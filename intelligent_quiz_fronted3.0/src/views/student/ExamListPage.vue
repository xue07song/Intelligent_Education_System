<template>
  <!--
    学生端「试卷列表」（R2A 迁移）。薄壳：页面本体仍是 ExamList，界面一行未改。

    R2B 起「开始答题」**直达 `#/exam/:examId`**：地址栏就是这次作答的身份，
    「退出答题页该回哪里」由 `goExam` 在跳转时记下（记的就是本页的完整位置）。
    不再经过 App.vue 的 `appNavigate.startExam` —— 那条路要先把状态写进内存再进 legacy 出口，
    中间任何一步丢失（刷新、换卷）都会让答题页失去身份。

    注意：这里**不绑 `@generate`**。学生分支迁移前就没绑（只有教师分支绑），
    绑上会让学生的 ExamList 多出一条通往「智能组卷」的路径，那是行为变更不是路由化。
  -->
  <ExamList :role="role" @start-exam="onStartExam" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';

import ExamList from '@/components/practice/ExamList.vue';
import { goExam } from '@/router/nav';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

// 路由 meta.roles 已保证这里是学生；兜底值只是为了组件在极端情况下不炸
const role = computed(() => currentUser.value?.role || 'student');

/** 唯一的「开始答题」入口。角色校验在 `App.vue: startExam`（AI 助手那条路）与路由守卫里各有一道。 */
const onStartExam = (examId) => goExam(examId);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
