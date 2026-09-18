<template>
  <!-- ===== 未登录：显示登录页 ===== -->
  <Login v-if="!currentUser" @success="handleLoginSuccess" @open-register="registerVisible = true" @feature="handleGuestFeature" />

  <RegistrationDialog
      v-if="!currentUser"
      :visible="registerVisible"
      @close="registerVisible = false"
      @success="registerSuccess"
  />

  <!-- ============================================================== -->
  <!-- 已登录：根据角色渲染不同布局                                    -->
  <!-- ============================================================== -->
  <div v-else>
    <!-- ============================================================ -->
    <!-- 学生端：顶部标签导航布局（5个标签 + 右上角下拉菜单）          -->
    <!-- ============================================================ -->
    <div v-if="currentUser.role === 'student'" class="student-layout">
      <header class="student-header">
        <div class="header-left">
          <div class="brand">
            <span class="brand-icon">📚</span>
            <span class="brand-name">智能题库</span>
          </div>
        </div>

        <nav class="header-nav" ref="navContainer">
          <button
              v-for="tab in studentTabs"
              :key="tab.key"
              class="nav-tab"
              :class="{ active: isTabActive(tab.key) }"
              @click="navigateTo(tab.key)"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </nav>

        <div class="header-right" ref="userMenuRef">
          <div class="user-menu-trigger" :class="{ open: showUserMenu }" @click.stop="toggleUserMenu">
            <span class="user-avatar">{{ avatarChar }}</span>
            <span class="user-name">{{ currentUser.nickname || currentUser.username }}</span>
            <span class="dropdown-arrow">▼</span>
          </div>

          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-header">
              <span class="dropdown-avatar">{{ avatarChar }}</span>
              <div class="dropdown-user-info">
                <div class="dropdown-username">{{ currentUser.nickname || currentUser.username }}</div>
                <div class="dropdown-role">学生</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" @click="goToProfile">
              <span>👤</span> 个人资料
            </div>
            <div class="dropdown-item" @click="openChangePasswordFromMenu">
              <span>🔐</span> 修改密码
            </div>
            <div class="dropdown-item" @click="openFeedbackFromMenu">
              <span>💬</span> 用户反馈
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout" @click="handleLogout">
              <span>🚪</span> 退出登录
            </div>
          </div>

          <div v-if="showUserMenu" class="dropdown-overlay" @click="showUserMenu = false"></div>
        </div>
      </header>

      <main class="student-main">
        <!--
          学生端正文**全部**由 URL 唯一驱动（R2A 的 5 个标签页 + R2B 的答题页）。
          R2B 之前这里还有一支 `<template v-else>` 兜底渲染答题页（靠内存态 `activeExamId` +
          地址停在 `#/legacy`）—— 现在答题页是 `#/exam/:examId`，那支分支已删除。
          **删除它本身就是一条防线**：守卫已把学生的 `#/legacy` 无条件重定向到试卷列表，
          若这里还留着分支，就会出现「守卫放行了一个渲染不出正文的地址」这类空白页。
        -->
        <router-view />
      </main>
    </div>

    <!-- ============================================================ -->
    <!-- 教师/管理员端：侧边栏布局                                      -->
    <!-- ============================================================ -->
    <div v-else id="app">
      <aside class="iq-layout-sidebar" :class="{ open: sidebarOpen }">
        <div class="iq-sidebar-brand">
          <div class="iq-sidebar-logo">📚</div>
          <span class="brand-name">智能题库</span>
          <span class="brand-role" v-if="currentUser.role === 'admin'">管理员</span>
          <span class="brand-role" v-else>教师</span>
        </div>

        <!--
          侧栏入口（R3）。每条按钮现在只做一件事：跳到它的命名路由。
          高亮判据从「内存里的 currentView/practiceView 枚举值」换成「地址是不是这一条」，
          于是**刷新后高亮依然正确**（迁移前刷新会落回角色默认页、高亮也跟着跑掉）。
          按钮文案、图标、顺序、显示条件（`v-if` 的角色判据）**逐字未改**。
        -->
        <nav class="iq-sidebar-nav">
          <!-- ===== 教学管理 ===== -->
          <div class="iq-nav-group">
            <div class="iq-nav-group-label">教学管理</div>
            <button
                v-if="currentUser.role === 'teacher' || currentUser.role === 'admin'"
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageQuestions) }"
                @click="goStaff(ROUTE.manageQuestions)"
            >
              <span class="iq-nav-icon">📚</span> 题库管理
            </button>
            <!--
              「出卷管理 / 试卷列表管理」这一条**按角色指向两条不同的路由**：
              教师去智能组卷、管理员去试卷列表 —— 与迁移前 `openStaffPage('practice',
              role === 'admin' ? 'exams' : 'generate')` 的分流逐字一致。
              高亮也按同一分流判定（迁移前是 practiceView 的同一个三元表达式）。
            -->
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(currentUser.role === 'admin' ? ROUTE.manageExams : ROUTE.manageGenerate) }"
                @click="goStaff(currentUser.role === 'admin' ? ROUTE.manageExams : ROUTE.manageGenerate)"
            >
              <span class="iq-nav-icon">📝</span> {{ currentUser.role === 'admin' ? '试卷列表管理' : '出卷管理' }}
            </button>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageClasses) }"
                @click="goStaff(ROUTE.manageClasses)"
            >
              <span class="iq-nav-icon">🏫</span> 班级管理
            </button>
          </div>

          <!-- ===== 教学数据 ===== -->
          <div class="iq-nav-group">
            <div class="iq-nav-group-label">教学数据</div>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageExamAnalysis) }"
                @click="goStaff(ROUTE.manageExamAnalysis)"
            >
              <span class="iq-nav-icon">📊</span> 试卷分析
            </button>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageAnalysis) }"
                @click="goStaff(ROUTE.manageAnalysis)"
            >
              <span class="iq-nav-icon">📈</span> {{ currentUser.role === 'admin' ? '学生个性化分析' : '学情分析' }}
            </button>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageAdaptive) }"
                @click="goStaff(ROUTE.manageAdaptive)"
            >
              <span class="iq-nav-icon">📊</span> 自适应学情
            </button>
            <!-- 主观题复核：`role !== 'admin'` 的判据同时写在按钮与 `manage.review` 的 meta.roles 里 -->
            <button
                v-if="currentUser.role !== 'admin'"
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.manageReview) }"
                @click="goStaff(ROUTE.manageReview)"
            >
              <span class="iq-nav-icon">📝</span> 主观题复核
            </button>
          </div>

          <!-- ===== 系统管理（仅管理员） ===== -->
          <div v-if="currentUser.role === 'admin'" class="iq-nav-group">
            <div class="iq-nav-group-label">系统管理</div>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.adminUsers) }"
                @click="goStaff(ROUTE.adminUsers)"
            >
              <span class="iq-nav-icon">👥</span> 用户管理
            </button>
            <button
                class="iq-nav-item"
                :class="{ active: isStaffActive(ROUTE.adminAudit) }"
                @click="goStaff(ROUTE.adminAudit)"
            >
              <span class="iq-nav-icon">✅</span> 注册审核
              <span v-if="pendingCount > 0" class="iq-nav-badge">{{ pendingCount }}</span>
            </button>
          </div>
        </nav>

        <!-- ===== 左下角用户菜单 ===== -->
        <div class="iq-sidebar-footer">
          <div class="sidebar-user-trigger" @click.stop="toggleSidebarUserMenu">
            <div class="user-info">
              <div class="user-avatar">{{ avatarChar }}</div>
              <div class="user-detail">
                <div class="user-name">{{ currentUser.nickname || currentUser.username }}</div>
                <div class="user-role">
                  <span class="role-badge" :class="currentUser.role">{{ roleMap[currentUser.role] }}</span>
                </div>
              </div>
            </div>
            <span class="dropdown-arrow" :class="{ open: showSidebarUserMenu }">▼</span>
          </div>

          <div v-if="showSidebarUserMenu" class="sidebar-user-dropdown">
            <div class="dropdown-item" @click="goToProfile">
              <span>👤</span> 个人中心
            </div>
            <div class="dropdown-item" @click="openChangePasswordFromMenu">
              <span>🔐</span> 修改密码
            </div>
            <div class="dropdown-item" @click="openFeedbackFromMenu">
              <span>💬</span> 用户反馈
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout" @click="handleLogout">
              <span>🚪</span> 退出登录
            </div>
          </div>
        </div>
      </aside>

      <div v-if="sidebarOpen" class="iq-sidebar-overlay" @click="sidebarOpen = false"></div>

      <!-- ===== 顶部 Header（已移除改密码和退出按钮） ===== -->
      <header class="iq-layout-header">
        <div class="header-left">
          <button class="iq-sidebar-toggle" @click="sidebarOpen = !sidebarOpen" aria-label="打开菜单">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <nav class="iq-breadcrumb">
            <span class="breadcrumb-home" @click="goHome">首页</span>
            <span class="crumb-sep">/</span>
            <span class="breadcrumb-current">{{ currentBreadcrumb }}</span>
          </nav>
        </div>
        <!-- 右上角只保留头像和姓名，功能移至左下角下拉菜单 -->
        <div class="iq-header-right">
          <div class="iq-avatar-wrap">
            <div class="iq-avatar">{{ avatarChar }}</div>
            <div class="iq-avatar-info">
              <div class="iq-avatar-name">{{ currentUser.nickname || currentUser.username }}</div>
              <div class="iq-avatar-role">
                <span class="role-badge" :class="currentUser.role">{{ roleMap[currentUser.role] }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- ===== 主内容区 ===== -->
      <main class="iq-layout-main">
        <!--
          R3 起**所有**页面都是真实路由，正文一律由 URL 唯一驱动 ——
          原来的 `v-if="inMigrated"` + `v-else` legacy 分派（题库管理 / 用户管理 / 注册审核 /
          出卷与学生管理的 8 个分支）已整体删除。

          为什么可以无条件渲染 `<router-view>`：staff 布局只在已登录且非学生时出现，
          而 `login` / `root` / `unknown` / `legacy` 四条地址标记路由**每一条都会被守卫重定向走**
          （见 `guard.js`），所以这里不会停在一条「有地址但没正文」的路由上。
          唯一会短暂经过的是「登录成功 → 守卫 replace 到角色首页」之间的那一瞬，
          此时渲染空组件 —— 与迁移前那一瞬的空白正文**视觉一致**（旧代码在那一刻也没有匹配分支）。

          智能组卷是唯一需要跨页面保留草稿状态的页面。main 曾用 `v-show` 永久挂载
          `GenerateExam`；路由迁移后改成只缓存 `ManageGeneratePage`，避免切到题库管理时销毁
          组卷步骤、表单和生成进度，同时不把其他管理页面一并缓存。退出登录会卸载整个 staff
          布局，因此缓存不会带到下一个账号。
        -->
        <router-view v-slot="{ Component }">
          <KeepAlive include="ManageGeneratePage">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </main>

      <!-- ===== 弹窗层 ===== -->
      <!--
        题库管理的 4 个弹窗（QuestionForm / QuestionDetail / ImportQuestions / AiGenerate /
        ImageRecognition）随正文一起搬进了 `views/manage/QuestionBankPage.vue`。
        `ChangePassword` **不属于题库管理**（教师/管理员由左下角菜单触发，学生端另有一处在
        模板末尾），故留在根组件 —— 它是外壳级弹窗，与当前在哪一页无关。
      -->
      <ChangePassword
          :visible="pwdVisible"
          @close="pwdVisible = false"
          @success="handlePwdChanged"
      />

    </div>

    <AIAssistant @start-exam="startExam" />
  </div>

  <!-- ===== Toast ===== -->
  <ChangePassword v-if="currentUser?.role === 'student'" :visible="pwdVisible" @close="pwdVisible=false" @success="handlePwdChanged" />
  <Toast :message="toastMessage" :type="toastType" />
</template>

<script setup>
// R3 起**每一个**页面都由 URL 唯一驱动，所以这里不再需要 `watch` / `reactive`：
// 原先 `reactive` 只服务于题库管理的筛选表单（随正文搬走），`watch` 只服务于
// 「页码变化清空勾选」与「currentView 落到 main 时纠正为 papers」（前者搬走、后者删）。
import { ref, computed, provide, readonly, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

// ===== 路由：页面身份的唯一来源就是地址 =====
import { ROUTE_NAMES } from '@/router/routes';
import {
  goExam,
  goRoleHome,
  goAfterLogin,
  goLogin,
  goStudentPage,
  goRoute,
  goProfile,
  goFeedback,
  isRouteAllowed,
  goLoginWithFeature,
  goFeatureLanding,
} from '@/router/nav';
// 登录页 `?feature=` 的白名单判定（纯函数，权威表在 `router/feature.js`，与候选路由的
// `meta.roles` 一起构成「登录后去哪」的**唯一**规则来源）。
import { normalizeFeature } from '@/router/feature';
// ⚠️ `clearSession` 曾经漏在这张名单外 —— `handleLogout` / `handlePwdChanged` / `handleAuthExpired`
// 三个出口都在调它，于是三处**全部**在运行时抛 `ReferenceError: clearSession is not defined`：
// 退出登录点了没反应、改密后不重登、401 不跳登录页。构建不会报（自由标识符被当成全局变量），
// 在 Node 里跑守卫矩阵也看不见（那边直接 import `session.js`，不经过 App.vue）。
// **是 R3 的真实浏览器验收把它抓出来的**（见 `docs/R3 验收报告.md`）。
import { clearSession, clearExamReturn, currentUser as currentUserRef } from '@/router/session';

// ===== 组件导入 =====
// R3 之后 App.vue 只剩「外壳级」组件：登录闸门、注册弹窗、Toast、改密弹窗、AI 助手。
// 所有业务正文都挂在路由上（`views/student/*`、`views/shared/*`、`views/manage/*`、
// `views/admin/*`），根组件不再直接渲染任何一个业务页面 —— 这正是 R3 的目的：
// **可见入口有稳定 URL，刷新/深链/前进后退都由地址说了算**。
import Login from '@/components/Login.vue';
import RegistrationDialog from '@/components/RegistrationDialog.vue';
import Toast from '@/components/Toast.vue';
import ChangePassword from '@/components/ChangePassword.vue';
// `ExamPractice` 的 import 随答题页迁移一并删除（R2B）：它现在只由 `#/exam/:examId` 的
// 薄壳 `views/student/ExamPracticePage.vue` 渲染。App.vue 里若还留着这个 import，
// 会让人以为这里仍是它的渲染点。
// 既存的未使用导入（迁移前就没有任何模板引用）。本轮不动它——边界是「不清历史死代码」。
import WrongBook from '@/components/practice/WrongBook.vue';
import AIAssistant from '@/components/AIAssistant.vue';

// ===== API =====
// 题库管理的 6 个接口（getQuestions / addQuestion / updateQuestion / deleteQuestion /
// getStatistics / batchDeleteQuestions）随正文一起搬到了 `views/manage/QuestionBankPage.vue`。
// 这里只剩注册审核角标用的那一个。
import { getRegistrations } from '@/api/auth';

// ================================================================
// 常量
// ================================================================
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' };

const studentTabs = [
  { key: 'papers', label: '试卷列表', icon: '📋' },
  { key: 'adaptive', label: '自适应练习', icon: '🎯' },
  { key: 'review', label: '题目复盘', icon: '📕' },
  { key: 'records', label: '答题记录', icon: '📊' },
  { key: 'analysis', label: '学情分析', icon: '📈' },
];

// ================================================================
// 登录态管理
// ================================================================
// 身份放在 router/session.js：守卫在组件之外运行，把 currentUser 放在根组件里会形成循环依赖。
//
// ⚠️ R3 删除了这里原本的两行 `const currentView = legacyView;` / `const practiceView =
// legacyPracticeView;`。它们的 10 个取值在 R3 全部拿到了地址，于是**两个 ref 都没有剩余
// 取值**，`currentView` 更没有任何模板消费方（原来唯一的用途是驱动已删除的 legacy 分派）。
// 「已无活取值/写入点/模板消费方」由全项目检索 + `guard-matrix.mjs` 的静态断言钉住，
// 不是靠阅读结论。
const currentUser = currentUserRef;
const registerVisible = ref(false);
// R4 删除了 `pendingFeature`（登录前点过的功能入口）：它现在由地址里的 `?feature=` 承载，
// 因此**刷新不会丢**，也不再需要「登录成功时清掉它」这个动作。
const sidebarOpen = ref(false);
const pwdVisible = ref(false);

/** 侧栏按钮与模板里要用命名路由常量，不拼字符串路径。 */
const ROUTE = ROUTE_NAMES;

// ================================================================
// 路由派生值（**单向**：路由 → 这些 computed；没有任何 watch 反向同步）
// ================================================================
const route = useRoute();
/**
 * 当前路由的上下文键，供 AI 助手判断场景。
 * R3 之后它是**唯一**的场景来源 —— 原来还要与 `practiceView` 哨兵二选一，那个哨兵已删除。
 */
const migratedContext = computed(() => route.meta?.context ?? null);

/** 侧栏条目高亮：地址就是这一条吗。刷新后依然正确（迁移前靠内存值，刷新即丢）。 */
const isStaffActive = (name) => route.name === name;

// ================================================================
// 答题练习状态
// ================================================================
/**
 * ⚠️ 这里**不再有任何答题会话状态**。
 *
 * R2A 期间这里曾有一份本地 `ref(null)` 与 `router/session.js` 里那份同名的 `activeExamId`
 * 并存，而守卫读的是 session 那份 —— 于是「学生进 `#/legacy`」的判定永远看到 `null`，
 * 每次点「开始答题」都被守卫当成「没有进行中的答题」原路送回 `#/papers`。
 * 症状是**点了没反应**，`npm run build` 与静态断言都发现不了。
 *
 * R2B 的处置不是「合并成一份」，而是**让这份状态整体消失**：答题页的身份改由
 * `#/exam/:examId` 的 `route.params.examId` 唯一驱动，`activeExamId` 与
 * `examReturnRoute`（退出答题页该回哪里）都已删除/搬进 `router/nav.js`。
 * 没有第二份状态，就没有第二个写入方。
 */
const analysisPracticeFilters = ref({});
const currentQuestionId = ref(null);
const currentQuestion = ref(null);
/**
 * AI 助手要的「当前试卷上下文」——**由路由派生**（R2B），不再是答题页上报的内存态。
 *
 * 为什么必须是 computed 而不是 `ref`：答题页的地址就是它的身份来源，任何时刻
 * `#/exam/16` 的上下文都应当是 16。用 ref 就得有人在进入/退出/提交/卸载时把它清干净，
 * 漏一处就会把**上一张卷**的 id 发给 AI 助手。
 *
 * `null` = 当前不在答题页上。非法 id（`#/exam/abc`）同样返回 `null`：
 * 那种地址根本不会有答题页实例，助手也就不该拿到一个假 id。
 */
const currentExamId = computed(() => {
  if (route.name !== ROUTE_NAMES.exam) return null;
  const raw = route.params.examId;
  return /^\d+$/.test(String(raw ?? '')) ? String(raw) : null;
});

/**
 * 教师/管理员侧边栏入口（题库管理 / 试卷列表管理 / 班级管理 / 用户管理 / 注册审核 …）。
 *
 * 入参是**命名路由常量**（模板里从 `ROUTE` 取），不是路径字符串 —— 展示地址里的 `#`
 * 永远不进入组件代码（实施计划 §5.3）。
 *
 * R3 起这个函数退化成纯粹的一跳：`goRoute` 就是 `router.push`（同址则 no-op）。
 * 迁移前它必须调 `goLegacyView`，因为那时侧栏写的是内存状态、而正文渲染由
 * `inMigrated`（路由派生）决定 —— 从 `#/profile` 点「题库管理」会出现「地址不动、
 * 正文还是个人资料」的假死。现在页面身份只在地址里，这种「两份状态不一致」的形态
 * **不存在了**，所以不需要任何补偿动作。
 */
const goStaff = (name) => {
  goRoute(name);
  sidebarOpen.value = false;
};

/**
 * 学情分析页的「去练习」。**按角色分流**（R3 之后两条支路都是真实路由）：
 * - 学生端：`#/adaptive` / `#/papers`（R2A 起就是路由，本轮未改）；
 * - 教师/管理员：`manage.exams`（迁移前是 `practiceView='exams'` 的 legacy 分派，落点相同）。
 *
 * 教师/管理员的 `wantsAdaptive` 分支在迁移前会写入 `practiceView='adaptive'` —— 那个值
 * **没有任何渲染分支**（既不在 `standalonePracticeViews` 之外的任何 `v-if` 里，
 * 也没有对应的模板分支），用户看到的是**空白正文**。本轮**不把它映射到任何一个形似页面**
 * （那会凭空造出一个产品里不存在的功能），而是给出明确的不可用提示。
 * 该分支目前**无调用点**（`LearningAnalysis` 从不 `$emit('practice')`），所以这个改动
 * 在任何可达路径上都观察不到。
 *
 * `analysisPracticeFilters` 保持「只写不读」的既存行为——迁移前 AdaptivePractice 就没接收
 * `initialFilters`（见 views/student/AdaptivePracticePage.vue 的注释），本轮不顺手接上它。
 */
const handlePracticeFromAnalysis = (filters) => {
  analysisPracticeFilters.value = filters || {};

  const isStudent = currentUser.value?.role === 'student';
  const wantsAdaptive = !!(
    filters?.adaptive ||
    filters?.questionTypes ||
    filters?.chapters ||
    filters?.knowledgeKeyword
  );

  if (isStudent) {
    goRoute(wantsAdaptive ? ROUTE_NAMES.adaptive : ROUTE_NAMES.papers);
    sidebarOpen.value = false;
    showToast('已跳转到练习页面', 'success');
    return;
  }

  if (wantsAdaptive) {
    showToast('自适应练习仅学生端可用，暂时不能从这里跳转。', 'warning');
    return;
  }

  goRoute(ROUTE_NAMES.manageExams);
  sidebarOpen.value = false;
  showToast('已跳转到练习页面', 'success');
};

/**
 * 学情分析页的「智能组卷」（`LearningAnalysis.vue:87` 的 `$emit('navigate','generate')`）。
 *
 * 目标页 `manage.generate` 的 `meta.roles` 是 `['teacher']`。**管理员点了会被守卫挡回
 * 管理员首页** —— 迁移前的行为是「写 `practiceView='generate'`，但正文分支要求
 * `role === 'teacher'`」⇒ **空白正文**。所以这是把一处白屏换成明确拒绝，**没有放宽**任何权限：
 * 管理员过去进不去组卷页，现在同样进不去（用户已就此裁决：不得开放 admin 进入
 * `manage.generate`）。
 *
 * 这里用 `isRouteAllowed` 先问一次「守卫会不会放行」，**读的还是 `meta.roles` 同一份规则**，
 * 目的只是不要在跳转注定失败时先弹一句「已跳转到智能组卷」再弹「无权访问」。
 * 它不是权限判定 —— 真正的边界永远是守卫。
 */
const handleNavigateFromAnalysis = (target) => {
  if (target !== 'generate') return;
  if (!isRouteAllowed(ROUTE_NAMES.manageGenerate)) {
    showToast('智能组卷仅教师可用。', 'warning');
    return;
  }
  goRoute(ROUTE_NAMES.manageGenerate);
  sidebarOpen.value = false;
  showToast('已跳转到智能组卷', 'success');
};

// ⚠️ R3 删除了 `openRecommendedPractice` 与 `onEnterPractice`。
// 二者都是**零调用点**的死代码（模板全文无引用），而函数体恰好就是
// `practiceView.value = 'adaptive'` / `currentView.value = 'practice'` —— 它们引用的两个 ref
// 在本轮被删除，因此**无法原样存活**。实施计划 §6.4 把「清理死代码」归到 R6，
// 但那里清理的是**与本次迁移无关**的既存死代码；这两个是本次迁移的直接后果，不在此列。
// 用户已裁决接受这一处例外。
//
// `handlePracticeFromAnalysis` / `analysisPracticeFilters` 按 §6.4 保留（它们不引用被删的 ref），
// 只把 jumps 改成路由。

provide('assistantState', {
  // 已迁移页面的上下文**只**由路由派生（D5）。R1 时这个键叫 `pilotView`，
  // R2A 随 `meta.migrated` 一起改名 —— 「试点」一词在页面变多后已不准确。
  //
  // R3 删除了同一对象里的 `currentView` / `practiceView` 两个只读键：它们喂给 AI 助手的
  // `currentPage` / `contextMode` 两个 computed，而那两个 computed 本来就已经
  // 「migratedView 优先」，遗留状态那一支在 R3 之后永远取不到有效值。
  // **留着一个没有写入方的 ref 比删掉它更危险** —— R2A 的「两份 activeExamId」事故
  // 正是「状态声明与状态消费分处两个模块」造成的（见下方答题会话状态的注释）。
  migratedView: readonly(migratedContext),
  currentQuestionId,
  currentQuestion,
  currentExamId,
  currentUser,
});


// ================================================================
// 导航
// ================================================================
/** 学生顶部标签：5 个标签全是真实路由，由统一入口按路由跳。 */
const navigateTo = (key) => {
  // `goStudentPage` 返回 false 只可能是「标签表里出现了一个没在 `STUDENT_PAGE_ROUTES` 里
  // 登记的键」—— 5 个键当前都有路由，这是**不可达**的编程错误分支。
  // 迁移前这里会退回 `goLegacyView(key)`，写一个没有任何渲染分支的遗留状态值 ⇒ 空白正文。
  // R3 之后没有 legacy 出口可退，改成明确提示（同样是不可达分支，只是不再制造白屏）。
  if (!goStudentPage(key)) showToast('这个入口暂时不可用。', 'warning');
};

/**
 * 标签高亮：**只**由 `meta.tab` 派生（详情页也高亮「答题记录」，因为它的 tab 就是 records）。
 * 迁移前是「已迁移看 meta.tab，未迁移看 currentView」的二选一，后者已随遗留状态删除。
 */
const isTabActive = (key) => route.meta?.tab === key;

const goHome = () => {
  goRoleHome(currentUser.value?.role);
  sidebarOpen.value = false;
};

// ================================================================
// 学生端下拉菜单
// ================================================================
const showUserMenu = ref(false);
const userMenuRef = ref(null);

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const closeUserMenu = () => {
  showUserMenu.value = false;
};

// ================================================================
// 教师端侧边栏底部下拉菜单
// ================================================================
const showSidebarUserMenu = ref(false);

const toggleSidebarUserMenu = () => {
  showSidebarUserMenu.value = !showSidebarUserMenu.value;
};

const closeSidebarUserMenu = () => {
  showSidebarUserMenu.value = false;
};

// ================================================================
// 公共操作
// ================================================================
const goToProfile = () => {
  goProfile();
  closeUserMenu();
  closeSidebarUserMenu();
};

const openChangePasswordFromMenu = () => {
  pwdVisible.value = true;
  closeUserMenu();
  closeSidebarUserMenu();
};

const openFeedbackFromMenu = () => {
  goFeedback();
  closeUserMenu();
  closeSidebarUserMenu();
};

const handleClickOutside = (event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showUserMenu.value = false;
  }
};

// ================================================================
// 计算属性
// ================================================================
// ⚠️ R3 删除了 `canEdit`：它唯一的消费方是题库管理横幅里的「AI 出题 / 批量导入 /
// 图片识别 / 新增题目」按钮组，已随正文搬到 `views/manage/QuestionBankPage.vue`
// （那里有一份逐字相同的 `canEdit`，因为 `QuestionTable` 的编辑/删除列判的是同一个条件）。

const avatarChar = computed(() => {
  const name = currentUser.value?.nickname || currentUser.value?.username || 'U';
  return name.charAt(0).toUpperCase();
});

/**
 * staff 面包屑：**只**来自 `meta.crumb`（R3）。
 *
 * 迁移前这里是一张按 `currentView` / `practiceView` 查表的手写映射，与路由表里的
 * `meta.crumb` **两份数据描述同一件事** —— 典型的双份真相：改了一处忘了另一处，
 * 面包屑就会与页面不符。现在 10 条 staff 路由各自在 `meta.crumb` 里写自己的名字
 * （`manage.*` 带「出卷与学生管理 / 」前缀，与迁移前 `practice` 分支的拼接结果逐字相同），
 * 查表整张删除。
 *
 * 登录/根/未知/legacy 四条地址标记路由没有 `crumb`，返回空串 —— 与迁移前
 * 「没有匹配分支时返回 ''」一致；而这些地址会被守卫立刻重定向走，用户看不到这一瞬。
 */
const currentBreadcrumb = computed(() => route.meta?.crumb || '');

/**
 * 「开始答题」——**学生端唯一入口**（试卷列表「开始答题」、题目复盘「重新练习」，
 * 以及 AI 助手生成练习卷后 @start-exam）。
 *
 * R2B 起它只做两件事：校验角色 → 交给 `nav.js: goExam` 跳 `#/exam/:examId`。
 * 「记住退出时要回哪里」（含角色校验、拒绝把另一张答题页当兜底）也在 `goExam` 里，
 * 所以**入口只有这一处、来源记录也只有一个写入方**。
 *
 * 角色校验保留在本组件（而不是下沉到 nav.js）：`#/exam/:examId` 的 `meta.roles` 是
 * `['student']`，教师/管理员误入会被守卫挡走；这里的 `currentUser` 是权威身份来源。
 * （R3 起这句话的依据从「教师侧没有 practice 分支 ⇒ 空白正文」换成了 `meta.roles`，
 * 行为不变：非学生调 `startExam` 一律什么都不做。）
 */
const startExam = (examId) => {
  if (currentUser.value?.role !== 'student') return;
  goExam(examId);
};

/**
 * 学情分析页（`views/student/LearningAnalysisPage.vue` 与
 * `views/manage/ManageAnalysisPage.vue`）要触发的**跨页面动作**。
 *
 * 迁移前它存在的理由是「同一个 `LearningAnalysis` 组件被两种角色复用，而两边的落点不同」——
 * 学生去 `#/adaptive` / `#/papers`，教师/管理员去 legacy 分派出来的页面。R3 之后
 * **两边都是真实路由**，但分流这件事本身还在（学生去练习页、staff 去试卷列表），
 * 所以这个通道保留：它是**唯一仍需 App.vue 上下文**的跨页动作。
 *
 * R2B 之前这里还有 `startExam` / `exitExam`，两者都因为依赖本组件的 `activeExamId` /
 * `examReturnRoute` 而挂在这里。那两份状态已经不存在了（答题页的身份改由 URL 驱动），
 * 所以两个键一并去掉 —— 薄壳改成直接从 `@/router/nav` import `goExam` / `exitExam`。
 * 留着它们反而危险：`appNavigate` 看起来还能写导航状态，会诱使后来者再引入一个写入方。
 *
 * ⚠️ 与 `appToast` 同理，必须放在上述函数的 `const` **之后**：`provide` 在 setup 执行期
 * 同步求值，写到前面会撞 TDZ（R1 的 appToast 就踩过一次，构建期发现不了）。
 */
provide('appNavigate', {
  practiceFromAnalysis: handlePracticeFromAnalysis,
  navigateFromAnalysis: handleNavigateFromAnalysis,
});

// ================================================================
// 注册审核
// ================================================================
const pendingCount = ref(0);

const loadPendingCount = async () => {
  if (!currentUser.value || currentUser.value.role === 'student') return;
  try {
    const data = await getRegistrations({ status: 'pending', pageSize: 1 });
    pendingCount.value = data.total;
  } catch (e) {
    pendingCount.value = 0;
  }
};

/**
 * R3 新增的下行通道：**给已迁移的 staff 页面用的外壳级动作**。
 *
 * 目前只有一个消费者 —— `views/admin/AdminAuditPage.vue`。迁移前
 * `RegistrationAudit` 的 `@update:pending` 是**直接**接到本组件的 `loadPendingCount`
 * 上的（`App.vue` 旧第 332 行），因为那时审核正文与角标同处一棵树。正文搬到路由之后，
 * 它们不再有父子关系，必须显式架一条通道 —— 与既有的 `appToast`（提示）/
 * `appNavigate`（跨页跳转）是同一套 `provide` 机制。
 *
 * 消费端**取不到时静默跳过**：角标不刷新是可接受的降级，而抛错会让整个审核页白屏。
 *
 * ⚠️ 与 `appToast` 同理，必须放在 `loadPendingCount` 的 `const` **之后**：
 * `provide` 在 setup 执行期同步求值，写到前面会撞 TDZ（R1 的 appToast 踩过一次）。
 */
provide('appStaff', { refreshPendingCount: loadPendingCount });

const registerSuccess = () => {
  registerVisible.value = false;
  showToast('✅ 注册申请已提交，请等待管理员审核', 'success');
};

// ================================================================
// 登录/退出
// ================================================================
// 会话恢复已移到 router/session.js 的模块初始化：守卫在组件挂载前就要知道身份，
// 而且恢复**只认 localStorage**——它绝不改写地址，所以不会覆盖已有的合法深链。

const handleLoginSuccess = (user) => {
  currentUser.value = user;

  // 1) 带 redirect：优先回到登录前想去的站内地址（角色不符/非法/未知目标会被 goAfterLogin 拒绝）
  const redirect = route.query?.redirect;
  if (redirect) {
    const landed = goAfterLogin(user.role, redirect);
    if (landed) {
      loadPendingCount();
      return;
    }
  }

  /**
   * 2) 无 redirect 或 redirect 不可用：按「登录前点过的功能入口」→ 角色默认页。
   *
   * R4 起这个入口的**唯一来源是地址**（`#/login?feature=xxx`，见 `router/feature.js`）。
   * 这里原来有一个内存 ref（`pendingFeature`）记着它：刷新即丢。现在地址在则意图在 ——
   * 用户点了「智能组卷」→ 地址变成 `?feature=generate` → 刷新 → 登录 → 照样落到智能组卷。
   *
   * 落点**不再由本文件里的角色表决定**（那张表已删除）：候选路由自己的 `meta.roles` 说了算，
   * 与守卫同源。一个候选都进不去时用的是守卫那份**统一越权提示**，然后回角色首页 ——
   * 与「直接敲地址被守卫挡回」是同一种收尾，不因为入口不同而给出两套说法。
   *
   * ⚠️ 迁移前这里有 `resetLegacy()`：把遗留状态复位到该角色的默认页，免得换角色登录后
   * 遗留状态还停在上一个角色的页面。遗留状态没了，这个动作随之消失；而「换角色登录不串页」
   * 这件事现在由 `meta.roles` 保证 —— 上一个角色的地址会被新角色的规则挡回新角色首页。
   *
   * ⚠️ 原来的 `loadData()` / `loadStats()`（题库列表与统计）也已移出：它们现在挂在
   * `views/manage/QuestionBankPage.vue` 的 `onMounted`，只在真正进入题库管理时执行。
   * **`loadPendingCount()` 必须留在原处**：它刷新的是侧栏「注册审核」角标，与当前在哪一页无关。
   */
  const requested = normalizeFeature(route.query?.feature);
  const landing = requested ? goFeatureLanding(requested, user.role) : null;
  if (!landing?.ok) {
    if (requested) showToast(landing.message, 'warning');
    goRoleHome(user.role);
  }

  loadPendingCount();
};

/**
 * 未登录点击登录页的功能入口：把目标写进地址（`router/feature.js` 白名单），并给一句提示。
 *
 * 提示语是**登录前**说的，只描述意图，不承诺结果：真正能不能进由登录后候选路由的
 * `meta.roles` 决定（例如学生点「智能组卷」会在登录后收到那条统一越权提示）。
 */
const handleGuestFeature = (feature) => {
  if (!goLoginWithFeature(feature)) return; // 白名单外的值：地址不动，也不提示
  const messages = {
    generate: '请先登录教师账号，登录后将进入智能组卷',
    adaptive: '请先登录学生账号，登录后将进入自适应练习',
    analysis: '请先登录账号，登录后将进入对应角色的学情分析',
    profile: '请先登录账号，登录后将进入个人中心',
  };
  showToast(messages[feature] || '请先登录', 'info');
};

const handleLogout = () => {
  if (!window.confirm('确定要退出登录吗？')) return;
  clearSession();
  // 迁移前是 `resetLegacy()`（清遗留状态 + 清答题返回来源）。遗留状态没了，
  // 现在只清 `examReturnLocation` —— 不清会把「上一个账号退出前所在页面」记进下一个账号。
  clearExamReturn();
  pendingCount.value = 0;
  closeUserMenu();
  closeSidebarUserMenu();
  // 退出登录回到登录页，且不带 redirect：重新登录应落角色首页，而不是回到退出前的地址
  goLogin();
};

const handlePwdChanged = () => {
  pwdVisible.value = false;
  showToast('密码修改成功，请重新登录', 'success');
  setTimeout(() => {
    clearSession();
    clearExamReturn();
    goLogin();
  }, 1500);
};

/** 401：清会话并回登录页，同时把当前站内地址记进 redirect（重登后能回到原页面）。 */
const handleAuthExpired = () => {
  const redirect = route.name === ROUTE_NAMES.login ? '' : route.fullPath;
  clearSession();
  clearExamReturn();
  showToast('登录已过期，请重新登录', 'warning');
  goLogin({ redirect });
};

/** 守卫（组件之外）的提示通道：与 toast 共用同一个 showToast。 */
const handleToastEvent = (event) => {
  const detail = event?.detail;
  if (detail?.message) showToast(detail.message, detail.type);
};

// ================================================================
// Toast
// ================================================================
const toastMessage = ref('');
const toastType = ref('info');

const showToast = (message, type = 'info') => {
  toastMessage.value = '';
  toastType.value = type;
  setTimeout(() => {
    toastMessage.value = message;
  }, 10);
};

// 子组件（含试点页面）统一用这个通道弹提示，不再各自直连 toast 内部状态。
// ⚠️ 必须放在 showToast 的 `const` **之后**：`provide(...)` 是在 setup 执行期同步求值的，
// 写到前面会撞上 TDZ，直接抛 ReferenceError 让整个 App 挂不起来（构建期发现不了，只有真机运行才暴露）。
provide('appToast', showToast);

// ⚠️ R3 删除了 `handleToastFromChild`（`({message,type}) => showToast(...)` 的拆包壳）。
// 它的两个消费者 `UserManagement` / `RegistrationAudit` 的 `@toast` 已随各自正文
// 搬到 `views/admin/AdminUsersPage.vue` / `views/admin/AdminAuditPage.vue`，那两处各有
// 一份同形态的 `onToast`（拆包逻辑相同，只是走本组件 provide 出去的 `appToast`）。
// 与 `openRecommendedPractice` 同类：**迁移的直接后果**，不是 R6 要清的既存死代码。


// ================================================================
// 题库管理
// ================================================================
// ⚠️ R3：整段移除。原 `App.vue` 的这一节（状态 21 项 / `loadData` / `loadStats` /
// `handleSearch` / `handleReset` / `handlePageChange` / `generateId` / `openAddDialog` /
// `openEditDialog` / `openViewDialog` / `handleSubmit` / `handleDelete` / `handleBatchDelete` /
// `handleImportSuccess` / `handleAiSuccess`，以及两个 watcher）**逐字搬到了**
// `views/manage/QuestionBankPage.vue`（命名路由 `manage.questions`）。
// 搬移前后的一致性核对见 `docs/R3 验收报告.md`「机械搬移一致性」一节。
//
// 两个 watcher 的去向不同，都不是「顺手删」：
//   - `watch(page, …清空勾选)` → 随 `selectedIds` 一起搬进新视图（原样保留）；
//   - `watch(currentView, …把学生的 main 纠正回 papers)` → **删除**。它纠正的是一个
//     学生根本不该到达的状态（题库管理是 teacher/admin 页面），R3 之后 `meta.roles`
//     在守卫里**事前拒绝**，比组件内事后纠正更强。
//
// 因此 `reactive` / `watch` 两个 import 也随之不再需要（本文件已无其他消费方）。

// ================================================================
// 生命周期
// ================================================================
onMounted(() => {
  // 会话在 router/session.js 模块初始化时已恢复，这里不再重复恢复，也不改写地址
  //
  // ⚠️ 迁移前这里还有 `loadData()` / `loadStats()`（题库列表 + 统计），对**任意已登录角色**
  // 都会发请求（学生、以及根本不看题库页的管理员也照发）。它们现在挂在
  // `views/manage/QuestionBankPage.vue` 的 `onMounted`，只在真正进入题库管理时执行。
  // 这是「正文不再挂在根组件上」的必然结果，方向是**减少**无谓请求；逐条副作用对账见验收报告。
  //
  // `loadPendingCount()` **留在原处**：它刷新侧栏「注册审核」角标，与在哪一页无关。
  if (currentUser.value) {
    loadPendingCount();
  }
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('auth-expired', handleAuthExpired);
  window.addEventListener('iq-toast', handleToastEvent);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('auth-expired', handleAuthExpired);
  window.removeEventListener('iq-toast', handleToastEvent);
});
</script>

<style scoped>
/* ================================================================
   学生端样式
   ================================================================ */
.student-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
  background: #F8FAFC;
}

