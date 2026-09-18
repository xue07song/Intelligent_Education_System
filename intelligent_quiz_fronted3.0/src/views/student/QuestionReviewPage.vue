<template>
  <!--
    学生端「题目复盘」（R2A 迁移）。薄壳：页面本体是 QuestionReview，界面一行未改。
    它是「错题本」的真实载体（AI 助手的 `wrong-book` 就映射到这里）。

    R2B 起「重新练习」直达 `#/exam/:examId`（原来经 App.vue 的 legacy 出口）。
    副作用是**退出目标变准了**：从本页进答题页再退出，回到的是本页（`goExam` 记下的
    就是 `#/review`），而 R2A 期间那条路只能记住一个不含参数的遗留视图名。
  -->
  <QuestionReview @start-exam="onStartExam" @toast="onToast" />
</template>

<script setup>
import { inject } from 'vue';

import QuestionReview from '@/components/practice/QuestionReview.vue';
import { goExam } from '@/router/nav';

const appToast = inject('appToast', null);

const onStartExam = (examId) => goExam(examId);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
