<template>
  <!--
    「试卷列表」（R3 迁移，命名路由 `manage.exams`）。

    迁移前的正文是 App.vue 内联的三段（`App.vue:337-354`）：标题栏 + 子导航 + ExamList，
    三段的显示条件都挂在 `practiceView === 'exams'` 上。逐条把 `practiceView = 'exams'` 代入：

      · 标题栏  `!standalonePracticeViews.includes(practiceView) && practiceView !== 'generate'`
        —— `standalonePracticeViews` 是 ['adaptive','adaptive-progress','learning-analysis',
        'adaptive-overview','adaptive-review','classes','admin-records']，与 'exams' 一起代入后
        该条件恒真 ⇒ 它真正表达的只是「本页是试卷列表」；
      · 子导航同理恒真，但**额外**要求 `role !== 'admin'`（管理员没有可点的第二个按钮）；
      · `ExamList` 无条件渲染。

    所以三段在新视图里都**不再有条件**：判据从「内存里的一个枚举值」变成了「地址就是本页」。
    标题字符串 `📋 试卷列表` 是旧 `pageTitle` 映射表的 'exams' 项（`App.vue:807`），
    教师与管理员显示的**是同一个字符串**（侧栏那个「试卷列表管理」是另一处文案，留在 App.vue）。
  -->
  <div class="manage-exams-page">
    <ExamManagementTabs v-if="role === 'teacher'" active="list" />
    <div class="iq-page-titlebar">
      <h1>📋 试卷列表</h1>
    </div>

    <ExamList :role="role" @generate="onGenerate" @toast="onToast" />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';

import ExamList from '@/components/practice/ExamList.vue';
import ExamManagementTabs from '@/components/practice/ExamManagementTabs.vue';
import { ROUTE_NAMES } from '@/router/routes';
import { goRoute } from '@/router/nav';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

/**
 * `role` 取共享会话（`meta.roles` 已保证这里是教师或管理员）。
 * 兜底值取 `'student'` 是**故意选的安全侧**：`ExamList` 的「智能组卷」按钮判据是
 * `role === 'teacher'`，取不到身份时宁可不显示入口，也不显示一个点了会被守卫挡回的按钮。
 */
const role = computed(() => currentUser.value?.role || 'student');

const goExams = () => goRoute(ROUTE_NAMES.manageExams);
const goGenerate = () => goRoute(ROUTE_NAMES.manageGenerate);

/**
 * `ExamList` 的「智能组卷」。迁移前是 `currentUser.role === 'teacher' && (practiceView = 'generate')`
 * —— 角色判据保留在这里（与旧代码一致），跳转改走统一入口。
 * 该按钮本身在 `ExamList` 里就有 `v-if="role === 'teacher'"`，这里是第二道，不是唯一一道。
 */
const onGenerate = () => {
  if (role.value === 'teacher') goGenerate();
};

/**
 * ⚠️ **本次搬移唯一一处「少绑了一个事件」，在此显式记账**（不是疏漏，是无人可达）：
 *
 * 迁移前 `App.vue:383` 的 staff 侧 `<ExamList>` 上还绑着 `@start-exam="startExam"`，
 * 本视图**没有**再绑它。理由是那条绑定在 staff 侧**永远收不到事件**——
 * `ExamList.vue:247-259` 的两个 emit 点都包在 `props.role === 'student'` 里：
 *
 *     const handleStartExam = (examId) => {
 *       if (props.role === 'student') { emit('start-exam', examId); }
 *       else { openPreview(examId); }          // ← 教师/管理员走预览弹窗
 *     };
 *
 * 而本页的 `:role` 只可能是 `'teacher'` / `'admin'`（路由 `meta.roles` 保证）。
 * 所以旧绑定对应的 `startExam()` 的 **staff 分支**（`practiceView.value = 'practice'`）
 * 从来没有被执行过 —— 就算执行了，`'practice'` 也不是 `practiceView` 的渲染分支
 * （真正渲染试卷列表的是 `'exams'`），是 R2B 报告里记过的那段死代码。
 *
 * 结论：删掉这条绑定**不改变任何角色看到的任何行为**。不补一个空函数是刻意的 ——
 * 那只会把一段死代码从「旧文件里的绑定」变成「新文件里的空实现」。
 */

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>

<style scoped>
/*
  `.iq-practice-subnav` / `.iq-subnav-btn` 在 `global.css:539-568` 与 `App.vue:1993-2021`
  各有一份，**两分值不同**（按钮内边距 6px vs 8px、圆角 8px vs var(--iq-radius-medium)、
  悬停底色 #F1F5F9 vs var(--iq-neutral-100)）。App.vue 那份带 `[data-v-*]`、特异性更高，
  迁移前是它生效。正文搬走后 App.vue 的 scoped 规则不再命中本视图，故把那一份**逐字**搬到这里
  （只搬不改，外观不变）。
*/
.iq-practice-subnav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #FFFFFF;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  flex-wrap: wrap;
}
.iq-subnav-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.iq-subnav-btn:hover {
  background: #F1F5F9;
}
.iq-subnav-btn.active {
  background: #6366F1;
  color: #fff;
}
</style>
