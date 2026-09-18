/**
 * 路由表。
 *
 * 约定：
 * - 本文件**不 import 任何 .vue**，每个路由只写一个组件**键名**（`component`），
 *   由 `index.js` 映射到真实组件。这样守卫与重定向规则可以在 Node 里用
 *   `createMemoryHistory` 真跑一遍（不依赖 DOM、不需要 .vue 编译器）。
 * - `meta.roles` 是**唯一**的角色规则来源（守卫、redirect 白名单校验读的都是它）。
 * - `meta.migrated` 标记「该页面已路由化，由 URL 唯一驱动」。**没有任何 watch 在路由与
 *   页面状态之间互相同步**。
 *   ⚠️ R3 之后**每一条**业务路由都带这个标记 —— 它已经不再有区分能力：
 *   `App.vue` 里那个「看 migrated 决定渲染 router-view 还是遗留分支」的三元判断连同
 *   遗留分支一起删掉了（`<router-view>` 现在是无条件的）。保留该字段是为了让
 *   `guard-matrix.mjs` 的「放行的页面必须真有正文」这类断言继续有锚点，
 *   以及给 R4「把剩余页面规则收进守卫」留一个统一的落点。**它是 R5/R6 的候选删除项**。
 * - `meta.context` 供 AI 助手判断当前场景（route-derived 的只读值，替代 `practiceView` 哨兵）。
 * - `meta.tab` 是学生顶部标签的高亮键（`null` = 该页面不占任何标签）。
 * - `meta.crumb` 是教师/管理员顶栏面包屑的当前段（学生端没有面包屑，故只有共享页需要它）。
 *
 * 命名沿革：R1 时这个标记叫 `meta.pilot`（只有 2 条「试点」路由）。R2A 起迁移页面不再是个位数，
 * 「试点」一词已不准确，故改名 `meta.migrated` —— **纯重命名，语义未变**。
 */

/** 路由名常量：代码里一律用命名路由对象，不拼字符串路径。 */
export const ROUTE_NAMES = {
  root: 'root',
  login: 'login',
  legacy: 'legacy',
  // —— 学生端 ——
  papers: 'student.papers',
  exam: 'student.exam',
  adaptive: 'student.adaptive',
  review: 'student.review',
  records: 'student.records',
  recordDetail: 'student.record-detail',
  analysis: 'student.analysis',
  // —— 教师 / 管理员端（R3 迁移）——
  manageQuestions: 'manage.questions',
  manageExams: 'manage.exams',
  manageGenerate: 'manage.generate',
  manageClasses: 'manage.classes',
  manageAnalysis: 'manage.analysis',
  manageAdaptive: 'manage.adaptive',
  manageReview: 'manage.review',
  manageExamAnalysis: 'manage.exam-analysis',
  adminUsers: 'admin.users',
  adminAudit: 'admin.audit',
  // —— 三角色共享 ——
  profile: 'profile',
  feedback: 'feedback',
  unknown: 'unknown',
};

/**
 * 不渲染任何内容的占位组件键：`root` / `login` / `legacy` / 兜底路由**只作地址标记**。
 *
 * ⚠️ R3 之前这里写的是「正文仍由 App.vue 的遗留分支渲染」—— 那句话现在**不成立**：
 * 遗留分支已全部删除，而守卫对这四条路由**每一条都会重定向走**（见 `guard.js`），
 * 所以它们不会停在屏幕上，也就永远不需要正文。留着这个占位组件是为了让路由表
 * 在被 `createMemoryHistory` 单独加载时（守卫矩阵）仍然结构完整。
 */
export const EMPTY_COMPONENT = 'empty';

export const ALL_ROLES = ['student', 'teacher', 'admin'];

const STUDENT_ONLY = ['student'];

