// 给没有任何班级记录的学生，随机分配 1~2 个班级（1 个必修 + 0/1 个选修）
// 运行: cd d:\intelligent_quiz_fronted3.0 ; node seed_student_classes.mjs
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let envPath = path.resolve('./.env');
if (!fs.existsSync(envPath)) {
  const alt = path.resolve('../intelligent_quiz_backend3.0/.env');
  if (fs.existsSync(alt)) envPath = alt;
}
if (fs.existsSync(envPath)) {
  const src = fs.readFileSync(envPath, 'utf8');
  src.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'program1',
  waitForConnections: true,
  connectionLimit: 5,
});

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  try {
    const [classes] = await pool.query('SELECT id, name, type, grade FROM classes ORDER BY id ASC');
    if (!classes.length) {
      console.log('❌ classes 表为空，先创建几个班级');
      const defaults = [
        ['人工智能1班', '2023级', 'compulsory', '系统自动创建'],
        ['数据结构1班', '2023级', 'compulsory', '系统自动创建'],
        ['软件工程1班', '2023级', 'elective', '系统自动创建'],
        ['思想政治1班', '2026', 'elective', '系统自动创建'],
      ];
      for (const d of defaults) {
        try {
          await pool.query('INSERT IGNORE INTO classes (name, grade, type, remark) VALUES (?, ?, ?, ?)', d);
        } catch (e) { /* ignore */ }
      }
      const [c2] = await pool.query('SELECT id, name, type, grade FROM classes ORDER BY id ASC');
      classes.push(...c2);
    }
    console.log('📚 可用班级:', classes.map(c => `${c.id}. ${c.name}[${c.type}]`).join(' / '));

    const [students] = await pool.query(
      `SELECT u.id, u.username, u.student_no
       FROM users u
       WHERE u.role='student'
         AND NOT EXISTS (SELECT 1 FROM student_classes sc WHERE sc.student_id = u.id)
       ORDER BY u.id ASC`
    );
    console.log(`🧑‍🎓 未分班学生 ${students.length} 人`);
    if (!students.length) {
      console.log('✅ 所有学生都有班级记录，无需处理');
      process.exit(0);
    }

    let assigned = 0;
    for (const stu of students) {
      // 必修：优先按学号前 4 位匹配年级，失败则随机
      let compulsory = null;
      const sn = String(stu.student_no || stu.username || '');
      const year = /^(\d{4})/.exec(sn)?.[1];
      if (year) {
        compulsory = classes.find(c => (c.grade || '').includes(year)) || null;
      }
      if (!compulsory) compulsory = pickRandom(classes.filter(c => (c.type || 'compulsory') === 'compulsory')) || pickRandom(classes);

      // 选修：60% 概率多一节，且与必修不同
      let electiveOptions = classes.filter(c => c.id !== compulsory.id);
      let elective = null;
      if (electiveOptions.length > 0 && Math.random() > 0.4) {
        const elecOnly = electiveOptions.filter(c => c.type === 'elective');
        elective = pickRandom(elecOnly.length ? elecOnly : electiveOptions);
      }

      const toInsert = [];
      toInsert.push([stu.id, compulsory.id, 'compulsory']);
      if (elective) toInsert.push([stu.id, elective.id, 'elective']);

      try {
        const [r] = await pool.query(
          'INSERT IGNORE INTO student_classes (student_id, class_id, type) VALUES ?',
          [toInsert]
        );
        // 回填 users.class_id = 第一个必修班
        try {
          await pool.query('UPDATE users SET class_id = ? WHERE id = ? AND (class_id IS NULL OR class_id = 0)', [compulsory.id, stu.id]);
        } catch { /* ignore 列不存在 */ }
        assigned += r.affectedRows;
        console.log(`  ✅ ${stu.username} (id=${stu.id}) → ${compulsory.name}(必修)${elective ? ` + ${elective.name}(选修)` : ''}`);
      } catch (e) {
        console.log(`  ⚠️  ${stu.username} 写入失败:`, e.message);
      }
    }
    console.log(`🎯 完成！共写入 ${assigned} 条班级关系`);
    process.exit(0);
  } catch (err) {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
  }
}

main();
