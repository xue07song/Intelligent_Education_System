<template>
  <!--
    试点页面（R1）：学生端「答题记录」列表。
    这个组件是**薄壳**，只负责三件事：
      1. 把「查看详情」变成一次路由跳转（不再写 currentView）；
      2. 把子组件的 toast 转给 App.vue（走与其它页面相同的通道）；
      3. 角色取自共享会话（路由 meta.roles 已经保证这里是学生）。
    页面本体仍是 PracticeRecords，未做任何界面改动。
  -->
  <PracticeRecords :role="role" @view-record="onViewRecord" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';

import PracticeRecords from '@/components/practice/PracticeRecords.vue';
import { goRecordDetail } from '@/router/nav';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

const role = computed(() => currentUser.value?.role || 'student');

const onViewRecord = (recordId) => goRecordDetail(recordId);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
