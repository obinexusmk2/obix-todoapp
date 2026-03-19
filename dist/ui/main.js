import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
const App = () => {
    const [teams, setTeams] = useState([]);
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        }
        catch (err) {
            setError('Failed to load data. Is the server running on port 3000?');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading && !stats) {
        return (_jsx("div", { style: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }, children: _jsxs("div", { className: "loading", children: [_jsx("h1", { style: { marginBottom: '20px' }, children: "\uD83D\uDE80 OBIX TodoApp" }), _jsx("p", { children: "Loading dashboard..." })] }) }));
    }
    return (_jsxs("div", { children: [_jsx("header", { style: { background: '#667eea', color: 'white', padding: '20px', marginBottom: '20px' }, children: _jsxs("div", { className: "container", children: [_jsx("h1", { children: "\uD83D\uDCCB OBIX TodoApp Dashboard" }), _jsx("p", { children: "Team Collaboration with #NoGhosting Protocol" })] }) }), _jsxs("div", { className: "container", children: [error && _jsxs("div", { className: "error", children: ["\u26A0\uFE0F ", error] }), violations.length > 0 && (_jsxs("div", { className: "warning", children: ["\u26A0\uFE0F ", violations.length, " compliance violation(s) detected. Review #NoGhosting protocol."] })), escalations.length > 0 && (_jsxs("div", { className: "warning", children: ["\uD83D\uDEA8 ", escalations.length, " escalation(s) require attention."] })), _jsxs("div", { className: "dashboard", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uD83D\uDCCA Overview" }), stats ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Total Tasks" }), _jsx("span", { className: "stat-value", children: stats.tasks })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Teams" }), _jsx("span", { className: "stat-value", children: stats.teams })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Engagement Events" }), _jsx("span", { className: "stat-value", children: stats.events })] })] })) : (_jsx("p", { children: "Loading..." })), _jsx("button", { className: "button", onClick: fetchData, children: "\uD83D\uDD04 Refresh" })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uD83D\uDC65 Teams" }), teams.length > 0 ? (_jsxs(_Fragment, { children: [teams.slice(0, 3).map(team => (_jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: team.name }), _jsx("span", { className: "stat-value", children: team.members.length })] }, team.id))), teams.length > 3 && (_jsxs("p", { style: { fontSize: '12px', color: '#999', marginTop: '10px' }, children: ["+", teams.length - 3, " more"] }))] })) : (_jsx("p", { children: "No teams yet" })), _jsx("button", { className: "button button-secondary", children: "\u2795 Create Team" })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\u2705 Compliance" }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Violations" }), _jsx("span", { style: { color: violations.length > 0 ? '#e74c3c' : '#27ae60' }, children: violations.length })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Escalations" }), _jsx("span", { style: { color: escalations.length > 0 ? '#e74c3c' : '#27ae60' }, children: escalations.length })] }), _jsx("button", { className: "button button-secondary", children: "\uD83D\uDCCA View Report" })] })] }), tasks.length > 0 && (_jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uD83D\uDCDD Recent Tasks" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Due" })] }) }), _jsx("tbody", { children: tasks.map(task => (_jsxs("tr", { children: [_jsx("td", { children: task.title }), _jsx("td", { children: _jsx("span", { className: `badge ${task.status === 'completed'
                                                            ? 'badge-success'
                                                            : task.status === 'blocked'
                                                                ? 'badge-danger'
                                                                : 'badge-warning'}`, children: task.status }) }), _jsx("td", { children: _jsx("span", { className: `badge ${task.priority === 'critical' || task.priority === 'high'
                                                            ? 'badge-danger'
                                                            : 'badge-warning'}`, children: task.priority }) }), _jsx("td", { children: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A' })] }, task.id))) })] })] })), _jsxs("div", { className: "card", style: { marginTop: '20px', textAlign: 'center', color: '#999' }, children: [_jsx("p", { style: { fontSize: '12px' }, children: "OBIX TodoApp v0.1.0 \u2022 #NoGhosting Protocol \u2022 SQLite Backend" }), _jsx("p", { style: { fontSize: '12px', marginTop: '10px' }, children: "\uD83C\uDF10 API: http://localhost:3000/api \u2022 \uD83D\uDDA5\uFE0F CLI: obix-todoapp" })] })] })] }));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(_jsx(App, {}));
//# sourceMappingURL=main.js.map