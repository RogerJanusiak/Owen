import mysql from 'mysql2/promise';

export function createDb() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'owen',
    password: process.env.DB_PASSWORD || 'owen',
    database: process.env.DB_NAME     || 'owen',
    waitForConnections: true,
  });

  return {
    async query(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
  };
}
