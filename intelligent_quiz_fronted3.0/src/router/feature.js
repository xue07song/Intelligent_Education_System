/**
 * 登录页「功能入口」的地址参数与落点规则（R4）。
 *
 * 背景：登录页的 4 个功能标签（智能组卷 / 自适应练习 / 学情分析 / 云端同步）在**未登录**时被点击，
 * 用户真正想要的是「登录之后去那个功能」。R4 之前这件事靠 App.vue 里的一个内存 ref
 * （`pendingFeature`）记住 —— 刷新即丢；而它旁边还抄了一张角色表（`featureTargetFor`），
 * 与 `meta.roles` 构成第二份权限来源。
 *
 * 现在只剩两条：
 *   1. 目标写进**地址**（`#/login?feature=generate`）—— 跨刷新保留，且只有一个来源；
 *   2. 落点由**候选路由自己的 `meta.roles`** 决定，本文件里**没有任何角色字面量**。
 *
 * 本文件不 import .vue、也不 import vue-router（`resolve` 由调用方注入），所以能在 Node 里直接跑
 * （见 `__tests__/feature-matrix.mjs`）。
 */
import { ROUTE_NAMES } from './routes.js';

/**
 * `?feature=` 的白名单。**只认这 4 个字符串**：
 * - query 同名参数重复出现时 vue-router 给的是**数组** → `typeof !== 'string'` 直接拒绝；
 * - 未知值（含 `__proto__` / `constructor` 这类原型键）在 `includes` 这一步就被拒，
 *   后面的映射表只可能被这 4 个已白名单化的 key 索引 —— 不存在原型链穿透。
 */
export const LOGIN_FEATURES = ['generate', 'adaptive', 'analysis', 'profile'];

export const normalizeFeature = (value) =>
  typeof value === 'string' && LOGIN_FEATURES.includes(value) ? value : null;

/**
 * 功能 → **候选**路由名（按优先级）。
 *
 * 刻意写成数组：`analysis` 对三种角色落在两个不同页面上（学生 `#/analysis`、
 * 教师/管理员 `#/manage/analysis`），但**选哪个不在这里判断** —— 交给候选路由自己的
 * `meta.roles`（与守卫同源）。这正是本表里没有任何角色字面量的原因。
 */
const FEATURE_ROUTE_CANDIDATES = {
  generate: [ROUTE_NAMES.manageGenerate],
  adaptive: [ROUTE_NAMES.adaptive],
  analysis: [ROUTE_NAMES.analysis, ROUTE_NAMES.manageAnalysis],
  profile: [ROUTE_NAMES.profile],
};

/** 候选路由名（未白名单化的 feature 返回空数组）。 */
export const featureRouteCandidates = (feature) => {
  const key = normalizeFeature(feature);
  return key ? FEATURE_ROUTE_CANDIDATES[key] : [];
};

/**
 * 选出**当前角色真的能进**的第一个候选，返回命名路由对象；都不行则返回 `null`。
 *
 * 判据与守卫**完全同源**：`meta.roles` 含该角色即放行（`roles` 缺失视为不限制，与 `decide()` 一致）。
 * 返回非 null 只说明「守卫会放行」，真正的边界永远是守卫。
 */
export const resolveFeatureTarget = (feature, role, resolve) => {
  for (const name of featureRouteCandidates(feature)) {
    const roles = resolve({ name })?.meta?.roles;
    if (!roles || roles.includes(role)) return { name, params: {}, query: {} };
  }
  return null;
};
