<template>
  <!--
    学生端「学情分析」（R2A 迁移）。薄壳：页面本体是 LearningAnalysis，界面一行未改。
    `role` 是**必填** prop，取自共享会话（路由 meta.roles 已保证这里是学生，
    但这个组件也被教师/管理员用，所以不能用常量）。

    `practice` / `navigate` 两个事件的落点由 App.vue 决定：学生端走真实路由，
    教师/管理员端维持既有 legacy 分派（他们那一侧本轮不动）。薄壳只转发，不做角色判断。
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
