<template>
  <nav class="exam-management-tabs" aria-label="出卷管理切换">
    <button class="iq-subnav-btn" :class="{ active: active === 'list' }" @click="goRoute(ROUTE_NAMES.manageExams)">📋 试卷列表</button>
    <button class="iq-subnav-btn" :class="{ active: active === 'generate' }" @click="goRoute(ROUTE_NAMES.manageGenerate)">📝 智能组卷</button>
  </nav>
</template>
<script setup>
import { goRoute } from '@/router/nav';
import { ROUTE_NAMES } from '@/router/routes';
defineProps({ active: String });
</script>
<style scoped>
.exam-management-tabs { display: flex; gap: 8px; margin-bottom: 24px; padding: 8px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; flex-wrap: wrap; }
.iq-subnav-btn { padding: 6px 16px; border-radius: 8px; font-size: 14px; }
</style>
