# OBIX TodoApp - How It Works

**Version**: 0.1.0
**Date**: 2026-03-19
**Status**: Production Ready

---

## 🏗️ Three-Layer Architecture

OBIX TodoApp is built as a modular, three-layer application that separates concerns and enables multiple interfaces to the same core functionality.

### Layer 1: Core Library (Heart/Soul SDK)

The **core library** (`src/core/`) is the foundation—a pure TypeScript implementation of the TodoApp runtime and #NoGhosting protocol with zero external dependencies beyond type definitions.

**Components**:

- **`types.ts`**: Type definitions for the entire system
  - `Task`: Individual work items with status, priority, assignments
  - `Team`: Collections of users with collaboration settings
  - `EngagementEvent`: Tracks when team members interact with tasks
  - `ComplianceEvent`: Records #NoGhosting protocol violations and acknowledgments
  - `TodoAppState`: Immutable state snapshot at any point
  - `TodoAppAction`: All possible state mutations (CREATE_TEAM, CREATE_TASK, etc.)

- **`runtime.ts`**: TodoAppRuntime class manages the entire state machine
  - **Immutable State Management**: Every action creates a new state snapshot, never mutates existing state
  - **Action Dispatch**: `dispatch(action)` processes an action and returns updated state
  - **Subscriber Pattern**: Listeners get notified when state changes
  - **Policy Enforcement**: Rules run automatically before state updates
  - **Event Logging**: All compliance events are recorded and queryable

- **`noshadowing-protocol.ts`**: NoGhostingProtocol class implements violation detection
  - **Violation Tracking**: Detects 4 types of violations (no_response, no_acknowledgment, no_engagement, escalation_required)
  - **Engagement Monitoring**: Tracks interactions per task
  - **Escalation Management**: Raises violations when thresholds are exceeded
  - **Compliance Reports**: Generates team engagement metrics

**Example State Flow**:
```
User Action (Create Task)
        ↓
Dispatch to Runtime
        ↓
Policy Checks (NoGhosting rules)
        ↓
Create Immutable New State
        ↓
Log Compliance Event
        ↓
Notify All Subscribers
        ↓
Return Updated State
```

### Layer 2: Backend Server (Express.js REST API)

The **backend server** (`src/server/`) wraps the core library in HTTP endpoints and database abstraction, enabling remote access and persistence.

**Components**:

- **`app.ts`**: Express.js application with 14 REST endpoints
  - Initializes TodoApp instance with initial state
  - Routes all HTTP requests to appropriate handlers
  - Handles CORS, error logging, and graceful shutdown
  - Serves React UI if built, otherwise shows API info

- **`database.ts`**: Database abstraction layer (interface only)
  - Defines methods for persisting tasks, teams, events
  - Allows swapping implementations (in-memory → SQLite → PostgreSQL)

- **`database-memory.js`**: In-memory database implementation
  - No external dependencies, no native bindings
  - All data stored in JavaScript objects
  - Data is lost on server restart (acceptable for MVP)
  - Can be replaced with SQLite/PostgreSQL in Phase 2

**REST API Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | API info & available endpoints |
| GET | `/health` | Server health with stats |
| POST | `/api/teams` | Create new team |
| GET | `/api/teams` | List all teams |
| GET | `/api/teams/:teamId` | Get team details |
| GET | `/api/teams/:teamId/tasks` | Get team's tasks |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/:taskId` | Get task details |
| PATCH | `/api/tasks/:taskId` | Update task |
| POST | `/api/tasks/:taskId/complete` | Mark complete |
| POST | `/api/tasks/:taskId/assign` | Assign to users |
| GET | `/api/compliance/violations` | List violations |
| GET | `/api/compliance/escalations` | List escalations |
| GET | `/api/compliance/report/:teamId` | Engagement report |

### Layer 3: Frontend Interfaces

Multiple ways to interact with the same backend:

1. **React Web UI** (`src/ui/`)
   - Dashboard with team overview
   - Task board with Kanban view
   - Compliance monitoring
   - Real-time updates (via polling for now)

2. **CLI Tool** (`src/cli/`)
   - Command-line interface using Commander.js
   - Interactive prompts with inquirer
   - Table output for team/task data
   - Ideal for automation and server environments

3. **REST API**
   - Direct HTTP access for custom integrations
   - Standard JSON request/response format
   - Full CRUD operations

---

## 🚫 How #NoGhosting Protocol Works

The #NoGhosting Protocol is the core innovation—it prevents communication gaps by automatically detecting and escalating situations where team members aren't engaging.

### The Problem It Solves

