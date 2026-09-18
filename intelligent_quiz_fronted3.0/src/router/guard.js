/**
 * 导航守卫与 redirect 白名单（R1）。
 *
 * 设计要点：
 * - `decide()` 是**纯决策函数**：只吃 `(to, user, resolve)`，返回一个决策对象，不碰 router、不碰 DOM。
 *   `installGuard()` 负责把决策翻译成 Vue Router 的返回值 + 遗留状态写入 + 提示。
 *   这样「越权 / 未知地址 / redirect 白名单 / 登录循环」这些规则可以在 Node 里真跑（见 routes.js 头注释）。
 * - `meta.roles` 是唯一的角色规则来源：守卫和 redirect 校验读同一份，不存在第二张权限表。
 */
// 注意：这里的相对导入**必须带 .js 扩展名**。Vite 两种写法都能解析，
// 但纯 Node（验收项 A 的守卫矩阵就是直接用 node 跑）只认带扩展名的 ESM 说明符。
import { ROUTE_NAMES } from './routes.js';
import { currentUser, homeFor, notify } from './session.js';

/**
 * redirect 白名单校验（§3.2）。**这是唯一实现点**，登录页 4 个 feature 入口与守卫都走它。
 *
 * 规则（按顺序）：
 *  1. 只接受站内路径：字符串、以 `/` 开头、不是 `//`（协议相对地址）、不含 `#`。
 *     外部地址（`http(s):`、`javascript:`、`//host`）一律丢弃。
 *  2. 必须能解析成已知路由：`matched.length === 0` 或落到兜底 `unknown` → 丢弃。
 *  3. 必须再查一次角色：目标路由的 `meta.roles` 不含当前角色 → 丢弃（角色二次校验）。
 *  4. 不许指向 `login` 自身 → 丢弃（防登录循环）。
 *  5. 返回值**只含 `name` / `params` / `query`**（命名路由对象），展示地址里的 `#` 永不进入 push/replace。
 */
export const normalizeRedirect = (value, role, resolve) => {
  if (typeof value !== 'string' || value === '') return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.includes('#')) return null;

  const resolved = resolve(value);
  if (!resolved || !resolved.matched || resolved.matched.length === 0) return null;
  if (resolved.name === ROUTE_NAMES.unknown || resolved.name === ROUTE_NAMES.login) return null;

  const roles = resolved.meta?.roles;
  if (roles && !roles.includes(role)) return null;

  return { name: resolved.name, params: { ...resolved.params }, query: { ...resolved.query } };
};

/**
 * 「返回」的历史来源是否可信（§4.5）。与 `normalizeRedirect` 同构：吃 `(back, role, resolve, currentName)`、
 * 是**纯函数**，所以能在 Node 里直接跑（见 `__tests__/guard-matrix.mjs`）。
 *
 * 为什么必须**解析成路由**再判断，而不是比字符串：原实现是 `back !== '/login'`，
 * 只挡住精确的 `/login`，于是 `/login?redirect=%2Frecords%2F1` 会被当成可靠来源——
 * 用户点「返回」就被送回登录页。
 *
 * R1 时迁移页面只有 2 条，白名单手写 `['student.records','legacy']` 就够；R2A 之后已迁移页面
 * 变成 9 条，再手抄一份必然漏项——漏一项的后果是「返回」把用户丢回列表，而他明明是从试卷列表
 * 或学情分析过来的。所以改成**从路由表推导**，不再维护第二份清单：
 *
 *   可信 = 站内绝对路径
 *        + 能解析到已知路由（不是兜底 `unknown`）
 *        + 目标不是导航死路（`login` / `root` / `unknown`：回去还会被守卫再重定向一次）
 *        + 目标不是**当前页面自己**（`record-detail` → `record-detail` 会在两条详情之间来回打转）
 *        + 当前角色有权访问（读的还是唯一那份 `meta.roles`）
 *
 * 与 R1 手写白名单的等价性由 `__tests__/guard-matrix.mjs` 逐条钉住（含 R1 的 4 个反例）。
 */
const BACK_TARGET_BLOCKLIST = [ROUTE_NAMES.login, ROUTE_NAMES.root, ROUTE_NAMES.unknown];

export const isReliableBackTarget = (back, role, resolve, currentName = null) => {
  if (typeof back !== 'string' || back === '') return false;
  if (!back.startsWith('/')) return false;
  if (back.startsWith('//')) return false; // 协议相对地址 = 站外

  // 只取 path：`/login?redirect=x` 与 `/login` 必须解析到同一条路由
  const path = back.split('#')[0].split('?')[0];
  if (!path) return false;

  const resolved = resolve(path);
  if (!resolved || !resolved.matched || resolved.matched.length === 0) return false;

  if (BACK_TARGET_BLOCKLIST.includes(resolved.name)) return false;
  if (currentName && resolved.name === currentName) return false;

  const roles = resolved.meta?.roles;
  return !roles || roles.includes(role);
};

/**
 * 越权统一提示（R4）。守卫与「登录后功能落点」（`nav.js` 的 `goFeatureLanding`）**共用这一个常量**：
 * 两处都是「目标路由的 `meta.roles` 不含当前角色 ⇒ 回角色首页」，各写一句文案迟早会漂移成两句。
 * 它只描述结果（被挡回首页），不描述原因 —— 原因因入口而异，写进去反而会让两个入口互相说谎。
 */
