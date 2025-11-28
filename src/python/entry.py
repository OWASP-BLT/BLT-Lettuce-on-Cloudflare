"""
OWASP BLT Lettuce Slack Bot - Project Finder
A Cloudflare Python Worker that helps users find OWASP projects through
interactive Slack DM conversations using a flowchart-based approach.
"""

import json
import hashlib
import hmac
import time
import re
from typing import Any

from workers import WorkerEntrypoint, Response, Request
from js import JSON, fetch

# Configuration constants
GITHUB_ORGS = ["OWASP"]  # Organizations to scan for projects
CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 hours cache expiration
SLACK_SIGNATURE_VERSION = "v0"
SLACK_SIGNATURE_MAX_AGE = 60 * 5  # 5 minutes

# Project categorization flowchart questions
FLOWCHART_QUESTIONS = {
    "start": {
        "question": "What type of OWASP resource are you looking for?",
        "options": [
            {"text": "🛠️ Security Tool", "value": "tool", "next": "tool_type"},
            {"text": "📚 Documentation/Guide", "value": "documentation", "next": "doc_type"},
            {"text": "🎓 Training/Education", "value": "training", "next": "training_type"},
            {"text": "🔬 Vulnerable Application (for testing)", "value": "vulnerable_app", "next": "vuln_app_type"},
        ]
    },
    "tool_type": {
        "question": "What kind of security tool are you looking for?",
        "options": [
            {"text": "🔍 Code Analysis/SAST", "value": "code_analysis", "next": "end"},
            {"text": "🌐 Web Application Testing", "value": "web_testing", "next": "end"},
            {"text": "🔐 Authentication/Authorization", "value": "auth", "next": "end"},
            {"text": "📊 Security Monitoring", "value": "monitoring", "next": "end"},
            {"text": "🔙 Go Back", "value": "back", "next": "start"},
        ]
    },
    "doc_type": {
        "question": "What documentation are you interested in?",
        "options": [
            {"text": "📋 Security Standards/Checklists", "value": "standards", "next": "end"},
            {"text": "🏗️ Secure Development Guide", "value": "secure_dev", "next": "end"},
            {"text": "📖 Security Testing Guide", "value": "testing_guide", "next": "end"},
            {"text": "⚡ Quick Reference", "value": "cheatsheet", "next": "end"},
            {"text": "🔙 Go Back", "value": "back", "next": "start"},
        ]
    },
    "training_type": {
        "question": "What kind of training are you looking for?",
        "options": [
            {"text": "🎮 Hands-on Labs/CTF", "value": "labs", "next": "end"},
            {"text": "📺 Presentations/Slides", "value": "presentations", "next": "end"},
            {"text": "🎓 Courses/Curriculum", "value": "courses", "next": "end"},
            {"text": "🔙 Go Back", "value": "back", "next": "start"},
        ]
    },
    "vuln_app_type": {
        "question": "What type of vulnerable application do you need?",
        "options": [
            {"text": "🌐 Web Application", "value": "vuln_web", "next": "end"},
            {"text": "📱 Mobile Application", "value": "vuln_mobile", "next": "end"},
            {"text": "🔌 API Security", "value": "vuln_api", "next": "end"},
            {"text": "🔙 Go Back", "value": "back", "next": "start"},
        ]
    }
}


