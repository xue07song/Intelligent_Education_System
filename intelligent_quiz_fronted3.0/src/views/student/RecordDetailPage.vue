<template>
  <!--
    试点页面（R1）：学生端「答题记录详情」。
    - 记录编号来自**路由参数**（`#/records/:recordId`），刷新/深链都靠它恢复；
    - 「返回」不是无条件 router.back()：有可靠的站内来源才后退，否则回记录列表（见 router/nav.js）；
    - 错误/空状态里的「返回列表」是**另一个事件**（`back-list`），它直接进列表、不做后退，
      否则 A→B 之后会退回 A 的详情（见 nav.js 的 goRecordsList）；
    - 组件本体 RecordDetail 已支持 recordId 变化（参数监听 + 过期回包丢弃）。
  -->
  <RecordDetail :recordId="recordId" @back="onBack" @back-list="onBackList" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';
import { useRoute } from 'vue-router';

import RecordDetail from '@/components/practice/RecordDetail.vue';
import { backFromRecordDetail, goRecordsList } from '@/router/nav';

const route = useRoute();
const appToast = inject('appToast', null);

// route.params.recordId 一定是字符串；非法值交给 RecordDetail 给出「编号无效」状态
const recordId = computed(() => route.params.recordId);

const onBack = () => backFromRecordDetail();
const onBackList = () => goRecordsList();

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