export const FORBIDDEN_NOTICE = { message: '无权访问该页面，已返回首页', type: 'warning' };

/**
 * 角色默认首页位置。R3 起三个角色**全部**是真实路由（见 `session.js` 的 `homeFor`）——
 * 这里从 R1 起就没改过写法，改的只是 `homeFor` 的返回值。
 */
const homeLocation = (role) => homeFor(role).location;

/** 未登录时要不要把当前地址记进 `?redirect=`：只有「已知且可恢复」的页面才值得记。 */
const shouldRemember = (to) =>
  to.name !== ROUTE_NAMES.root &&
  to.name !== ROUTE_NAMES.unknown &&
  to.name !== ROUTE_NAMES.legacy &&
  to.name !== ROUTE_NAMES.login;

/**
 * 纯决策函数。只吃 `(to, user, resolve)` —— 没有任何「会话态」输入了：R2B 之后每个页面
 * 都由地址唯一决定（答题页也不例外），R3 之后**三个角色**都是如此（教师/管理员的 10 个页面
 * 也拿到了地址），所以决策只依赖目标地址 + 身份。
 *
 * 返回：`{ type: 'allow' }`
 *     | `{ type: 'redirect', location, notice?: {message,type} }`
 *
 * ⚠️ R3 删掉了返回里的 `home: true`。它原来的唯一作用是让 `installGuard` 调用
 * `setLegacyHome()` —— 遗留状态没了，这个字段就没有任何读取方了。**留着一个没人读的字段
 * 比删掉它更危险**：它会让人以为「回首页时会顺带复位某些状态」。
 */
export const decide = ({ to, user, resolve }) => {
  const role = user?.role ?? null;

  // —— 未登录 ——
  if (!user) {
    if (to.name === ROUTE_NAMES.login) return { type: 'allow' };
    return {
      type: 'redirect',
      location: {
        name: ROUTE_NAMES.login,
        query: shouldRemember(to) ? { redirect: to.fullPath } : {},
      },
    };
  }

  // —— 已登录却访问登录页：redirect 或角色首页（防登录循环）——
  if (to.name === ROUTE_NAMES.login) {
    const target = normalizeRedirect(to.query?.redirect, role, resolve);
    if (target) return { type: 'redirect', location: target };
    return { type: 'redirect', location: homeLocation(role) };
  }

  // —— 角色守卫 ——
  const roles = to.meta?.roles;
  if (roles && !roles.includes(role)) {
    return {
      type: 'redirect',
      location: homeLocation(role),
      notice: FORBIDDEN_NOTICE,
    };
  }

  // —— 未知地址：回角色首页（D2，不做 404 页）——
  if (to.name === ROUTE_NAMES.unknown) {
    return {
      type: 'redirect',
      location: homeLocation(role),
      notice: { message: '页面不存在，已返回首页', type: 'warning' },
    };
  }

  // —— 冷启动入口 `/`：按角色落到默认页 ——
  if (to.name === ROUTE_NAMES.root) {
    return { type: 'redirect', location: homeLocation(role) };
  }

  // —— legacy 出口：R3 起对**三个角色**都是无条件重定向 ——
  if (to.name === ROUTE_NAMES.legacy) {
    /**
     * 这条分支的收敛过程，三步都记在这里，因为它是「按会话判定 → 无会话判定」的完整样本：
     *
     *   R1：三角色都放行 + 补各自的默认遗留页（页面身份在内存里）。
     *   R2B：学生端已无未迁移页面 ⇒ 学生改无条件回 `#/papers`，教师/管理员仍放行。
     *   R3：教师/管理员的 10 个页面也迁完 ⇒ **没有任何角色**还有未迁移页面，
     *       于是统一成「静默回角色首页」。分支里不再有任何按角色/按会话的差别。
     *
     * 「静默」是刻意的：这不是用户操作失误，只是一个对所有人都已失去意义的地址，
     * 弹「页面不存在」会把一次正常的迁移说成用户走错了路。
     *
     * 保留这条路由本身（而不是删掉让它落进兜底）的理由见 `routes.js` 的注释：老书签。
     */
    return { type: 'redirect', location: homeLocation(role) };
  }

  return { type: 'allow' };
};

const isSameLocation = (to, location) =>
  to.name === location.name &&
  JSON.stringify(to.params || {}) === JSON.stringify(location.params || {});

/**
 * 把 `decide()` 的决策装到 router 上。
 *
 * R3 起这个函数**只做两件事**：把决策翻译成 Vue Router 的返回值、把 `notice` 送进提示通道。
 * 它不再写任何「页面状态」—— 那个职责随遗留状态一起消失，于是「路由 ↔ 内存状态」之间
 * 彻底不存在双向同步，也就没有第二份可能过期的页面身份。
 */
export const installGuard = (router) => {
  router.beforeEach((to) => {
    const user = currentUser.value;
    const decision = decide({
      to,
      user,
      resolve: (path) => router.resolve(path),
    });

    if (decision.type === 'allow') return true;

    if (decision.notice) notify(decision.notice.message, decision.notice.type);

    // 已经在目标地址上就不要重复导航（避免 Vue Router 的无限重定向中止）
    if (isSameLocation(to, decision.location)) return true;
    return decision.location;
  });
};