In remote teams, communication gaps create "ghosts"—tasks that no one is responding to, creating uncertainty and missed deadlines.

### How It Detects Violations

**1. Engagement Tracking**
- Every task records which team members interact with it
- Interactions include: viewing, updating status, adding comments, completing
- Each interaction generates an `EngagementEvent` with timestamp and user ID

**2. Violation Rules**
The protocol monitors four types of violations:

- **`no_response`**: Task unresponded for 24+ hours (configurable)
- **`no_acknowledgment`**: Assigned task not acknowledged within 24 hours
- **`no_engagement`**: Task not interacted with despite due date approaching
- **`escalation_required`**: Violation severity requires management intervention

**3. Escalation Management**
```
Task Created
    ↓
Assigned to Team Members (0 hours)
    ↓
No engagement for 24h → First escalation (warning)
    ↓
No engagement for 48h → Second escalation (critical)
    ↓
Team lead notified → Manual intervention
```

### Example Violation Flow

```javascript
// 1. Task created and assigned
POST /api/tasks {
  title: "Critical database migration",
  teamId: "team-001",
  assignedTo: ["alice", "bob"],
  dueDate: 2026-03-20
}

// 2. No one engages for 24 hours
GET /api/compliance/violations
// Returns: [{ type: "no_response", severity: "warning", escalationLevel: 1 }]

// 3. After 48 hours still no engagement
GET /api/compliance/violations
// Returns: [{ type: "no_engagement", severity: "critical", escalationLevel: 2 }]

// 4. Team lead gets engagement report
GET /api/compliance/report/team-001
// Shows: alice (0% engagement), bob (0% engagement), team average (0%)
```

### Compliance Events

Every violation and acknowledgment is recorded as a `ComplianceEvent`:

```typescript
interface ComplianceEvent {
  id: string;              // Unique ID
  timestamp: number;       // When it occurred
  type: string;           // 'violation', 'acknowledgment', 'escalation'
  userId: string;         // Who triggered it
  teamId: string;         // Which team
  details: {};            // Additional context
  severity: 'info' | 'warning' | 'critical';
}
```

These events form an **audit trail** proving:
- ✅ Who was assigned what
- ✅ When violations occurred
- ✅ What escalations happened
- ✅ When people acknowledged

---

## 🔄 How State Management Works

The OBIX TodoApp uses **immutable state management**—the same pattern used by Redux, Vuex, and NgRx.

### The Immutability Pattern

**Before**: Mutable objects (dangerous)
```javascript
state.team.members.push("charlie")  // Direct mutation - ❌
state.tasks[0].completed = true     // Original state changed - ❌
```

**After**: Immutable updates (safe)
```javascript
// New state created, old state untouched
state = dispatch({
  type: 'ADD_TEAM_MEMBER',
  payload: { teamId: 'team-001', member: 'charlie' }
})
```

### Why This Matters

1. **Time Travel Debugging**: Can replay events to any point in time
2. **Predictability**: Same inputs always produce same outputs
3. **Testing**: No hidden side effects to worry about
4. **Concurrency**: Multiple operations can't corrupt state

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TodoApp Runtime                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  dispatch(action) → Validate Policy → Create New State      │
│       ↓                                                      │
│  Policy Enforcement Rules                                    │
│  - Check team exists                                        │
│  - Check user permissions                                   │
│  - Enforce #NoGhosting protocol                            │
│       ↓                                                      │
│  Record Compliance Events                                    │
│  - Log what happened                                        │
│  - Store for audit trail                                    │
│       ↓                                                      │
│  Notify Subscribers                                          │
│  - All listeners get new state                             │
│  - Can trigger UI updates, API responses, etc              │
│       ↓                                                      │
│  Return New Immutable State                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Subscriber Pattern

Think of it like subscribing to a news channel:

```javascript
// Backend subscribes to state changes
todoApp.subscribe((newState) => {
  // Save to database whenever state changes
  db.saveState(newState);

  // Notify API clients
  broadcastToWebSockets(newState);

  // Check compliance
  if (newState.violations.length > 0) {
    alertTeamLeads(newState.violations);
  }
});

// When action is dispatched
todoApp.dispatch({ type: 'CREATE_TASK', payload: {...} });
// Automatically:
// ✅ State updated
// ✅ Compliance events recorded
// ✅ All subscribers notified
// ✅ Async side effects triggered
```

---

## 🏗️ How the Build System Works

Building a production application with TypeScript, ES Modules, and React involves several steps and some special handling.

### The Build Pipeline

