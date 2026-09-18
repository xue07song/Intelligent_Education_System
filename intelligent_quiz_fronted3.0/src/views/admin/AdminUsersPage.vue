<template>
  <!--
    「用户管理」（R3 迁移，命名路由 `admin.users`，**仅管理员**）。

    迁移前的正文（`App.vue:324-328`）：

        <template v-if="currentView === 'users' && currentUser.role === 'admin'">
          <div class="iq-page-titlebar"><h1>👥 用户管理</h1></div>
          <UserManagement @toast="handleToastFromChild" />
        </template>

    角色判据 `currentUser.role === 'admin'` 提升为路由的 `meta.roles = ['admin']`（守卫执行），
    模板里的 `v-if` 换成「地址就是本页」。标题栏文案与结构逐字保留。
    `.iq-page-titlebar` 的定义在 `global.css:497`，是全局样式，本视图无需复制。
  -->
  <div class="admin-users-page">
    <div class="iq-page-titlebar"><h1>👥 用户管理</h1></div>
    <UserManagement @toast="onToast" />
  </div>
</template>

<script setup>
import { inject } from 'vue';

import UserManagement from '@/components/UserManagement.vue';

const appToast = inject('appToast', null);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
