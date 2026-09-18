/**
 * 验收项 A：守卫 / redirect 白名单矩阵（**模拟测试，不是生产路径**）。
 *
 * 为什么能这么测：`routes.js`（只写组件 key 字符串）、`guard.js`、`session.js`
 * 三者都**不 import 任何 .vue**，所以可以在纯 Node 里直接 import。
 * `nav.js` / `index.js` **不能**这样测——`createWebHashHistory()` 需要 DOM。
 *
 * 跑法（在 intelligent_quiz_fronted3.0 目录下）：
 *   node src/router/__tests__/guard-matrix.mjs
 * 无需新增任何依赖，也不改 package.json。
 *
 * 沿革：R1 建了这个矩阵（2 条迁移路由）；R2A 迁移页面变成 9 条 + 共享页三角色，
 * 同时「返回来源」从**手写白名单**改成**从路由表推导**——矩阵相应扩充，
 * 并保留 R1 的全部反例（它们是「改造没把旧结论改坏」的证据）。
 * R2B 又加了一条 `#/exam/:examId`，并把学生端的 `#/legacy` 从「按会话判定」变成
 * **无条件重定向**（学生已无未迁移页面）——矩阵里那条会话判定用例随之改写成新结论。
 *
 * R3（本轮）把教师/管理员的 10 个页面迁完，于是：
 *   · `#/legacy` 对**三个角色**都变成无条件重定向（不再有「放行 + 补默认遗留页」这一支）；
 *   · `decide()` 的返回值里不再有 `home: true`（它的唯一读取方是已删除的 `setLegacyHome`）；
 *   · 教师/管理员的默认页从「legacy 出口」变成各自的真实首页；
 *   · 新增第 1.5 / 3.5 部分：10 条 staff 路由的角色矩阵与真路由深链；
 *   · 新增第 4 部分：**全项目静态断言**，证明遗留导航状态真的没有活引用。
 * R1/R2A/R2B 的结论一条都没删——只把「结论变了」的那几条改写成新结论并注明原因。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMemoryHistory, createRouter } from 'vue-router';

import { routes, ROUTE_NAMES } from '../routes.js';
import { decide, installGuard, isReliableBackTarget, normalizeRedirect } from '../guard.js';
import { clearExamReturn, currentUser, examReturnLocation, homeFor } from '../session.js';

// ---------------------------------------------------------------- 断言小工具
let passed = 0;
const failures = [];

const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    return;
  }
  failures.push({ label, expected: e, actual: a });
};

// 路由表里 component 只有 key 字符串，测试时统一换成空组件
const emptyView = { name: 'TestEmpty', render: () => null };
const testRoutes = routes.map((r) => ({ ...r, component: emptyView }));

// ------------------------------------------------------------ 第 1 部分：decide() 纯决策矩阵
// 用一个**真** router 提供 resolve（白名单规则 2/3 依赖真实的解析结果）
const plainRouter = createRouter({ history: createMemoryHistory(), routes: testRoutes });
const at = (path) => plainRouter.resolve(path);
/**
 * R2B：`decide()` 的入参里**没有会话态了**。「有没有进行中的答题」这个输入随
 * `activeExamId` 一起消失，因为答题页现在由地址唯一决定 —— 决策只依赖目标地址 + 身份。
 * R3：也没有「当前遗留页面」这个输入了，理由相同。
 */
const ask = (path, user) =>
  decide({ to: at(path), user, resolve: (p) => plainRouter.resolve(p) });

const STUDENT = { role: 'student' };
const TEACHER = { role: 'teacher' };
const ADMIN = { role: 'admin' };

/**
 * 角色默认页位置。**R3 起三个角色都是真实路由** —— R2A 时学生是 `student.papers`、
 * 教师/管理员还是 `legacy` 出口；R3 把 staff 的 10 个页面迁完后，后两者的默认页
 * 分别变成 `manage.questions` 与 `manage.exams`（与旧 `homeFor` 的 legacy 默认页逐字对应，
 * 见 `session.js` 的 `homeFor` 注释）。
 */
const HOME = {
  student: { name: ROUTE_NAMES.papers },
  teacher: { name: ROUTE_NAMES.manageQuestions },
  admin: { name: ROUTE_NAMES.manageExams },
};

