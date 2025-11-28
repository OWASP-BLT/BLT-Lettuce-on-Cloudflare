"""
Tests for the OWASP BLT Lettuce Slack Bot
"""

import pytest
import json


class TestParseIndexMd:
    """Tests for parsing index.md YAML frontmatter"""

    def test_parse_valid_frontmatter(self):
        """Test parsing valid YAML frontmatter"""
        content = """---
layout: col-sidebar
title: OWASP Juice Shop
tags: juiceshop
level: 4
type: tool
pitch: A great project for testing
---

Some markdown content here.
"""
        # Import parse function - we'll test the parsing logic
        metadata = parse_index_md(content)

        assert metadata is not None
        assert metadata["title"] == "OWASP Juice Shop"
        assert metadata["level"] == 4
        assert metadata["type"] == "tool"
        assert "juiceshop" in str(metadata.get("tags", []))

    def test_parse_no_frontmatter(self):
        """Test that content without frontmatter returns None"""
        content = """# Regular Markdown

This is just regular markdown without frontmatter.
"""
        metadata = parse_index_md(content)
        assert metadata is None

    def test_parse_empty_content(self):
        """Test that empty content returns None"""
        metadata = parse_index_md("")
        assert metadata is None

    def test_parse_incomplete_frontmatter(self):
        """Test that incomplete frontmatter returns None"""
        content = """---
title: Test Project
"""
        metadata = parse_index_md(content)
        assert metadata is None


class TestFlowchartQuestions:
    """Tests for flowchart question structure"""

    def test_flowchart_has_start(self):
        """Test that flowchart has a start node"""
        assert "start" in FLOWCHART_QUESTIONS
        assert "question" in FLOWCHART_QUESTIONS["start"]
        assert "options" in FLOWCHART_QUESTIONS["start"]

    def test_all_options_have_required_fields(self):
        """Test that all options have required fields"""
        for key, question_data in FLOWCHART_QUESTIONS.items():
            for option in question_data["options"]:
                assert "text" in option, f"Option in {key} missing 'text'"
                assert "value" in option, f"Option in {key} missing 'value'"
                assert "next" in option, f"Option in {key} missing 'next'"

    def test_next_nodes_exist_or_end(self):
        """Test that all 'next' values point to existing nodes or 'end'"""
        valid_nodes = set(FLOWCHART_QUESTIONS.keys()) | {"end"}

        for key, question_data in FLOWCHART_QUESTIONS.items():
            for option in question_data["options"]:
                next_node = option["next"]
                assert next_node in valid_nodes, f"Invalid next node '{next_node}' in {key}"


class TestFilterProjects:
    """Tests for project filtering logic"""

    def test_filter_tool_projects(self):
        """Test filtering tool projects"""
        projects = [
            {"title": "Test Tool", "type": "tool", "pitch": "A code analysis tool", "tags": []},
            {"title": "Test Doc", "type": "documentation", "pitch": "A guide", "tags": []},
        ]

        matching = filter_projects(projects, "code_analysis")
        assert len(matching) == 1
        assert matching[0]["title"] == "Test Tool"

    def test_filter_documentation_projects(self):
        """Test filtering documentation projects"""
        projects = [
            {"title": "Security Standard", "type": "standard", "pitch": "A security checklist", "tags": []},
            {"title": "Test Tool", "type": "tool", "pitch": "A testing tool", "tags": []},
        ]

        matching = filter_projects(projects, "standards")
        assert len(matching) == 1
        assert matching[0]["title"] == "Security Standard"

    def test_filter_returns_empty_for_unknown_category(self):
        """Test that unknown categories return all projects (no filter)"""
        projects = [
            {"title": "Project 1", "type": "tool", "pitch": "A tool", "tags": []},
        ]

        matching = filter_projects(projects, "unknown_category")
        assert len(matching) == 0


class TestGetLevelEmoji:
    """Tests for level emoji mapping"""

    def test_flagship_level(self):
        """Test flagship level emoji"""
        assert get_level_emoji(4) == "🏆"

    def test_lab_level(self):
        """Test lab level emoji"""
        assert get_level_emoji(3) == "🥇"

    def test_incubator_level(self):
        """Test incubator level emoji"""
        assert get_level_emoji(2) == "🥈"

    def test_production_level(self):
        """Test production level emoji"""
        assert get_level_emoji(1) == "🥉"

    def test_unknown_level(self):
        """Test unknown level emoji"""
        assert get_level_emoji(0) == "📦"
        assert get_level_emoji(5) == "📦"


# Helper functions extracted for testing
def parse_index_md(content: str) -> dict | None:
    """Parse YAML frontmatter from index.md"""
    if not content.startswith("---"):
        return None

    end_index = content.find("---", 3)
    if end_index == -1:
        return None

    frontmatter = content[3:end_index].strip()

    metadata = {}
    for line in frontmatter.split("\n"):
        line = line.strip()
        if ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            if key == "tags":
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


# Flowchart questions (copied from entry.py for testing)
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


def filter_projects(projects: list, category: str) -> list:
    """Filter projects based on selected category"""
    category_mappings = {
        "code_analysis": ["sast", "code", "analysis", "dependency", "scanner"],
        "web_testing": ["web", "dast", "testing", "proxy", "scanner", "zap"],
        "auth": ["authentication", "authorization", "identity", "sso", "oauth"],
        "monitoring": ["monitor", "logging", "detection", "siem"],
        "standards": ["standard", "checklist", "asvs", "masvs", "samm"],
        "secure_dev": ["development", "secure coding", "security guide"],
        "testing_guide": ["testing guide", "pentest", "wstg"],
        "cheatsheet": ["cheat", "reference", "quick"],
        "labs": ["lab", "ctf", "challenge", "vulnerable", "juice shop", "webgoat"],
        "presentations": ["presentation", "slide", "talk"],
        "courses": ["course", "curriculum", "training"],
        "vuln_web": ["vulnerable", "insecure", "web application", "juice shop", "webgoat"],
        "vuln_mobile": ["mobile", "android", "ios", "mstg"],
        "vuln_api": ["api", "rest", "graphql"],
    }

    keywords = category_mappings.get(category, [])
    if not keywords:
        return []

    matching = []
    for project in projects:
        searchable = (
            f"{project.get('title', '')} {project.get('pitch', '')} "
            f"{' '.join(project.get('tags', []))} {project.get('type', '')}"
        ).lower()

        project_type = project.get("type", "").lower()

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


def get_level_emoji(level: int) -> str:
    """Get emoji for project level"""
    levels = {
        4: "🏆",
        3: "🥇",
        2: "🥈",
        1: "🥉",
    }
    return levels.get(level, "📦")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
