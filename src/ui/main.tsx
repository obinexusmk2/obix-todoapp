import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

interface Team {
  id: string;
  name: string;
  members: any[];
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: number;
}

interface Stats {
  tasks: number;
  teams: number;
  events: number;
}

const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState([]);
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [healthRes, teamsRes, tasksRes, violationsRes, escalationsRes] = await Promise.all([
        fetch('/health'),
        fetch('/api/teams'),
        fetch('/api/teams'),
        fetch('/api/compliance/violations'),
        fetch('/api/compliance/escalations'),
      ]);

      if (healthRes.ok) {
        const health = await healthRes.json();
        setStats(health.database);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data || []);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const allTasks = (tasksData.data || []).slice(0, 10);
        setTasks(allTasks);
      }

      if (violationsRes.ok) {
        const viols = await violationsRes.json();
        setViolations(viols.data || []);
      }

      if (escalationsRes.ok) {
        const escs = await escalationsRes.json();
        setEscalations(escs.data || []);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load data. Is the server running on port 3000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <div className="loading">
          <h1 style={{ marginBottom: '20px' }}>🚀 OBIX TodoApp</h1>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ background: '#667eea', color: 'white', padding: '20px', marginBottom: '20px' }}>
        <div className="container">
          <h1>📋 OBIX TodoApp Dashboard</h1>
          <p>Team Collaboration with #NoGhosting Protocol</p>
        </div>
      </header>

      <div className="container">
        {error && <div className="error">⚠️ {error}</div>}

        {violations.length > 0 && (
          <div className="warning">
            ⚠️ {violations.length} compliance violation(s) detected. Review #NoGhosting protocol.
          </div>
        )}

        {escalations.length > 0 && (
          <div className="warning">
            🚨 {escalations.length} escalation(s) require attention.
          </div>
        )}

        <div className="dashboard">
          <div className="card">
            <h2>📊 Overview</h2>
            {stats ? (
              <>
                <div className="stat">
                  <span className="stat-label">Total Tasks</span>
                  <span className="stat-value">{stats.tasks}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Teams</span>
                  <span className="stat-value">{stats.teams}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Engagement Events</span>
                  <span className="stat-value">{stats.events}</span>
                </div>
              </>
            ) : (
              <p>Loading...</p>
            )}
            <button className="button" onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>

          <div className="card">
            <h2>👥 Teams</h2>
            {teams.length > 0 ? (
              <>
                {teams.slice(0, 3).map(team => (
                  <div key={team.id} className="stat">
                    <span className="stat-label">{team.name}</span>
                    <span className="stat-value">{team.members.length}</span>
                  </div>
                ))}
                {teams.length > 3 && (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                    +{teams.length - 3} more
                  </p>
                )}
              </>
            ) : (
              <p>No teams yet</p>
            )}
            <button className="button button-secondary">➕ Create Team</button>
          </div>

          <div className="card">
            <h2>✅ Compliance</h2>
            <div className="stat">
              <span className="stat-label">Violations</span>
              <span style={{ color: violations.length > 0 ? '#e74c3c' : '#27ae60' }}>
                {violations.length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Escalations</span>
              <span style={{ color: escalations.length > 0 ? '#e74c3c' : '#27ae60' }}>
                {escalations.length}
              </span>
            </div>
            <button className="button button-secondary">📊 View Report</button>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="card">
            <h2>📝 Recent Tasks</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>
                      <span
                        className={`badge ${
                          task.status === 'completed'
                            ? 'badge-success'
                            : task.status === 'blocked'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          task.priority === 'critical' || task.priority === 'high'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card" style={{ marginTop: '20px', textAlign: 'center', color: '#999' }}>
          <p style={{ fontSize: '12px' }}>
            OBIX TodoApp v0.1.0 • #NoGhosting Protocol • SQLite Backend
          </p>
          <p style={{ fontSize: '12px', marginTop: '10px' }}>
            🌐 API: http://localhost:3000/api • 🖥️ CLI: obix-todoapp
          </p>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
