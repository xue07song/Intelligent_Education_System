// 测试数据批量创建脚本（管理员身份）
// 使用方式：在浏览器控制台（已登录管理员账号）执行：
//   import('/src/utils/testDataRunner.js').then(async m => { await m.registerTestData(200); })

import request from '@/utils/request';
import { generateTestData } from '@/utils/colleges';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function registerTestData(studentCount = 200) {
  const { students, teachers, summary } = generateTestData(studentCount);
  console.log(`%c准备创建 ${summary.studentCount} 名学生 + ${summary.teacherCount} 名教师（${summary.majorCount} 个专业）`, 'color:#4f46e5;font-weight:bold;');

  let okCount = 0;
  let failCount = 0;
  const errors = [];

  // ---- 先创建教师 ----
  console.log('%c--- 创建教师 ---', 'color:#059669;font-weight:bold;');
  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    try {
      await request.post('/users', {
        username: t.username,
        password: t.password,
        role: 'teacher',
        nickname: t.nickname,
        college: t.college,
        status: 1,
        subjects: t.subjects,
      });
      okCount++;
      if ((i + 1) % 5 === 0) console.log(`教师进度: ${i + 1}/${teachers.length}`);
    } catch (err) {
      failCount++;
      errors.push({ type: 'teacher', username: t.username, error: err.message });
    }
    await sleep(80); // 间隔 80ms 避免请求过快
  }

  // ---- 再创建学生 ----
  console.log('%c--- 创建学生 ---', 'color:#7c3aed;font-weight:bold;');
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      await request.post('/users', {
        username: s.username,
        password: s.password,
        role: 'student',
        nickname: s.nickname,
        college: s.college,
        major: s.major,
        status: 1,
        student_no: s.student_no,
      });
      okCount++;
      if ((i + 1) % 20 === 0) console.log(`学生进度: ${i + 1}/${students.length}`);
    } catch (err) {
      failCount++;
      errors.push({ type: 'student', username: s.username, error: err.message });
    }
    await sleep(50);
  }

  console.log('%c=== 完成 ===', 'color:#dc2626;font-weight:bold;font-size:14px;');
  console.log(`成功: ${okCount}，失败: ${failCount}`);
  if (errors.length) {
    console.log('失败详情（前 10 条）:', errors.slice(0, 10));
  }

  return { okCount, failCount, errors, summary };
}

// 仅预览数据（不实际创建）
export function previewTestData(studentCount = 200) {
  const data = generateTestData(studentCount);
  console.table(data.students.slice(0, 10));
  console.table(data.teachers);
  console.log(`学生 ${data.students.length} 名，教师 ${data.teachers.length} 名`);
  return data;
}
