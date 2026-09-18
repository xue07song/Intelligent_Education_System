// 学院 / 专业 / 课程 基础数据（注册与管理界面下拉选择 + 测试数据生成共用）

export const COLLEGES = [
  {
    name: '数理与人工智能学院',
    code: '01',
    majors: [
      {
        name: '软件工程',
        code: '01',
        subjects: ['高等数学', '线性代数', '概率论与数理统计', '数据结构', '操作系统', '计算机网络', '数据库原理', '软件工程', 'Java程序设计', 'Python程序设计'],
      },
      {
        name: '数据科学与大数据技术',
        code: '02',
        subjects: ['高等数学', '线性代数', '概率论与数理统计', '大数据技术原理', '机器学习', '数据挖掘', 'Python程序设计', '数据库原理'],
      },
      {
        name: '人工智能',
        code: '03',
        subjects: ['高等数学', '线性代数', '人工智能', '机器学习', '深度学习', '计算机视觉', '自然语言处理', 'Python程序设计'],
      },
      {
        name: '数学与应用数学',
        code: '04',
        subjects: ['数学分析', '高等代数', '解析几何', '常微分方程', '概率论与数理统计', '复变函数'],
      },
      {
        name: '统计学',
        code: '05',
        subjects: ['概率论与数理统计', '数理统计', '应用统计学', '回归分析', '时间序列分析', 'Python程序设计'],
      },
      {
        name: '物理学',
        code: '06',
        subjects: ['大学物理', '理论力学', '电动力学', '量子力学', '热力学与统计物理', '高等数学'],
      },
    ],
  },
  {
    name: '地球科学与工程学院',
    code: '02',
    majors: [
      {
        name: '资源勘查工程',
        code: '01',
        subjects: ['普通地质学', '矿物学', '岩石学', '矿床学', '地球化学', '构造地质学'],
      },
      {
        name: '勘查技术与工程',
        code: '02',
        subjects: ['地球物理勘探', '地震勘探', '测井原理', '岩土工程', '工程地质'],
      },
      {
        name: '智能地球探测',
        code: '03',
        subjects: ['地球物理学', '人工智能', '机器学习', '智能勘探技术', 'Python程序设计'],
      },
    ],
  },
  {
    name: '石油工程学院',
    code: '03',
    majors: [
      {
        name: '石油工程',
        code: '01',
        subjects: ['油藏工程', '钻井工程', '采油工程', '油层物理', '渗流力学', '高等数学'],
      },
      {
        name: '油气储运工程',
        code: '02',
        subjects: ['流体力学', '传热学', '油气管道输送', '储存与装卸', '工程热力学'],
      },
    ],
  },
];

// 扁平化的专业列表（含学院归属），便于联动查询
export const ALL_MAJORS = COLLEGES.flatMap((c) =>
  c.majors.map((m) => ({ ...m, college: c.name, collegeCode: c.code }))
);

// 所有科目去重列表
export const ALL_SUBJECTS = [...new Set(COLLEGES.flatMap((c) => c.majors.flatMap((m) => m.subjects)))].sort();

// 根据学院名获取专业列表
export const getMajorsByCollege = (collegeName) =>
  COLLEGES.find((c) => c.name === collegeName)?.majors.map((m) => m.name) || [];

// 根据学院名获取该学院所有可选科目（去重）
export const getSubjectsByCollege = (collegeName) => {
  const college = COLLEGES.find((c) => c.name === collegeName);
  if (!college) return [];
  return [...new Set(college.majors.flatMap((m) => m.subjects))].sort();
};

// 根据学院+专业获取该专业的科目
export const getSubjectsByMajor = (collegeName, majorName) => {
  const college = COLLEGES.find((c) => c.name === collegeName);
  if (!college) return [];
  const major = college.majors.find((m) => m.name === majorName);
  return major ? major.subjects : [];
};

// 学院名称列表（下拉选项用）
export const COLLEGE_NAMES = COLLEGES.map((c) => c.name);

// ===== 测试数据生成 =====

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎', '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜', '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆', '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史', '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤', '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文', '卢', '苏'];

