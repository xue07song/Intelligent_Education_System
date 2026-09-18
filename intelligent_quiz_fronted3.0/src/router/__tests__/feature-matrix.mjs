/**
 * R4 验收：登录页 `?feature=` 白名单与落点矩阵（**纯函数测试，不走生产路径里的 router**）。
 *
 * 为什么能这么测：`feature.js` 只 import `routes.js`（纯元数据，不含 .vue），
 * `resolve` 由调用方注入 —— 所以这里可以塞一个「只读路由表 meta」的假 resolve 进去。
 *
 * 跑法（在 intelligent_quiz_fronted3.0 目录下）：
 *   node src/router/__tests__/feature-matrix.mjs
 * 不新增依赖，不改 package.json。与 `guard-matrix.mjs` 是两份独立矩阵（那份管守卫与 redirect）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { routes } from '../routes.js';
import {
  LOGIN_FEATURES,
  featureRouteCandidates,
  normalizeFeature,
  resolveFeatureTarget,
} from '../feature.js';

// ---------------------------------------------------------------- 断言小工具
let passed = 0;
const failures = [];

const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failures.push(`${label}\n    实际: ${a}\n    期望: ${e}`);
  }
};

/** 假 resolve：只回路由表里那条的 name/meta —— 与真实 `router.resolve` 的 meta 同源。 */
const resolveByName = (location) => {
  const route = routes.find((r) => r.name === location?.name);
  if (!route) return { matched: [] };
  return { name: route.name, meta: route.meta, matched: [route] };
};

const targetName = (feature, role) => {
  const t = resolveFeatureTarget(feature, role, resolveByName);
  return t ? t.name : null;
};

// ================================================================
// 1. 白名单：只认 4 个字符串
// ================================================================
check('白名单恰好 4 项', LOGIN_FEATURES.length, 4);
for (const ok of ['generate', 'adaptive', 'analysis', 'profile']) {
  check(`正例 ${ok}`, normalizeFeature(ok), ok);
}

const REJECTS = [
  ['undefined', undefined],
  ['null', null],
  ['空串', ''],
  ['未知值', 'stats'],
  ['大小写不同', 'Generate'],
  ['前后空格', ' generate'],
  ['数组（query 重复出现）', ['generate']],
  ['多值数组', ['generate', 'adaptive']],
  ['原型键 __proto__', '__proto__'],
  ['原型键 constructor', 'constructor'],
  ['原型键 toString', 'toString'],
  ['数字', 1],
  ['对象', { feature: 'generate' }],
];
for (const [label, value] of REJECTS) {
  check(`反例 ${label}`, normalizeFeature(value), null);
}

// ================================================================
// 2. 候选表：不含角色字面量，且 analysis 有两个候选（顺序 = 优先级）
// ================================================================
check('generate 候选', featureRouteCandidates('generate'), ['manage.generate']);
check('adaptive 候选', featureRouteCandidates('adaptive'), ['student.adaptive']);
check('analysis 候选', featureRouteCandidates('analysis'), ['student.analysis', 'manage.analysis']);
check('profile 候选', featureRouteCandidates('profile'), ['profile']);
check('未知 feature 无候选', featureRouteCandidates('__proto__'), []);

// ================================================================
// 3. 落点矩阵（角色 × 功能）：null = 没有候选可进 → 调用方走统一越权提示 + 角色首页
// ================================================================
const MATRIX = [
  // generate：manage.generate 只对教师开放
  ['generate', 'student', null],
  ['generate', 'teacher', 'manage.generate'],
  ['generate', 'admin', null],
  // adaptive：学生专属
  ['adaptive', 'student', 'student.adaptive'],
  ['adaptive', 'teacher', null],
  ['adaptive', 'admin', null],
  // analysis：学生走 #/analysis，教师/管理员走 #/manage/analysis
  ['analysis', 'student', 'student.analysis'],
  ['analysis', 'teacher', 'manage.analysis'],
  ['analysis', 'admin', 'manage.analysis'],
  // profile：三角色共享
  ['profile', 'student', 'profile'],
  ['profile', 'teacher', 'profile'],
  ['profile', 'admin', 'profile'],
  // 未知 feature / 无角色
  ['stats', 'student', null],
  ['generate', null, null],
];
for (const [feature, role, expected] of MATRIX) {
  check(`落点 ${feature} × ${role}`, targetName(feature, role), expected);
}

// 返回值必须是**命名路由对象**（不含展示地址里的 `#`）
const objTarget = resolveFeatureTarget('analysis', 'teacher', resolveByName);
check('落点是命名路由对象', objTarget, { name: 'manage.analysis', params: {}, query: {} });

// ================================================================
// 4. 静态断言：规则表里真的没有角色字面量（这正是 R4 删掉旧角色表的目的）
// ================================================================
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'feature.js'), 'utf8');
check('feature.js 不含角色字面量', /\b(student|teacher|admin)\b/.test(source), false);
check('feature.js 不 import .vue', /from\s+'[^']*\.vue'/.test(source), false);
check('feature.js 不 import vue-router', /from\s+'vue-router'/.test(source), false);

const appSource = readFileSync(join(here, '..', '..', 'App.vue'), 'utf8');
check('App.vue 里已无 pendingFeature 活代码', /pendingFeature\s*(=|\.value\s*=)/.test(appSource), false);
check('App.vue 里已无旧角色表', /featureTargetFor\s*\(/.test(appSource), false);

// ---------------------------------------------------------------- 结果
console.log(`\n通过 ${passed} 项`);
if (failures.length) {
  console.log(`失败 ${failures.length} 项:\n`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('feature-matrix: 全部通过');
