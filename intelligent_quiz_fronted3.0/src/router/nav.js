/**
 * 统一导航入口。
 *
 * 规矩（对应实施计划 §5.3）：
 * - push/replace 的入参一律是**命名路由对象**；展示地址里的 `#` 永不传进来。
 * - 组件（含 AI 助手）不得直接改导航 ref，一律调这里的函数。
 *
 * R3 之后这里**没有「写遗留状态」这件事了**（`goLegacyView` 已删除）：页面身份只有一个来源
 * ——地址。所有函数都退化成「把命名路由对象 push/replace 进去」，唯一的例外是
 * `exitExam` / `backFromRecordDetail`，它们要在「记忆的来源」与「浏览器历史」之间做选择。
 */
import { router } from './index';
import { ROUTE_NAMES } from './routes';
import { FORBIDDEN_NOTICE, isReliableBackTarget, normalizeRedirect } from './guard';
import { normalizeFeature, resolveFeatureTarget } from './feature';
import { currentUser, examReturnLocation, homeFor } from './session';

/**
 * 当前是否处在**已迁移**路由上（页面由 URL 唯一驱动）。R1 时这个函数叫 `isOnPilotRoute`。
 *
 * R3 起每条业务路由都带 `meta.migrated`，所以它恒为 `true`，**已无区分能力**；
 * 它当前没有调用点（R1/R2 期间就没有了）。按「不清与本次迁移无关的既存代码」保留原样，
 * 与 `meta.migrated` 一起列为 R5/R6 的候选删除项。
 *
 * `isOnLegacyRoute` 已随 `goLegacyView` 一起删除：R3 之后没有任何页面需要「判断自己在不在
 * legacy 出口上」——那个出口对所有人都只是换乘站。
 */
export const isOnMigratedRoute = () => router.currentRoute.value.meta?.migrated === true;

/**
 * 已经在目标路由上就不要再 push：Vue Router 对同一地址的重复导航会返回一个 duplicated
 * 失败对象（未捕获时刷控制台告警），而「点当前标签」「深链后点下拉菜单」都是真实会发生的。
 *
 * 入参两种形态：
 * - 路由名字符串 —— 无参数页面（试卷列表 / 自适应 / 学情分析 / 个人资料 …）；
 * - 命名路由对象   —— **带参数**页面。答题页退出要回到「从哪进来的那一页」，而从
 *   `#/records/1` 进来的话目标带 `recordId`，只传名字会触发
 *   「Missing required param "recordId"」的导航失败（详见 App.vue `examReturnRoute`）。
 */
const pushIfDifferent = (target) => {
  const current = router.currentRoute.value;
  if (typeof target === 'string') {
    if (current.name === target) return;
    router.push({ name: target });
    return;
  }
  if (
    current.name === target.name &&
    JSON.stringify(current.params || {}) === JSON.stringify(target.params || {})
  ) {
    return;
  }
  router.push(target);
};

/** 学生顶部标签（键）→ 路由名。R2A 起 5 个标签全部是真实路由。 */
const STUDENT_PAGE_ROUTES = {
  papers: ROUTE_NAMES.papers,
  adaptive: ROUTE_NAMES.adaptive,
  review: ROUTE_NAMES.review,
  records: ROUTE_NAMES.records,
  analysis: ROUTE_NAMES.analysis,
};

/**
 * 跳到**已迁移**页面（答题页退出、学情分析「去练习」、登录后的功能入口）。
 * 入参同 `pushIfDifferent`：路由名（无参数页面）或命名路由对象（带参数页面）。
 */
export const goRoute = (target) => pushIfDifferent(target);

/**
 * 学生顶部标签的统一入口。返回 `false` 表示这个键没有对应路由（当前 5 个键都有）。
 * 保留返回值是为了让调用方在标签表出现新键时能显式处理，而不是静默什么都不做。
 */
export const goStudentPage = (key) => {
  const name = STUDENT_PAGE_ROUTES[key];
  if (!name) return false;
  pushIfDifferent(name);
  return true;
};

/** 三角色共享页面（个人资料 / 用户反馈）。 */
export const goProfile = () => pushIfDifferent(ROUTE_NAMES.profile);

