<template>
  <!--
    「注册审核」（R3 迁移，命名路由 `admin.audit`，**仅管理员**）。

    迁移前的正文（`App.vue:330-334`）：

        <template v-if="currentView === 'audit' && currentUser.role === 'admin'">
          <div class="iq-page-titlebar"><h1>✅ 注册审核</h1></div>
          <RegistrationAudit @toast="handleToastFromChild" @update:pending="loadPendingCount" />
        </template>

    角色判据提升为路由的 `meta.roles = ['admin']`；标题栏文案与结构逐字保留
    （`.iq-page-titlebar` 是 `global.css:497` 的全局样式，无需复制）。

    ⚠️ `@update:pending` 是**跨组件的第二件事**：它原来直接把 App.vue 的 `loadPendingCount`
    接到这里，用来刷新**侧栏「注册审核」角标**（`App.vue:177`）。正文搬到路由之后，
    这个回调不再与角标同处一个组件树分支上，改由 App.vue 通过 `provide('appStaff')` 下发
    （与既有的 `appToast` / `appNavigate` 是同一套通道）。取不到时**静默跳过**：
    角标不刷新是可以接受的降级，而抛错会让整个审核页白屏。
  -->
  <div class="admin-audit-page">
    <div class="iq-page-titlebar"><h1>✅ 注册审核</h1></div>
    <RegistrationAudit @toast="onToast" @update:pending="onPendingChange" />
  </div>
</template>

<script setup>
import { inject } from 'vue';

import RegistrationAudit from '@/components/RegistrationAudit.vue';

const appToast = inject('appToast', null);
const appStaff = inject('appStaff', null);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};

/** 与迁移前的 `@update:pending="loadPendingCount"` 等价（该回调不读事件参数）。 */
const onPendingChange = () => {
  if (typeof appStaff?.refreshPendingCount === 'function') appStaff.refreshPendingCount();
};
</script>
