/**
 * OBIX DOM Renderer
 * Minimal renderer that maps OBIX component state to live DOM nodes.
 * No virtual DOM - direct element manipulation via subscriptions.
 */

export interface ObixNode {
  tag: string;
  attrs?: Record<string, string>;
  text?: string;
  children?: ObixNode[];
  className?: string;
}

/** Create a DOM element from an ObixNode descriptor */
export function createElement(node: ObixNode): HTMLElement {
  const el = document.createElement(node.tag);

  if (node.className) {
    el.className = node.className;
  }

  if (node.attrs) {
    for (const [k, v] of Object.entries(node.attrs)) {
      el.setAttribute(k, v);
    }
  }

  if (node.text !== undefined) {
    el.textContent = node.text;
  }

  if (node.children) {
    for (const child of node.children) {
      el.appendChild(createElement(child));
    }
  }

  return el;
}

/**
 * Mount a render function into a container.
 * Re-renders whenever `render()` is called.
 * Returns a cleanup no-op (subscriptions are handled externally).
 */
export function mount(
  container: HTMLElement,
  render: () => ObixNode
): () => void {
  function update(): void {
    const node = render();
    const el = createElement(node);
    container.innerHTML = '';
    container.appendChild(el);
  }

  update();
  return update;
}

/** Helper: create a stat row element */
export function statRow(label: string, value: string | number, danger = false): HTMLElement {
  const row = document.createElement('div');
  row.className = 'stat';

  const labelEl = document.createElement('span');
  labelEl.className = 'stat-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'stat-value';
  valueEl.textContent = String(value);
  if (danger) valueEl.style.color = '#e74c3c';

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

/** Helper: create a badge element */
export function badge(text: string, type: 'success' | 'warning' | 'danger'): HTMLElement {
  const el = document.createElement('span');
  el.className = `badge badge-${type}`;
  el.textContent = text;
  return el;
}

/** Helper: create a card container */
export function card(title: string): { el: HTMLElement; body: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'card';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  el.appendChild(h2);

  const body = document.createElement('div');
  el.appendChild(body);

  return { el, body };
}

/** Helper: create a button */
export function button(
  label: string,
  onClick: () => void,
  secondary = false
): HTMLElement {
  const el = document.createElement('button');
  el.className = secondary ? 'button button-secondary' : 'button';
  el.textContent = label;
  el.setAttribute('type', 'button');
  el.addEventListener('click', onClick);
  return el;
}
