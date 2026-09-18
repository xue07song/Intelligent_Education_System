<template>
  <!--
    「学情分析」/「学生个性化分析」（R3 迁移，命名路由 `manage.analysis`）。

    侧栏文案按角色不同（教师「学情分析」、管理员「学生个性化分析」），但**正文与面包屑是同一份**
    —— 迁移前就是同一个 `<LearningAnalysis>`、同一个 `practiceView === 'learning-analysis'`，
    文案差异只体现在侧栏按钮上（那段仍在 App.vue）。所以这里只有一条路由。

    迁移前的正文（`App.vue:370-376`）：

        <LearningAnalysis v-if="practiceView === 'learning-analysis'" :role="currentUser.role"
                          @practice="handlePracticeFromAnalysis"
                          @navigate="handleNavigateFromAnalysis"
                          @toast="handleToastFromChild" />

    `learning-analysis` 也在 `standalonePracticeViews` 里，所以同样没有标题栏/子导航。

    两个跨页事件仍然转发到 App.vue 通过 `provide('appNavigate')` 给出的落点，与
    `views/student/LearningAnalysisPage.vue` 的写法一致 —— 薄壳只转发，不自己做角色判断。
  -->
  <LearningAnalysis
      :role="role"
      @practice="onPractice"
      @navigate="onNavigate"
      @toast="onToast"
  />
</template>

<script setup>
import { computed, inject } from 'vue';

import LearningAnalysis from '@/components/practice/LearningAnalysis.vue';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);
const appNavigate = inject('appNavigate', null);

const role = computed(() => currentUser.value?.role || 'student');

const onPractice = (filters) => appNavigate?.practiceFromAnalysis?.(filters);
const onNavigate = (target) => appNavigate?.navigateFromAnalysis?.(target);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
