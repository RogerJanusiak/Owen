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

if (typeof window !== 'undefined') {
  loadBoard();
}
