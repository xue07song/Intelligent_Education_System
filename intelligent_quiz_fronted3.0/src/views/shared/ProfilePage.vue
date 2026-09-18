<template>
  <!--
    三角色共享「个人资料 / 个人中心」（R2A 迁移）。
    页面本体是 Profile，**无 props**、只发 `profile-updated`，界面一行未改
    （它自己带 `iq-page-titlebar`「👤 个人中心」，所以这里不再套标题栏）。

    保存成功后的身份更新写入 `router/session.js` 的 `applyProfileUpdate`，
    与 R1 的 `App.vue: handleProfileUpdated` 是同一件事——只是现在三个角色共用一条路由，
    更新逻辑不能再挂在某一个角色的布局分支里。
  -->
  <Profile @profile-updated="onProfileUpdated" />
</template>

<script setup>
import Profile from '@/components/Profile.vue';
import { applyProfileUpdate } from '@/router/session';

const onProfileUpdated = (updated) => applyProfileUpdate(updated);
</script>