export const goFeedback = () => pushIfDifferent(ROUTE_NAMES.feedback);

/** 角色默认首页（面包屑「首页」/ 登录兜底 / 越权兜底）。R3 起三个角色都是真实路由。 */
export const goRoleHome = (role = currentUser.value?.role) => {
  const target = homeFor(role).location;
  if (router.currentRoute.value.name !== target.name) router.push(target);
};

/**
 * 目标路由是否对当前角色开放。**读的还是 `meta.roles` 这一份规则**（与守卫同源），
 * 组件里不另抄一张角色表。
 *
 * 用途只有一个：调用方在跳转前想**先决定提示语**时用（例如学情分析的「智能组卷」，
 * 管理员点了会被守卫挡回首页，此时不该先弹「已跳转到智能组卷」再弹「无权访问」）。
 * 它**不是**权限判定 —— 真正的边界永远是守卫；这里返回 `true` 也只说明「守卫会放行」。
 */
export const isRouteAllowed = (name, role = currentUser.value?.role) =>
  !!router.resolve({ name }).meta?.roles?.includes(role);

/** 退出登录 / 401 过期：清会话后回登录页（可带上站内目标）。 */
export const goLogin = ({ redirect } = {}) => {
  const query = redirect ? { redirect } : {};
  if (router.currentRoute.value.name === ROUTE_NAMES.login) return;
  router.replace({ name: ROUTE_NAMES.login, query });
};

/**
 * 未登录时点击登录页的功能入口：把目标写进地址（`#/login?feature=generate`）。
 *
 * 两个刻意的选择：
 * - 用 `replace`：这是**修正性**跳转（用户还在登录页上，只是改主意点了哪个入口），
 *   不该在历史里留下「点了三次入口」三条记录。
 * - 查询串里**只带 feature**：用户既然改点了功能入口，原来那个「登录后回原页面」
 *   （`?redirect=`）的意图就被覆盖了 —— 两个目标并存只会让「谁优先」变成一条没人记得住的隐式规则。
 *
 * 地址即状态：刷新后 `?feature=` 还在，所以「登录后去哪个功能」不会被刷新清掉。
 * 返回 `false` 表示这个 feature 不在白名单里（地址一个字节都不动）。
 */
export const goLoginWithFeature = (feature) => {
  const key = normalizeFeature(feature);
  if (!key) return false;
  const current = router.currentRoute.value;
  if (
    current.name === ROUTE_NAMES.login &&
    current.query?.feature === key &&
    !current.query?.redirect
  ) {
    return true;
  }
  router.replace({ name: ROUTE_NAMES.login, query: { feature: key } });
  return true;
};

/**
 * 登录成功后落地：redirect 白名单 → 无则角色首页。
 *
 * R3 之前这里还要「把遗留状态复位到该角色默认页」（避免换角色登录后遗留状态还是上一个角色的
 * 页面）。遗留状态没了，这个动作随之消失；而现在**换角色登录也不会串页**，靠的不再是复位，
 * 而是「页面身份只在地址里」—— 上一个角色的地址会被新角色的 `meta.roles` 挡回新角色首页。
 */
export const goAfterLogin = (role, redirectPath) => {
  const target = redirectPath
    ? normalizeRedirect(redirectPath, role, (path) => router.resolve(path))
    : null;
  if (target) {
    router.replace(target);
    return true;
  }
  router.replace(homeFor(role).location);
  return false;
};

/**
 * 登录成功后按地址里的 `?feature=` 落地（`goAfterLogin` 之后调用，故它是**第二优先**）。
 *
 * 落点由候选项自己的 `meta.roles` 决定（见 `feature.js`，那里没有任何角色字面量）：
 * - 有角色能进的候选 → `replace` 过去，返回 `{ ok: true }`；
 * - **一个都进不去**（学生点「智能组卷」、教师点「自适应练习」…）→ 返回统一越权文案，
 *   由调用方提示并回角色首页。**不降级到相近页面**，也不在这里直接跳首页 ——
 *   「回首页」是调用方与守卫共有的收尾动作，写两遍就会出现两条不同的收尾路径。
 */