.student-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width:260px;
  height:100vh;
  position:fixed;
  left:0;
  top:0;
  flex-direction:column;
  align-items:stretch;
  padding:18px 14px;
  background: #FFFFFF;
  border-right: 1px solid #E2E8F0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1E293B;
}
.brand-icon {
  font-size: 24px;
}
.brand-name {
  background: linear-gradient(135deg, #6366F1, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  flex: 1;
  justify-content: flex-start;
  padding: 22px 0 0;
}

.nav-tab {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: #64748B;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
  text-align: left;
}
.nav-tab:hover {
  background: #F1F5F9;
  color: #1E293B;
}
.nav-tab.active {
  background: #EEF2FF;
  color: #4338CA;
}

.header-right {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.user-menu-trigger:hover {
  background: #F1F5F9;
}

.user-menu-trigger .user-avatar {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #EEF2FF;
  color: #4338CA;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
}

.user-menu-trigger .user-name {
  font-size: 13px;
  font-weight: 500;
  color: #1E293B;
}

.dropdown-arrow {
  font-size: 10px;
  color: #94A3B8;
  transition: transform 0.2s;
}

.user-menu-trigger.open .dropdown-arrow {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F8FAFC;
}

.dropdown-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #EEF2FF;
  color: #4338CA;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
}

.dropdown-username {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
}

.dropdown-role {
  font-size: 12px;
  color: #94A3B8;
}

.dropdown-divider {
  height: 1px;
  background: #E2E8F0;
  margin: 0 12px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: #F1F5F9;
}

.dropdown-item.logout {
  color: #EF4444;
}

.dropdown-item.logout:hover {
  background: #FEF2F2;
}

.dropdown-item span:first-child {
  width: 20px;
  text-align: center;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
}

.student-main {
  flex: 1;
  padding: 24px;
  max-width: none;
  width: calc(100% - 260px);
  min-height: 100vh;
  margin-left: 260px;
}

@media (max-width: 768px) {
  .student-header {
    flex-wrap: wrap;
    height: auto;
    padding: 10px 12px;
    gap: 8px;
  }
  .header-nav {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-start;
  }
  .nav-tab {
    padding: 4px 10px;
    font-size: 12px;
  }
  .student-main {
    padding: 16px;
  }
  .user-menu-trigger .user-name {
    display: none;
  }
}

/* ================================================================
   教师/管理员端样式
   ================================================================ */
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.iq-layout-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 100vh;
  background: #FFFFFF;
  border-right: 1px solid #E2E8F0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease;
}

