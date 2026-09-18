<template>
  <!--
    「主观题复核」（R3 迁移，命名路由 `manage.review`，**仅教师**）。

    迁移前的正文（`App.vue:383-386`）：

        <AdaptiveReview v-if="practiceView === 'adaptive-review' && currentUser.role !== 'admin'"
                        @toast="handleToastFromChild" />

    两个显示条件各自去哪了：
      · `practiceView === 'adaptive-review'` → 由「地址就是本页」取代；
      · `currentUser.role !== 'admin'`      → 提升为路由的 `meta.roles = ['teacher']`，
        由全局守卫执行。侧栏那个按钮的同类判据是 `v-if="currentUser.role !== 'admin'"`；
        学生看不到 staff 侧栏也进不来 staff 布局，所以「非 admin」在**可达集合**上等价于
        「仅 teacher」—— 这一点在 `routes.js` 的注释里也写了一遍。

    组件没有 props，只有 toast 通道。
  -->
  <AdaptiveReview @toast="onToast" />
</template>

<script setup>
import { inject } from 'vue';

import AdaptiveReview from '@/components/practice/AdaptiveReview.vue';

const appToast = inject('appToast', null);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
