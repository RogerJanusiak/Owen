-- Columns are loaded and ordered by display_order (0 = leftmost).
CREATE TABLE IF NOT EXISTS board_columns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  display_order INT         NOT NULL DEFAULT 0
);

INSERT INTO board_columns (name, display_order) VALUES
  ('Backlog',   0),
  ('Ready',     1),
  ('Scheduled', 2),
  ('Waiting',   3),
  ('Done',      4);

-- tasks.column_id references board_columns.id
CREATE TABLE IF NOT EXISTS tasks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  column_id  INT          NOT NULL DEFAULT 1,
  created_at TIMESTAMP             DEFAULT CURRENT_TIMESTAMP
);

-- ── Migration for existing databases ─────────────────────────────────────────
-- If you already have data, run these manually in TablePlus:
--
--   CREATE TABLE IF NOT EXISTS board_columns ( ... );   -- as above
--   INSERT INTO board_columns (name, display_order) VALUES (...);
--
--   -- Then remap old integer positions to the new column ids:
--   UPDATE tasks SET column_id = (SELECT id FROM board_columns WHERE display_order = column_id);
