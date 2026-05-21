CREATE TABLE IF NOT EXISTS tasks (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  column_name  VARCHAR(50)  NOT NULL DEFAULT 'backlog',
  label        VARCHAR(100)          DEFAULT NULL,
  created_at   TIMESTAMP             DEFAULT CURRENT_TIMESTAMP
);