export const goFeatureLanding = (feature, role = currentUser.value?.role) => {
  const target = resolveFeatureTarget(feature, role, (location) => router.resolve(location));
  if (!target) return { ok: false, message: FORBIDDEN_NOTICE.message };
  router.replace(target);
  return { ok: true };
};

/**
 * —— 学生端答题页（R2B）——
 *
 * R2B 之前答题页不是路由页：它的身份是内存里的 `activeExamId`，地址永远停在 `#/legacy`。
 * 现在它是 `#/exam/:examId`，**试卷 id 由地址唯一驱动**：
 * 刷新 = 同一地址 → 同一个 `examId` → 后端 `startOrResume` 返回同一次作答
 * （已实测：重复调用 `/start` 的 `attemptNo` 与 `startedAt` 都不变，不新增次数、不重置时限）。
 *
 * 所有答题入口（试卷列表「开始答题」、题目复盘「重新练习」、AI 助手生成练习卷）
 * **统一走这一个函数**，不再有第二个写入方 —— R2A 的「两份 `activeExamId`」事故就是
 * 两个人写同一份状态导致的，这里从入口数上杜绝。
 */
export const goExam = (examId) => {
  rememberExamReturn();
  router.push({ name: ROUTE_NAMES.exam, params: { examId: String(examId) } });
};

/** 取「当前页面的完整站内位置」（命名路由对象，含 params 与 query）。 */
const currentLocation = () => {
  const current = router.currentRoute.value;
  if (!current?.name || current.name === ROUTE_NAMES.unknown) return null;
  return {
    name: current.name,
    params: { ...current.params },
    query: { ...current.query },
  };
};

/**
 * 记住「退出答题页该回哪里」。**在写入时就完成全部校验**，消费端只认已校验的值。
 *
 * 只记满足以下全部条件的来源：
 *   1. 站内已知路由（当前路由本身，故必然 matched）；
 *   2. 不是导航死路（`login` / `root` / `unknown`）—— 回去只会被守卫再弹一次；
 *   3. **不是另一张答题页** —— 否则 A→B 之后退出会把用户送回 A，等于用答题页当兜底；
 *   4. `meta.roles` 含当前角色 —— 防「教师在上一个页面 → 退出」时把他送去学生页面。
 *
 * 已在答题页上时（未来若出现「答题页直接跳答题页」）**保留原有来源**而不是覆盖成 null：
 * 换卷不该丢掉最初是从哪儿进来的。
 */
const rememberExamReturn = () => {
  const role = currentUser.value?.role ?? null;
  const current = router.currentRoute.value;
  if (current?.name === ROUTE_NAMES.exam) return;

  const location = currentLocation();
  const roles = current?.meta?.roles;
  const usable =
    location &&
    location.name !== ROUTE_NAMES.login &&
    location.name !== ROUTE_NAMES.root &&
    location.name !== ROUTE_NAMES.unknown &&
    (!roles || roles.includes(role));

  examReturnLocation.value = usable ? location : null;
};

/**
 * 退出答题页（顶部「✕ 退出」/ 结果页「返回列表」）。
 *
 * 三条来源，按可信度排：
 *   1. `examReturnLocation`（进入答题页时记下的完整站内来源）；
 *   2. 浏览器历史的上一页 —— 只在通过 `isReliableBackTarget` 校验时才用。
 *      注意这里把 `currentName` 传成 `exam`：该校验会**顺带拒绝「上一页也是答题页」**，
 *      正是「不把另一张答题页作为退出兜底」那一条。也**不做无条件 `router.back()`**：
 *      深链进来时上一页是站外/登录页，会被拒。
 *   3. 都没有（直接深链、刷新后模块状态重建、来源是登录页）→ 试卷列表。
 *
 * 用 `push` 而不是 `replace`：与 R2A 的退出行为一致（`goRoute` 就是 push），
 * 且「浏览器后退重进刚交过的卷」是**服务端规则说了算**的真实场景 ——
 * 有 `max_attempts` 的卷会被 `/start` 判为不可作答（明确结果），没有的则按规则新开一次作答。
 */
export const exitExam = () => {
  const remembered = examReturnLocation.value;
  if (remembered) {
    router.push(remembered);
    return;
  }
  const role = currentUser.value?.role ?? null;
  const back = router.options.history.state?.back;
  if (isReliableBackTarget(back, role, (path) => router.resolve(path), ROUTE_NAMES.exam)) {
    router.back();
    return;
  }
  goPapers();
};

