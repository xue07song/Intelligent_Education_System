/**
 * 路由实例。
 *
 * - **hash 模式**（D1）：发布包是离线目录，hash 不需要服务端配合
 *   （后端虽然已有 SPA fallback，见 `backend/src/app.js:26-36`，但直接打开 dist 的场景下 hash 更稳）。
 * - 路由表在 `routes.js`（纯元数据，Node 可测）；守卫在 `guard.js`；统一导航入口在 `nav.js`。
 * - **`App.vue` 不是路由页面**：路由表里没有任何条目指向它，它只作为外壳提供 `<router-view>`。
 * - 这里负责把 `routes.js` 里的组件**键名**换成真实组件 —— 键名映射就是「路由表不含 .vue」
 *   这条约束的落点：新增页面必须同时在两处登记，漏登记会走 EmptyView（正文空白）。
 */
import { createRouter, createWebHashHistory } from 'vue-router';

import { EMPTY_COMPONENT, routes } from './routes';
import { installGuard } from './guard';
// —— 学生端（R2A 迁移；`records-*` 是 R1 迁移的，本轮从 views/pilot 移到 views/student）——
import ExamListPage from '@/views/student/ExamListPage.vue';
import ExamPracticePage from '@/views/student/ExamPracticePage.vue';
import AdaptivePracticePage from '@/views/student/AdaptivePracticePage.vue';
import QuestionReviewPage from '@/views/student/QuestionReviewPage.vue';
import RecordsListPage from '@/views/student/RecordsListPage.vue';
import RecordDetailPage from '@/views/student/RecordDetailPage.vue';
import LearningAnalysisPage from '@/views/student/LearningAnalysisPage.vue';
// —— 三角色共享（R2A 迁移）——
import ProfilePage from '@/views/shared/ProfilePage.vue';
import FeedbackPage from '@/views/shared/FeedbackPage.vue';
// —— 教师 / 管理员端（R3 迁移）——
import QuestionBankPage from '@/views/manage/QuestionBankPage.vue';
import ManageExamsPage from '@/views/manage/ManageExamsPage.vue';
import ManageGeneratePage from '@/views/manage/ManageGeneratePage.vue';
import ManageClassesPage from '@/views/manage/ManageClassesPage.vue';
import ManageAnalysisPage from '@/views/manage/ManageAnalysisPage.vue';
import ManageAdaptivePage from '@/views/manage/ManageAdaptivePage.vue';
import ManageReviewPage from '@/views/manage/ManageReviewPage.vue';
import ManageExamAnalysisPage from '@/views/manage/ManageExamAnalysisPage.vue';
import AdminUsersPage from '@/views/admin/AdminUsersPage.vue';
import AdminAuditPage from '@/views/admin/AdminAuditPage.vue';

/**
 * 空组件：`legacy` / `login` / `root` / 兜底路由只作地址标记。
 *
 * R3 起这个「空」是**真的空**：这四条路由**每一条**都会被守卫重定向走
 * （`login` 未登录时由 App.vue 的登录闸门渲染正文、`root`/`unknown`/`legacy` 一律回角色首页），
 * 没有任何一条会停在原地渲染。R2B 之前注释里那句「正文由 App.vue 的遗留分支渲染」已经不成立
 * ——遗留分支在 R3 删掉了。
 */
const EmptyView = { name: 'EmptyRouteView', render: () => null };

const COMPONENTS = {
  [EMPTY_COMPONENT]: EmptyView,
  'exam-list': ExamListPage,
  'exam-practice': ExamPracticePage,
  'adaptive-practice': AdaptivePracticePage,
  'question-review': QuestionReviewPage,
  'records-list': RecordsListPage,
  'record-detail': RecordDetailPage,
  'learning-analysis': LearningAnalysisPage,
  profile: ProfilePage,
  feedback: FeedbackPage,
  'manage-questions': QuestionBankPage,
  'manage-exams': ManageExamsPage,
  'manage-generate': ManageGeneratePage,
  'manage-classes': ManageClassesPage,
  'manage-analysis': ManageAnalysisPage,
  'manage-adaptive': ManageAdaptivePage,
  'manage-review': ManageReviewPage,
  'manage-exam-analysis': ManageExamAnalysisPage,
  'admin-users': AdminUsersPage,
  'admin-audit': AdminAuditPage,
};

const withComponents = routes.map((route) => ({
  ...route,
  component: COMPONENTS[route.component] || EmptyView,
}));

export const router = createRouter({
  history: createWebHashHistory(),
  routes: withComponents,
});

installGuard(router);

export default router;
