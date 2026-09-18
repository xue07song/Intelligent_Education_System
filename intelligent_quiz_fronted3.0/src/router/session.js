/**
 * 路由改造期的共享会话与「遗留导航状态」。
 *
 * 为什么要有这个文件：
 * 1. 守卫（`router/index.js`）在**组件之外**运行，它需要能读到登录身份；把 `currentUser` 放在
 *    `App.vue` 里，守卫就得反过来 import 根组件 —— 会形成循环依赖。所以身份与遗留状态 ref
 *    放在这里，由 `App.vue` 引用。
 * 2. 统一导航入口（`router/nav.js`）与各薄壳视图要能读同一份身份，同样需要这份共享引用。
 *
 * R3 起这里**只剩三样东西**：登录身份、答题页来源（`examReturnLocation`）、角色默认页（`homeFor`）。
 * 曾经承载的「遗留导航状态」（`legacyView` / `legacyPracticeView`）随教师/管理员的 10 个页面
 * 路由化而删除 —— 页面身份现在只有一个来源：地址。
 *
 * 本文件**不 import 任何 .vue、也不 import vue-router**，因此可以在 Node 里直接跑守卫测试
 * （见 `router/__tests__/guard-matrix.mjs`）。
 */
import { ref } from 'vue';

export const ALL_ROLES = ['student', 'teacher', 'admin'];

const storage = typeof localStorage === 'undefined' ? null : localStorage;

/** 从 localStorage 恢复身份；解析失败则清掉坏数据（沿用 R0 前 restoreSession 的行为）。 */
const readStoredUser = () => {
  if (!storage) return null;
  const token = storage.getItem('token');
  const raw = storage.getItem('user');
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw);
    if (!user || !user.role) return null;
    return user;
  } catch {
    storage.removeItem('token');
    storage.removeItem('user');
    return null;
  }
};

/**
 * 会话在**模块初始化时同步恢复**，比原来的 `App.vue: onMounted → restoreSession()` 更早：
 * - 守卫在首次导航前就能拿到身份；
 * - 首屏渲染时 `currentUser` 已经有值，不再依赖挂载时机。
 *
 * 关键：这里**只恢复身份，完全不碰地址**。所以「已登录冷启动深链 #/records/12」不会被
 * 角色默认页覆盖（这是 R1 的硬要求，也是原实现的行为缺口）。
 */
export const currentUser = ref(readStoredUser());

/**
 * —— `legacyView` / `legacyPracticeView` 已于 R3 删除 ——
 *
 * R2A 起它们只剩教师/管理员端在用；R3 把那 10 个页面全部迁到真实路由后，
 * 两个 ref 的**取值域被搬空了**（`currentView` 的 main/users/audit 与
 * `practiceView` 的 7 个值各自有了地址），因此连同 `applyLegacyTarget` /
 * `setLegacyHome` / `ensureLegacyDefaults` / `legacyInitialized` 一起删除。
 *
 * 「已无活取值/写入点/模板消费方」不是靠阅读得出的，而是由 `__tests__/guard-matrix.mjs`
 * 第 4 部分的静态断言钉住（全项目检索 + 断言这些标识符在 router/ 下不再被定义或引用）。
 * 这段注释保留在这里，是为了让后来者知道**这里原本有什么、为什么可以没有**。
 */

/**
 * 「答题页该退回到哪里」——**完整站内来源位置**（命名路由位置对象：name + params + query）。
 *
 * R2B 之前这份状态是 `App.vue` 里的 `examReturnRoute`，只存 `name` + `params`，**丢掉 query**：
 * 从 `#/papers?subject=xxx`（或任何带筛选条件的列表）进答题页，退出后筛选条件就没了。
 * 搬到这里并补上 `query`，同时由 `nav.js` 的 `rememberExamReturn()` **在写入时**做角色与
 * 路由合法性校验（见那里的注释）—— 消费端只认这份已经校验过的值。
 *
 * 为什么不直接用 `history.state.back`：那是**浏览器历史**，深链/刷新/从登录页跳回来时
 * 它指向的可能是登录页或站外。`back` 只在没有记忆来源时作为**次选**（同样要过校验），
 * 见 `nav.js` 的 `exitExam`。
 *
 * `null` = 没有可信来源（深链直接打开、刷新后组件树重建、来源是另一张答题页），
 * 此时退出回试卷列表。
 */
export const examReturnLocation = ref(null);

/**
 * 角色默认首页（R3 起三个角色**全部**是真实路由）。
 *
 * 返回值只剩 `location` 一个字段：R2B 起 `legacy` 对学生恒为 `null`，R3 起对教师/管理员
 * 也不再有 legacy 页面，于是这个字段连同它的消费端（`applyLegacyTarget`）一起删掉。
 *
 * 落点与迁移前的 legacy 默认页**逐字对应**（见 `session.js` 旧版 `homeFor`）：
 *   · student → `#/papers`（R2A 起就是它，未变）
 *   · teacher → 旧 `{ view: 'main' }`           = 题库管理    → `manage.questions`
 *   · admin   → 旧 `{ view:'practice', practiceView:'exams' }` = 试卷列表 → `manage.exams`
 */
export const homeFor = (role) => {
  if (role === 'student') return { location: { name: 'student.papers' } };
  if (role === 'admin') return { location: { name: 'manage.exams' } };
  return { location: { name: 'manage.questions' } };
};

/**
 * 退出登录 / 改密 / 401 过期时清掉「答题页退回去哪」。
 *
 * 为什么必须清：否则「A 账号在答题页 → 退出登录 → 换 B 账号登录 → 进答题页 → 退出」
 * 会退回到**上一个账号**的页面（可能还是 B 无权访问的地址）。清它是让退出目标
 * 不依赖跨会话的陈旧状态。
 *
 * R3 之前这个动作叫 `resetLegacy`（顺手复位遗留状态）；遗留状态没了，只剩这一件事，
 * 于是名字改成它真正做的事 —— 留一个叫 legacy 的函数体里没有任何 legacy，比改名更糟。
 */
export const clearExamReturn = () => {
  examReturnLocation.value = null;
};

/** 更新当前用户的资料（`Profile` 保存成功后调用；原来是 `App.vue` 的 `handleProfileUpdated`）。 */
export const applyProfileUpdate = (updated) => {
  if (!updated || !currentUser.value) return;
  currentUser.value = { ...currentUser.value, ...updated };
};

/** 清会话（退出登录 / 401 过期 / 改密后强制重登）。 */
export const clearSession = () => {
  if (storage) {
    storage.removeItem('token');
    storage.removeItem('user');
  }
  currentUser.value = null;
};

/**
 * 组件之外的提示通道（守卫里无法调用 App.vue 的 showToast）。
 * 用既有代码已经在用的 `window` 自定义事件模式（对照 `utils/request.js:54` 的 `auth-expired`）。
 */
export const notify = (message, type = 'info') => {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(new CustomEvent('iq-toast', { detail: { message, type } }));
};