.iq-sidebar-brand {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E2E8F0;
  gap: 10px;
  flex-wrap: wrap;
}
.iq-sidebar-logo {
  font-size: 28px;
  line-height: 1;
}
.brand-name {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366F1, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-role {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #EEF2FF;
  color: #4338CA;
  font-weight: 500;
  -webkit-text-fill-color: #4338CA;
  margin-left: auto;
}

.iq-sidebar-nav {
  flex: 1;
  padding: 12px 0 8px;
  overflow-y: auto;
}

.iq-nav-group {
  margin-bottom: 4px;
}
.iq-nav-group-label {
  padding: 8px 20px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.iq-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  margin: 1px 12px;
  border-radius: 8px;
  color: #64748B;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  width: calc(100% - 24px);
}
.iq-nav-item:hover {
  background: #F1F5F9;
  color: #1E293B;
}
.iq-nav-item.active {
  background: #6366F1;
  color: #FFFFFF;
}
.iq-nav-item .iq-nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.iq-nav-badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0 6px;
  background: #EF4444;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  border-radius: 9px;
  margin-left: auto;
}

.iq-sidebar-footer {
  border-top: 1px solid #E2E8F0;
  padding: 12px 16px;
  margin-top: auto;
  position: relative;
}

.sidebar-user-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  border-radius: 8px;
  transition: background 0.2s;
}