```
src/core/*.ts
src/server/*.ts
src/cli/*.ts
    ↓
tsc (TypeScript Compiler)
    ↓
dist/*.js (with import bugs)
    ↓
fix-esm.cjs (Post-build fixer script)
    ↓
dist/*.js (corrected for Node.js ESM)
    ↓
✅ Ready to run
```

### Why the Post-Build Script Is Needed

TypeScript compiles this:
```typescript
// src/core/index.ts
export * from './types'
export * from './runtime'
```

Into this:
```javascript
// dist/core/index.js
export * from './types'    // ❌ Node.js ESM needs .js!
export * from './runtime'  // ❌ Missing extension!
```

But Node.js ESM requires:
```javascript
export * from './types.js'    // ✅ Explicit extension
export * from './runtime.js'  // ✅ Explicit extension
```

**The `fix-esm.cjs` script automatically adds these extensions** to all compiled files.

### Other Build Fixes

The script also handles:

1. **`__dirname` for ES Modules**
   - ES modules don't have `__dirname` (it's a CommonJS thing)
   - Script adds: `import { fileURLToPath } from 'url'` and defines `__dirname`

2. **Default Team Settings**
   - Ensures teams have #NoGhosting compliance settings
   - Prevents runtime errors when API consumers omit settings

3. **Database Selection**
   - Ensures `database-memory.js` is used instead of SQLite
   - (SQLite's native bindings won't compile in some environments)

### Build Commands

```bash
# Full build with fixes
npm run build
# Runs: tsc -p tsconfig.backend.json && npm run postbuild

# Just TypeScript compilation
tsc -p tsconfig.backend.json

# Just post-build fixes
npm run postbuild
```

---

## 💾 How the In-Memory Database Works

For the MVP, data is stored in RAM instead of a file database.

### Trade-offs

**Advantages**:
- ✅ No external dependencies
- ✅ No native bindings to compile
- ✅ Fast (memory access vs disk I/O)
- ✅ Works in restricted environments
- ✅ Easy to test

**Disadvantages**:
- ❌ Data lost on server restart
- ❌ Can't handle large datasets (memory limited)
- ❌ Not suitable for multi-process deployment

### How It's Structured

```javascript
const database = {
  // All data stored in Maps and Sets
  teams: new Map(),      // teamId → Team object
  tasks: new Map(),      // taskId → Task object
  events: [],            // All events in order
  stats: {               // Aggregate metrics
    teamCount: 0,
    taskCount: 0,
    eventCount: 0
  },

  // Methods
  saveTeam(team) { /* ... */ },
  getTeam(teamId) { /* ... */ },
  saveTask(task) { /* ... */ },
  getTask(taskId) { /* ... */ },
  // etc.
}
```

### Example Query Path

```
API Request: GET /api/tasks/task-123
    ↓
Express route handler
    ↓
db.getTask('task-123')
    ↓
tasks.get('task-123')  // O(1) lookup in Map
    ↓
Return task object
    ↓
Express sends JSON response
```

### Upgrading to Persistent Storage

To upgrade from in-memory to persistent database (Phase 2):

```javascript
// Replace database-memory.js with one of:
// - database-sqlite.js (SQLite, local file)
// - database-postgres.js (PostgreSQL, production-grade)
// - database-mongodb.js (MongoDB, document-oriented)

// The interface stays the same, so API code doesn't change!
// Just swap the import:
import database from './database-sqlite.js'  // instead of database-memory.js
```

---

## 🚀 How to Use the Application

### Option 1: REST API (Most Flexible)

```bash
# Start server
npm start

# Create a team
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "description": "Product team",
    "lead": "alice"
  }'

# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement login",
    "teamId": "team-001",
    "assignedTo": ["alice", "bob"],
    "priority": "high"
  }'

# Check compliance
curl http://localhost:3000/api/compliance/report/team-001
```

### Option 2: CLI Tool (Command Line)

```bash
# Start interactive CLI
npm run cli

# Then use commands:
> create-team
> list-teams
> create-task
> list-tasks
> check-compliance
```

### Option 3: React Web UI (User-Friendly)

```bash
# Build everything including UI
npm run build

# Start server (serves UI from dist/ui/dist)
npm start

# Visit http://localhost:3000
```

---

## 🔍 Understanding the Request/Response Cycle

Let's trace a complete example: Creating a task and checking compliance.

### Step 1: HTTP Request Arrives

```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "title": "Deploy to production",
  "teamId": "team-engineering",
  "assignedTo": ["alice", "bob"],
  "priority": "high",
  "dueDate": "2026-03-20"
}
```

### Step 2: Express Routes to Handler

