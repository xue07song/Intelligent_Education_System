<template>
  <!--
    「班级管理」（R3 迁移，命名路由 `manage.classes`）。

    迁移前的正文是一行（`App.vue:363-368`）：

        <ClassManagement v-if="practiceView === 'classes'" :role="currentUser.role"
                         :subjects="currentUser.subjects || []" @toast="handleToastFromChild" />

    `classes` 在 `standalonePracticeViews` 里（`App.vue:573`），所以它**既没有标题栏也没有子导航**
    —— 旧代码那两处的条件在 `practiceView === 'classes'` 时都是 false。本视图因此只有一个子组件。
    `v-if` 的 `practiceView === 'classes'` 条件由「地址就是本页」取代，props 与事件原样保留。
  -->
  <ClassManagement :role="role" :subjects="subjects" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';

import ClassManagement from '@/components/practice/ClassManagement.vue';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

const role = computed(() => currentUser.value?.role || 'student');
/** 与迁移前的 `currentUser.subjects || []` 逐字一致。 */
const subjects = computed(() => currentUser.value?.subjects || []);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