.sidebar-user-trigger:hover {
  background: #F1F5F9;
}

.iq-sidebar-footer .user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.iq-sidebar-footer .user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #EEF2FF;
  color: #4338CA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.iq-sidebar-footer .user-detail {
  flex: 1;
  min-width: 0;
}

.iq-sidebar-footer .user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
}

.iq-sidebar-footer .user-role {
  font-size: 11px;
  color: #94A3B8;
}

.sidebar-user-trigger .dropdown-arrow {
  font-size: 10px;
  color: #94A3B8;
  transition: transform 0.2s;
  margin-left: 4px;
}

.sidebar-user-trigger .dropdown-arrow.open {
  transform: rotate(180deg);
}

.sidebar-user-dropdown {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 8px;
  right: 8px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  z-index: 50;
}

.sidebar-user-dropdown .dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-user-dropdown .dropdown-item:hover {
  background: #F1F5F9;
}

.sidebar-user-dropdown .dropdown-item.logout {
  color: #EF4444;
}

.sidebar-user-dropdown .dropdown-item.logout:hover {
  background: #FEF2F2;
}

.sidebar-user-dropdown .dropdown-item span:first-child {
  width: 20px;
  text-align: center;
}

.sidebar-user-dropdown .dropdown-divider {
  height: 1px;
  background: #E2E8F0;
  margin: 4px 12px;
}