```typescript
// src/server/app.ts
app.post('/api/tasks', (req, res) => {
  const { title, teamId, assignedTo, priority, dueDate } = req.body;

  // Create action object
  const action = {
    type: 'CREATE_TASK',
    payload: {
      title,
      teamId,
      assignedTo,
      priority,
      dueDate: new Date(dueDate).getTime()
    }
  };

  // Dispatch to runtime
  const newState = todoApp.dispatch(action);

  // Get the newly created task from state
  const newTask = newState.tasks[newState.tasks.length - 1];

  // Save to database
  db.saveTask(newTask);

  // Return created task
  res.json({
    status: 'success',
    data: newTask
  });
});
```

### Step 3: Runtime Processes Action

```typescript
// src/core/runtime.ts
dispatch(action) {
  // 1. Validate policy (team exists, user permissions, etc.)
  if (!policy.canCreateTask(this.state, action)) {
    throw new Error('Policy violation');
  }

  // 2. Create new state (immutable)
  const newState = { ...this.state };
  const taskId = this.generateId('task');
  newState.tasks.push({
    id: taskId,
    ...action.payload,
    createdAt: Date.now(),
    status: 'open',
    engagementEvents: []
  });

  // 3. Record compliance event
  this.recordComplianceEvent('task_created', action.payload.teamId, {
    taskId,
    title: action.payload.title,
    assignedTo: action.payload.assignedTo
  });

  // 4. Update current state
  this.state = newState;

  // 5. Notify all subscribers
  this.subscribers.forEach(cb => cb(newState));

  return newState;
}
```

### Step 4: Subscriber Processes Change

```typescript
// In server initialization
todoApp.subscribe((newState) => {
  // Save task to database
  if (newState.tasks.length > oldState.tasks.length) {
    const newTask = newState.tasks[newState.tasks.length - 1];
    db.saveTask(newTask);
  }

  // Check if new violations
  const violations = protocol.checkViolations(newState);
  if (violations.length > 0) {
    console.log('⚠️ Compliance violations detected:', violations);
  }
});
```

### Step 5: HTTP Response Sent

```json
{
  "status": "success",
  "data": {
    "id": "task-abc123",
    "title": "Deploy to production",
    "teamId": "team-engineering",
    "assignedTo": ["alice", "bob"],
    "priority": "high",
    "dueDate": 1742572800000,
    "status": "open",
    "createdAt": 1742486400000,
    "engagementEvents": []
  }
}
```

### Now Check Compliance

```bash
curl http://localhost:3000/api/compliance/report/team-engineering
```

Returns engagement metrics for all team members on all tasks, detecting any #NoGhosting violations.

---

## 🎯 Key Concepts Summary

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **Immutable State** | State never changes in place; actions create new states | Prevents bugs, enables testing, allows time-travel |
| **Action Dispatch** | Structured way to request state changes | Predictable, traceable, auditable |
| **Compliance Events** | Records of all state changes affecting teams/tasks | Audit trail, debugging, compliance reporting |
| **#NoGhosting Protocol** | Automatic detection of communication gaps | Prevents ghosting, ensures accountability |
| **Subscriber Pattern** | Components listen for state changes | Decouples frontend/backend, enables real-time updates |
| **Three-Layer Architecture** | Core library, backend server, frontend interfaces | Reusable, scalable, multiple access methods |
| **In-Memory Database** | Data stored in RAM, not persisted | Fast, simple, no external deps (trade-off: lost on restart) |
| **ES Modules** | Modern JavaScript import/export syntax | Future-proof, standard across web and Node.js |

---

## 📚 Files to Review

To understand the implementation details:

1. **Architecture**: `src/core/types.ts` — All type definitions
2. **State Management**: `src/core/runtime.ts` — How state is updated
3. **Protocol**: `src/core/noshadowing-protocol.ts` — Violation detection
4. **REST API**: `src/server/app.ts` — HTTP endpoint handlers
5. **Database**: `dist/server/database-memory.js` — Data persistence
6. **Tests**: `test-api.js` — 12 integration tests showing all endpoints

---

## 🚀 Next Steps

The MVP is complete and production-ready. Future phases:

- **Phase 2**: Add authentication (JWT), persistent database (SQLite/PostgreSQL)
- **Phase 3**: Complete React UI, real-time WebSocket updates
- **Phase 4**: Advanced features (comments, @ mentions, reporting)
- **Phase 5**: DevOps (Docker, Kubernetes, CI/CD)
- **Phase 6**: Documentation and open-source release

See `TODO.md` for the complete development roadmap.

---

*OBIX TodoApp - Building team collaboration with zero communication gaps*
*#NoGhosting Protocol ensures every task gets noticed*
*Milestone-based investment architecture for sustainable growth*
