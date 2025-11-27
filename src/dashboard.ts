/**
 * Dashboard HTML generator for the Slack Welcome Bot
 */

export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OWASP BLT Slack Welcome Bot</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --primary: #1a73e8;
      --primary-dark: #1557b0;
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
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
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
      color: var(--primary);
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

    .joins-table {
      width: 100%;
      border-collapse: collapse;
    }

    .joins-table th,
    .joins-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .joins-table th {
      background: var(--background);
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .joins-table tr:hover {
      background: var(--background);
    }

    .success-badge {
      display: inline-block;
      background: var(--success);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .setup-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      border-radius: 12px;
      text-align: center;
      margin: 2rem 0;
    }

    .setup-section h2 {
      color: white;
      margin-bottom: 1rem;
    }

    .setup-section p {
      opacity: 0.9;
      margin-bottom: 1.5rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .deploy-button {
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

    .deploy-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
      opacity: 0.5;
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
    <p>Slack Welcome Bot powered by Cloudflare Workers</p>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Members Welcomed</h3>
        <div class="value" id="total-joins">-</div>
        <div class="subtitle">Since deployment</div>
      </div>
      <div class="stat-card">
        <h3>Last Join</h3>
        <div class="value" id="last-join">-</div>
        <div class="subtitle" id="last-join-full">Never</div>
      </div>
      <div class="stat-card">
        <h3>Joins Today</h3>
        <div class="value" id="today-joins">-</div>
        <div class="subtitle">New members today</div>
      </div>
    </div>

    <div class="card">
      <h2>📈 Joins Over Time</h2>
      <div class="chart-container">
        <canvas id="joinsChart"></canvas>
      </div>
    </div>

    <div class="card">
      <h2>📋 Recent Joins</h2>
      <div id="joins-list">
        <div class="loading">Loading...</div>
      </div>
    </div>

    <div class="setup-section">
      <h2>🚀 Deploy Your Own</h2>
      <p>Set up your own Slack welcome bot in minutes with one-click deployment to Cloudflare Workers.</p>
      <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare" class="deploy-button">
        Deploy to Cloudflare
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

        // Update total joins
        document.getElementById('total-joins').textContent = stats.totalJoins || 0;

        // Update last join
        if (stats.lastJoinAt) {
          const lastJoinDate = new Date(stats.lastJoinAt);
          const now = new Date();
          const diffMs = now - lastJoinDate;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let timeAgo;
          if (diffMins < 1) timeAgo = 'Just now';
          else if (diffMins < 60) timeAgo = diffMins + 'm ago';
          else if (diffHours < 24) timeAgo = diffHours + 'h ago';
          else timeAgo = diffDays + 'd ago';

          document.getElementById('last-join').textContent = timeAgo;
          document.getElementById('last-join-full').textContent = lastJoinDate.toLocaleString();
        }

        // Update today's joins
        const today = new Date().toISOString().split('T')[0];
        const todayJoins = stats.dailyJoins?.[today] || 0;
        document.getElementById('today-joins').textContent = todayJoins;

        // Update chart
        updateChart(stats.dailyJoins || {});
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    async function loadJoins() {
      try {
        const response = await fetch('/api/joins?limit=20');
        const joins = await response.json();

        const container = document.getElementById('joins-list');

        if (!joins || joins.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No joins recorded yet. New members will appear here when they join your Slack workspace.</p>
            </div>
          \`;
          return;
        }

        const tableHtml = \`
          <table class="joins-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Joined At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${joins.map(join => \`
                <tr>
                  <td>\${escapeHtml(join.userName)}</td>
                  <td>\${new Date(join.timestamp).toLocaleString()}</td>
                  <td><span class="success-badge">✓ Welcomed</span></td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        \`;

        container.innerHTML = tableHtml;
      } catch (error) {
        console.error('Error loading joins:', error);
        document.getElementById('joins-list').innerHTML = '<div class="loading">Error loading data</div>';
      }
    }

    function updateChart(dailyJoins) {
      const ctx = document.getElementById('joinsChart').getContext('2d');

      // Generate last 30 days of labels
      const labels = [];
      const data = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(dailyJoins[dateStr] || 0);
      }

      if (chart) {
        chart.destroy();
      }

      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'New Members',
            data: data,
            borderColor: '#1a73e8',
            backgroundColor: 'rgba(26, 115, 232, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Load data on page load
    loadStats();
    loadJoins();

    // Refresh data every 30 seconds
    setInterval(() => {
      loadStats();
      loadJoins();
    }, 30000);
  </script>
</body>
</html>`;
}