.iq-layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  position: fixed;
  top: 0;
  right: 0;
  left: 260px;
  z-index: 90;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.iq-sidebar-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #FFFFFF;
  color: #64748B;
  cursor: pointer;
  flex-shrink: 0;
}
.iq-sidebar-toggle:hover {
  background: #F1F5F9;
}

.iq-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.breadcrumb-home {
  color: #94A3B8;
  cursor: pointer;
}
.breadcrumb-home:hover {
  color: #6366F1;
}
.crumb-sep {
  color: #CBD5E1;
}
.breadcrumb-current {
  color: #1E293B;
  font-weight: 500;
}

.iq-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.iq-avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px 2px 2px;
  border-radius: 8px;
}
.iq-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #EEF2FF;
  color: #4338CA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.iq-avatar-name {
  font-size: 13px;
  font-weight: 500;
  color: #1E293B;
}
.iq-avatar-role {
  font-size: 11px;
  color: #94A3B8;
}

.role-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.role-badge.admin {
  background: #FEF2F2;
  color: #DC2626;
}
.role-badge.teacher {
  background: #DBEAFE;
  color: #1D4ED8;
}
.role-badge.student {
  background: #DCFCE7;
  color: #15803D;
}

.iq-layout-main {
  margin-left: 260px;
  padding: 88px 24px 24px;
  min-height: 100vh;
  background: #F8FAFC;
}