export const routes = [
  // 冷启动入口：`index.html` 没有 hash 时落在 `/`。守卫按角色落到默认页。
  { path: '/', name: ROUTE_NAMES.root, component: EMPTY_COMPONENT, meta: { roles: ALL_ROLES } },
  // 登录页本身不是路由页面：未登录时 App.vue 的登录闸门负责渲染。这条只是地址标记 + redirect 的落点。
  { path: '/login', name: ROUTE_NAMES.login, component: EMPTY_COMPONENT, meta: { roles: ALL_ROLES } },
  /**
   * `#/legacy` —— **R3 之后它不再代表任何页面**，只剩「老书签兼容别名」这一个作用。
   *
   * 沿革：R1 时它是「尚未迁移页面」的受控出口；R2B 起学生端已无未迁移页面，于是对学生
   * 变成无条件重定向；R3 把教师/管理员的 10 个页面全部迁走后，**三个角色都没有未迁移页面**，
   * 于是守卫那一支统一成「静默回角色首页」（见 `guard.js` 的 legacy 分支）。
   *
   * 为什么**保留这条路由**而不是删掉：教师/管理员的整个业务区在 R3 之前地址一直是
   * `#/legacy`，用户书签里很可能就是它。删掉会落到兜底 `unknown`，用户会收到
   * 「页面不存在」的提示；留着则是**静默**换到角色首页——同样的结果，不把一次正常的
   * 迁移说成用户走错了地址。这也是它必须排在兜底路由之前的原因。
   */
  { path: '/legacy', name: ROUTE_NAMES.legacy, component: EMPTY_COMPONENT, meta: { roles: ALL_ROLES } },

  // ================= 学生端（R2A 迁移）=================
  {
    path: '/papers',
    name: ROUTE_NAMES.papers,
    component: 'exam-list',
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'papers', tab: 'papers' },
  },
  {
    path: '/exam/:examId',
    name: ROUTE_NAMES.exam,
    component: 'exam-practice',
    /**
     * 答题页（R2B）。**试卷 id 由 URL 唯一驱动** —— 这是 R2B 的核心：
     * 迁移前答卷身份存在内存里的 `activeExamId`，刷新即丢；现在刷新 = 同一地址，
     * 按服务端状态与草稿恢复（不新增考试次数、不重置时限，见 `startExamApi` 的幂等性）。
     *
     * `tab: null`：答题页占满正文、自带顶部横幅，不属于任何一个顶部标签。
     * 迁移前它也没有高亮任何标签（`currentView='practice'` 不对应任何 tab 键），此处保持一致。
     *
     * —— `context: 'practice/exam'` 的来龙去脉（**这个字面量是一次有意的行为变更**）——
     *
     * `meta.context` 同时喂给两个消费者：
     *   · 前端 `AIAssistant.contextMode` → `CONTEXT_META[key]` → 悬浮球文案与快捷按钮
     *   · 后端 chat 的 `currentPage`    → `inExam` 分支（考试中拦截组卷 / 同类 / 浓缩）
     *
     * ⚠️ **迁移前学生答题页发的不是 `'practice/exam'`**（早先的注释在这里写错过，已纠正）。
     * 实测 `git show HEAD:src/App.vue`：
     *   · `startExam()` 的**学生**分支只设 `currentView='practice'`，**不设 `practiceView`**，
     *     而 `practiceView` 的初值是 `ref('exams')`（`App.vue:570`）⇒ 学生答题页上
     *     `practiceView === 'exams'`；
     *   · 于是迁移前：`contextMode = 'exams'`（→ `CONTEXT_META['exams']`，那是**教师试卷列表**
     *     的文案：「试卷列表」已就绪…），`currentPage = 'practice/exams'` ⇒ `inExam = false`。
     *   （`practiceView = 'practice'` 只在 `startExam` 的**非学生**分支写过，而教师/管理员点
     *     「开始答题」走的是 `ExamList` 的预览弹窗 `openPreview`，根本不进答题页 ⇒ 那条分支是死代码。）
     *
     * 所以选 `'practice/exam'` 会带来**两处可见变化**，都是有意为之、都记在 R2B 报告里：
     *   1. 悬浮球文案：由「试卷列表」那句（本来是**串到答题页上的错文案**）换成**专门为答题页写的**
     *      `CONTEXT_META['practice/exam']`。两个 key 都**不含** `hint`/`similar`，红线不受影响。
     *   2. `inExam`：false → **true**，即「考试中拦截组卷 / 同类 / 浓缩」这条后端规则**新被激活**。
     *      方向是**收紧**（只拦不给），并且在答题页上**顺带挡掉了**「浓缩错题」那条既有 500
     *      （`findRecentWrongAnswers` 引用了没 JOIN 进来的 `eq` 别名，见 R2B 报告 §4.3）。
     *      选 `'practice/exam'` 的依据是**真实后端探针**（`r2b-probe-ai-context.mjs`，只发只读消息）：
     *          page='practice/exam' + examId    ⇒ inExam=**true**（回「答题过程中该功能暂不可用…」）
     *            （探针当时回的原文是「正式考试中…」；2026-09-15 按用户裁决只改这句文案为
     *              「答题过程中…」，**判定范围一字未动**，见 R2B 报告 §5.2 的 D1/D2 裁决记录）
     *          page='practice/exam' + 无 examId ⇒ false
     *          page='exam' / 'exam-practice'    ⇒ false
     *      写成 `'exam'` 虽同样不会摆出 hint/similar，但那两个 key 是**给教师侧**的语义，
     *      且会让 `inExam` 保持 false —— 与「用户此刻正在答题」的实际状态不符。
     * 若日后要**严格复刻迁移前**（连错文案一起保留），唯一做法是写 `'exams'`；
     * 那是「保持 bug」而不是「保持行为」，本文件不采用。
     */
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'practice/exam', tab: null },
  },
  {
    path: '/adaptive',
    name: ROUTE_NAMES.adaptive,
    component: 'adaptive-practice',
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'adaptive', tab: 'adaptive' },
  },
  {
    path: '/review',
    name: ROUTE_NAMES.review,
    component: 'question-review',
    // context 仍是 'review'（不是 'wrong-book'）：迁移前 `currentView='review'` 时
    // CONTEXT_META 里没有 `review` 键，AI 走 default 文案。R2A **保持行为等价**，不改这个。
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'review', tab: 'review' },
  },
  {
    path: '/records',
    name: ROUTE_NAMES.records,
    component: 'records-list',
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'records', tab: 'records' },
  },
  {
    path: '/records/:recordId',
    name: ROUTE_NAMES.recordDetail,
    component: 'record-detail',
    // 详情页占「答题记录」这个标签（迁移前 `currentView='record-detail'`，标签同样是答题记录）
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'record-detail', tab: 'records' },
  },
  {
    path: '/analysis',
    name: ROUTE_NAMES.analysis,
    component: 'learning-analysis',
    meta: { roles: STUDENT_ONLY, migrated: true, context: 'analysis', tab: 'analysis' },
  },

  // ================= 三角色共享（R2A 迁移）=================
  // 保留原有 props / 事件 / 权限：`Profile` 无 props、只发 `profile-updated`；
  // `Feedback` 需要 `role`、只发 `toast`。三者的 `meta.roles` 都是 ALL_ROLES，
  // 所以守卫放行后**三个角色都必须能渲染出正文**（不能放行后空白）。
  {
    path: '/profile',
    name: ROUTE_NAMES.profile,
    component: 'profile',
    meta: { roles: ALL_ROLES, migrated: true, context: 'profile', tab: null, crumb: '个人中心' },
  },
  {
    path: '/feedback',
    name: ROUTE_NAMES.feedback,
    component: 'feedback',
    meta: { roles: ALL_ROLES, migrated: true, context: 'feedback', tab: null, crumb: '用户反馈' },
  },

  // ================= 教师 / 管理员端（R3 迁移）=================
  /**
   * 这 10 条与 `docs/evidence-r3/R3-01-视图对照表.md` 逐行对应，**不多不少**。
   * 判断「有几条」的依据是实际可入口，不是 `currentView` / `practiceView` 的枚举域：
   * 后者的 `wrong-book` / `adaptive` / `adaptive-progress` / `records` / `stats`
   * 五个值在模板里**没有任何渲染分支**，迁移前落上去就是空白正文，故不建路由。
   *
   * 三条贯穿全组的约定：
   * - `meta.roles` 是角色规则的**唯一**来源（守卫与本文件外的任何判断都读它）；
   * - `meta.context` 取**迁移前的 `contextMode`**（不是 `currentPage`）—— 取舍依据见对照表 §3，
   *   要点是它决定 AI 悬浮球的**用户可见文案**，而教师端的 `currentPage` 在后端是语义惰性的
   *   （`aiAssistantService.js` 全文只比较 `'practice/exam'` 一处字面量）；
   * - `meta.crumb` 是顶栏面包屑的当前段，字符串与迁移前 `currentBreadcrumb`（`App.vue:776-803`）
   *   的输出**逐字一致**，含「出卷与学生管理 / 」前缀。
   *
   * 全部 **无 params、无 query**：`R3-01-视图对照表.md` §2 已核对，教师/管理端没有任何
   * 带参数的页面，所以「参数切换被过期请求回填」这类风险在本轮没有载体。
   */
  {
    // currentView='main'：题库管理（侧栏第一项，teacher 与 admin 都有）
    path: '/manage/questions',
    name: ROUTE_NAMES.manageQuestions,
    component: 'manage-questions',
    meta: { roles: ['teacher', 'admin'], migrated: true, context: 'main', crumb: '题库管理' },
  },
  {
    // practiceView='exams'：教师经子导航进入，管理员经侧栏「试卷列表管理」进入
    path: '/manage/exams',
    name: ROUTE_NAMES.manageExams,
    component: 'manage-exams',
    meta: {
      roles: ['teacher', 'admin'],
      migrated: true,
      context: 'exams',
      crumb: '出卷与学生管理 / 试卷列表',
    },
  },
  {
    /**
     * practiceView='generate'：**仅教师**。
     *
     * 迁移前的三处判据都是「非教师不得入」：侧栏按钮 `role === 'teacher'`、
     * 子导航按钮 `v-if="currentUser.role === 'teacher'"`、正文
     * `v-if="practiceView === 'generate' && currentUser.role === 'teacher'"`。
     * 管理员**过去进不去**（点学情分析的「智能组卷」会得到空白正文），
     * 现在由 `meta.roles` 明确拒绝并回管理员首页 —— 是**收紧到既定边界**，不是新限制，
     * 更不得因为「有了路由」就顺手放开。
     */
    path: '/manage/generate',
    name: ROUTE_NAMES.manageGenerate,
    component: 'manage-generate',
    meta: { roles: ['teacher'], migrated: true, context: 'generate', crumb: '出卷与学生管理 / 智能组卷' },
  },
  {
    // practiceView='classes'：班级管理
    path: '/manage/classes',
    name: ROUTE_NAMES.manageClasses,
    component: 'manage-classes',
    meta: {
      roles: ['teacher', 'admin'],
      migrated: true,
      context: 'classes',
      crumb: '出卷与学生管理 / 班级管理',
    },
  },
  {
    // practiceView='learning-analysis'：侧栏文案按角色不同（学情分析 / 学生个性化分析），
    // 但正文与面包屑是同一份，所以只有一条路由。面包屑用的是旧映射表的 '学习分析' 原文。
    path: '/manage/analysis',
    name: ROUTE_NAMES.manageAnalysis,
    component: 'manage-analysis',
    meta: {
      roles: ['teacher', 'admin'],
      migrated: true,
      context: 'learning-analysis',
      crumb: '出卷与学生管理 / 学习分析',
    },
  },
  {
    // practiceView='adaptive-overview'：自适应学情
    path: '/manage/adaptive',
    name: ROUTE_NAMES.manageAdaptive,
    component: 'manage-adaptive',
    meta: {
      roles: ['teacher', 'admin'],
      migrated: true,
      context: 'adaptive-overview',
      crumb: '出卷与学生管理 / 自适应学情',
    },
  },
  {
    /**
     * practiceView='adaptive-review'：主观题复核，**仅教师**。
     * 侧栏按钮与正文分支的判据都是 `role !== 'admin'`；学生看不到 staff 侧栏、
     * 也进不来 staff 布局，故「非 admin」在可达集合上等价于「仅 teacher」。
     */
    path: '/manage/review',
    name: ROUTE_NAMES.manageReview,
    component: 'manage-review',
    meta: {
      roles: ['teacher'],
      migrated: true,
      context: 'adaptive-review',
      crumb: '出卷与学生管理 / 主观题复核',
    },
  },
  {
    // practiceView='admin-records'：试卷分析
    path: '/manage/exam-analysis',
    name: ROUTE_NAMES.manageExamAnalysis,
    component: 'manage-exam-analysis',
    meta: {
      roles: ['teacher', 'admin'],
      migrated: true,
      context: 'admin-records',
      crumb: '出卷与学生管理 / 试卷分析',
    },
  },
  {
    // currentView='users'：用户管理，**仅管理员**（侧栏分组本身就有 role === 'admin'）
    path: '/admin/users',
    name: ROUTE_NAMES.adminUsers,
    component: 'admin-users',
    meta: { roles: ['admin'], migrated: true, context: 'users', crumb: '用户管理' },
  },
  {
    // currentView='audit'：注册审核，**仅管理员**
    path: '/admin/audit',
    name: ROUTE_NAMES.adminAudit,
    component: 'admin-audit',
    meta: { roles: ['admin'], migrated: true, context: 'audit', crumb: '注册审核' },
  },

  // 兜底：**不给 404 页面**（D2）。守卫一定会把它重定向到角色首页。
  { path: '/:pathMatch(.*)*', name: ROUTE_NAMES.unknown, component: EMPTY_COMPONENT, meta: { roles: ALL_ROLES } },
];
