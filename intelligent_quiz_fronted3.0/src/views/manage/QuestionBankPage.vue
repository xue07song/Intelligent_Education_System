<template>
  <!--
    「题库管理」（R3 迁移，命名路由 `manage.questions`，teacher/admin）。

    ⚠️ 本文件是**机械搬移**的产物，不是重写。正文原本内联在 `App.vue:259-322`，
    弹窗层原本在 `App.vue:398-442`，状态与方法原本在 `App.vue:1006-1228`。
    搬移过程中只做了两类改写，除此之外逐字未动：

      1. `currentUser.role`            → `role`（computed，值相同：`currentUser.role`）
         `currentUser.subjects || []`  → `subjects`（computed，值相同）
         —— 这两处是因为正文不再与根组件同处一个作用域，必须把身份从共享会话取一次。
      2. `showToast(msg, type)`        → 同名薄封装，内部转调注入的 `appToast`
         —— 迁移前 `showToast` 就是 App.vue 的局部函数，`appToast` 提供的正是同一个函数。

    上述两类改写之外，搬移**没有**改动业务逻辑、接口调用、状态机、字段名或样式数值。
    搬移前后的一致性核对见验收报告。

    —— 以下是搬移之后、R3 收尾时才发生的改动，**不属于机械搬移** ——

      3. **权限变更（经用户确认）**：`canEdit` 由 `admin || teacher` 收成**仅 admin**，
         教师的 4 个写入口（AI 出题 / 批量导入 / 图片识别 / 新增题目）整组消失；
         `QuestionTable` 的编辑·删除按钮与勾选列用同一口径一起收。
         裁决原文：「教师只能查看自己所教科目的题库；所有题库写能力仅管理员可用。」
      4. **随之调整的头部文案**：`hero-desc` 改成按 `canEdit` 取两段文案。
         管理员的文案**逐字未变**；教师那段是新写的，因为原文案
         「管理所有题目，支持 AI 出题和批量导入」对只读的教师是失实的。

    这两项是**唯一**偏离「逐字搬移」的地方，已单列进 `docs/R3 验收报告.md`，
    不再当作迁移的隐含行为。

    5 个弹窗全部以 `<Teleport to="body">` 为根（已逐个核对组件源码第 2 行），
    所以「组件标签从 App.vue 的弹窗层挪到本视图」**不产生任何 DOM 位置差异**。
  -->
  <div class="question-bank-page">
    <!-- 顶部横幅 -->
    <header class="iq-page-hero">
      <div class="hero-content">
        <span class="hero-badge">📚 教学管理</span>
        <h1 class="hero-title">题库管理</h1>
        <!-- 管理员那段与迁移前**逐字相同**；教师那段是权限裁决后新写的（原文案对只读教师失实）。 -->
        <p class="hero-desc">{{ canEdit ? '管理所有题目，支持 AI 出题和批量导入' : '查看你所教科目的题目' }}</p>
      </div>
      <!--
        题库的**写入口全部集中在这里**（4 个按钮），因此 `canEdit` 一收，教师的写入口就整组消失。
        `canEdit` 的取值与理由见 <script> 里的说明（经用户确认的权限裁决：仅管理员可写）。

        另有 2 个写入口不在本视图：`QuestionTable` 的编辑/删除按钮与勾选列（同一个 `canEdit` 口径）。
        「批量删除」在本文件里是**既存死代码**（`handleBatchDelete` 没有调用点），不构入口。
      -->
      <div v-if="canEdit" class="hero-actions">
        <button class="iq-btn iq-btn-secondary-light" @click="aiVisible = true">🤖 AI 出题</button>
        <button class="iq-btn iq-btn-secondary-light" @click="importVisible = true">📥 批量导入</button>
        <button class="iq-btn iq-btn-secondary-light" @click="imageRecognitionVisible = true">🖼️ 图片识别</button>
        <button class="iq-btn iq-btn-primary" @click="openAddDialog">+ 新增题目</button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <div v-if="stats" class="iq-stat-grid">
      <div class="iq-card iq-stat-card">
        <div class="iq-stat-label">📊 题库总量</div>
        <div class="iq-stat-value">{{ stats.total }}</div>
      </div>
      <div class="iq-card iq-stat-card"><div class="iq-stat-label">📚 科目数</div><div class="iq-stat-value">{{ stats.bySubject?.length || 0 }}</div></div>
    </div>
    <div v-if="stats" class="iq-subject-summary">
      <section v-for="subject in stats.bySubject" :key="subject.subject" class="iq-card iq-subject-summary-card">
        <h3>{{ subject.subject }} <small>共 {{ subject.count }} 题</small></h3>
        <div v-for="chapter in stats.bySubjectChapter?.filter(c => c.subject === subject.subject)" :key="chapter.chapter" class="iq-subject-chapter-row">
          <span>第{{ chapter.chapter }}章 {{ chapter.title }}</span><b>{{ chapter.count }}题</b>
        </div>
      </section>
    </div>

    <!-- 筛选栏 -->
    <SearchBar
        :initialFilters="filters"
        :role="role"
        :subjects="subjects"
        @search="handleSearch"
        @reset="handleReset"
    />

    <!-- 表格 -->
    <QuestionTable
        :list="list"
        :loading="loading"
        :role="role"
        :compact="role === 'admin' || role === 'teacher'"
        v-model="selectedIds"
        @view="openViewDialog"
        @edit="openEditDialog"
        @delete="handleDelete"
    />

    <!-- 分页 -->
    <Pagination
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="total"
        @change="handlePageChange"
    />

    <!-- ===== 弹窗层（随正文一起从 App.vue 搬来；ChangePassword 不属题库管理，留在 App.vue）===== -->
    <QuestionForm
        :visible="dialogVisible"
        :data="formData"
        :isEdit="isEdit"
        :role="role"
        :subjects="subjects"
        @close="dialogVisible = false"
        @submit="handleSubmit"
    />

    <QuestionDetail
        :visible="viewVisible"
        :data="viewData"
        @close="viewVisible = false"
    />

    <ImportQuestions
        :visible="importVisible"
        :role="role"
        :subjects="subjects"
        @close="importVisible = false"
        @success="handleImportSuccess"
    />

    <AiGenerate
        :visible="aiVisible"
        :role="role"
        :subjects="subjects"
        @close="aiVisible = false"
        @success="handleAiSuccess"
    />

    <ImageRecognition
        :visible="imageRecognitionVisible"
        :role="role"
        :subjects="subjects"
        @close="imageRecognitionVisible = false"
        @success="handleImportSuccess"
    />
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue';