/* ============================================================================
   ⚠️ R3 说明：以下直到「子导航」结束的这一段（`.question-bank-page` / `.iq-stat-*` /
   `.iq-subject-summary*` / `.iq-page-hero` / `.hero-*` / `.hero-actions` / `.iq-btn*` /
   `.iq-practice-subnav` / `.iq-subnav-btn`）**在 App.vue 的模板里已经没有消费者** ——
   题库管理正文已搬进 `views/manage/QuestionBankPage.vue`（自带一份逐字相同的 scoped 副本），
   出卷管理的子导航已搬进 `views/manage/ManageExamsPage.vue`（同样自带副本）。

   **本轮故意不删除它们**，两个理由：
     1. 本轮对样式的要求是「只允许机械搬移，禁止顺手重写」——删除是**逆**方向的改动，
        同样需要逐类核对「是否有本文件的元素仍在用」，而这份核对的价值远低于误删的风险；
     2. `<style scoped>` 的作用域规则是「本模板的元素 + 直接子组件的根元素」，
        而 `<router-view>` 渲染出的视图是否继承 App.vue 的 scope id 需要实测才能下结论
        （验收报告里记录了这次实测的结果）。在结论落地之前删除属于**拿不准就改**。

   因此这段按「与本次迁移无关的既存代码」对待，与 `isOnMigratedRoute` 一起列为
   R6（死代码清理）的候选删除项。**它们不会影响任何页面**：本模板已无对应 class。
   ============================================================================ */

