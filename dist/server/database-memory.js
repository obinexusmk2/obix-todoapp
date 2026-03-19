/**
 * In-Memory Database Implementation for OBIX TodoApp
 * Provides the same interface as TodoDatabase but uses in-memory storage
 * Useful for testing and when native SQLite bindings are unavailable
 */

export class TodoDatabase {
    constructor(dbPath = './todoapp.db') {
        this.dbPath = dbPath;
        this.tasks = new Map();
        this.teams = new Map();
        this.engagementEvents = [];
        this.complianceEvents = [];
        this.initializeSchema();
    }

    /**
     * Initialize schema (no-op for in-memory)
     */
    initializeSchema() {
        // In-memory initialization
        console.log('In-memory database initialized');
    }

    // ===== TASK OPERATIONS =====
    saveTask(task) {
        this.tasks.set(task.id, JSON.parse(JSON.stringify(task)));
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    getTeamTasks(teamId) {
        return Array.from(this.tasks.values())
            .filter(task => task.teamId === teamId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    // ===== TEAM OPERATIONS =====
    saveTeam(team) {
        this.teams.set(team.id, JSON.parse(JSON.stringify(team)));
        return team;
    }

    getTeam(teamId) {
        return this.teams.get(teamId) || null;
    }

    getAllTeams() {
        return Array.from(this.teams.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // ===== EVENT OPERATIONS =====
    saveEngagementEvent(event) {
        this.engagementEvents.push(JSON.parse(JSON.stringify(event)));
        return event;
    }

    getEngagementEvents(teamId) {
        return this.engagementEvents
            .filter(e => e.teamId === teamId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    saveComplianceEvent(event) {
        this.complianceEvents.push(JSON.parse(JSON.stringify(event)));
        return event;
    }

    getComplianceEvents(teamId) {
        return this.complianceEvents
            .filter(e => e.teamId === teamId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // ===== STATISTICS =====
    getStats() {
        return {
            tasks: this.tasks.size,
            teams: this.teams.size,
            engagementEvents: this.engagementEvents.length,
            complianceEvents: this.complianceEvents.length,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }

    // ===== CLEANUP =====
    close() {
        // No-op for in-memory
    }
}
