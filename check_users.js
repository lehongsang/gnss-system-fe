const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5433,
  database: 'gnss_system'
});

async function main() {
  const res = await pool.query('SELECT email, role FROM "user"');
  console.log(res.rows);
  pool.end();
}
main();