/* ===== 题库管理页面容器（与学情分析宽度一致） ===== */
.question-bank-page {
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

/* ===== 统计卡片 ===== */
.iq-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.iq-stat-card {
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.iq-stat-label {
  font-size: 13px;
  color: #94A3B8;
  margin-bottom: 4px;
}

.iq-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #6366F1;
}
.student-layout .header-nav{flex-direction:column;justify-content:flex-start;align-items:stretch;padding-top:22px}.student-layout .nav-tab{text-align:left;padding:10px 14px}.student-layout .header-right{margin-top:auto}.student-layout .user-menu-trigger{width:100%}.student-layout .user-dropdown{bottom:48px;top:auto;left:0;right:auto}.student-layout .student-main{margin-left:260px;max-width:none;width:calc(100% - 260px)}
.iq-subject-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.iq-subject-summary-card{padding:16px}.iq-subject-summary-card h3{margin:0 0 10px;color:#312e81}.iq-subject-summary-card h3 small{float:right;color:#64748b;font-weight:500}.iq-subject-chapter-row{display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #eef2f7;font-size:13px}.iq-subject-chapter-row b{color:#6366f1}

/* ===== 顶部横幅 ===== */
.iq-page-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 34px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.25);
}

.hero-content .hero-badge {
  font-size: 12px;
  opacity: 0.8;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 4px;
}