class Default(WorkerEntrypoint):
    """Main Worker Entrypoint for the OWASP Project Finder Bot"""

    async def fetch(self, request: Request) -> Response:
        """Handle incoming HTTP requests"""
        url_str = str(request.url)
        path = url_str.split("?")[0].rstrip("/").split("/")[-1] if "/" in url_str else ""

        # Extract path from URL
        if "/slack/events" in url_str:
            path = "slack_events"
        elif "/slack/interactivity" in url_str:
            path = "slack_interactivity"
        elif "/api/stats" in url_str:
            path = "api_stats"
        elif "/api/projects" in url_str:
            path = "api_projects"

        method = str(request.method).upper()

        # Route requests
        if path == "slack_events" and method == "POST":
            return await self.handle_slack_events(request)
        elif path == "slack_interactivity" and method == "POST":
            return await self.handle_slack_interactivity(request)
        elif path == "api_stats" and method == "GET":
            return await self.handle_get_stats()
        elif path == "api_projects" and method == "GET":
            return await self.handle_get_projects()

        # Serve the dashboard for all other routes
        return self.render_dashboard()

    async def scheduled(self, controller, env, ctx) -> None:
        """Scheduled task to refresh project cache"""
        print("Running scheduled project cache refresh...")
        await self.refresh_project_cache()
        print("Project cache refresh completed.")

    async def handle_slack_events(self, request: Request) -> Response:
        """Handle Slack Events API requests"""
        try:
            # Verify Slack signature
            is_valid = await self.verify_slack_signature(request)
            if not is_valid:
                return Response("Invalid signature", status=401)

            body_text = await request.text()
            body = json.loads(body_text)

            # Handle URL verification challenge from Slack
            if body.get("type") == "url_verification":
                return Response(body.get("challenge", ""), headers={"Content-Type": "text/plain"})

            # Handle event callbacks
            if body.get("type") == "event_callback":
                event = body.get("event", {})

                # Handle team_join events - send interactive welcome
                if event.get("type") == "team_join":
                    user = event.get("user", {})
                    user_id = user.get("id") if isinstance(user, dict) else user
                    await self.send_welcome_message(user_id)

                # Handle direct messages (app_mention or message events)
                elif event.get("type") == "message" and event.get("channel_type") == "im":
                    # Skip bot messages to avoid loops
                    if not event.get("bot_id"):
                        user_id = event.get("user")
                        text = event.get("text", "").lower().strip()

                        if text in ["start", "help", "find project", "projects"]:
                            await self.start_conversation(user_id)

            return Response("OK", status=200)
        except Exception as e:
            print(f"Error handling Slack event: {e}")
            return Response("Internal Server Error", status=500)

    async def handle_slack_interactivity(self, request: Request) -> Response:
        """Handle Slack interactive components (button clicks)"""
        try:
            # Verify Slack signature
            is_valid = await self.verify_slack_signature(request)
            if not is_valid:
                return Response("Invalid signature", status=401)

            body_text = await request.text()
            # Parse URL-encoded payload
            if body_text.startswith("payload="):
                payload_str = body_text[8:]  # Remove "payload="
                # URL decode
                from urllib.parse import unquote
                payload_str = unquote(payload_str)
                payload = json.loads(payload_str)
            else:
                payload = json.loads(body_text)

            # Handle block actions (button clicks)
            if payload.get("type") == "block_actions":
                user_id = payload.get("user", {}).get("id")
                actions = payload.get("actions", [])

                if actions:
                    action = actions[0]
                    action_id = action.get("action_id", "")
                    value = action.get("value", "")

                    await self.handle_flowchart_action(user_id, action_id, value)

            return Response("", status=200)
        except Exception as e:
            print(f"Error handling interactivity: {e}")
            return Response("Internal Server Error", status=500)

    async def verify_slack_signature(self, request: Request) -> bool:
        """Verify that a request is legitimately from Slack"""
        timestamp = request.headers.get("x-slack-request-timestamp")
        slack_signature = request.headers.get("x-slack-signature")

        if not timestamp or not slack_signature:
            return False

        # Validate signature format
        if not re.match(r"^v0=[a-f0-9]{64}$", slack_signature):
            return False

        # Check timestamp is valid
        try:
            timestamp_num = int(timestamp)
            if timestamp_num <= 0:
                return False
        except (ValueError, TypeError):
            return False

        # Check request age (prevent replay attacks)
        current_time = int(time.time())
        if abs(current_time - timestamp_num) > SLACK_SIGNATURE_MAX_AGE:
            return False

        body = await request.text()
        sig_basestring = f"{SLACK_SIGNATURE_VERSION}:{timestamp}:{body}"

        # Create HMAC-SHA256 signature
        signing_secret = self.env.SLACK_SIGNING_SECRET
        computed_sig = hmac.new(
            signing_secret.encode('utf-8'),
            sig_basestring.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        computed_signature = f"{SLACK_SIGNATURE_VERSION}={computed_sig}"

        # Constant-time comparison
        return hmac.compare_digest(computed_signature, slack_signature)

    async def send_welcome_message(self, user_id: str) -> None:
        """Send interactive welcome message to a new user"""
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🥬 Welcome to OWASP!",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Hello and welcome to the *OWASP* community! I'm the OWASP Project Finder Bot, and I'm here to help you discover the perfect OWASP project for your needs."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Would you like me to help you find an OWASP project? I'll ask you a few questions to understand what you're looking for."
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "🔍 Find a Project",
                            "emoji": True
                        },
                        "style": "primary",
                        "action_id": "start_flowchart",
                        "value": "start"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "📖 Learn More",
                            "emoji": True
                        },
                        "action_id": "learn_more",
                        "value": "learn"
                    }
                ]
            }
        ]

        await self.send_dm(user_id, blocks, "Welcome to OWASP!")

    async def start_conversation(self, user_id: str) -> None:
        """Start the project finder conversation flowchart"""
        await self.send_flowchart_question(user_id, "start")

    async def send_flowchart_question(self, user_id: str, question_key: str) -> None:
        """Send a flowchart question with multiple choice options"""
        question_data = FLOWCHART_QUESTIONS.get(question_key)
        if not question_data:
            return

        buttons = []
        for option in question_data["options"]:
            buttons.append({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": option["text"],
                    "emoji": True
                },
                "action_id": f"flowchart_{question_key}_{option['value']}",
                "value": json.dumps({
                    "current": question_key,
                    "selected": option["value"],
                    "next": option["next"]
                })
            })

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{question_data['question']}*"
                }
            },
            {
                "type": "actions",
                "elements": buttons
            }
        ]

        await self.send_dm(user_id, blocks, question_data["question"])

    async def handle_flowchart_action(self, user_id: str, action_id: str, value: str) -> None:
        """Handle a flowchart button click"""
        if action_id == "start_flowchart":
            await self.start_conversation(user_id)
            return

        if action_id == "learn_more":
            await self.send_learn_more(user_id)
            return

        if action_id == "start_over":
            await self.start_conversation(user_id)
            return

        if action_id.startswith("flowchart_"):
            try:
                data = json.loads(value)
                selected = data.get("selected")
                next_step = data.get("next")

                # Store user's selection in conversation state
                await self.store_user_selection(user_id, data.get("current"), selected)

                if next_step == "end":
                    # Show matching projects
                    await self.show_matching_projects(user_id, selected)
                else:
                    # Continue to next question
                    await self.send_flowchart_question(user_id, next_step)
            except json.JSONDecodeError:
                await self.start_conversation(user_id)

    async def store_user_selection(self, user_id: str, question: str, answer: str) -> None:
        """Store user's selection in KV for conversation state"""
        key = f"conversation:{user_id}"
        existing = await self.env.SLACK_BOT_KV.get(key)

        state = json.loads(existing) if existing else {"selections": {}}
        state["selections"][question] = answer
        state["last_updated"] = time.time()

        await self.env.SLACK_BOT_KV.put(key, json.dumps(state), expirationTtl=3600)

    async def show_matching_projects(self, user_id: str, category: str) -> None:
        """Show projects matching the user's selections"""
        # Get cached projects
        projects = await self.get_cached_projects()

        # Filter projects based on category
        matching = self.filter_projects(projects, category)

        if not matching:
            # No projects found - offer to start over
            blocks = [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "😕 *No projects found matching your criteria.*\n\nDon't worry! OWASP has many other great projects."
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Would you like to try a different search, or learn how to start your own OWASP project?"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "🔄 Start Over",
                                "emoji": True
                            },
                            "style": "primary",
                            "action_id": "start_over",
                            "value": "start"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "🚀 Start a Project",
                                "emoji": True
                            },
                            "url": "https://owasp.org/www-policy/operational/project-create",
                            "action_id": "new_project"
                        }
                    ]
                }
            ]
        else:
            # Show matching projects
            project_blocks = [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🎉 *Found {len(matching)} project(s) matching your criteria!*"
                    }
                },
                {"type": "divider"}
            ]

            for project in matching[:5]:  # Show top 5
                level_emoji = self.get_level_emoji(project.get("level", 0))
                project_blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{level_emoji} *<{project.get('url', '#')}|{project.get('title', 'Unknown Project')}>*\n{project.get('pitch', 'No description available.')[:200]}"
                    }
                })

            project_blocks.append({"type": "divider"})
            project_blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "🔄 Search Again",
                            "emoji": True
                        },
                        "action_id": "start_over",
                        "value": "start"
                    }
                ]
            })

            blocks = project_blocks

        await self.send_dm(user_id, blocks, "Project search results")

        # Record search stats
        await self.record_search(user_id, category, len(matching))

    def filter_projects(self, projects: list, category: str) -> list:
        """Filter projects based on selected category"""
        category_mappings = {
            # Tools
            "code_analysis": ["sast", "code", "analysis", "dependency", "scanner"],
            "web_testing": ["web", "dast", "testing", "proxy", "scanner", "zap"],
            "auth": ["authentication", "authorization", "identity", "sso", "oauth"],
            "monitoring": ["monitor", "logging", "detection", "siem"],
            # Documentation
            "standards": ["standard", "checklist", "asvs", "masvs", "samm"],
            "secure_dev": ["development", "secure coding", "security guide"],
            "testing_guide": ["testing guide", "pentest", "wstg"],
            "cheatsheet": ["cheat", "reference", "quick"],
            # Training
            "labs": ["lab", "ctf", "challenge", "vulnerable", "juice shop", "webgoat"],
            "presentations": ["presentation", "slide", "talk"],
            "courses": ["course", "curriculum", "training"],
            # Vulnerable Apps
            "vuln_web": ["vulnerable", "insecure", "web application", "juice shop", "webgoat"],
            "vuln_mobile": ["mobile", "android", "ios", "mstg"],
            "vuln_api": ["api", "rest", "graphql"],
        }

        keywords = category_mappings.get(category, [])
        if not keywords:
            return projects

        matching = []
        for project in projects:
            searchable = (
                f"{project.get('title', '')} {project.get('pitch', '')} "
                f"{' '.join(project.get('tags', []))} {project.get('type', '')}"
            ).lower()

            # Also check project type from index.md
            project_type = project.get("type", "").lower()

            # Match by type first
            if category in ["code_analysis", "web_testing", "auth", "monitoring"]:
                if project_type == "tool":
                    for kw in keywords:
                        if kw in searchable:
                            matching.append(project)
                            break
            elif category in ["standards", "secure_dev", "testing_guide", "cheatsheet"]:
                if project_type in ["documentation", "standard"]:
                    for kw in keywords:
                        if kw in searchable:
                            matching.append(project)
                            break
            elif category in ["labs", "presentations", "courses"]:
                for kw in keywords:
                    if kw in searchable:
                        matching.append(project)
                        break
            elif category in ["vuln_web", "vuln_mobile", "vuln_api"]:
                if project_type in ["tool", "code"]:
                    for kw in keywords:
                        if kw in searchable:
                            matching.append(project)
                            break

        return matching

    def get_level_emoji(self, level: int) -> str:
        """Get emoji for project level"""
        levels = {
            4: "🏆",  # Flagship
            3: "🥇",  # Lab
            2: "🥈",  # Incubator
            1: "🥉",  # Production
        }
        return levels.get(level, "📦")

    async def send_learn_more(self, user_id: str) -> None:
        """Send information about OWASP"""
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*About OWASP*\n\nThe Open Worldwide Application Security Project (OWASP) is a nonprofit foundation that works to improve the security of software."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Useful Links:*\n• <https://owasp.org|OWASP Website>\n• <https://owasp.org/projects/|All Projects>\n• <https://owasp.org/chapters/|Local Chapters>\n• <https://owasp.org/www-project-top-ten/|OWASP Top 10>"
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "🔍 Find a Project",
                            "emoji": True
                        },
                        "style": "primary",
                        "action_id": "start_flowchart",
                        "value": "start"
                    }
                ]
            }
        ]

        await self.send_dm(user_id, blocks, "About OWASP")

    async def send_dm(self, user_id: str, blocks: list, fallback_text: str) -> None:
        """Send a direct message to a user"""
        bot_token = self.env.SLACK_BOT_TOKEN

        # Open conversation
        conv_response = await fetch(
            "https://slack.com/api/conversations.open",
            method="POST",
            headers={
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json"
            },
            body=json.dumps({"users": user_id})
        )

        conv_data = json.loads(await conv_response.text())
        if not conv_data.get("ok"):
            print(f"Failed to open conversation: {conv_data.get('error')}")
            return

        channel_id = conv_data.get("channel", {}).get("id")

        # Send message
        msg_response = await fetch(
            "https://slack.com/api/chat.postMessage",
            method="POST",
            headers={
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json"
            },
            body=json.dumps({
                "channel": channel_id,
                "blocks": blocks,
                "text": fallback_text
            })
        )

        msg_data = json.loads(await msg_response.text())
        if not msg_data.get("ok"):
            print(f"Failed to send message: {msg_data.get('error')}")

    async def get_cached_projects(self) -> list:
        """Get projects from cache or fetch fresh"""
        cache_key = "projects:cache"
        cached = await self.env.SLACK_BOT_KV.get(cache_key)

        if cached:
            data = json.loads(cached)
            # Check if cache is still valid
            if time.time() - data.get("timestamp", 0) < CACHE_TTL_SECONDS:
                return data.get("projects", [])

        # Fetch fresh data
        projects = await self.fetch_owasp_projects()

        # Cache the results
        await self.env.SLACK_BOT_KV.put(
            cache_key,
            json.dumps({"timestamp": time.time(), "projects": projects}),
            expirationTtl=CACHE_TTL_SECONDS
        )

        return projects

    async def fetch_owasp_projects(self) -> list:
        """Fetch OWASP projects from GitHub by scanning index.md files"""
        projects = []

        for org in GITHUB_ORGS:
            try:
                # Get all repositories in the organization that start with www-project
                repos_response = await fetch(
                    f"https://api.github.com/orgs/{org}/repos?per_page=100&type=public",
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "OWASP-BLT-Lettuce-Bot"
                    }
                )

                if repos_response.status != 200:
                    continue

                repos = json.loads(await repos_response.text())

                for repo in repos:
                    repo_name = repo.get("name", "")
                    # Only process OWASP project repositories
                    if not repo_name.startswith("www-project-"):
                        continue

                    # Try to fetch index.md
                    try:
                        index_response = await fetch(
                            f"https://raw.githubusercontent.com/{org}/{repo_name}/main/index.md",
                            headers={"User-Agent": "OWASP-BLT-Lettuce-Bot"}
                        )

                        if index_response.status != 200:
                            # Try master branch
                            index_response = await fetch(
                                f"https://raw.githubusercontent.com/{org}/{repo_name}/master/index.md",
                                headers={"User-Agent": "OWASP-BLT-Lettuce-Bot"}
                            )

                        if index_response.status == 200:
                            content = await index_response.text()
                            metadata = self.parse_index_md(content)

                            if metadata:
                                metadata["repo"] = repo_name
                                metadata["url"] = f"https://owasp.org/{repo_name.replace('www-', '')}/"
                                metadata["github_url"] = f"https://github.com/{org}/{repo_name}"
                                metadata["stars"] = repo.get("stargazers_count", 0)
                                projects.append(metadata)
                    except Exception as e:
                        print(f"Error fetching index.md for {repo_name}: {e}")
                        continue

            except Exception as e:
                print(f"Error fetching repos for {org}: {e}")
                continue

        return projects

    def parse_index_md(self, content: str) -> dict | None:
        """Parse YAML frontmatter from index.md"""
        # Check if content has YAML frontmatter
        if not content.startswith("---"):
            return None

        # Find the end of frontmatter
        end_index = content.find("---", 3)
        if end_index == -1:
            return None

        frontmatter = content[3:end_index].strip()

        # Parse YAML manually (simple key: value parsing)
        metadata = {}
        for line in frontmatter.split("\n"):
            line = line.strip()
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()

                # Handle special cases
                if key == "tags":
                    # Tags might be on same line or following lines
                    if value:
                        metadata[key] = [v.strip() for v in value.split(",")]
                    else:
                        metadata[key] = []
                elif key == "level":
                    try:
                        metadata[key] = int(value)
                    except ValueError:
                        metadata[key] = 0
                else:
                    metadata[key] = value

        return metadata if metadata.get("title") else None

    async def refresh_project_cache(self) -> None:
        """Refresh the project cache (called by scheduled task)"""
        projects = await self.fetch_owasp_projects()

        cache_key = "projects:cache"
        await self.env.SLACK_BOT_KV.put(
            cache_key,
            json.dumps({"timestamp": time.time(), "projects": projects}),
            expirationTtl=CACHE_TTL_SECONDS
        )

        print(f"Cached {len(projects)} projects")

    async def record_search(self, user_id: str, category: str, results_count: int) -> None:
        """Record search statistics"""
        stats_key = "stats:searches"
        existing = await self.env.SLACK_BOT_KV.get(stats_key)

        stats = json.loads(existing) if existing else {"total": 0, "categories": {}}
        stats["total"] += 1
        stats["categories"][category] = stats["categories"].get(category, 0) + 1
        stats["last_search"] = time.time()

        await self.env.SLACK_BOT_KV.put(stats_key, json.dumps(stats))

    async def handle_get_stats(self) -> Response:
        """Handle API request for statistics"""
        stats_key = "stats:searches"
        stats = await self.env.SLACK_BOT_KV.get(stats_key)

        return Response(
            stats or json.dumps({"total": 0, "categories": {}}),
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        )

    async def handle_get_projects(self) -> Response:
        """Handle API request for cached projects"""
        projects = await self.get_cached_projects()

        return Response(
            json.dumps(projects),
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        )

    def render_dashboard(self) -> Response:
        """Render the dashboard HTML"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OWASP BLT Lettuce Bot - Project Finder</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --primary: #1a73e8;
      --primary-dark: #1557b0;
      --owasp-blue: #0f4c81;
      --success: #34a853;
      --background: #f5f7fa;
      --card-bg: #ffffff;
      --text: #202124;
      --text-secondary: #5f6368;
      --border: #dadce0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--background);
      color: var(--text);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      background: linear-gradient(135deg, var(--owasp-blue) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .stat-card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border);
    }

    .stat-card h3 {
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--owasp-blue);
    }

    .stat-card .subtitle {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border);
    }

    .card h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--text);
    }

    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }

    .projects-list {
      display: grid;
      gap: 1rem;
    }

    .project-item {
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: all 0.2s;
    }

    .project-item:hover {
      border-color: var(--primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .project-item h4 {
      color: var(--owasp-blue);
      margin-bottom: 0.5rem;
    }

    .project-item h4 a {
      color: inherit;
      text-decoration: none;
    }

    .project-item h4 a:hover {
      text-decoration: underline;
    }

    .project-item p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .project-meta {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .flowchart-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      border-radius: 12px;
      text-align: center;
      margin: 2rem 0;
    }

    .flowchart-section h2 {
      color: white;
      margin-bottom: 1rem;
    }

    .flowchart-section p {
      opacity: 0.9;
      margin-bottom: 1.5rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .setup-button {
      display: inline-block;
      background: white;
      color: #667eea;
      padding: 1rem 2rem;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .setup-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    footer a {
      color: var(--primary);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      header h1 {
        font-size: 1.75rem;
      }
      
      .container {
        padding: 1rem;
      }

      .stat-card .value {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>🥬 OWASP BLT Lettuce Bot</h1>
    <p>Interactive Project Finder for Slack</p>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Searches</h3>
        <div class="value" id="total-searches">-</div>
        <div class="subtitle">Project finder queries</div>
      </div>
      <div class="stat-card">
        <h3>Projects Indexed</h3>
        <div class="value" id="projects-count">-</div>
        <div class="subtitle">OWASP projects available</div>
      </div>
      <div class="stat-card">
        <h3>Most Popular Category</h3>
        <div class="value" id="top-category">-</div>
        <div class="subtitle">Most searched</div>
      </div>
    </div>

    <div class="card">
      <h2>📊 Search Categories</h2>
      <div class="chart-container">
        <canvas id="categoriesChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h2>🏆 Featured Projects</h2>
      <div id="projects-list" class="projects-list">
        <div class="loading">Loading projects...</div>
      </div>
    </div>

    <div class="flowchart-section">
      <h2>🤖 How It Works</h2>
      <p>
        The OWASP Project Finder Bot uses an interactive flowchart conversation to help users discover 
        the perfect OWASP project for their needs. It scans GitHub organizations for project metadata 
        and caches results for fast responses.
      </p>
      <a href="https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare" class="setup-button">
        View on GitHub
      </a>
    </div>
  </div>

  <footer>
    <p>
      Made with ❤️ by <a href="https://owasp.org/www-project-bug-logging-tool/">OWASP BLT</a> | 
      <a href="https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare">GitHub</a>
    </p>
  </footer>

  <script>
    let chart = null;

    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        document.getElementById('total-searches').textContent = stats.total || 0;

        // Find top category
        const categories = stats.categories || {};
        let topCat = '-';
        let maxCount = 0;
        for (const [cat, count] of Object.entries(categories)) {
          if (count > maxCount) {
            maxCount = count;
            topCat = cat.replace(/_/g, ' ');
          }
        }
        document.getElementById('top-category').textContent = topCat;

        // Update chart
        updateChart(categories);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    async function loadProjects() {
      try {
        const response = await fetch('/api/projects');
        const projects = await response.json();

        document.getElementById('projects-count').textContent = projects.length;

        const container = document.getElementById('projects-list');

        if (!projects || projects.length === 0) {
          container.innerHTML = '<div class="loading">No projects indexed yet. The cache will be populated automatically.</div>';
          return;
        }

        // Sort by level (flagship first) and stars
        projects.sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return (b.stars || 0) - (a.stars || 0);
        });

        const html = projects.slice(0, 10).map(project => `
          <div class="project-item">
            <h4><a href="${escapeHtml(project.url || '#')}" target="_blank">${escapeHtml(project.title || 'Unknown')}</a></h4>
            <p>${escapeHtml((project.pitch || 'No description available.').substring(0, 200))}</p>
            <div class="project-meta">
              <span>📊 Level ${project.level || 0}</span>
              <span>⭐ ${project.stars || 0} stars</span>
              <span>📁 ${escapeHtml(project.type || 'project')}</span>
            </div>
          </div>
        `).join('');

        container.innerHTML = html;
      } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projects-list').innerHTML = '<div class="loading">Error loading projects</div>';
      }
    }

    function updateChart(categories) {
      const ctx = document.getElementById('categoriesChart').getContext('2d');

      const labels = Object.keys(categories).map(k => k.replace(/_/g, ' '));
      const data = Object.values(categories);

      if (chart) {
        chart.destroy();
      }

      if (labels.length === 0) {
        labels.push('No data');
        data.push(0);
      }

      chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: [
              '#1a73e8', '#34a853', '#fbbc04', '#ea4335',
              '#667eea', '#764ba2', '#0f4c81', '#00bcd4'
            ],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            }
          }
        }
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    // Load data on page load
    loadStats();
    loadProjects();

    // Refresh every 60 seconds
    setInterval(() => {
      loadStats();
      loadProjects();
    }, 60000);
  </script>
</body>
</html>"""

        return Response(html, headers={"Content-Type": "text/html;charset=UTF-8"})
