/**
 * SQLite Database Layer for OBIX TodoApp
 * Provides persistence for tasks, teams, and compliance data
 */
import Database from 'better-sqlite3';
import path from 'path';
export class TodoDatabase {
    constructor(dbPath = path.join(process.cwd(), 'todoapp.db')) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeSchema();
    }
    /**
     * Initialize database schema
     */
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        parentId TEXT,
        assignedTo TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        teamId TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        dueDate INTEGER,
        completedAt INTEGER,
        tags TEXT,
        attachments TEXT,
        customFields TEXT,
        FOREIGN KEY (teamId) REFERENCES teams(id),
        FOREIGN KEY (parentId) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        members TEXT NOT NULL,
        settings TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS engagement_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        userId TEXT NOT NULL,
        taskId TEXT NOT NULL,
        metadata TEXT,
        acknowledged INTEGER DEFAULT 0,
        acknowledgmentDeadline INTEGER,
        FOREIGN KEY (taskId) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS compliance_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        userId TEXT NOT NULL,
        teamId TEXT NOT NULL,
        details TEXT,
        severity TEXT NOT NULL,
        FOREIGN KEY (teamId) REFERENCES teams(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_teamId ON tasks(teamId);
      CREATE INDEX IF NOT EXISTS idx_tasks_createdBy ON tasks(createdBy);
      CREATE INDEX IF NOT EXISTS idx_engagement_taskId ON engagement_events(taskId);
      CREATE INDEX IF NOT EXISTS idx_engagement_userId ON engagement_events(userId);
      CREATE INDEX IF NOT EXISTS idx_compliance_teamId ON compliance_events(teamId);
    `);
    }
    /**
     * Save task to database
     */
    saveTask(task) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks
      (id, title, description, parentId, assignedTo, createdBy, teamId, status, priority,
       createdAt, updatedAt, dueDate, completedAt, tags, attachments, customFields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(task.id, task.title, task.description, task.parentId || null, JSON.stringify(task.assignedTo), task.createdBy, task.teamId, task.status, task.priority, task.createdAt, task.updatedAt, task.dueDate || null, task.completedAt || null, JSON.stringify(task.tags), JSON.stringify(task.attachments), JSON.stringify(task.customFields));
    }
    /**
     * Get task by ID
     */
    getTask(id) {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return {
            ...row,
            assignedTo: JSON.parse(row.assignedTo),
            tags: JSON.parse(row.tags),
            attachments: JSON.parse(row.attachments),
            customFields: JSON.parse(row.customFields),
            engagementEvents: this.getEngagementEventsForTask(id),
        };
    }
    /**
     * Get all tasks for a team
     */
    getTeamTasks(teamId) {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE teamId = ? ORDER BY createdAt DESC');
        const rows = stmt.all(teamId);
        return rows.map(row => ({
            ...row,
            assignedTo: JSON.parse(row.assignedTo),
            tags: JSON.parse(row.tags),
            attachments: JSON.parse(row.attachments),
            customFields: JSON.parse(row.customFields),
            engagementEvents: this.getEngagementEventsForTask(row.id),
        }));
    }
    /**
     * Save team to database
     */
    saveTeam(team) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO teams
      (id, name, description, createdAt, updatedAt, members, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(team.id, team.name, team.description, team.createdAt, team.updatedAt, JSON.stringify(team.members), JSON.stringify(team.settings));
    }
    /**
     * Get team by ID
     */
    getTeam(id) {
        const stmt = this.db.prepare('SELECT * FROM teams WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return {
            ...row,
            members: JSON.parse(row.members),
            settings: JSON.parse(row.settings),
            complianceTrail: this.getComplianceTrailForTeam(id),
        };
    }
    /**
     * Get all teams
     */
    getAllTeams() {
        const stmt = this.db.prepare('SELECT * FROM teams ORDER BY createdAt DESC');
        const rows = stmt.all();
        return rows.map(row => ({
            ...row,
            members: JSON.parse(row.members),
            settings: JSON.parse(row.settings),
            complianceTrail: this.getComplianceTrailForTeam(row.id),
        }));
    }
    /**
     * Save engagement event
     */
    saveEngagementEvent(event) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engagement_events
      (id, type, timestamp, userId, taskId, metadata, acknowledged, acknowledgmentDeadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(event.id, event.type, event.timestamp, event.userId, event.taskId, JSON.stringify(event.metadata), event.acknowledged ? 1 : 0, event.acknowledgmentDeadline || null);
    }
    /**
     * Get engagement events for a task
     */
    getEngagementEventsForTask(taskId) {
        const stmt = this.db.prepare('SELECT * FROM engagement_events WHERE taskId = ? ORDER BY timestamp ASC');
        const rows = stmt.all(taskId);
        return rows.map(row => ({
            ...row,
            acknowledged: row.acknowledged === 1,
            metadata: JSON.parse(row.metadata),
        }));
    }
    /**
     * Save compliance event
     */
    saveComplianceEvent(event) {
        const stmt = this.db.prepare(`
      INSERT INTO compliance_events
      (id, timestamp, type, userId, teamId, details, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(event.id, event.timestamp, event.type, event.userId, event.teamId, JSON.stringify(event.details), event.severity);
    }
    /**
     * Get compliance trail for a team
     */
    getComplianceTrailForTeam(teamId) {
        const stmt = this.db.prepare('SELECT * FROM compliance_events WHERE teamId = ? ORDER BY timestamp DESC');
        const rows = stmt.all(teamId);
        return rows.map(row => ({
            ...row,
            details: JSON.parse(row.details),
        }));
    }
    /**
     * Delete task
     */
    deleteTask(id) {
        const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
        stmt.run(id);
    }
    /**
     * Get database statistics
     */
    getStats() {
        const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
        const teamCount = this.db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
        const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM engagement_events').get().count;
        return { tasks: taskCount, teams: teamCount, events: eventCount };
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=database.js.map