/**
 * OBIX TodoApp Dashboard
 * Pure OBIX SDK — no React, no JSX.
 * Uses @obinexusltd/obix-adapter for reactive state and vanilla DOM rendering.
 */

import { DOPAdapter } from '@obinexusltd/obix-adapter';
import { statRow, badge, card, button } from './renderer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Team {
  id: string;
  name: string;
  members: unknown[];
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: number;
}

interface AppState {
  teams: Team[];
  tasks: Task[];
  stats: { tasks: number; teams: number; events: number } | null;
  violations: unknown[];
  escalations: unknown[];
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// OBIX component logic (data-oriented)
// ---------------------------------------------------------------------------

const dashboardLogic = {
  name: 'TodoDashboard',
  state: {
    teams: [] as Team[],
    tasks: [] as Task[],
    stats: null as AppState['stats'],
    violations: [] as unknown[],
    escalations: [] as unknown[],
    loading: true,
    error: null as string | null,
  } satisfies AppState,
  actions: {
    setLoading: (_state: AppState, loading: boolean): Partial<AppState> => ({ loading }),
    setError: (_state: AppState, error: string | null): Partial<AppState> => ({ error }),
    setData: (
      _state: AppState,
      data: Partial<AppState>
    ): Partial<AppState> => data,
  },
  render: (state: AppState) => state,
};

// ---------------------------------------------------------------------------
// Build reactive component via OBIX adapter
// ---------------------------------------------------------------------------

const adapter = DOPAdapter.fromAny(dashboardLogic);
const reactive = adapter.toReactive();

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchData(): Promise<void> {
  reactive.dispatch('setLoading', true);

  try {
    const [healthRes, teamsRes, violationsRes, escalationsRes] = await Promise.all([
      fetch('/health'),
      fetch('/api/teams'),
      fetch('/api/compliance/violations'),
      fetch('/api/compliance/escalations'),
    ]);

    const update: Partial<AppState> = { loading: false, error: null };

    if (healthRes.ok) {
      const h = await healthRes.json();
      update.stats = h.database ?? null;
    }

    if (teamsRes.ok) {
      const t = await teamsRes.json();
      update.teams = t.data ?? [];
      // Use teams list as task source (teams carry task arrays in some endpoints)
      update.tasks = (t.data ?? []).flatMap((team: Team & { tasks?: Task[] }) => team.tasks ?? []).slice(0, 10);
    }

    if (violationsRes.ok) {
      const v = await violationsRes.json();
      update.violations = v.data ?? [];
    }

    if (escalationsRes.ok) {
      const e = await escalationsRes.json();
      update.escalations = e.data ?? [];
    }

    reactive.dispatch('setData', update);
  } catch {
    reactive.dispatch('setData', {
      loading: false,
      error: 'Failed to load data. Is the server running on port 3000?',
    });
  }
}

// ---------------------------------------------------------------------------
// DOM rendering
// ---------------------------------------------------------------------------

function renderHeader(app: HTMLElement): void {
  const header = document.createElement('header');
  header.style.cssText = 'background:#667eea;color:white;padding:20px;margin-bottom:20px;';

  const wrap = document.createElement('div');
  wrap.className = 'container';

  const h1 = document.createElement('h1');
  h1.textContent = 'OBIX TodoApp Dashboard';

  const p = document.createElement('p');
  p.textContent = 'Team Collaboration with #NoGhosting Protocol';

  wrap.appendChild(h1);
  wrap.appendChild(p);
  header.appendChild(wrap);
  app.appendChild(header);
}

function renderBanner(container: HTMLElement, state: AppState): void {
  container.querySelectorAll('.banner').forEach(b => b.remove());

  if (state.error) {
    const el = document.createElement('div');
    el.className = 'error banner';
    el.textContent = `${state.error}`;
    container.prepend(el);
  }

  if (state.violations.length > 0) {
    const el = document.createElement('div');
    el.className = 'warning banner';
    el.textContent = `${state.violations.length} compliance violation(s) detected. Review #NoGhosting protocol.`;
    container.prepend(el);
  }

  if (state.escalations.length > 0) {
    const el = document.createElement('div');
    el.className = 'warning banner';
    el.textContent = `${state.escalations.length} escalation(s) require attention.`;
    container.prepend(el);
  }
}

function renderOverviewCard(state: AppState): HTMLElement {
  const { el, body } = card('Overview');

  if (state.stats) {
    body.appendChild(statRow('Total Tasks', state.stats.tasks));
    body.appendChild(statRow('Teams', state.stats.teams));
    body.appendChild(statRow('Engagement Events', state.stats.events));
  } else {
    body.textContent = 'Loading...';
  }

  el.appendChild(button('Refresh', fetchData));
  return el;
}

function renderTeamsCard(state: AppState): HTMLElement {
  const { el, body } = card('Teams');

  if (state.teams.length > 0) {
    state.teams.slice(0, 3).forEach(team => {
      body.appendChild(statRow(team.name, team.members.length));
    });
    if (state.teams.length > 3) {
      const more = document.createElement('p');
      more.style.cssText = 'font-size:12px;color:#999;margin-top:10px;';
      more.textContent = `+${state.teams.length - 3} more`;
      body.appendChild(more);
    }
  } else {
    body.textContent = 'No teams yet';
  }

  el.appendChild(button('Create Team', () => { /* future: open modal */ }, true));
  return el;
}

function renderComplianceCard(state: AppState): HTMLElement {
  const { el, body } = card('Compliance');
  body.appendChild(statRow('Violations', state.violations.length, state.violations.length > 0));
  body.appendChild(statRow('Escalations', state.escalations.length, state.escalations.length > 0));
  el.appendChild(button('View Report', () => { /* future */ }, true));
  return el;
}

function renderTasksCard(state: AppState): HTMLElement | null {
  if (state.tasks.length === 0) return null;

  const { el, body } = card('Recent Tasks');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Title', 'Status', 'Priority', 'Due'].forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.tasks.forEach(task => {
    const tr = document.createElement('tr');

    const titleTd = document.createElement('td');
    titleTd.textContent = task.title;
    tr.appendChild(titleTd);

    const statusTd = document.createElement('td');
    statusTd.appendChild(
      badge(task.status,
        task.status === 'completed' ? 'success' :
        task.status === 'blocked' ? 'danger' : 'warning')
    );
    tr.appendChild(statusTd);

    const priorityTd = document.createElement('td');
    priorityTd.appendChild(
      badge(task.priority,
        task.priority === 'critical' || task.priority === 'high' ? 'danger' : 'warning')
    );
    tr.appendChild(priorityTd);

    const dueTd = document.createElement('td');
    dueTd.textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A';
    tr.appendChild(dueTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);

  return el;
}

function renderFooter(): HTMLElement {
  const { el, body } = card('');
  el.style.cssText = 'margin-top:20px;text-align:center;color:#999;';

  const p1 = document.createElement('p');
  p1.style.fontSize = '12px';
  p1.textContent = 'OBIX TodoApp v0.1.0 - #NoGhosting Protocol - SQLite Backend';

  const p2 = document.createElement('p');
  p2.style.cssText = 'font-size:12px;margin-top:10px;';
  p2.textContent = 'API: http://localhost:3000/api - CLI: obix-todoapp';

  body.appendChild(p1);
  body.appendChild(p2);
  return el;
}

// ---------------------------------------------------------------------------
// Full page render on state change
// ---------------------------------------------------------------------------

let mainContainer: HTMLElement | null = null;
let dashboardGrid: HTMLElement | null = null;

function renderDashboard(state: AppState): void {
  if (!mainContainer || !dashboardGrid) return;

  if (state.loading && !state.stats) {
    mainContainer.innerHTML = '<div class="loading"><h1>OBIX TodoApp</h1><p>Loading dashboard...</p></div>';
    return;
  }

  renderBanner(mainContainer, state);

  dashboardGrid.innerHTML = '';
  dashboardGrid.appendChild(renderOverviewCard(state));
  dashboardGrid.appendChild(renderTeamsCard(state));
  dashboardGrid.appendChild(renderComplianceCard(state));

  const tasksCard = renderTasksCard(state);
  if (tasksCard) {
    mainContainer.querySelector('.tasks-section')?.remove();
    const section = document.createElement('div');
    section.className = 'tasks-section';
    section.appendChild(tasksCard);
    // Insert before footer
    const footer = mainContainer.querySelector('.footer-section');
    if (footer) {
      mainContainer.insertBefore(section, footer);
    } else {
      mainContainer.appendChild(section);
    }
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) return;

  renderHeader(app);

  mainContainer = document.createElement('div');
  mainContainer.className = 'container';
  app.appendChild(mainContainer);

  dashboardGrid = document.createElement('div');
  dashboardGrid.className = 'dashboard';
  mainContainer.appendChild(dashboardGrid);

  const footerSection = document.createElement('div');
  footerSection.className = 'footer-section';
  footerSection.appendChild(renderFooter());
  mainContainer.appendChild(footerSection);

  // Subscribe to OBIX reactive state changes → re-render
  reactive.subscribe((state: AppState) => {
    renderDashboard(state);
  });

  // Initial fetch
  fetchData();

  // Auto-refresh every 5 seconds
  setInterval(fetchData, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
