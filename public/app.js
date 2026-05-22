import { renderColumns, renderTasks, updateColumnCounts } from './board.js';

export { renderColumns, renderTasks, updateColumnCounts };

async function loadBoard() {
  try {
    const [columnsRes, tasksRes] = await Promise.all([
      fetch('/api/columns'),
      fetch('/api/tasks'),
    ]);

    if (!columnsRes.ok) throw new Error(`Columns: server returned ${columnsRes.status}`);
    if (!tasksRes.ok)   throw new Error(`Tasks: server returned ${tasksRes.status}`);

    const columns = await columnsRes.json();
    const tasks   = await tasksRes.json();

    console.log('Loaded columns:', columns);
    console.log('Loaded tasks:', tasks);

    renderColumns(columns);
    renderTasks(tasks);
  } catch (err) {
    console.error('Failed to load board:', err.message);
    updateColumnCounts();
  }
}

function setupAddTask() {
  const modal = document.getElementById('add-task-modal');
  const titleInput = document.getElementById('modal-task-title');
  let activeColumnId = null;

  function openModal(columnId) {
    activeColumnId = columnId;
    titleInput.value = '';
    modal.classList.remove('hidden');
    titleInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    activeColumnId = null;
  }

  async function submitTask() {
    const title = titleInput.value.trim();
    if (!title) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, column_id: activeColumnId }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      closeModal();
      const tasksRes = await fetch('/api/tasks');
      const tasks = await tasksRes.json();
      renderTasks(tasks);
    } catch (err) {
      console.error('Failed to create task:', err.message);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-task-btn')) {
      openModal(Number(e.target.dataset.columnId));
    } else if (e.target === modal || e.target.id === 'modal-cancel') {
      closeModal();
    } else if (e.target.id === 'modal-submit') {
      submitTask();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') submitTask();
  });
}

if (typeof window !== 'undefined') {
  loadBoard();
  setupAddTask();
}