.hero-content .hero-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.hero-content .hero-desc {
  font-size: 14px;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
  margin: 4px 0 0;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* 浅色背景按钮（用于深色横幅上） */
.iq-btn-secondary-light {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.iq-btn-secondary-light:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

.iq-btn {
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

.iq-btn-primary {
  background: #6366F1;
  color: #fff;
  border-color: #6366F1;
}
.iq-btn-primary:hover {
  background: #4F46E5;
  border-color: #4F46E5;
}

.iq-btn-secondary {
  background: #FFFFFF;
  color: #64748B;
  border-color: #E2E8F0;
}
.iq-btn-secondary:hover {
  background: #F1F5F9;
}

/* ===== 子导航 ===== */
.iq-practice-subnav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #FFFFFF;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  flex-wrap: wrap;
}
.iq-subnav-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.iq-subnav-btn:hover {
  background: #F1F5F9;
}
.iq-subnav-btn.active {
  background: #6366F1;
  color: #fff;
}

.iq-sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .iq-sidebar-toggle {
    display: inline-flex;
  }
  .iq-layout-sidebar {
    transform: translateX(-100%);
    width: 280px;
  }
  .iq-layout-sidebar.open {
    transform: translateX(0);
  }
  .iq-sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    z-index: 99;
  }
  .iq-layout-header {
    left: 0;
    padding: 0 12px;
  }
  .iq-layout-main {
    margin-left: 0;
    padding: 80px 12px 20px;
  }
  .iq-avatar-info {
    display: none;
  }
  .iq-header-right {
    gap: 6px;
  }
  .iq-sidebar-footer .user-detail {
    display: none;
  }
  .brand-role {
    display: none;
  }
}
</style>
