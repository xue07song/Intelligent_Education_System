<template>
  <!--
    「自适应学情」（R3 迁移，命名路由 `manage.adaptive`）。

    迁移前的正文是一行（`App.vue:378-381`）：

        <AdaptiveOverview v-if="practiceView === 'adaptive-overview'" @toast="handleToastFromChild" />

    它**没有 props**（不接收 role/subjects），也**没有标题栏/子导航**
    （`adaptive-overview` 在 `standalonePracticeViews` 里，且组件自带 hero 横幅）。
    唯一的输入就是 toast 通道，原样转发。
  -->
  <AdaptiveOverview @toast="onToast" />
</template>

<script setup>
import { inject } from 'vue';

import AdaptiveOverview from '@/components/practice/AdaptiveOverview.vue';

const appToast = inject('appToast', null);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