import SearchBar from '@/components/SearchBar.vue';
import QuestionTable from '@/components/QuestionTable.vue';
import QuestionForm from '@/components/QuestionForm.vue';
import { confirmQuestionDeletion } from '@/components/questionSafety';
import QuestionDetail from '@/components/QuestionDetail.vue';
import Pagination from '@/components/Pagination.vue';
import ImportQuestions from '@/components/ImportQuestions.vue';
import ImageRecognition from '@/components/ImageRecognition.vue';
import AiGenerate from '@/components/AiGenerate.vue';

import { currentUser } from '@/router/session';

import {
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getStatistics,
  batchDeleteQuestions,
} from '@/api/question';

const appToast = inject('appToast', null);

/**
 * 身份取自共享会话。兜底 `'student'` 是**故意选的安全侧**：`canEdit` 与 `QuestionTable`
 * 的编辑/删除列都判 `role === 'admin' || role === 'teacher'`，取不到身份时宁可不显示入口。
 * 正常情况下走不到兜底 —— `meta.roles` 已保证本页只有 teacher/admin 能进。
 */
const role = computed(() => currentUser.value?.role || 'student');
const subjects = computed(() => currentUser.value?.subjects || []);

/** 迁移前是 App.vue 的局部 `showToast`，`appToast` 提供的正是同一个函数（逐字等价）。 */
const showToast = (message, type = 'info') => {
  if (typeof appToast === 'function') appToast(message, type);
};

// ================================================================
// 题库管理（以下至文件末尾：自 App.vue 原样搬移）
// ================================================================
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const selectedIds = ref([]);
const importVisible = ref(false);
const aiVisible = ref(false);
const imageRecognitionVisible = ref(false);
const stats = ref(null);