/** 学生试卷列表（答题页退出的兜底目标）。 */
export const goPapers = () => pushIfDifferent(ROUTE_NAMES.papers);

/** —— 已迁移路由入口（学生端答题记录）—— */
export const goRecords = () => pushIfDifferent(ROUTE_NAMES.records);

export const goRecordDetail = (recordId) =>
  router.push({ name: ROUTE_NAMES.recordDetail, params: { recordId: String(recordId) } });

/**
 * 进入记录列表。用 `replace`：这是**修正性**跳转，不该在历史里留下中间态。
 * 两个调用点：
 * - 「返回」在来源不可靠时的兜底；
 * - 错误 / 空状态那个「返回列表」按钮 —— 它必须**真的进入列表**，
 *   不能走历史后退（A→B 之后再后退会落回 A 的详情页）。
 */
export const goRecordsList = () => router.replace({ name: ROUTE_NAMES.records });

/**
 * 正常详情页「返回」的语义（§4.5）：**有可靠的站内来源就返回，否则回记录列表**。
 * 不允许无条件 `router.back()` —— 深链直接进来时会把用户带出本项目。
 *
 * 「来源是否可信」的规则本体在 `guard.js` 的 `isReliableBackTarget`（纯函数，Node 里可单测），
 * 这里只负责把真实的 `router.resolve` 注入进去。
 */
export const backFromRecordDetail = (role = currentUser.value?.role) => {
  const back = router.options.history.state?.back;
  const currentName = router.currentRoute.value.name;
  if (isReliableBackTarget(back, role, (path) => router.resolve(path), currentName)) {
    router.back();
    return;
  }
  goRecordsList();
};

/**
 * AI 助手的业务跳转映射（§4.3）。**只映射确有业务对应的目标**；
 * 对不上或角色不允许的一律返回 `{ ok:false, message }`，由助手面板给出明确提示，
 * **不映射成相近页面**。
 *
 * R3 起这张表里**每一项都是真实路由**（`legacy` 那种目标形态已随遗留状态删除）：
 * 学生 4 项 R2A 就迁了，教师/管理员的 `learning-analysis` 在本轮迁到 `manage.analysis`。
 * `stats` / `adaptive-progress` 依然**没有对应页面** —— 它们在当前版本只出现在旧面包屑/
 * 标题映射表里（那个映射表已作为死代码随页面一起删除），保持明确不导航。
 *
 * 注意 `learning-analysis` 的 staff 目标是 `manage.analysis`，其 `meta.roles` 含 admin ——
 * 与迁移前一致（管理员点这个入口落在「学生个性化分析」页上，也就是同一个组件）。
 */
export const AI_BUSINESS_TARGETS = {
  'learning-analysis': {
    student: { route: { name: ROUTE_NAMES.analysis } },
    staff: { route: { name: ROUTE_NAMES.manageAnalysis } },
  },
  adaptive: { student: { route: { name: ROUTE_NAMES.adaptive } }, unavailable: '该功能仅学生端可用。' },
  records: { student: { route: { name: ROUTE_NAMES.records } }, unavailable: '该功能仅学生端可用。' },
  // 真实错题本挂在「题目复盘」页内（QuestionReview.vue:41）
  'wrong-book': { student: { route: { name: ROUTE_NAMES.review } }, unavailable: '该功能仅学生端可用。' },
  // 下面两个在当前版本**没有任何对应页面**，明确不导航
  stats: { unavailable: '当前版本没有「我的统计」这一页，暂时不能跳转。' },
  'adaptive-progress': { unavailable: '当前版本没有「自适应成果」这一页，暂时不能跳转。' },
};

export const goAiBusiness = (key, role = currentUser.value?.role) => {
  const map = AI_BUSINESS_TARGETS[key];
  if (!map) return { ok: false, message: '这个入口暂时没有对应页面。' };

  const target = role === 'student' ? map.student : map.staff;
  if (!target) return { ok: false, message: map.unavailable || '这个入口暂时没有对应页面。' };

  pushIfDifferent(target.route.name);
  return { ok: true };
};
