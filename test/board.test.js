import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, groupTasksByColumn, renderColumns, renderTasks } from '../public/board.js';

// ── escapeHtml ────────────────────────────────────────────────────────────────

test('escapeHtml escapes < and >', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapeHtml escapes &', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml escapes quotes', () => {
  assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;');
});

test('escapeHtml handles null and undefined safely', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

// ── groupTasksByColumn ────────────────────────────────────────────────────────

test('groupTasksByColumn groups tasks by column_id', () => {
  const tasks = [
    { id: 1, title: 'A', column_id: 1 },
    { id: 2, title: 'B', column_id: 2 },
    { id: 3, title: 'C', column_id: 1 },
  ];
  const groups = groupTasksByColumn(tasks);
  assert.equal(groups[1].length, 2);
  assert.equal(groups[2].length, 1);
});

test('groupTasksByColumn returns an empty object for no tasks', () => {
  assert.deepEqual(groupTasksByColumn([]), {});
});

// ── renderColumns ─────────────────────────────────────────────────────────────

function makeBoardRoot() {
  let boardHtml = '';
  const board = {
    set innerHTML(html) { boardHtml = html; },
    get innerHTML()     { return boardHtml; },
  };
  return {
    querySelector:    (sel) => sel === '.board' ? board : null,
    querySelectorAll: ()    => [],
    get boardHtml() { return boardHtml; },
  };
}

test('renderColumns creates a section for each column', () => {
  const root = makeBoardRoot();
  renderColumns([
    { id: 1, name: 'Backlog', display_order: 0 },
    { id: 2, name: 'Done',    display_order: 1 },
  ], root);
  assert.match(root.boardHtml, /Backlog/);
  assert.match(root.boardHtml, /Done/);
});

test('renderColumns sets the data-column-id attribute', () => {
  const root = makeBoardRoot();
  renderColumns([{ id: 3, name: 'Waiting', display_order: 0 }], root);
  assert.match(root.boardHtml, /data-column-id="3"/);
});

test('renderColumns escapes HTML in column names', () => {
  const root = makeBoardRoot();
  renderColumns([{ id: 1, name: '<script>', display_order: 0 }], root);
  assert.doesNotMatch(root.boardHtml, /<script>/);
  assert.match(root.boardHtml, /&lt;script&gt;/);
});

// ── renderTasks ───────────────────────────────────────────────────────────────

function makeColumn(columnId) {
  let bodyHtml = '';
  const countEl = { textContent: '' };
  const body = {
    set innerHTML(html) { bodyHtml = html; },
    get innerHTML()     { return bodyHtml; },
  };
  return {
    dataset: { columnId },
    querySelector:    (sel) => sel === '.column-body'  ? body
                             : sel === '.column-count' ? countEl
                             : null,
    querySelectorAll: (sel) => sel === '.card'
      ? Array((bodyHtml.match(/class="card"/g) || []).length).fill(null)
      : [],
    get bodyHtml() { return bodyHtml; },
    countEl,
  };
}

function makeRoot(columnIds) {
  const columns = columnIds.map(makeColumn);
  return { querySelectorAll: (sel) => sel === '.column' ? columns : [], columns };
}

test('renderTasks places each task in the correct column', () => {
  const root = makeRoot([1, 2, 3]);
  renderTasks([
    { id: 1, title: 'Task A', column_id: 1, label: null },
    { id: 2, title: 'Task B', column_id: 2, label: null },
  ], root);

  assert.match(root.columns[0].bodyHtml, /Task A/);
  assert.match(root.columns[1].bodyHtml, /Task B/);
  assert.equal(root.columns[2].bodyHtml, '');
});

test('renderTasks updates column counts after rendering', () => {
  const root = makeRoot([1, 2]);
  renderTasks([
    { id: 1, title: 'A', column_id: 1, label: null },
    { id: 2, title: 'B', column_id: 1, label: null },
  ], root);

  assert.equal(root.columns[0].countEl.textContent, 2);
  assert.equal(root.columns[1].countEl.textContent, 0);
});

test('renderTasks clears existing cards before re-rendering', () => {
  const root = makeRoot([1]);
  renderTasks([{ id: 1, title: 'Old', column_id: 1, label: null }], root);
  renderTasks([{ id: 2, title: 'New', column_id: 1, label: null }], root);

  assert.doesNotMatch(root.columns[0].bodyHtml, /Old/);
  assert.match(root.columns[0].bodyHtml, /New/);
});

test('renderTasks escapes HTML in task titles', () => {
  const root = makeRoot([1]);
  renderTasks([{ id: 1, title: '<script>alert(1)</script>', column_id: 1, label: null }], root);

  assert.doesNotMatch(root.columns[0].bodyHtml, /<script>/);
  assert.match(root.columns[0].bodyHtml, /&lt;script&gt;/);
});

test('renderTasks renders the label when present', () => {
  const root = makeRoot([1]);
  renderTasks([{ id: 1, title: 'Task', column_id: 1, label: 'bug' }], root);

  assert.match(root.columns[0].bodyHtml, /bug/);
});
