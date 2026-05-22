export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderColumns(columns, root = document) {
  const board = root.querySelector('.board');
  board.innerHTML = columns.map(column => `
    <section class="column" data-column-id="${column.id}">
      <div class="column-header">
        <span class="column-title">${escapeHtml(column.name)}</span>
        <span class="column-count">0</span>
      </div>
      <div class="column-body"></div>
      <div class="column-footer">
        <button class="add-task-btn" data-column-id="${column.id}">+ Add task</button>
      </div>
    </section>
  `).join('');
}

export function groupTasksByColumn(tasks) {
  const groups = {};
  for (const task of tasks) {
    const key = task.column_id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return groups;
}

function createCardHtml(task) {
  const label = task.label
    ? `<div class="card-meta"><span class="label">${escapeHtml(task.label)}</span></div>`
    : '';
  return `<div class="card" data-id="${task.id}"><p class="card-title">${escapeHtml(task.title)}</p>${label}</div>`;
}

export function renderTasks(tasks, root = document) {
  const groups = groupTasksByColumn(tasks);
  for (const column of root.querySelectorAll('.column')) {
    const columnId = Number(column.dataset.columnId);
    const body = column.querySelector('.column-body');
    const columnTasks = groups[columnId] || [];
    body.innerHTML = columnTasks.map(createCardHtml).join('');
  }
  updateColumnCounts(root);
}

export function updateColumnCounts(root = document) {
  for (const column of root.querySelectorAll('.column')) {
    const count = column.querySelectorAll('.card').length;
    column.querySelector('.column-count').textContent = count;
  }
}
