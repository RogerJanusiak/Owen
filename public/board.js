export function updateColumnCounts(root = document) {
  for (const column of root.querySelectorAll('.column')) {
    const count = column.querySelectorAll('.card').length;
    column.querySelector('.column-count').textContent = count;
  }
}