const filters = reactive({
  id: '',
  关键词: '',
  题型: '',
  难度: '',
  章节: '',
  出题人: '',
  科目: '',
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const formData = ref({});
const viewVisible = ref(false);
const viewData = ref({});

/**
 * 写入口总开关：**仅管理员**。
 *
 * ⚠️ 这一行**不是机械搬移的产物**，是 R3 收尾时经用户确认的**权限变更**
 * （「教师只能查看自己所教科目的题库；所有题库写能力仅管理员可用」）。
 * 迁移前它与 `QuestionTable` 里那份逐字相同，都是 `admin || teacher`；
 * 两处现在一起收成仅管理员，取值口径仍然一致 —— **必须一起改**，
 * 只改一处会出现「有按钮但表格里没有编辑列」这种半截状态。
 *
 * 教师保留的是**读**：列表、筛选、分页、统计、查看详情、以及服务端按其所教科目
 * 收窄的可见行范围，全部不变。本页对教师唯一的变化就是这一组写入口消失。
 *
 * ⚠️ 再说一次：这是 UI 层。服务端 `routes/question.js` 的 7 条写路由 + `routes/ai.js`
 * 的 AI 出题入库都已收成 `requireRoles('admin')`，**权限生效的证据在那边**，不在这里。
 */
const canEdit = computed(() => currentUser.value?.role === 'admin');

watch(page, () => {
  selectedIds.value = [];
});

/**
 * ⚠️ 迁移前这里还有一个 `watch(currentView, ...)`：`currentView` 变成 `'main'` 且角色是学生时
 * 把它改回 `'papers'`。R3 删除了 `currentView`（它的 3 个取值全部路由化），这个 watcher 随之
 * 消失 —— 它防的事情现在由 `meta.roles`（本页是 teacher/admin）在守卫里挡掉了，
 * 且**学生根本进不到本视图**（学生端是另一套布局，staff 侧栏与 staff 路由对学生一律拒绝）。
 * 这不是「删掉了一处保护」，而是把保护从组件内的事后纠正换成了守卫里的事前拒绝。
 */
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (filters.id) params.id = filters.id;
    if (filters.关键词) params.关键词 = filters.关键词;
    if (filters.题型) params.题型 = filters.题型;
    if (filters.难度) params.难度 = filters.难度;
    if (filters.章节) params.章节 = filters.章节;
    if (filters.出题人) params.出题人 = filters.出题人;
    if (filters.科目) params.科目 = filters.科目;

    const data = await getQuestions(params);
    list.value = data.list;
    total.value = data.total;
  } catch (error) {
    showToast(error.message || '加载数据失败', 'error');
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    stats.value = await getStatistics();
  } catch (e) {
    console.warn('统计加载失败:', e);
  }
};

const handleSearch = (newFilters) => {
  Object.assign(filters, newFilters);
  page.value = 1;
  loadData();
};

const handleReset = () => {
  filters.id = '';
  filters.关键词 = '';
  filters.题型 = '';
  filters.难度 = '';
  filters.章节 = '';
  filters.出题人 = '';
  filters.科目 = '';
  page.value = 1;
  loadData();
};

const handlePageChange = ({ page: newPage, pageSize: newSize }) => {
  page.value = newPage;
  pageSize.value = newSize;
  loadData();
};

const generateId = () => {
  const maxId = list.value.reduce((max, item) => {
    const num = parseInt(item.id.replace(/\D/g, ''), 10);
    return num > max ? num : max;
  }, 0);
  return `Q${String(maxId + 1).padStart(3, '0')}`;
};

const openAddDialog = () => {
  isEdit.value = false;
  const teacherSubjects = currentUser.value?.subjects || [];
  const defaultSubject = teacherSubjects.length === 1 ? teacherSubjects[0] : '';
  formData.value = {
    id: generateId(),
    章节: '',
    题型: 2,
    序号: 0,
    题目: '',
    选项: '',
    答案: '',
    解析: '',
    难度: '',
    知识点: '',
    使用频率: '',
    出题人: '',
    科目: defaultSubject,
  };
  dialogVisible.value = true;
};

const openEditDialog = (item) => {
  isEdit.value = true;
  formData.value = { ...item };
  dialogVisible.value = true;
};

const openViewDialog = (item) => {
  viewData.value = { ...item };
  viewVisible.value = true;
};

const handleSubmit = async (payload) => {
  try {
    if (isEdit.value) {
      await updateQuestion(payload.id, payload);
      showToast('✅ 修改成功', 'success');
    } else {
      await addQuestion(payload);
      showToast('✅ 新增成功', 'success');
    }
    dialogVisible.value = false;
    loadData();
    loadStats();
  } catch (error) {
    showToast(error.message || '操作失败', 'error');
  }
};

const handleDelete = async (item) => {
  if (!await confirmQuestionDeletion(item)) {
    return;
  }
  try {
    await deleteQuestion(item.id);
    showToast('✅ 删除成功', 'success');
    if (list.value.length === 1 && page.value > 1) {
      page.value--;
    }
    loadData();
    loadStats();
  } catch (error) {
    showToast(error.message || '删除失败', 'error');
  }
};

/**
 * ⚠️ **既存死代码，原样搬移**：本函数在迁移前的模板里就没有任何调用点
 * （批量删除入口不存在，`selectedIds` 只被 `QuestionTable` 的勾选写入）。
 * 按「不顺手清理与本次迁移无关的既存代码」原样保留，清理属 R6 范围。
 */
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  if (!window.confirm(`确定要批量删除选中的 ${selectedIds.value.length} 条题目吗？`)) return;

  loading.value = true;
  try {
    const result = await batchDeleteQuestions(selectedIds.value);
    const deleted = result?.deleted ?? selectedIds.value.length;
    showToast(`✅ 批量删除成功，共删除 ${deleted} 条`, 'success');
    selectedIds.value = [];
    const remainingInPage = list.value.length - deleted;
    if (remainingInPage <= 0 && page.value > 1) {
      page.value--;
    }
    await loadData();
    await loadStats();
  } catch (error) {
    showToast(error.message || '批量删除失败', 'error');
  } finally {
    loading.value = false;
  }
};

