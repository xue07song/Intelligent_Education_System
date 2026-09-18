<template>
  <!--
    「试卷分析」（R3 迁移，命名路由 `manage.exam-analysis`）。

    迁移前的正文（`App.vue:388-392`）：

        <AdminRecords v-if="practiceView === 'admin-records'" :role="currentUser.role"
                      @toast="handleToastFromChild" />

    `admin-records` 在 `standalonePracticeViews` 里（注释原文：「admin-records 已加入独立视图列表，
    试卷分析不显示子导航」，`App.vue:571`），所以没有标题栏/子导航，组件自带 hero 横幅。

    ⚠️ 该组件内部有一条**不可达**分支（`view === 'detail'`，因为 `activeRecordId` 从未被赋值，
    见已知问题清单 G1）。本轮**只搬迁渲染点，不碰组件内部**，那条缺口状态与迁移前一致。
  -->
  <AdminRecords :role="role" @toast="onToast" />
</template>

<script setup>
import { computed, inject } from 'vue';

import AdminRecords from '@/components/practice/AdminRecords.vue';
import { currentUser } from '@/router/session';

const appToast = inject('appToast', null);

const role = computed(() => currentUser.value?.role || 'student');

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
