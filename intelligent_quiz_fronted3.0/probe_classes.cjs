const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 解析 env：依次尝试 __dirname/../backend3.0/.env → process.cwd()/.env
let envPath = path.resolve(__dirname, '../intelligent_quiz_backend3.0/.env');
if (!fs.existsSync(envPath)) envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      const q = v.charCodeAt(0);
      if ((q === 34 || q === 39) && v.charCodeAt(v.length - 1) === q) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
}

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'program1',
    connectionLimit: 2,
  });
  const [users] = await pool.query(
    'SELECT id, username, role FROM users WHERE role="student" ORDER BY id LIMIT 5');
  for (const u of users) {
    const [cls] = await pool.query(
      `SELECT c.id class_id, c.name class_name, sc.type relation_type
       FROM student_classes sc INNER JOIN classes c ON c.id = sc.class_id
       WHERE sc.student_id = ? ORDER BY sc.type, sc.created_at`, [u.id]);
    console.log(`${u.username} (id=${u.id}): ${cls.length} classes`);
    console.log(JSON.stringify(cls, null, 2));
  }
  process.exit(0);
})();
