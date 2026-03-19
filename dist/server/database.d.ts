/**
 * SQLite Database Layer for OBIX TodoApp
 * Provides persistence for tasks, teams, and compliance data
 */
import { Task, Team, EngagementEvent, ComplianceEvent } from '../core';
export declare class TodoDatabase {
    private db;
    constructor(dbPath?: string);
    /**
     * Initialize database schema
     */
    private initializeSchema;
    /**
     * Save task to database
     */
    saveTask(task: Task): void;
    /**
     * Get task by ID
     */
    getTask(id: string): Task | null;
    /**
     * Get all tasks for a team
     */
    getTeamTasks(teamId: string): Task[];
    /**
     * Save team to database
     */
    saveTeam(team: Team): void;
    /**
     * Get team by ID
     */
    getTeam(id: string): Team | null;
    /**
     * Get all teams
     */
    getAllTeams(): Team[];
    /**
     * Save engagement event
     */
    saveEngagementEvent(event: EngagementEvent): void;
    /**
     * Get engagement events for a task
     */
    private getEngagementEventsForTask;
    /**
     * Save compliance event
     */
    saveComplianceEvent(event: ComplianceEvent): void;
    /**
     * Get compliance trail for a team
     */
    private getComplianceTrailForTeam;
    /**
     * Delete task
     */
    deleteTask(id: string): void;
    /**
     * Get database statistics
     */
    getStats(): {
        tasks: number;
        teams: number;
        events: number;
    };
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=database.d.ts.map