// 男生名（当代大学生 / 青年教师气质）
const MALE_NAMES = [
  '浩然', '子轩', '俊杰', '嘉豪', '宇航', '思远', '睿哲', '皓轩', '博文', '晨阳',
  '雨泽', '梓豪', '俊豪', '文博', '志远', '瑾瑜', '博超', '智渊', '立诚', '立轩',
  '鹤轩', '鹏煊', '海涛', '明轩', '志刚', '俊辉', '俊宇', '嘉俊', '嘉宁', '嘉宇',
  '嘉乐', '思齐', '思源', '子豪', '子涵', '子墨', '宇轩', '宇豪', '宇辰', '宇泽',
  '浩宇', '浩轩', '浩泽', '皓宇', '博远', '智轩', '擎宇', '志泽', '旭东', '旭峰',
  '晓东', '伟杰', '伟豪', '天佑', '天宇', '天泽', '子睿', '子默', '明杰', '明远',
  '明辉', '振宇', '文轩', '文远', '子安', '逸飞', '逸轩', '致远', '正浩', '正阳',
  '彦霖', '铭轩', '铭泽', '锦程', '煜城', '鸿煊', '弘文', '峻熙', '熠彤', '懿轩',
  '鹏程', '永刚', '永强', '志伟', '永明', '学伟', '俊峰', '鹏飞', '振华', '永康',
  '立军', '新华', '卫东', '学军', '为民', '国庆', '建军', '宏伟', '志强', '永明',
];

// 女生名（当代大学生 / 青年教师气质）
const FEMALE_NAMES = [
  '雨涵', '若曦', '梓涵', '雅婷', '诗琪', '梦瑶', '雅静', '思雨', '若雪', '晓雪',
  '嘉怡', '雅琪', '梦洁', '诗婷', '雪琪', '佳怡', '欣怡', '可馨', '梦琪', '婉婷',
  '紫涵', '雨萱', '若萱', '嘉宁', '嘉乐', '思源', '思齐', '雅文', '雅楠', '雨欣',
  '雨晨', '雨桐', '雨薇', '雨菲', '雨嘉', '雨晴', '若初', '若安', '若彤', '若兰',
  '若云', '晓燕', '晓慧', '晓梅', '晓琳', '晓雅', '晓雯', '晓蕾', '晓晨', '佳慧',
  '佳琪', '佳宁', '佳音', '佳颖', '慧敏', '慧心', '慧玲', '慧娜', '欣然', '欣悦',
  '欣妍', '心怡', '心悦', '心语', '可昕', '可儿', '可佳', '思颖', '思莹', '思琪',
  '思琳', '思敏', '诗雨', '诗涵', '诗韵', '诗妍', '雪松', '雪梅', '雪婷', '紫萱',
  '紫嫣', '紫怡', '紫宁', '紫琪', '悦心', '悦琳', '悦彤', '韵涵', '韵诗', '梦竹',
  '雅慧', '雅芳', '雅玲', '雅琴', '雅雯', '雅楠', '雅萱', '若涵', '若妍', '若菲',
];

function randomName() {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const isMale = Math.random() < 0.5;
  const names = isMale ? MALE_NAMES : FEMALE_NAMES;
  const given = names[Math.floor(Math.random() * names.length)];
  return surname + given;
}

function randomUsername(prefix, code, idx) {
  // 用户名：前缀 + 代码 + 4位数字
  const num = String(idx).padStart(4, '0');
  return `${prefix}${code}${num}`;
}

// 生成 200 名学生 + 对应教师
export function generateTestData(studentCount = 200) {
  const students = [];
  const teachers = [];

  // 每个专业分配学生（按比例）
  const allMajors = ALL_MAJORS; // 11 个专业
  let studentIdx = 1;

  allMajors.forEach((major) => {
    // 每个专业分配约 studentCount / 11 名学生，四舍五入
    const count = Math.round(studentCount / allMajors.length);
    for (let i = 0; i < count && studentIdx <= studentCount; i++, studentIdx++) {
      const year = [2023, 2024, 2025, 2026][Math.floor(Math.random() * 4)];
      const seq = String(i + 1).padStart(3, '0');
      const studentNo = `${year}${major.collegeCode}${major.code}${seq}`;
      students.push({
        username: randomUsername('s', `${major.collegeCode}${major.code}`, studentIdx),
        password: '123456',
        role: 'student',
        nickname: randomName(),
        college: major.college,
        major: major.name,
        student_no: studentNo,
      });
    }
  });

  // 每个专业 2-3 名教师，教授该专业 2-3 门课程
  let teacherIdx = 1;
  allMajors.forEach((major) => {
    const teacherNum = 2 + Math.floor(Math.random() * 2); // 2-3
    for (let i = 0; i < teacherNum; i++, teacherIdx++) {
      // 随机选 2-3 门科目
      const shuffled = [...major.subjects].sort(() => Math.random() - 0.5);
      const subjectCount = Math.min(2 + Math.floor(Math.random() * 2), major.subjects.length);
      const subjects = shuffled.slice(0, subjectCount);
      const empNo = `T${major.collegeCode}${String(teacherIdx).padStart(3, '0')}`;
      teachers.push({
        username: randomUsername('t', major.collegeCode, teacherIdx),
        password: '123456',
        role: 'teacher',
        nickname: randomName(),
        college: major.college,
        employee_no: empNo,
        subjects,
      });
    }
  });

  return { students, teachers, summary: { studentCount: students.length, teacherCount: teachers.length, majorCount: allMajors.length } };
}
