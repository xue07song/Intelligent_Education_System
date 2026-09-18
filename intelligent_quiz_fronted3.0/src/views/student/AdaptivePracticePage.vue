<template>
  <!--
    学生端「自适应练习」（R2A 迁移）。薄壳：页面本体是 AdaptivePractice，界面一行未改。

    ⚠️ 这里**故意不传 `:initialFilters`**，与迁移前完全一致。
    `AdaptivePractice` 声明了 `initialFilters` prop，但迁移前学生分支就没传过它；
    App.vue 里那个 `analysisPracticeFilters` 只被写、从不被读（学情分析点「去练习」写的）。
    本轮的规则是「行为等价」，所以不顺手把它接上——接上就等于悄悄改变了这个页面的入参。
  -->
  <AdaptivePractice @toast="onToast" />
</template>

<script setup>
import { inject } from 'vue';

import AdaptivePractice from '@/components/practice/AdaptivePractice.vue';

const appToast = inject('appToast', null);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
