import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateColumnCounts } from '../public/app.js';

// Builds a minimal mock of a .column element with n cards inside it.
function makeColumn(cardCount) {
  const countEl = { textContent: '' };
  const cards = Array(cardCount).fill(null);

  return {
    querySelector:    (sel) => sel === '.column-count' ? countEl : null,
    querySelectorAll: (sel) => sel === '.card' ? cards : [],
    countEl,
  };
}

// Wraps one or more column mocks in a root mock.
function makeRoot(columns) {
  return {
    querySelectorAll: (sel) => sel === '.column' ? columns : [],
  };
}

test('empty column shows count of 0', () => {
  const column = makeColumn(0);
  updateColumnCounts(makeRoot([column]));
  assert.equal(column.countEl.textContent, 0);
});

test('column with cards shows the correct count', () => {
  const column = makeColumn(3);
  updateColumnCounts(makeRoot([column]));
  assert.equal(column.countEl.textContent, 3);
});

test('each column is counted independently', () => {
  const backlog   = makeColumn(2);
  const ready     = makeColumn(0);
  const scheduled = makeColumn(5);

  updateColumnCounts(makeRoot([backlog, ready, scheduled]));

  assert.equal(backlog.countEl.textContent,   2);
  assert.equal(ready.countEl.textContent,     0);
  assert.equal(scheduled.countEl.textContent, 5);
});
