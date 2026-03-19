/**
 * OBIX TodoApp - Express.js REST API Server
 * Provides HTTP endpoints for task and team management
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTodoApp } from '../core/index.js';
import { TodoDatabase } from './database-memory.js';
// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());
// Initialize database
const db = new TodoDatabase();
// Initialize TodoApp runtime
const todoApp = createTodoApp();
// Load data from database on startup
function loadFromDatabase() {
    const teams = db.getAllTeams();
    teams.forEach(team => {
        todoApp.dispatch({ type: 'CREATE_TEAM', payload: team });
    });
}
/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const stats = db.getStats();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        database: stats,
    });
});
/**
 * GET /api/teams - List all teams
 */
app.get('/api/teams', (req, res) => {
    try {
        const state = todoApp.state();
        const teams = Object.values(state.teams);
        res.json({ success: true, data: teams });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * POST /api/teams - Create new team
 */
app.post('/api/teams', (req, res) => {
    try {
        const { name, description, members, settings } = req.body;
        todoApp.dispatch({
            type: 'CREATE_TEAM',
            payload: {
                name,
                description,
                members: members || [],
                settings: settings || {
                    requireAcknowledgment: false,
                    acknowledgmentTimeoutHours: 24,
                    autoEscalationDays: 3,
                },
            },
        });
        const state = todoApp.state();
        const teams = Object.values(state.teams);
        const newTeam = teams[teams.length - 1];
        // Persist to database
        db.saveTeam(newTeam);
        res.status(201).json({ success: true, data: newTeam });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/teams/:teamId - Get team details
 */
app.get('/api/teams/:teamId', (req, res) => {
    try {
        const team = todoApp.runtime.getTeam(req.params.teamId);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        res.json({ success: true, data: team });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/teams/:teamId/tasks - List team tasks
 */
app.get('/api/teams/:teamId/tasks', (req, res) => {
    try {
        const tasks = todoApp.runtime.getTeamTasks(req.params.teamId);
        res.json({ success: true, data: tasks });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * POST /api/tasks - Create new task
 */
app.post('/api/tasks', (req, res) => {
    try {
        const { title, description, assignedTo, createdBy, teamId, priority, status, dueDate, tags, attachments, customFields, } = req.body;
        todoApp.dispatch({
            type: 'CREATE_TASK',
            payload: {
                title,
                description,
                assignedTo: assignedTo || [],
                createdBy,
                teamId,
                priority: priority || 'medium',
                status: status || 'open',
                dueDate,
                childIds: [],
                tags: tags || [],
                attachments: attachments || [],
                customFields: customFields || {},
            },
        });
        const state = todoApp.state();
        const tasks = Object.values(state.tasks);
        const newTask = tasks[tasks.length - 1];
        // Persist to database
        db.saveTask(newTask);
        res.status(201).json({ success: true, data: newTask });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/tasks/:taskId - Get task details
 */
app.get('/api/tasks/:taskId', (req, res) => {
    try {
        const task = todoApp.runtime.getTask(req.params.taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * PATCH /api/tasks/:taskId - Update task
 */
app.patch('/api/tasks/:taskId', (req, res) => {
    try {
        const updates = req.body;
        todoApp.dispatch({
            type: 'UPDATE_TASK',
            payload: {
                id: req.params.taskId,
                updates,
            },
        });
        const task = todoApp.runtime.getTask(req.params.taskId);
        if (task) {
            db.saveTask(task);
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * POST /api/tasks/:taskId/complete - Mark task complete
 */
app.post('/api/tasks/:taskId/complete', (req, res) => {
    try {
        todoApp.dispatch({
            type: 'COMPLETE_TASK',
            payload: { id: req.params.taskId },
        });
        const task = todoApp.runtime.getTask(req.params.taskId);
        if (task) {
            db.saveTask(task);
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * POST /api/tasks/:taskId/assign - Assign task to user
 */
app.post('/api/tasks/:taskId/assign', (req, res) => {
    try {
        const { userId } = req.body;
        todoApp.dispatch({
            type: 'ASSIGN_TASK',
            payload: {
                taskId: req.params.taskId,
                userId,
            },
        });
        const task = todoApp.runtime.getTask(req.params.taskId);
        if (task) {
            db.saveTask(task);
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/compliance/violations - Check compliance violations
 */
app.get('/api/compliance/violations', (req, res) => {
    try {
        const violations = todoApp.validateCompliance();
        res.json({ success: true, data: violations });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/compliance/report/:teamId - Get engagement report
 */
app.get('/api/compliance/report/:teamId', (req, res) => {
    try {
        const report = todoApp.getEngagementReport(req.params.teamId);
        res.json({ success: true, data: report });
    }
    catch (error) {
        res.status(400).json({ success: false, error: String(error) });
    }
});
/**
 * GET /api/compliance/escalations - Check for escalations
 */
app.get('/api/compliance/escalations', (req, res) => {
    try {
        const escalations = todoApp.checkEscalations();
        res.json({ success: true, data: escalations });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * Serve static files from UI build
 */
app.use(express.static(path.join(__dirname, '../ui/dist')));
/**
 * Serve index.html for SPA routing
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/dist/index.html'));
});
/**
 * Error handling
 */
app.use((err, req, res) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});
/**
 * Start server
 */
if (process.env.NODE_ENV !== 'test') {
    loadFromDatabase();
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════╗
║   OBIX TodoApp Server Started ✅       ║
║   🌐 http://localhost:${PORT}          ║
║   📊 REST API: /api/*                   ║
║   💾 SQLite Database: todoapp.db        ║
╚════════════════════════════════════════╝
    `);
    });
}
export default app;
//# sourceMappingURL=app.js.map