const handleImportSuccess = (result) => {
  const { inserted = 0, skipped = 0, invalid = 0 } = result || {};
  const msg = `导入完成：成功 ${inserted} 条，跳过 ${skipped} 条，无效 ${invalid} 条`;
  if (inserted > 0) {
    loadData();
    loadStats();
  }
  if (invalid > 0 || skipped > 0) {
    showToast(msg, 'warning');
  } else {
    showToast(msg, 'success');
  }
};

const handleAiSuccess = (result) => {
  const { inserted = 0, skipped = 0 } = result || {};
  const msg = `AI 出题入库完成：成功 ${inserted} 条，跳过 ${skipped} 条`;
  if (inserted > 0) {
    loadData();
    loadStats();
  }
  if (skipped > 0) {
    showToast(msg, 'warning');
  } else {
    showToast(msg, 'success');
  }
  aiVisible.value = false;
};

// ================================================================
// 生命周期
// ================================================================
/**
 * 迁移前这两次加载在 `App.vue` 的 `onMounted` 里，对**任意已登录角色**都会执行
 * （包括根本不看这一页的管理员与学生）。搬到本视图后只在**进入本页时**执行。
 *
 * 这是抽取的必然结果，不是顺手优化：正文与它的数据不再挂在根组件上。
 * 方向是**减少**无谓请求，且没有任何页面依赖被去掉的那两次调用 ——
 * 逐条核对见验收报告「初始化副作用对账」一节（App.vue 的 `onMounted` 其余副作用
 * `loadPendingCount` 与两个事件监听全部留在原处，一条未动）。
 *
 * `if (currentUser.value)` 的守卫保留自迁移前的写法：本页只可能在已登录且为
 * teacher/admin 时挂载，保留它是为了**不改变**「无身份则不请求」这条既有行为。
 */
onMounted(() => {
  if (currentUser.value) {
    loadData();
    loadStats();
  }
});
</script>

<style scoped>
/*
  以下样式自 `App.vue` 的 `<style scoped>` **逐字搬移**（原行号见括号）。
  搬移是必需的：这些类名只被题库管理正文使用，而 scoped 规则带 `[data-v-*]`，
  正文搬走后 App.vue 那份不再命中本视图，不搬就会掉回 global.css 里**另一套数值不同**的规则。
  （`.iq-btn*` 系列 App.vue 里那份仍保留在原处给弹窗层与 header 用，此处是复制不是移动。）
*/
.question-bank-page {           /* App.vue:1869 */
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.iq-stat-grid {                 /* App.vue:1877 */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.iq-stat-card {                 /* App.vue:1883 */
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.iq-stat-label {                /* App.vue:1891 */
  font-size: 13px;
  color: #94A3B8;
  margin-bottom: 4px;
}

.iq-stat-value {                /* App.vue:1897 */
  font-size: 28px;
  font-weight: 700;
  color: #6366F1;
}

.iq-subject-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.iq-subject-summary-card{padding:16px}.iq-subject-summary-card h3{margin:0 0 10px;color:#312e81}.iq-subject-summary-card h3 small{float:right;color:#64748b;font-weight:500}.iq-subject-chapter-row{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #eef2f7;font-size:13px}.iq-subject-chapter-row b{color:#6366f1}

.iq-page-hero {                 /* App.vue:1906 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 34px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.25);
}

.hero-content .hero-badge {     /* App.vue:1917 */
  font-size: 12px;
  opacity: 0.8;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 4px;
}

.hero-content .hero-title {     /* App.vue:1925 */
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.hero-content .hero-desc {      /* App.vue:1932 */
  font-size: 14px;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
  margin: 4px 0 0;
}

.hero-actions {                 /* App.vue:1939 */
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* 浅色背景按钮（用于深色横幅上）—— App.vue:1947 */
.iq-btn-secondary-light {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.iq-btn-secondary-light:hover {  /* App.vue:1954 */
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

.iq-btn {                       /* App.vue:1959 */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.2s;
}

.iq-btn-primary {               /* App.vue:1973 */
  background: #6366F1;
  color: #fff;
  border-color: #6366F1;
}
.iq-btn-primary:hover {         /* App.vue:1978 */
  background: #4F46E5;
  border-color: #4F46E5;
}
</style>
