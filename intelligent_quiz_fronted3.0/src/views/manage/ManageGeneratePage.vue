<template>
  <!--
    「智能组卷」（R3 迁移，命名路由 `manage.generate`，**仅教师**）。

    迁移前的正文只有一行（`App.vue:356-361`）：

        <GenerateExam v-if="practiceView === 'generate' && currentUser.role === 'teacher'"
                      :role="currentUser.role" :subjects="currentUser.subjects || []"
                      @toast="handleToastFromChild" />

    它**没有**标题栏、**没有**子导航 —— 旧代码里那两个条件的写法是
    `!standalonePracticeViews.includes(practiceView) && practiceView !== 'generate'`，
    而 'generate' 被显式排除，理由是「generate 自己显示横幅」（`App.vue:338` 的注释）。
    所以本视图只有 GenerateExam 一个子组件，模板结构与迁移前逐行对应。

    角色判据 `currentUser.role === 'teacher'` **不在模板里重复**：它已经提升为路由的
    `meta.roles = ['teacher']`，由全局守卫统一执行（这是本轮要求 2 的落点）。
    props 的取值来源（`currentUser.role` / `currentUser.subjects || []`）与迁移前一致。
  -->
  <!--
    ⚠️ 与迁移前相比这里**少了** `@start-exam="startExam"`（旧 `App.vue:392`）。
    这不是 R3 删的：`GenerateExam` 组件本身在 **R2B** 就不再 emit 这个事件了
    （旧版 `GenerateExam.vue:172` 的「开始答题」按钮连同一个 `defineEmits` 成员一起被移除，
    因为教师点它只会把 `practiceView` 设成一个没有渲染分支的值 ⇒ 空白正文）。
    本视图因此只是**照抄组件当前的真实接口**，没有新增偏差。
  -->
  <div class="manage-generate-page">
    <ExamManagementTabs active="generate" />
    <GenerateExam :role="role" :subjects="subjects" @toast="onToast" />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';

import GenerateExam from '@/components/practice/GenerateExam.vue';
import ExamManagementTabs from '@/components/practice/ExamManagementTabs.vue';
import { currentUser } from '@/router/session';

// KeepAlive 的 include 按组件名匹配；显式命名，避免构建工具改变文件名推导规则后缓存失效。
defineOptions({ name: 'ManageGeneratePage' });

const appToast = inject('appToast', null);

const role = computed(() => currentUser.value?.role || 'student');
/** 与迁移前的 `currentUser.subjects || []` 逐字一致（缺字段给空数组，不是 undefined）。 */
const subjects = computed(() => currentUser.value?.subjects || []);

const onToast = ({ message, type }) => {
  if (typeof appToast === 'function') appToast(message, type);
};
</script>