// —— 未登录 ——
check('未登录 /records/12 → login + redirect',
  ask('/records/12', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/records/12' } } });
check('未登录 /records → login + redirect',
  ask('/records', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/records' } } });
// R2A 新增的迁移页同样值得记（登录后要回到它，而不是角色首页）
check('未登录 /papers → login + redirect=/papers',
  ask('/papers', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/papers' } } });
check('未登录 /profile → login + redirect=/profile（共享页）',
  ask('/profile', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/profile' } } });
// R3 新增：staff 页面对未登录用户同样要能记下来（登录后回到原来那一页）
check('未登录 /manage/questions → login + redirect（R3 新增页同样可恢复）',
  ask('/manage/questions', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/manage/questions' } } });
check('未登录 /admin/audit → login + redirect',
  ask('/admin/audit', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/admin/audit' } } });
// 根 / legacy / unknown 不值得记，redirect 必须为空（否则登录后会绕一圈）
check('未登录 / → login 无 redirect',
  ask('/', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: {} } });
check('未登录 /legacy → login 无 redirect',
  ask('/legacy', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: {} } });
check('未登录 /nope → login 无 redirect',
  ask('/nope', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: {} } });
check('未登录 /login → 放行', ask('/login', null), { type: 'allow' });

// —— 已登录访问 /login（防循环）——
check('学生 /login 无 redirect → 角色首页',
  ask('/login', STUDENT),
  { type: 'redirect', location: HOME.student });
check('学生 /login?redirect=/records/12 → 命名路由对象',
  ask('/login?redirect=/records/12', STUDENT),
  { type: 'redirect', location: { name: ROUTE_NAMES.recordDetail, params: { recordId: '12' }, query: {} } });
check('学生 /login?redirect=/adaptive → 回迁移路由（R2A 新增）',
  ask('/login?redirect=/adaptive', STUDENT),
  { type: 'redirect', location: { name: ROUTE_NAMES.adaptive, params: {}, query: {} } });
check('教师 /login?redirect=/records/12 → 角色不符，回首页',
  ask('/login?redirect=/records/12', TEACHER),
  { type: 'redirect', location: HOME.teacher });
check('教师 /login?redirect=/profile → 共享页角色相符，允许',
  ask('/login?redirect=/profile', TEACHER),
  { type: 'redirect', location: { name: ROUTE_NAMES.profile, params: {}, query: {} } });
check('学生 /login?redirect=http://evil → 回首页',
  ask('/login?redirect=http://evil.com', STUDENT),
  { type: 'redirect', location: HOME.student });
// R3 新增：staff 深链在登录页上也要能恢复
check('教师 /login?redirect=/manage/classes → 回该 staff 页（R3 新增页同样在白名单内）',
  ask('/login?redirect=/manage/classes', TEACHER),
  { type: 'redirect', location: { name: ROUTE_NAMES.manageClasses, params: {}, query: {} } });
check('教师 /login?redirect=/admin/users → 角色不符（staff 内部也有角色边界），回教师首页',
  ask('/login?redirect=/admin/users', TEACHER),
  { type: 'redirect', location: HOME.teacher });
check('管理员 /login?redirect=/manage/generate → 角色不符（组卷仅教师），回管理员首页',
  ask('/login?redirect=/manage/generate', ADMIN),
  { type: 'redirect', location: HOME.admin });

// —— 迁移路由的角色守卫 ——
check('学生 /records 放行', ask('/records', STUDENT), { type: 'allow' });
check('学生 /records/12 放行', ask('/records/12', STUDENT), { type: 'allow' });
check('学生 /papers 放行', ask('/papers', STUDENT), { type: 'allow' });
check('学生 /adaptive 放行', ask('/adaptive', STUDENT), { type: 'allow' });
check('学生 /review 放行', ask('/review', STUDENT), { type: 'allow' });
check('学生 /analysis 放行', ask('/analysis', STUDENT), { type: 'allow' });
check('教师 /records → 首页 + 无权提示',
  ask('/records', TEACHER),
  {
    type: 'redirect',
    location: HOME.teacher,
    notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
  });
check('管理员 /records/12 → 首页 + 无权提示',
  ask('/records/12', ADMIN),
  {
    type: 'redirect',
    location: HOME.admin,
    notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
  });
// R2A 新增的学生专属页：教师/管理员一律被挡回各自首页
for (const path of ['/papers', '/adaptive', '/review', '/analysis']) {
  check(`教师 ${path} → 首页 + 无权提示`,
    ask(path, TEACHER),
    {
      type: 'redirect',
      location: HOME.teacher,
      notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
    });
  check(`管理员 ${path} → 首页 + 无权提示`,
    ask(path, ADMIN),
    {
      type: 'redirect',
      location: HOME.admin,
      notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
    });
}

// —— 三角色共享页：**放行即要有正文**，不能再被角色规则挡掉 ——
for (const [path, name] of [['/profile', ROUTE_NAMES.profile], ['/feedback', ROUTE_NAMES.feedback]]) {
  for (const [label, user] of [['学生', STUDENT], ['教师', TEACHER], ['管理员', ADMIN]]) {
    check(`${label} ${path} 放行（共享页）`, ask(path, user), { type: 'allow' });
  }
  check(`${path} 的 meta.roles 是三角色（放行后必须有正文，不能靠空组件兜底）`,
    at(path).meta.roles.slice().sort(), ['admin', 'student', 'teacher']);
  check(`${path} 标记为 migrated（正文走 router-view，不落遗留分支）`,
    at(path).meta.migrated, true);
  check(`${path} 有路由名 ${name}`, at(path).name, name);
}

// —— 未知地址 / 冷启动根 ——
check('学生 /nope → 首页 + 页面不存在',
  ask('/nope', STUDENT),
  {
    type: 'redirect',
    location: HOME.student,
    notice: { message: '页面不存在，已返回首页', type: 'warning' },
  });
check('教师 / → 首页（R3：教师首页是题库管理，不再是 legacy 出口）',
  ask('/', TEACHER),
  { type: 'redirect', location: HOME.teacher });
check('管理员 / → 首页（R3：管理员首页是试卷列表）',
  ask('/', ADMIN),
  { type: 'redirect', location: HOME.admin });
check('学生 / → 试卷列表（R2A：不再是 legacy 出口）', ask('/', STUDENT),
  { type: 'redirect', location: HOME.student });

// —— legacy 出口 ——
// 学生端：R2B 起**没有任何未迁移页面**（答题页也拿到了 `#/exam/:examId`）。
// R3：教师/管理员的 10 个页面也迁完了 ⇒ 这条分支对**三个角色**都只剩「静默回角色首页」。
// 这条收敛的意义：原来那个分支需要一个能在刷新后变空的输入（activeExamId / legacyView），
// 每多一个这种输入就多一个能渲染出空白正文的入口。现在分支里不剩任何按角色/按会话的差别。
check('学生 /legacy → 无条件回试卷列表（R2B：会话态输入已消失）',
  ask('/legacy', STUDENT),
  { type: 'redirect', location: { name: ROUTE_NAMES.papers } });
check('教师 /legacy → 静默回题库管理（R3：staff 也无未迁移页面）',
  ask('/legacy', TEACHER),
  { type: 'redirect', location: HOME.teacher });
check('管理员 /legacy → 静默回试卷列表（R3）',
  ask('/legacy', ADMIN),
  { type: 'redirect', location: HOME.admin });
// 「静默」是刻意的：老书签不是用户走错了路，不该弹「页面不存在」。
// 下面两条同时**钉住返回对象的形状** ——
// `check` 用 JSON.stringify 全等比较，所以多一个字段（比如 R3 删掉的 `home: true`）就会失败。
check('三个角色 /legacy 的兜底**都不带提示**（不是用户操作失误，只是地址没有意义）',
  [ask('/legacy', STUDENT).notice, ask('/legacy', TEACHER).notice, ask('/legacy', ADMIN).notice],
  [undefined, undefined, undefined]);
check('三个角色 /legacy 的兜底**都没有多余字段**（`home: true` 已随 setLegacyHome 一起删除）',
  [ask('/legacy', STUDENT).home, ask('/legacy', TEACHER).home, ask('/legacy', ADMIN).home],
  [undefined, undefined, undefined]);

// —— 答题页 `#/exam/:examId`（R2B 新增）——
check('学生 /exam/16 放行', ask('/exam/16', STUDENT), { type: 'allow' });
// 非法 id **也放行**：守卫不做「这个 id 存不存在」的判断，那是服务端的事
// （`GET /exams/99999` → 404）。放行后由答题页给出明确结果，而不是被静默弹走。
check('学生 /exam/99999 放行（是否存在由服务端判定，守卫不做内容校验）',
  ask('/exam/99999', STUDENT), { type: 'allow' });
check('学生 /exam/abc 放行（非法 id 由答题页拦截并给出明确结果）',
  ask('/exam/abc', STUDENT), { type: 'allow' });
check('教师 /exam/16 → 首页 + 无权提示（答题页学生专属）',
  ask('/exam/16', TEACHER),
  {
    type: 'redirect',
    location: HOME.teacher,
    notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
  });
check('管理员 /exam/16 → 首页 + 无权提示',
  ask('/exam/16', ADMIN),
  {
    type: 'redirect',
    location: HOME.admin,
    notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
  });
check('未登录 /exam/16 → login + redirect=/exam/16（登录后回原试卷）',
  ask('/exam/16', null),
  { type: 'redirect', location: { name: ROUTE_NAMES.login, query: { redirect: '/exam/16' } } });

// —— 答题页的 meta：**red line 的静态钉子** ——
// 这几个字面量一旦被改写，会在运行时以「此前不可达的 AI 功能被激活」或
// 「既有后端 in-exam 规则被关掉」的形式出现，界面看起来仍然正常、构建也不报错 ——
// 所以在这里钉死。依据是真实后端探针（r2b-probe-ai-context.mjs）。
const examMeta = at('/exam/16').meta;
check('答题页有路由名 student.exam', at('/exam/16').name, ROUTE_NAMES.exam);
check('答题页标记为 migrated（正文走 router-view，不落遗留分派）', examMeta.migrated, true);
check('答题页 roles 只有 student', examMeta.roles.slice().sort(), ['student']);
check('答题页 context 是 practice/exam（后端 aiAssistantService 用它判定 inExam）',
  examMeta.context, 'practice/exam');
check('答题页 context **不能是 exam**（那个键带 hint/similar 两个此前不可达的动作，且会让 inExam 保持 false）',
  examMeta.context === 'exam', false);
check('答题页 context 不是 exam-practice（同样不打开 inExam，且没有对应的 CONTEXT_META 键）',
  examMeta.context === 'exam-practice', false);
check('答题页 context **不能是 exams**（那是教师试卷列表的键；迁移前学生答题页误用了它，见 routes.js 说明）',
  examMeta.context === 'exams', false);
check('答题页 tab 为 null（它不属于任何一个顶部标签）', examMeta.tab, null);

// ================================================================
// 第 1.5 部分：R3 —— 教师/管理员 10 条路由的**枚举 + 角色矩阵**
// ================================================================
/**
 * 这张表就是 `docs/evidence-r3/R3-01-视图对照表.md` 的机器可读版本。
 *
 * 字段：展示路径 / 路由名 / 允许角色 / `meta.context` / `meta.crumb`。
 *
 * ⚠️ 这张表是**穷举**，不是举例：条目数与路由表里 `component` 以 `manage-` / `admin-`
 * 开头的路由数必须相等（下面有断言）。加一条路由却忘了加进这里，枚举断言会失败。
 */
const STAFF_ROUTES = [
  ['/manage/questions', ROUTE_NAMES.manageQuestions, ['teacher', 'admin'], 'main', '题库管理'],
  ['/manage/exams', ROUTE_NAMES.manageExams, ['teacher', 'admin'], 'exams', '出卷与学生管理 / 试卷列表'],
  ['/manage/generate', ROUTE_NAMES.manageGenerate, ['teacher'], 'generate', '出卷与学生管理 / 智能组卷'],
  ['/manage/classes', ROUTE_NAMES.manageClasses, ['teacher', 'admin'], 'classes', '出卷与学生管理 / 班级管理'],
  ['/manage/analysis', ROUTE_NAMES.manageAnalysis, ['teacher', 'admin'], 'learning-analysis', '出卷与学生管理 / 学习分析'],
  ['/manage/adaptive', ROUTE_NAMES.manageAdaptive, ['teacher', 'admin'], 'adaptive-overview', '出卷与学生管理 / 自适应学情'],
  ['/manage/review', ROUTE_NAMES.manageReview, ['teacher'], 'adaptive-review', '出卷与学生管理 / 主观题复核'],
  ['/manage/exam-analysis', ROUTE_NAMES.manageExamAnalysis, ['teacher', 'admin'], 'admin-records', '出卷与学生管理 / 试卷分析'],
  ['/admin/users', ROUTE_NAMES.adminUsers, ['admin'], 'users', '用户管理'],
  ['/admin/audit', ROUTE_NAMES.adminAudit, ['admin'], 'audit', '注册审核'],
];

const staffRouteCount = routes.filter(
  (r) => typeof r.component === 'string' && (r.component.startsWith('manage-') || r.component.startsWith('admin-'))
).length;
check('R3 staff 路由的条数就是 10（枚举完整性：多了少了都要在这里显形）',
  staffRouteCount, 10);
check('枚举表条数与路由表一致（表里写的 10 条都要真实存在）',
  STAFF_ROUTES.filter(([, name]) => routes.some((r) => r.name === name)).length, 10);

for (const [path, name, roles, context, crumb] of STAFF_ROUTES) {
  const resolved = at(path);
  check(`${path} 有路由名 ${name}`, resolved.name, name);
  check(`${path} 的 meta.roles`, resolved.meta.roles.slice().sort(), roles.slice().sort());
  check(`${path} 标记为 migrated（正文走 router-view，不落遗留分派）`, resolved.meta.migrated, true);
  check(`${path} 的 meta.context（喂 AI 助手；取的是迁移前的 contextMode，见对照表 §3）`,
    resolved.meta.context, context);
  check(`${path} 的 meta.crumb（与迁移前 currentBreadcrumb 的输出逐字一致）`,
    resolved.meta.crumb, crumb);
  check(`${path} 无路径参数（教师/管理端没有任何带参数的页面，见对照表 §2）`,
    Object.keys(resolved.params).length, 0);
  check(`${path} 不占学生顶部标签（meta.tab 必须缺省）`, resolved.meta.tab, undefined);

  for (const [label, user] of [['教师', TEACHER], ['管理员', ADMIN], ['学生', STUDENT]]) {
    if (roles.includes(user.role)) {
      check(`${label} ${path} 放行`, ask(path, user), { type: 'allow' });
    } else {
      check(`${label} ${path} → 角色首页 + 无权提示`,
        ask(path, user),
        {
          type: 'redirect',
          location: HOME[user.role],
          notice: { message: '无权访问该页面，已返回首页', type: 'warning' },
        });
    }
  }
}
// 这四条是**权限边界的钉子**，单独再写一遍：它们是产品既定边界，
// 不因为「现在有路由了」而放宽（用户已就此裁决：不得开放 admin 进入 manage.generate）。
check('manage.generate 对管理员**不放行**（组卷仅教师；迁移前管理员点进去是空白正文，现在明确拒绝）',
  ask('/manage/generate', ADMIN).type, 'redirect');
check('manage.review 对管理员**不放行**（主观题复核仅教师）',
  ask('/manage/review', ADMIN).type, 'redirect');
check('admin.users 对教师**不放行**',
  ask('/admin/users', TEACHER).type, 'redirect');
check('admin.audit 对教师**不放行**',
  ask('/admin/audit', TEACHER).type, 'redirect');
check('**学生进不去任何一条 staff 路由**（staff 布局与 staff 权限对学生一律拒绝）',
  STAFF_ROUTES.filter(([path]) => ask(path, STUDENT).type !== 'redirect').length, 0);

// —— 全局不变量：每条已迁移路由都要有 roles 与 context ——
const migratedRoutes = routes.filter((r) => r.meta?.migrated === true);
check('已迁移路由共 19 条（学生 7 + 共享 2 + staff 10）', migratedRoutes.length, 19);
check('每条已迁移路由都有 meta.roles（不留「谁都能进」的口子）',
  migratedRoutes.filter((r) => !Array.isArray(r.meta.roles) || r.meta.roles.length === 0).map((r) => r.path),
  []);
check('每条已迁移路由都有非空 meta.context（AI 助手的场景判定不留空洞）',
  migratedRoutes.filter((r) => !r.meta.context).map((r) => r.path),
  []);
// 地址标记路由必须**没有** migrated（它们不该被当成页面）。
// 从 `routes` 里按**路由名**取，而不是 `at('/:pathMatch(.*)*')`：后者是拿一串
// 「长得像路径的文本」去解析，兜底路由能匹配上纯属巧合（它本来就是兜底），
// 断言会以一种说不清的方式成立。按名字取才是直接读那一条自己的 meta。
check('四条地址标记路由都不带 migrated（它们只是地址，正文由守卫重定向走）',
  [ROUTE_NAMES.root, ROUTE_NAMES.login, ROUTE_NAMES.legacy, ROUTE_NAMES.unknown]
    .map((n) => routes.find((r) => r.name === n)?.meta?.migrated),
  [undefined, undefined, undefined, undefined]);
// 老书签兼容：`/legacy` 必须排在兜底之前，否则老书签会落到「页面不存在」
const pathIndex = (p) => routes.findIndex((r) => r.path === p);
check('`/legacy` 排在兜底路由之前（否则老书签会收到「页面不存在」而不是静默换页）',
  pathIndex('/legacy') < pathIndex('/:pathMatch(.*)*'), true);

// ------------------------------------------- 第 2 部分：normalizeRedirect 白名单（§3.2 五条规则）
const norm = (value, role = 'student') =>
  normalizeRedirect(value, role, (p) => plainRouter.resolve(p));

check('规则1 外部 http 地址丢弃', norm('http://evil.com'), null);
check('规则1 https 丢弃', norm('https://evil.com'), null);
check('规则1 javascript: 丢弃', norm('javascript:alert(1)'), null);
check('规则1 协议相对 // 丢弃', norm('//evil.com'), null);
check('规则1 无前导斜杠丢弃', norm('records'), null);
check('规则1 空串丢弃', norm(''), null);
check('规则1 非字符串丢弃', norm(12345), null);
check('规则1 含 # 丢弃', norm('/records/12#x'), null);
check('规则2 未知路径丢弃', norm('/nope'), null);
check('规则4 指向 login 自身丢弃', norm('/login'), null);
check('规则3 角色不符丢弃（教师访问学生路由）', norm('/records/12', 'teacher'), null);
check('规则3 角色不符丢弃（管理员访问学生路由）', norm('/records', 'admin'), null);
check('规则3 角色不符丢弃（管理员访问 /papers）', norm('/papers', 'admin'), null);
check('合法深链 → 命名路由对象（不含 #）', norm('/records/12'),
  { name: ROUTE_NAMES.recordDetail, params: { recordId: '12' }, query: {} });
check('合法列表页 → 命名路由对象', norm('/records'),
  { name: ROUTE_NAMES.records, params: {}, query: {} });
check('R2A 新迁移页 → 命名路由对象', norm('/analysis'),
  { name: ROUTE_NAMES.analysis, params: {}, query: {} });
check('R2B 答题页 → 命名路由对象（带 examId 参数）', norm('/exam/16'),
  { name: ROUTE_NAMES.exam, params: { examId: '16' }, query: {} });
check('答题页对教师角色不符丢弃', norm('/exam/16', 'teacher'), null);
check('答题页对管理员角色不符丢弃', norm('/exam/16', 'admin'), null);
check('共享页对教师合法', norm('/feedback', 'teacher'),
  { name: ROUTE_NAMES.feedback, params: {}, query: {} });
check('legacy 是已知路由，允许作为 redirect 目标', norm('/legacy'),
  { name: ROUTE_NAMES.legacy, params: {}, query: {} });
// R3 新增：staff 路由同样按 meta.roles 二次校验，读的是同一份规则
check('规则3 staff 页对合法角色放行（教师 /manage/classes）', norm('/manage/classes', 'teacher'),
  { name: ROUTE_NAMES.manageClasses, params: {}, query: {} });
check('规则3 staff 页对合法角色放行（管理员 /admin/users）', norm('/admin/users', 'admin'),
  { name: ROUTE_NAMES.adminUsers, params: {}, query: {} });
check('规则3 staff 页对越权角色丢弃（管理员 /manage/generate）',
  norm('/manage/generate', 'admin'), null);
check('规则3 staff 页对越权角色丢弃（教师 /admin/audit）',
  norm('/admin/audit', 'teacher'), null);
check('规则3 学生访问 staff 页丢弃（staff 内部也有边界，不是「登录了就都行」）',
  norm('/manage/questions', 'student'), null);

// ------------------------------- 第 2.5 部分：isReliableBackTarget（「返回」来源校验，§4.5）
// R2A 起规则是**推导的**（见 guard.js），currentName 是「当前所在路由」——
// 它的作用是挡掉「回自己 = 在两条详情之间打转」。
const back = (value, role = 'student', currentName = null) =>
  isReliableBackTarget(value, role, (p) => plainRouter.resolve(p), currentName);

// —— 可信来源：R1 的两条 ——
check('返回来源 /records 可信（从列表进来）', back('/records'), true);
check('返回来源 /legacy 可信（老书签地址本身是已知路由，不是死路）', back('/legacy'), true);

// —— 可信来源：R2A 新增的路由（这正是「不照抄 R1 白名单」的意义）——
for (const path of ['/papers', '/adaptive', '/review', '/analysis']) {
  check(`返回来源 ${path} 可信（R2A 新增的迁移页）`, back(path), true);
}
check('返回来源 /profile 可信（共享页，学生有权访问）', back('/profile'), true);
check('返回来源 /feedback 对管理员可信', back('/feedback', 'admin'), true);

// —— R3 新增：staff 路由作为「返回来源」的可信度同样从 meta.roles 推导 ——
for (const [path, , roles] of STAFF_ROUTES) {
  check(`返回来源 ${path} 对 ${roles.join('/')} 可信`,
    roles.map((role) => back(path, role)), roles.map(() => true));
  check(`返回来源 ${path} 对学生不可信（角色不符）`, back(path, 'student'), false);
}
check('返回来源 /manage/generate 对管理员不可信（组卷仅教师）',
  back('/manage/generate', 'admin'), false);
check('返回来源 /admin/users 对教师不可信', back('/admin/users', 'teacher'), false);

// —— 不可信：登录页（**含带 query 的**，这正是原实现 `back !== '/login'` 漏掉的那个）——
check('返回来源 /login 不可信', back('/login'), false);
check('返回来源 /login?redirect=... 不可信（带 query 的登录页）',
  back('/login?redirect=%2Frecords%2F1'), false);
check('返回来源 /login#x 不可信（带 hash 的登录页）', back('/login#x'), false);

// —— 不可信：回去会被守卫再重定向 / 兜底页 ——
check('返回来源 / 不可信（回首页还要再重定向一次）', back('/'), false);
check('返回来源 /nope 不可信（未知兜底页）', back('/nope'), false);

// —— 不可信：循环来源（对**当前页**而言，回自己 = 打转）——
check('当前在详情页时，返回来源 /records/12 不可信（会退回上一条详情）',
  back('/records/12', 'student', ROUTE_NAMES.recordDetail), false);
check('当前在详情页时，返回来源 /records/1 不可信（同上，换个 id）',
  back('/records/1', 'student', ROUTE_NAMES.recordDetail), false);
// 同一条路径，换个「当前页」就成立 —— 说明这条规则不是硬编码路径，而是「别回自己」
check('当前在列表页时，返回来源 /records/12 可信（不是回自己）',
  back('/records/12', 'student', ROUTE_NAMES.records), true);

// —— R2B：答题页的两条 ——
// 「不把另一张答题页作为退出兜底」**不需要单独写规则**：把 currentName 传成 `exam`，
// 「别回自己」这条就顺带把 `/exam/7` 拒掉了（路由名相同，参数不同也算回自己）。
check('答题页退出：上一页是另一张答题页 → 不可信（不拿答题页当兜底）',
  back('/exam/7', 'student', ROUTE_NAMES.exam), false);
check('学生从 /papers 进答题页 → 退出来源 /papers 可信',
  back('/papers', 'student', ROUTE_NAMES.exam), true);
check('答题页**不能**作为教师的返回来源（学生专属）',
  back('/exam/16', 'teacher'), false);

// —— 不可信：站外 / 非路径 ——
check('返回来源 http://evil.com 不可信', back('http://evil.com'), false);
check('返回来源 //evil.com 不可信（协议相对地址）', back('//evil.com'), false);
check('返回来源 非字符串 不可信', back(null), false);
check('返回来源 空串 不可信', back(''), false);

// —— 角色权限：meta.roles 是唯一规则源，与守卫读同一张表 ——
check('返回来源 /records 对教师不可信（角色不符）', back('/records', 'teacher'), false);
check('返回来源 /papers 对教师不可信（学生专属）', back('/papers', 'teacher'), false);
check('返回来源 /legacy 对教师可信（三角色均可访问）', back('/legacy', 'teacher'), true);
check('返回来源 /profile 对管理员可信（共享页）', back('/profile', 'admin'), true);

// ------------------------------------------- 第 3 部分：真路由 + installGuard（含 isSameLocation 防循环）
const liveRouter = createRouter({ history: createMemoryHistory(), routes: testRoutes });
installGuard(liveRouter);

/**
 * 真导航：把身份切成 `user`，再**强制**走一次 `path`。
 *
 * `force: true` 不是可选优化，是这个夹具能不能测到东西的前提 —— 详见本节后面
 * 「为什么 `goto` 必须带 `force`」那一组断言。一句话版本：
 * vue-router 在 **push 到当前地址**时直接返回 `NAVIGATION_DUPLICATED` 并**跳过整条守卫链**，
 * `beforeEach` 一次都不跑。于是「同一地址再进一次」的用例会**静默空转**：
 * 守卫没执行，地址自然没变，断言却正好拿到它期望的那个值 —— 通过，但什么都没验证。
 *
 * 本矩阵的目的是「对每个（地址，身份）组合问一次守卫」，所以每次都得让守卫真的跑。
 *
 * 对浏览器历史的影响：地址**不同**时 `force` 是空操作，与不加它逐字等价；
 * 地址**相同时**会多压一条历史项，位置就在那次重复导航处。后面按相对位置
 * `back()`/`forward()` 的用例（staff 三步来回）不受影响 —— 它们的三次 push 地址各不相同。
 */
const goto = async (path, user) => {
  currentUser.value = user;
  await liveRouter.push({ path, force: true });
  await liveRouter.isReady();
  return {
    name: liveRouter.currentRoute.value.name,
    params: liveRouter.currentRoute.value.params,
    query: liveRouter.currentRoute.value.query,
  };
};

// 未登录深链 → 停在 login，并把目标记进 redirect（对应 §5.3-8 第 10 行）
check('真路由：未登录深链 /records/12',
  await goto('/records/12', null),
  { name: ROUTE_NAMES.login, params: {}, query: { redirect: '/records/12' } });

// 已登录深链 → **不被角色默认页覆盖**（§5.2 第 3 条 / §5.3-8 第 9 行）
check('真路由：学生已登录深链 /records/12',
  await goto('/records/12', STUDENT),
  { name: ROUTE_NAMES.recordDetail, params: { recordId: '12' }, query: {} });
check('真路由：学生已登录深链 /analysis（R2A 新增页同样不被默认页覆盖）',
  await goto('/analysis', STUDENT),
  { name: ROUTE_NAMES.analysis, params: {}, query: {} });
check('真路由：教师已登录深链 /feedback（共享页不被默认页覆盖）',
  await goto('/feedback', TEACHER),
  { name: ROUTE_NAMES.feedback, params: {}, query: {} });

// 学生端 legacy 出口：R2B 起无条件回试卷列表
check('真路由：学生进 /legacy → 被送回试卷列表',
  await goto('/legacy', STUDENT),
  { name: ROUTE_NAMES.papers, params: {}, query: {} });

// R3：staff 的 legacy 出口同样不再「保留同会话已选页面」——
// 迁移前这里会 `applyLegacyTarget({view:'analysis'})` 再进 `#/legacy`，然后断言遗留状态没被覆盖。
// 页面身份已经在地址里，这条用例连同它的输入一起消失，改写成「一律回角色首页」。
check('真路由：教师进 /legacy → 静默回题库管理（R3：不再有「同会话已选页」这回事）',
  await goto('/legacy', TEACHER),
  { name: ROUTE_NAMES.manageQuestions, params: {}, query: {} });
check('真路由：管理员进 /legacy → 静默回试卷列表（R3）',
  await goto('/legacy', ADMIN),
  { name: ROUTE_NAMES.manageExams, params: {}, query: {} });

await goto('/records', STUDENT);
check('真路由：学生已在别处，再回 /legacy 仍是试卷列表（不会空白正文）',
  await goto('/legacy', STUDENT),
  { name: ROUTE_NAMES.papers, params: {}, query: {} });

// 答题页的地址**刷新即身份**：同一个深链两次进入都必须停在同一份试卷上
check('真路由：学生深链 /exam/16 停在答题页（examId 由地址驱动）',
  await goto('/exam/16', STUDENT),
  { name: ROUTE_NAMES.exam, params: { examId: '16' }, query: {} });
check('真路由：从答题页再深链 /exam/17 → 换成 17（同一条路由，参数变了）',
  await goto('/exam/17', STUDENT),
  { name: ROUTE_NAMES.exam, params: { examId: '17' }, query: {} });
check('真路由：非法 id 也停在答题页（由页面给出明确结果，不被静默弹走）',
  await goto('/exam/abc', STUDENT),
  { name: ROUTE_NAMES.exam, params: { examId: 'abc' }, query: {} });
check('真路由：教师深链 /exam/16 被挡在题库管理（无无限重定向）',
  (await goto('/exam/16', TEACHER), liveRouter.currentRoute.value.name), ROUTE_NAMES.manageQuestions);

// `examReturnLocation` 是「退出答题页回哪里」的唯一载体：退出登录必须清掉
examReturnLocation.value = { name: ROUTE_NAMES.papers, params: {}, query: {} };
clearExamReturn();
check('真路由：clearExamReturn（退出登录 / 401 / 改密）清掉答题页来源，避免跨账号复用陈旧目标',
  examReturnLocation.value, null);
examReturnLocation.value = null;

// 越权不产生「已在目标地址」的无限重定向
await goto('/records', TEACHER);
check('真路由：教师越权后停在题库管理（无无限重定向）',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageQuestions);

await goto('/papers', ADMIN);
check('真路由：管理员越权访问 /papers 后停在试卷列表（无无限重定向）',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageExams);

// 共享页对三角色都必须真正停在目标路由（放行后不能又被弹走）
for (const [label, user] of [['学生', STUDENT], ['教师', TEACHER], ['管理员', ADMIN]]) {
  check(`真路由：${label}进 /profile 停在 profile`,
    (await goto('/profile', user)).name, ROUTE_NAMES.profile);
  check(`真路由：${label}进 /feedback 停在 feedback`,
    (await goto('/feedback', user)).name, ROUTE_NAMES.feedback);
}

// 已迁移页面之间的前进后退由浏览器历史负责，守卫只要求「各自都停得住」
await goto('/papers', STUDENT);
await goto('/analysis', STUDENT);
// `router.back()` 不返回 Promise（它走 history 监听回调），所以等一个宏任务让导航落定
liveRouter.back();
await new Promise((resolve) => setTimeout(resolve, 0));
check('真路由：学生 /papers → /analysis → 后退回到 /papers',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.papers);

// ================================================================
// 第 3.5 部分：R3 —— staff 的**真路由**行为（刷新 / 深链 / 越权 / 后退）
// ================================================================
// 这一节全部走 `installGuard` 的真实导航，不是 `decide()` 的纯函数调用 ——
// 它证明的是「守卫装上之后，地址真的停得住」，也就是本轮的核心承诺：
// **侧栏上看得见的每一条，都有一个刷新不丢、深链可进、前进后退正确的地址。**

// 深链直接进入（等价于刷新那次导航：守卫只会看到地址 + 身份这两个输入）
for (const [path, name, roles, context] of STAFF_ROUTES) {
  const owner = roles.includes('teacher') ? TEACHER : ADMIN;
  const landed = await goto(path, owner);
  check(`真路由：${roles.includes('teacher') ? '教师' : '管理员'}深链 ${path} 停在 ${name}`,
    landed.name, name);
  check(`真路由：${path} 停在目标路由后 meta.context 可用（AI 助手拿到的场景不是空的）`,
    liveRouter.currentRoute.value.meta.context, context);
  // **刷新等价性**：同一个地址再进一次，必须落在同一条路由上（刷新不会退回首页）
  // ⚠️ 这一条是「同地址再进」，守卫会不会被调用完全取决于 `goto` 里的 `force`
  //    —— 详见本节末尾「为什么 `goto` 必须带 `force: true`」那段。没有它这条就是空转。
  const again = await goto(path, owner);
  check(`真路由：${path} 再次进入仍在 ${name}（刷新 = 同一地址 = 同一页面）`,
    again.name, name);
}

// 冷启动根 `/`：R3 之前 staff 会落进 legacy 出口（`#/legacy` 上的遗留分派），
// 现在必须是各自**真实首页**。这里走的是真导航，区别于第 1 部分对 `decide()` 的直接调用。
for (const [label, user, home] of [
  ['学生', STUDENT, ROUTE_NAMES.papers],
  ['教师', TEACHER, ROUTE_NAMES.manageQuestions],
  ['管理员', ADMIN, ROUTE_NAMES.manageExams],
]) {
  check(`真路由：${label}冷启动进 / 落在 ${home}（不再是 legacy 出口）`,
    (await goto('/', user)).name, home);
  check(`真路由：${label}再次进 / 仍落在 ${home}（刷新等价）`,
    (await goto('/', user)).name, home);
}

// 越权深链 → 落在角色首页，且**不停在越权地址上**（否则会渲染出无权访问的正文）
check('真路由：管理员深链 /manage/generate → 停在管理员首页（组卷仅教师）',
  (await goto('/manage/generate', ADMIN)).name, ROUTE_NAMES.manageExams);
check('真路由：教师深链 /admin/audit → 停在教师首页（用户/审核仅管理员）',
  (await goto('/admin/audit', TEACHER)).name, ROUTE_NAMES.manageQuestions);
check('真路由：学生深链 /manage/questions → 停在试卷列表（staff 区对学生整体关闭）',
  (await goto('/manage/questions', STUDENT)).name, ROUTE_NAMES.papers);

// 越权**之后**再回到自己有权的一页，必须正常（越权不留下任何残留状态）
check('真路由：管理员越权后再进 /admin/users 正常（越权不残留）',
  (await goto('/admin/users', ADMIN)).name, ROUTE_NAMES.adminUsers);
check('真路由：教师越权后再进 /manage/classes 正常（越权不残留）',
  (await goto('/manage/classes', TEACHER)).name, ROUTE_NAMES.manageClasses);

// 前进后退：staff 区域内部来回，守卫不得把任何一步弹走
await goto('/manage/questions', TEACHER);
await goto('/manage/classes', TEACHER);
await goto('/manage/exam-analysis', TEACHER);
liveRouter.back();
await new Promise((resolve) => setTimeout(resolve, 0));
check('真路由：教师 /manage/questions → /manage/classes → /manage/exam-analysis → 后退回到 classes',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageClasses);
liveRouter.back();
await new Promise((resolve) => setTimeout(resolve, 0));
check('真路由：再后退回到 questions（多步历史都停得住）',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageQuestions);
await liveRouter.forward();
await new Promise((resolve) => setTimeout(resolve, 0));
check('真路由：前进回到 classes（前进同样停得住，不被默认页覆盖）',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageClasses);

// —— 为什么 `goto` 必须带 `force: true` ——
//
// 下面几条要证的是「**守卫**会把越权身份挡回新角色首页」，但有个前提：守卫得真的被调用。
// vue-router 在 push 到**当前地址**时会短路掉整条守卫链 —— `pushWithRedirect` 里
// `if (!force && isSameRouteLocation(from, target))` 直接返回 `NAVIGATION_DUPLICATED`，
// **不调用 `navigate()`**，于是 `beforeEach` 一次都不跑（vue-router@4.6.4
// `dist/vue-router.mjs:1297`；`force` 取自原始 location，见同文件 :1286）。
//
// 这个短路**不报错**，所以症状是**静默空转**而不是失败：地址没变、守卫没跑、断言却
// 正好拿到它期望的值。本文件里所有「同一地址再进一次」的用例都会踩到 —— 包括上面
// staff 的「刷新等价」那 10 条（它们在加 `force` 之前，一条都没有真正验证过守卫）。
//
// 所以先把坑显形，并证明 `force` 就是解药。这两条钉的是**依赖的语义**，不是我们的守卫：
// 哪天 vue-router 改了这条语义（重复导航也开始跑守卫），它们会先红，
// 提醒我们 `force` 已经不是必需品 —— 而不是让上面那些用例继续以一种我们没意识到的方式成立。
await goto('/manage/questions', TEACHER);

currentUser.value = STUDENT;
await liveRouter.push('/manage/questions'); // 不带 force
check('依赖语义：同地址 push 跳过守卫（NAVIGATION_DUPLICATED 短路）—— 学生身份仍停在教师页',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.manageQuestions);

currentUser.value = STUDENT;
await liveRouter.push({ path: '/manage/questions', force: true });
check('依赖语义：同一地址加上 force，守卫立刻执行 —— 学生被挡回试卷列表',
  liveRouter.currentRoute.value.name, ROUTE_NAMES.papers);

// 跨角色切换：**换账号后不会沿用上一个角色的地址**。
// 真实链路是 `nav.js` 的 `goAfterLogin()` → `router.replace(homeFor(role).location)`，
// 而退出登录 / 改密 / 401 三个出口都先 `clearSession()` 再 `goLogin()`（`App.vue:792-822`）——
// 也就是说**换账号一定伴随一次导航**，不会停在原地址上。
//
// 下面这条是**用夹具逼近**那个状态（直接改身份 + 停在同地址），它证明的是
// 「真到了这一步，守卫会把人挡回新角色首页」；它**不是**在描述真实登录流程。
// 真实流程里的角色隔离由上面的越权深链用例证明 —— 那些用例地址是变的，走的是真导航。
await goto('/admin/users', ADMIN);
check('真路由：管理员停在 /admin/users 后换成教师身份再进同一地址 → 教师首页',
  (await goto('/admin/users', TEACHER)).name, ROUTE_NAMES.manageQuestions);
check('真路由：homeFor 三个角色都指向真实路由（不再有 legacy 出口）',
  [homeFor('student').location.name, homeFor('teacher').location.name, homeFor('admin').location.name],
  [ROUTE_NAMES.papers, ROUTE_NAMES.manageQuestions, ROUTE_NAMES.manageExams]);
check('真路由：homeFor 的返回值没有 legacy 字段了（消费方 applyLegacyTarget 已删除）',
  Object.keys(homeFor('teacher')), ['location']);

// clearExamReturn 之外，session 里不该再有任何「能在刷新后变空、又能决定页面」的状态
check('session：clearExamReturn 是函数（退出/401/改密的清理动作不能一起消失）',
  typeof clearExamReturn, 'function');

// ================================================================
// 第 4 部分：R3 静态断言 —— **全项目检索**证明遗留导航状态没有活引用
// ================================================================
/**
 * 为什么需要这一节：`decide()` 的矩阵只能证明「守卫的决策里没有遗留状态」，
 * 证明不了「没有别的地方还在读写它」。R3 的需求 2 要求的是后者，而且要求
 * **用检索 + 静态断言钉住**，不是靠阅读结论。
 *
 * 做法：把 `src/` 下所有源码文件读出来，**先剥掉注释**（否则会命中大量
 * 「这里原本有什么」的说明文字，那正是我们想保留的），再按词边界找这些标识符。
 *
 * 剥注释要处理三种构造，而且有**两个必须显式处理的坑**：
 *
 *   1. **三种注释必须放在同一条交替里**，不能「先剥块注释、再剥行注释」。反例就在本项目里：
 *      `App.vue` 有一条行注释写着「`views/student/*`、`views/shared/*`…」，若先剥块注释，
 *      那个 `/*` 会被当成块注释开头，一路吞到**下一个** `*/`（也就是下一条块注释的结尾），
 *      中间所有真实代码都不再被检查 —— 这是**静默的假阴性**，比误报危险得多。
 *      写成一条交替则是安全的：正则引擎从左到右扫描，**先出现的那个构造先赢**，
 *      「行注释里的 `/*`」永远轮不到被当成块注释开头。
 *   2. **要先把 `://` 与引号里的 `//` 换成占位符**，否则 `http://…` 和
 *      `value.startsWith('//')` 里的 `//` 会被当成行注释，把它后面的内容一起吃掉。
 *
 * 剩下的偏差方向是**误报**（比如某段注释没被剥干净 → 断言失败 → 人去核对），
 * 不会把真引用当成注释丢掉 —— 因为「真引用」在本仓库里全都形如 `xxx.value`，
 * 而剥除只会让文本变短，不会凭空造出一个标识符。
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolvePath(HERE, '..', '..'); // .../src
const THIS_FILE = resolvePath(fileURLToPath(import.meta.url));
const SCAN_EXT = new Set(['.js', '.mjs', '.cjs', '.vue', '.ts', '.html']);

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
      continue;
    }
    if (SCAN_EXT.has(extname(entry.name))) out.push(full);
  }
  return out;
};

/**
 * 占位符：**一个真实存在的控制字符**（单字节，`charCodeAt(0) < 0x20`）。
 *
 * ⚠️ 它在编辑器里是**看不见**的 —— `URL_GUARD` 的引号中间有**一个字符**，
 * 既不是空串也不是「没有内容」。别顺手把它「修掉」：一旦变成空串，
 * 还原那一步就退化成「在每两个字符之间插入 `://`」，会把待检源码改成另一段文本。
 *
 * 为什么必须用控制字符而不是 `'@@URL@@'` 这种看得见的字符串：这个占位符要临时
 * 顶替源码里所有的 `://`，稍后再换回来。若换成可见字符串，一旦被扫描的源码里
 * 正好出现同名文本，还原那一步就会**篡改源码**，把误报变成更难发现的假阴性。
 * 控制字符不可能出现在 `src/` 的任何源码里。它的长度与取值范围由下面一条 `check` 钉住。
 */
const URL_GUARD = '';

const stripComments = (text) =>
  text
    // 先保护 URL 的 `://` 与引号里的 `//`（`'//evil.com'` / `startsWith('//')`）
    .replace(/:\/\//g, URL_GUARD)
    .replace(/(['"`])\/\//g, `$1${URL_GUARD}`)
    // 三种注释放在**同一条交替**里，交给正则引擎从左到右决定谁先开始（见上方注释的坑 1）
    .replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    // 还原用 `split/join` 而不是 `new RegExp(URL_GUARD, 'g')`：前者把占位符当
    // **普通字符串**，无论占位符是哪个字符都不会踩到正则元字符的坑。
    .split(URL_GUARD)
    .join('://');

// 占位符本身看不见，只能靠断言让它显形。这条同时挡住「被谁顺手改成空串」。
check('静态检索：URL_GUARD 恰好是单个控制字符（空串会让还原步骤篡改源码文本）',
  URL_GUARD.length === 1 && URL_GUARD.charCodeAt(0) < 0x20, true);

/**
 * 这些标识符是 R3 要**彻底消灭**的：它们共同构成「页面身份的第二份存储」。
 * 任何一个重新出现在活代码里，都意味着「地址之外又有人能决定当前是哪一页」——
 * 那正是 R2A 那次「两份 activeExamId」事故的成因。
 */
const FORBIDDEN = [
  'legacyView',
  'legacyPracticeView',
  'legacyInitialized',
  'applyLegacyTarget',
  'setLegacyHome',
  'ensureLegacyDefaults',
  'resetLegacy',
  'goLegacyView',
  'isOnLegacyRoute',
  'inMigrated',
  'standalonePracticeViews',
  'legacyNavView',
  'currentView',
  'practiceView',
];

const scannedFiles = walk(SRC_DIR);
// 先证明「目录真的被走到了」：否则一个空目录也能让下面的零命中断言通过
check('静态检索：扫到的源码文件数 > 40（确认遍历没被静默跳过）',
  scannedFiles.length > 40, true);

const violations = [];
for (const file of scannedFiles) {
  // 本测试文件自身在 FORBIDDEN 数组里列出了这些名字，跳过它。
  // 忽略大小写再比一次：Windows 路径大小写不敏感，而命令行里写的目录大小写
  // 未必与磁盘上的一致（`THIS_FILE` 来自 `import.meta.url`，是原样保留的）。
  if (file.toLowerCase() === THIS_FILE.toLowerCase()) continue;
  const code = stripComments(readFileSync(file, 'utf8'));
  for (const name of FORBIDDEN) {
    if (new RegExp(`\\b${name}\\b`).test(code)) {
      violations.push(`${relative(SRC_DIR, file).replace(/\\/g, '/')}: ${name}`);
    }
  }
}

check('静态断言：src/ 下不存在任何遗留导航状态的**活引用**（注释已剥离）',
  violations, []);

// —— 反向断言：该在的必须在。只断言「没有」是不够的，一次把所有源码清空也能通过。 ——
const readSrc = (rel) => stripComments(readFileSync(join(SRC_DIR, rel), 'utf8'));

const sessionSrc = readSrc(join('router', 'session.js'));
check('静态断言：session.js 仍导出 homeFor（角色默认页不能一起消失）',
  /export const homeFor/.test(sessionSrc), true);
check('静态断言：session.js 仍导出 clearExamReturn（退出/401 的清理动作不能一起消失）',
  /export const clearExamReturn/.test(sessionSrc), true);
check('静态断言：session.js 仍导出 currentUser 与 examReturnLocation（身份与答题来源）',
  [/export const currentUser/.test(sessionSrc), /export const examReturnLocation/.test(sessionSrc)],
  [true, true]);
check('静态断言：session.js 不再导出任何 legacy 相关的东西（导出面就是事实清单）',
  /export const (legacy|resetLegacy|applyLegacy)/.test(sessionSrc), false);

const appSrc = readSrc('App.vue');
check('静态断言：App.vue 的正文渲染是无条件的（不再按 migrated 分派）',
  /<main class="iq-layout-main">[\s\S]*?<router-view(?:\s[^>]*)?(?:\s*\/>|>[\s\S]*?<\/router-view>)/.test(appSrc), true);
check('静态断言：App.vue 里没有遗留分派用的 v-if / v-else 三元',
  /inMigrated|v-if="currentView|practiceView/.test(appSrc), false);
check('静态断言：App.vue 仍把 appToast / appNavigate / appStaff 三个通道 provide 出去',
  ['appToast', 'appNavigate', 'appStaff'].map((k) => appSrc.includes(`provide('${k}'`)),
  [true, true, true]);

const manageGenerateSrc = readSrc(join('views', 'manage', 'ManageGeneratePage.vue'));
check('静态断言：staff 路由只缓存智能组卷页面（不恢复全局 v-show 常驻）',
  [
    /<KeepAlive\s+include="ManageGeneratePage">[\s\S]*?<component\s+:is="Component"\s*\/>[\s\S]*?<\/KeepAlive>/.test(appSrc),
    /defineOptions\(\{\s*name:\s*'ManageGeneratePage'\s*\}\)/.test(manageGenerateSrc),
    /generateExamMounted|v-show="[^\"]*manageGenerate|v-show="[^\"]*generate/.test(appSrc),
  ],
  [true, true, false]);

const aiSrc = readSrc(join('components', 'AIAssistant.vue'));
check('静态断言：AIAssistant 的 assistantState 兜底里没有遗留状态键（没有第二个默认语义）',
  /assistantState = inject\('assistantState',\s*\{[\s\S]*?\}\)/.test(aiSrc) &&
    !/currentView|practiceView/.test(aiSrc),
  true);

// ---------------------------------------------------------------- 结果
console.log(`\n守卫/白名单矩阵：通过 ${passed} / ${passed + failures.length}`);
if (failures.length) {
  console.log('\n未通过：');
  for (const f of failures) {
    console.log(`  ✗ ${f.label}\n      期望 ${f.expected}\n      实际 ${f.actual}`);
  }
  process.exitCode = 1;
} else {
  console.log('全部通过。');
}
