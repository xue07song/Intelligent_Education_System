<template>
  <!--
    学生端「答题页」（R2B 迁移，地址 `#/exam/:examId`）。薄壳：正文仍是 ExamPractice，界面一行未改。

    迁移前后唯一的差别是**身份从哪来**：
      · 迁移前：`App.vue` 的内存态 `activeExamId` + 地址永远停在 `#/legacy`（刷新即丢）；
      · 迁移后：`route.params.examId`（刷新 = 同一地址 = 同一份卷）。

    `:key` 让**每个 examId 一个独立实例**：A→B 切换时旧实例被卸载（计时器清掉、在飞的回包
    按 `disposed` 丢弃），新实例从零开始。⚠️ 但 key 只是父组件侧的便利，**不能替代**组件内部
    的失效保护 —— 浏览器后退/前进、以及卸载后才回来的请求都不经过 key，所以
    `ExamPractice.vue` 里另有 `disposed` + `loadToken` 两道独立防护（那才是权威的那道）。
  -->
  <ExamPractice
      :key="examKey"
      :exam-id="examId"
      @exit="onExit"
      @view-record="onViewRecord"
      @toast="onToast"
  />
</template>

<script setup>
import { computed, inject } from 'vue';
import { useRoute } from 'vue-router';

import ExamPractice from '@/components/practice/ExamPractice.vue';
import { exitExam, goRecordDetail } from '@/router/nav';

const route = useRoute();
const appToast = inject('appToast', null);

const examId = computed(() => String(route.params.examId ?? ''));
const examKey = computed(() => `exam-${examId.value}`);

/**
 * 退出答题页：**不在这里写 `router.back()` 或任何目标地址**。
 * 「回来源还是回试卷列表」的判定（含角色校验、拒绝把另一张答题页当兜底）唯一实现在
 * `nav.js: exitExam`，这里只转发 —— 与 R2A 把导航决策收进 `nav.js` 是同一原则。
 */
const onExit = () => exitExam();

/** 结果页「查看详情」：进答题记录详情（真实路由）。 */
const onViewRecord = (recordId) => goRecordDetail(recordId);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
