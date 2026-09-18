<template>
  <!--
    三角色共享「用户反馈」（R2A 迁移）。`Feedback` 需要 `role` prop、只发 `toast`，界面一行未改。
    它自带页头（「💬 用户反馈」），所以学生端迁移前就没有标题栏。

    ⚠️ 教师/管理员端多一行 `iq-page-titlebar`：迁移前 staff 分支里有这个标题栏，学生分支里没有。
    同一份标题会出现两次（Feedback 内部还有一个），看起来是冗余——但**本轮不美化前端**，
    保持两个角色各自迁移前的样子才是「行为等价」。等 R3 统一 staff 外壳时再处理。
    多根节点是 Vue 3 支持的写法，DOM 结构与迁移前完全一致（没有多余包裹元素）。
  -->
  <div v-if="isStaff" class="iq-page-titlebar"><h1>💬 用户反馈</h1></div>
  <Feedback :role="role" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';

import Feedback from '@/components/Feedback.vue';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

const role = computed(() => currentUser.value?.role || 'student');
const isStaff = computed(() => role.value !== 'student');

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
