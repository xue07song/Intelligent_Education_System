<template>
  <div class="question-review-page">
    <!-- ===== 顶部横幅 ===== -->
    <div class="page-banner">
      <div class="banner-left">
        <span class="banner-icon">📕</span>
        <div>
          <h1>题目复盘</h1>
          <p>错题回顾、收藏管理与基于遗忘曲线的复习计划</p>
        </div>
      </div>
      <div class="banner-right">
        <button class="btn-stats" @click="openStats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          统计分析
        </button>
      </div>
    </div>

    <!-- ===== 标签页 ===== -->
    <div class="review-tabs">
      <button
          v-for="tab in tabs"
          :key="tab.key"
          class="review-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
        <span v-if="tab.key === 'today' && stats.dueCount" class="tab-badge">{{ stats.dueCount }}</span>
      </button>
    </div>

    <!-- ===== 错题 Tab ===== -->
    <div v-if="activeTab === 'wrong'" class="tab-panel">
      <WrongBook ref="wrongBookRef" @start-exam="$emit('start-exam', $event)" @toast="$emit('toast', $event)" />
    </div>

    <!-- ===== 收藏 Tab ===== -->
    <div v-if="activeTab === 'favorite'" class="tab-panel">
      <div class="favorite-toolbar">
        <div class="favorite-left">
          <span class="toolbar-title">我的收藏</span>
          <span class="toolbar-count">共 {{ favoriteTotal }} 题</span>
        </div>
        <div class="favorite-search">
          <input
              v-model="favoriteKeyword"
              class="filter-search"
              placeholder="搜索题目/知识点/章节"
              @keyup.enter="onFavoriteSearch"
          />
          <button class="btn-search" @click="onFavoriteSearch">🔍</button>
        </div>
        <div class="favorite-right">
          <select v-model="favoriteTagFilter" class="filter-select" @change="onTagFilterChange">
            <option value="">全部标签</option>
            <option v-for="tag in allTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
          <button
              v-if="favoriteTagFilter && favorites.length > 0"
              class="btn-practice-tag"
              :disabled="practiceByTagLoading"
              @click="practiceByTag"
          >
            {{ practiceByTagLoading ? '生成中...' : '🎯 按此标签练习' }}
          </button>
          <button class="btn-manage-tags" @click="showTagManager = true">🏷 管理标签</button>
        </div>
      </div>

      <div v-if="favoriteLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else-if="favorites.length === 0" class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>暂无收藏</h3>
        <p>在答题时点击「收藏」按钮，把重点题目加入这里</p>
      </div>
      <div v-else class="favorite-grid">
        <div v-for="item in favorites" :key="item.questionId" class="favorite-card">
          <div class="favorite-card-header">
            <div class="favorite-card-left">
              <span class="favorite-id">#{{ item.questionId }}</span>
              <span class="favorite-type-tag" :class="`type-${item.questionType}`">
                {{ getTypeName(item.questionType) }}
              </span>
              <span class="favorite-difficulty">{{ getDifficultyLabel(item.difficulty) }}</span>
            </div>
            <button class="btn-favorite-action" @click="removeFavorite(item.questionId)">取消收藏</button>
          </div>

          <div class="favorite-question">{{ item.title }}</div>

          <div class="favorite-meta">
            <span class="meta-item">
              <span class="meta-label">章节</span>
              <span class="meta-value">第{{ item.chapter }}章</span>
            </span>
            <span class="meta-item">
              <span class="meta-label">知识点</span>
              <span class="meta-value">{{ item.knowledgePoint || '未标注' }}</span>
            </span>
          </div>

          <div class="favorite-tags-row">
            <span
                v-for="tag in item.tags"
                :key="tag.id"
                class="favorite-tag"
                :style="{ background: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }"
            >
              {{ tag.name }}
            </span>
            <button class="btn-add-tag" @click="openTagSelector(item)">+ 标签</button>
          </div>

          <div class="favorite-card-footer">
            <button class="btn-practice" @click="startFavoritePractice(item.questionId)">练习</button>
          </div>
        </div>
      </div>

      <div v-if="favoriteTotal > favoritePageSize" class="pagination-wrapper">
        <Pagination
            v-model:page="favoritePage"
            v-model:pageSize="favoritePageSize"
            :total="favoriteTotal"
            @change="loadFavorites"
        />
      </div>
    </div>

    <!-- ===== 今日复习 Tab ===== -->
    <div v-if="activeTab === 'today'" class="tab-panel">
      <div class="review-toolbar">
        <div class="review-left">
          <span class="toolbar-title">今日复习</span>
          <select v-model="reviewFilter" class="filter-select">
            <option value="unreviewed">未复习</option>
            <option value="reviewed">已复习</option>
          </select>
          <span class="toolbar-count">{{ reviewFilter === 'reviewed' ? reviewedTotal : neverReviewedTotal }} 题</span>
        </div>
        <div class="review-right">
          <button class="btn-practice-all" :disabled="visibleReviewItems.length === 0" @click="startReviewPractice">
            🚀 开始复习
          </button>
        </div>
      </div>

      <div v-if="scheduleLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else-if="visibleReviewItems.length === 0" class="empty-state">
        <div class="empty-icon">🎉</div>
        <h3>暂无待复习</h3>
        <p>当前没有到期的复习任务，先去收藏一些题目吧</p>
      </div>
      <div v-else>
        <div v-if="reviewFilter === 'unreviewed' && neverReviewedList.length > 0" class="review-section">
          <h3 class="review-section-title">新收藏未复习</h3>
          <div class="review-grid">
            <div v-for="item in neverReviewedList" :key="item.questionId" class="review-card">
              <div class="review-card-header">
                <span class="review-id">#{{ item.questionId }}</span>
                <span class="review-type-tag" :class="`type-${item.questionType}`">{{ getTypeName(item.questionType) }}</span>
              </div>
              <div class="review-question">{{ item.title }}</div>
              <div class="review-meta">
                <span>第{{ item.chapter }}章</span>
                <span>{{ item.knowledgePoint || '未标注' }}</span>
              </div>
              <div class="review-card-footer">
                <div class="self-assess">
                  <span class="assess-hint">自评掌握程度：</span>
                  <button class="btn-assess forgot" @click="submitReview(item.questionId, 'forgot')">✗ 忘了</button>
                  <button class="btn-assess remembered" @click="submitReview(item.questionId, 'remembered')">✓ 记得</button>
                </div>
                <button class="btn-practice" @click="startReviewPractice(item.questionId)">做题</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="reviewFilter === 'reviewed' && reviewedList.length > 0" class="review-section">
          <h3 class="review-section-title">已复习题目</h3>
          <div class="review-grid">
            <div v-for="item in reviewedList" :key="item.questionId" class="review-card">
              <div class="review-card-header">
                <span class="review-id">#{{ item.questionId }}</span>
                <span class="review-type-tag" :class="`type-${item.questionType}`">{{ getTypeName(item.questionType) }}</span>
              </div>
              <div class="review-question">{{ item.title }}</div>
              <div class="review-meta">
                <span>第{{ item.chapter }}章</span>
                <span>间隔 {{ item.intervalDays }} 天</span>
                <span>最近复习 {{ formatDate(item.lastReviewedAt) }}</span>
              </div>
              <div class="review-card-footer">
                <div class="self-assess">
                  <span class="assess-hint">自评掌握程度：</span>
                  <button class="btn-assess forgot" @click="submitReview(item.questionId, 'forgot')">✗ 忘了</button>
                  <button class="btn-assess remembered" @click="submitReview(item.questionId, 'remembered')">✓ 记得</button>
                </div>
                <button class="btn-practice" @click="startReviewPractice(item.questionId)">做题</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 标签管理弹窗 ===== -->
    <div v-if="showTagManager" class="modal-mask" @click.self="showTagManager = false">
      <div class="modal-dialog tag-manager">
        <div class="modal-head">
          <h3>🏷 标签管理</h3>
          <button class="close-btn" @click="showTagManager = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="preset-tags">
            <h4>预设标签</h4>
            <div class="tag-list">
              <span
                  v-for="tag in presetTags"
                  :key="tag.id"
                  class="tag-chip"
                  :style="{ background: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>
          <div class="custom-tags">
            <h4>我的标签</h4>
            <div class="tag-list">
              <span
                  v-for="tag in customTags"
                  :key="tag.id"
                  class="tag-chip editable"
                  :style="{ background: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }"
              >
                {{ tag.name }}
                <button class="btn-delete-tag" @click="deleteTag(tag.id)">✕</button>
              </span>
              <span v-if="customTags.length === 0" class="tag-empty">暂无自定义标签</span>
            </div>
          </div>
          <div class="create-tag">
            <input v-model="newTagName" class="tag-input" placeholder="新标签名称" maxlength="20" />
            <input v-model="newTagColor" type="color" class="tag-color" value="#6366F1" />
            <button class="btn-create-tag" :disabled="!newTagName.trim()" @click="createTag">创建</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 题目标签选择弹窗 ===== -->
    <div v-if="tagSelectorVisible" class="modal-mask" @click.self="tagSelectorVisible = false">
      <div class="modal-dialog tag-selector">
        <div class="modal-head">
          <h3>设置标签</h3>
          <button class="close-btn" @click="tagSelectorVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="tag-options">
            <label
                v-for="tag in allTags"
                :key="tag.id"
                class="tag-option"
                :style="{ background: selectedTagIds.includes(tag.id) ? tag.color + '30' : 'transparent', borderColor: tag.color + '60' }"
            >
              <input
                  type="checkbox"
                  :value="tag.id"
                  v-model="selectedTagIds"
              />
              <span :style="{ color: tag.color }">{{ tag.name }}</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="tagSelectorVisible = false">取消</button>
            <button class="btn-primary" @click="saveQuestionTags">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 统计小窗 ===== -->
    <div v-if="statsVisible" class="modal-mask" @click.self="statsVisible = false">
      <div class="modal-dialog stats-panel">
        <div class="modal-head">
          <h3>📊 复盘统计</h3>
          <button class="close-btn" @click="statsVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="stats-overview">
            <div class="stat-card">
              <span class="stat-value">{{ stats.totalFavorites }}</span>
              <span class="stat-label">收藏题目</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ stats.dueCount }}</span>
              <span class="stat-label">待复习</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ stats.dueToday }}</span>
              <span class="stat-label">今日到期</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ stats.newToReview }}</span>
              <span class="stat-label">新题未复习</span>
            </div>
          </div>

          <!-- 遗忘曲线进度环 -->
          <div class="stats-curve">
            <h4>遗忘曲线进度</h4>
            <div class="curve-row">
              <div class="curve-ring">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" stroke-width="10"></circle>
                  <circle
                      cx="60" cy="60" r="52" fill="none"
                      :stroke="ringColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      :stroke-dasharray="ringCircumference"
                      :stroke-dashoffset="ringDashOffset"
                      :transform="'rotate(-90 60 60)'"
                  ></circle>
                </svg>
                <div class="ring-center">
                  <span class="ring-value">{{ Math.round(reviewProgress.masteryRatio * 100) }}%</span>
                  <span class="ring-label">掌握度</span>
                </div>
              </div>
              <div class="curve-legend">
                <div class="legend-item">
                  <span class="legend-dot" style="background:#10B981"></span>
                  <span class="legend-text">已掌握 {{ reviewProgress.onTrack }} 题</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background:#F59E0B"></span>
                  <span class="legend-text">待复习 {{ reviewProgress.dueCount }} 题</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background:#94A3B8"></span>
                  <span class="legend-text">未复习 {{ reviewProgress.newToReview }} 题</span>
                </div>
                <p class="curve-hint" v-if="reviewProgress.dueCount > 0">
                  💡 有 {{ reviewProgress.dueCount }} 题到期，建议去「今日复习」自评
                </p>
                <p class="curve-hint" v-else-if="reviewProgress.total > 0">
                  ✅ 当前没有到期题目，继续保持！
                </p>
              </div>
            </div>
          </div>

          <!-- 标签练习建议 -->
          <div class="stats-suggest" v-if="stats.tags && stats.tags.length > 0">
            <h4>标签练习建议</h4>
            <div class="suggest-list">
              <div v-for="tag in suggestedTags" :key="tag.id" class="suggest-item">
                <span class="suggest-name" :style="{ color: tag.color }">{{ tag.name }}</span>
                <span class="suggest-count">{{ tag.count }} 题</span>
                <button class="btn-suggest" @click="practiceTagFromStats(tag.id)">去练习</button>
              </div>
            </div>
          </div>

          <div class="stats-tags">
            <h4>标签分布</h4>
            <div v-if="stats.tags && stats.tags.length > 0" class="stats-tag-list">
              <div v-for="tag in stats.tags" :key="tag.id" class="stats-tag-bar">
                <span class="stats-tag-name" :style="{ color: tag.color }">{{ tag.name }}</span>
                <div class="stats-bar-wrap">
                  <div class="stats-bar-fill" :style="{ width: tagBarWidth(tag.count), background: tag.color }"></div>
                </div>
                <span class="stats-tag-count">{{ tag.count }}</span>
              </div>
            </div>
            <p v-else class="stats-empty">暂无标签数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import WrongBook from './WrongBook.vue';
import Pagination from '@/components/Pagination.vue';
import { getTypeName, getDifficultyLabel } from '@/utils/constants';
import { formatTime } from '@/utils/format';
import {
  getFavorites,
  removeFavorite as removeFavoriteApi,
  getFavoriteTags,
  createFavoriteTag,
  deleteFavoriteTag as deleteFavoriteTagApi,
  getFavoriteQuestionTags,
  setFavoriteQuestionTags,
  getReviewSchedule,
  submitFavoriteReview,
  getFavoriteStats,
} from '@/api/student';
import { createWrongExam } from '@/api/practice';

const emit = defineEmits(['start-exam', 'toast']);

const tabs = [
  { key: 'wrong', label: '错题', icon: '❌' },
  { key: 'favorite', label: '收藏', icon: '⭐' },
  { key: 'today', label: '今日复习', icon: '📅' },
];
const activeTab = ref('wrong');

const wrongBookRef = ref(null);

// ===== 收藏 =====
const favorites = ref([]);
const favoriteTotal = ref(0);
const favoritePage = ref(1);
const favoritePageSize = ref(10);
const favoriteLoading = ref(false);
const favoriteTagFilter = ref('');
const favoriteKeyword = ref('');
const practiceByTagLoading = ref(false);

const onTagFilterChange = () => {
  favoritePage.value = 1;
  loadFavorites();
};

const onFavoriteSearch = () => {
  favoritePage.value = 1;
  loadFavorites();
};

const allTags = ref([]);
const presetTags = computed(() => allTags.value.filter(t => t.type === 'preset'));
const customTags = computed(() => allTags.value.filter(t => t.type === 'custom'));

const is404 = (err) => {
  const s = err?.status || err?.code;
  return s === 404;
};

const loadTags = async () => {
  try {
    allTags.value = await getFavoriteTags();
  } catch (err) {
    if (!is404(err)) emit('toast', { message: err.message || '加载标签失败', type: 'error' });
    allTags.value = [
      { id: 'preset_easy', name: '易错', color: '#EF4444', type: 'preset' },
      { id: 'preset_freq', name: '常考', color: '#3B82F6', type: 'preset' },
      { id: 'preset_hard', name: '难题', color: '#8B5CF6', type: 'preset' },
    ];
  }
};

const loadFavorites = async () => {
  favoriteLoading.value = true;
  try {
    const params = { page: favoritePage.value, pageSize: favoritePageSize.value };
    if (favoriteTagFilter.value) params.tagId = favoriteTagFilter.value;
    if (favoriteKeyword.value.trim()) params.keyword = favoriteKeyword.value.trim();
    const data = await getFavorites(params);
    const list = data.list || [];
    // 加载每道题的标签（404 时静默跳过）
    const enriched = await Promise.all(list.map(async (item) => {
      try {
        const tags = await getFavoriteQuestionTags(item.questionId);
        return { ...item, tags };
      } catch {
        return { ...item, tags: [] };
      }
    }));
    favorites.value = enriched;
    favoriteTotal.value = data.total || 0;
  } catch (err) {
    if (!is404(err)) emit('toast', { message: err.message || '加载收藏失败', type: 'error' });
    favorites.value = [];
    favoriteTotal.value = 0;
  } finally {
    favoriteLoading.value = false;
  }
};

const removeFavorite = async (questionId) => {
  if (!window.confirm('确定取消收藏这道题？')) return;
  try {
    await removeFavoriteApi(questionId);
    emit('toast', { message: '已取消收藏', type: 'success' });
    loadFavorites();
    loadStats();
  } catch (err) {
    emit('toast', { message: err.message || '取消收藏失败', type: 'error' });
  }
};

// 按当前选中标签生成练习卷（拉取该标签下全部收藏题目）
const practiceByTag = async () => {
  const tagId = favoriteTagFilter.value;
  if (!tagId) {
    emit('toast', { message: '请先选择一个标签', type: 'warning' });
    return;
  }
  practiceByTagLoading.value = true;
  try {
    const data = await getFavorites({ page: 1, pageSize: 1000, tagId });
    const questionIds = (data.list || []).map(i => i.questionId).filter(Boolean);
    if (questionIds.length === 0) {
      emit('toast', { message: '该标签下没有可练习的题目', type: 'warning' });
      return;
    }
    const exam = await createWrongExam({
      questionIds,
      count: questionIds.length,
      title: `标签练习卷（${getTagName(tagId)}）`,
    });
    emit('toast', { message: `已生成「${getTagName(tagId)}」练习卷，共 ${questionIds.length} 题`, type: 'success' });
    emit('start-exam', exam.examId);
  } catch (err) {
    emit('toast', { message: err.message || '按标签练习失败', type: 'error' });
  } finally {
    practiceByTagLoading.value = false;
  }
};

const getTagName = (tagId) => {
  const t = allTags.value.find(x => x.id === tagId);
  return t ? t.name : '标签';
};

// ===== 标签管理 =====
const showTagManager = ref(false);
const newTagName = ref('');
const newTagColor = ref('#6366F1');

const createTag = async () => {
  const name = newTagName.value.trim();
  if (!name) return;
  try {
    await createFavoriteTag({ name, color: newTagColor.value });
    newTagName.value = '';
    emit('toast', { message: '标签创建成功', type: 'success' });
    loadTags();
  } catch (err) {
    emit('toast', { message: err.message || '创建标签失败', type: 'error' });
  }
};

const deleteTag = async (tagId) => {
  if (!window.confirm('确定删除该标签？关联的题目将自动取消此标签。')) return;
  try {
    await deleteFavoriteTagApi(tagId);
    emit('toast', { message: '标签已删除', type: 'success' });
    loadTags();
    loadFavorites();
  } catch (err) {
    emit('toast', { message: err.message || '删除标签失败', type: 'error' });
  }
};

// ===== 题目标签选择 =====
const tagSelectorVisible = ref(false);
const selectedTagIds = ref([]);
const selectingItem = ref(null);

const openTagSelector = async (item) => {
  selectingItem.value = item;
  selectedTagIds.value = item.tags.map(t => t.id);
  tagSelectorVisible.value = true;
};

const saveQuestionTags = async () => {
  if (!selectingItem.value) return;
  try {
    await setFavoriteQuestionTags(selectingItem.value.questionId, selectedTagIds.value);
    emit('toast', { message: '标签设置成功', type: 'success' });
    tagSelectorVisible.value = false;
    loadFavorites();
  } catch (err) {
    emit('toast', { message: err.message || '设置标签失败', type: 'error' });
  }
};

// ===== 今日复习 =====
const dueList = ref([]);
const neverReviewedList = ref([]);
const reviewedList = ref([]);
const reviewFilter = ref('unreviewed');
const scheduleTotal = ref(0);
const neverReviewedTotal = ref(0);
const reviewedTotal = ref(0);
const scheduleLoading = ref(false);
const visibleReviewItems = computed(() => reviewFilter.value === 'reviewed' ? reviewedList.value : neverReviewedList.value);

const loadSchedule = async () => {
  scheduleLoading.value = true;
  try {
    const data = await getReviewSchedule();
    dueList.value = data.due?.list || [];
    scheduleTotal.value = data.due?.total || 0;
    neverReviewedList.value = data.neverReviewed?.list || [];
    neverReviewedTotal.value = data.neverReviewed?.total || 0;
    reviewedList.value = data.reviewed?.list || [];
    reviewedTotal.value = data.reviewed?.total || 0;
  } catch (err) {
    // 404 时静默降级（后端尚未实现复习计划接口）
    if (!is404(err)) emit('toast', { message: err.message || '加载复习计划失败', type: 'error' });
    dueList.value = [];
    scheduleTotal.value = 0;
    neverReviewedList.value = [];
    neverReviewedTotal.value = 0;
    reviewedList.value = [];
    reviewedTotal.value = 0;
  } finally {
    scheduleLoading.value = false;
  }
};

const startReviewPractice = async (singleQuestionId = null) => {
  let questionIds = [];
  if (singleQuestionId) {
    questionIds = [singleQuestionId];
  } else {
    questionIds = visibleReviewItems.value.map(i => i.questionId).slice(0, 20);
  }
  if (questionIds.length === 0) {
    emit('toast', { message: '没有可复习的题目', type: 'warning' });
    return;
  }
  try {
    const data = await createWrongExam({ questionIds, count: questionIds.length, title: '收藏复习卷' });
    emit('start-exam', data.examId);
  } catch (err) {
    emit('toast', { message: err.message || '生成复习卷失败', type: 'error' });
  }
};

const startFavoritePractice = async (questionId) => {
  await startReviewPractice(questionId);
};

// 自评复习：直接驱动遗忘曲线（记得→延长间隔，忘了→重置）
const submitReview = async (questionId, result) => {
  const ok = result === 'remembered';
  try {
    await submitFavoriteReview(questionId, result);
    emit('toast', {
      message: ok ? '已记录「记得」，复习间隔将延长' : '已记录「忘了」，复习间隔将重置',
      type: ok ? 'success' : 'warning',
    });
    // 重新读取服务端状态，确保“已复习/未复习”切换后立即准确。
    await Promise.all([loadSchedule(), loadStats()]);
  } catch (err) {
    if (is404(err)) {
      emit('toast', { message: '复习接口尚未就绪，自评结果未保存', type: 'warning' });
    } else {
      emit('toast', { message: err.message || '提交复习结果失败', type: 'error' });
    }
  }
};

// ===== 统计 =====
const statsVisible = ref(false);
const stats = ref({ totalFavorites: 0, dueCount: 0, dueToday: 0, newToReview: 0, tags: [] });

const loadStats = async () => {
  try {
    stats.value = await getFavoriteStats();
  } catch (err) {
    // silent
  }
};

const openStats = async () => {
  await loadStats();
  statsVisible.value = true;
};

const tagBarWidth = (count) => {
  const max = Math.max(...stats.value.tags.map(t => t.count), 1);
  return `${Math.max((count / max) * 100, 5)}%`;
};

// 遗忘曲线进度环
const reviewProgress = computed(() => {
  const total = Number(stats.value.totalFavorites) || 0;
  const newToReview = Number(stats.value.newToReview) || 0;
  const dueCount = Number(stats.value.dueCount) || 0;
  const onTrack = Math.max(0, total - newToReview - dueCount);
  const masteryRatio = total > 0 ? onTrack / total : 0;
  return { total, newToReview, dueCount, onTrack, masteryRatio };
});

const ringCircumference = 2 * Math.PI * 52;
const ringDashOffset = computed(() => ringCircumference * (1 - reviewProgress.value.masteryRatio));
const ringColor = computed(() => {
  const r = reviewProgress.value.masteryRatio;
  if (r >= 0.7) return '#10B981';
  if (r >= 0.4) return '#F59E0B';
  return '#EF4444';
});

// 标签练习建议：按题量倒序取前 5
const suggestedTags = computed(() => {
  const tags = stats.value.tags || [];
  return [...tags].sort((a, b) => b.count - a.count).slice(0, 5);
});

const practiceTagFromStats = (tagId) => {
  statsVisible.value = false;
  activeTab.value = 'favorite';
  favoriteTagFilter.value = tagId;
  favoritePage.value = 1;
  loadFavorites();
};

const formatDate = (d) => {
  if (!d) return '-';
  return formatTime(d);
};

watch(activeTab, (val) => {
  if (val === 'favorite') loadFavorites();
  if (val === 'today') loadSchedule();
});

onMounted(() => {
  loadTags();
  loadStats();
});
</script>

<style scoped>
.question-review-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border-radius: 16px;
  color: #fff;
  margin-bottom: 20px;
}
.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.banner-icon { font-size: 36px; line-height: 1; }
.banner-left h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; color: #fff; }
.banner-left p { font-size: 14px; opacity: 0.85; margin: 0; }

.btn-stats {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.review-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: #fff;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
}
.review-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748B;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
}
.review-tab.active {
  background: #6366F1;
  color: #fff;
  font-weight: 600;
}
.tab-icon { font-size: 16px; }
.tab-badge {
  background: #EF4444;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
}

.tab-panel { min-height: 300px; }

.favorite-toolbar,
.review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.toolbar-title { font-weight: 600; color: #1E293B; margin-right: 10px; }
.toolbar-count { font-size: 13px; color: #94A3B8; }

.filter-select {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: #475569;
  font-family: inherit;
}
.btn-manage-tags {
  padding: 6px 14px;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  background: #EEF2FF;
  color: #4F46E5;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  color: #94A3B8;
}
.loading-spinner {
  width: 40px; height: 40px;
  border: 3px solid #E2E8F0;
  border-top: 3px solid #6366F1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state h3 { font-size: 18px; color: #475569; margin: 0 0 4px 0; }

.favorite-grid,
.review-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.favorite-card,
.review-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 18px 20px;
}
.favorite-card-header,
.review-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.favorite-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.favorite-id,
.review-id { font-size: 12px; color: #94A3B8; font-family: monospace; }
.favorite-type-tag,
.review-type-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 12px;
  border-radius: 12px;
}
.type-1 { background: #EDE9FE; color: #6D28D9; }
.type-2 { background: #DBEAFE; color: #1D4ED8; }
.type-3 { background: #FCE7F3; color: #BE185D; }
.type-4 { background: #D1FAE5; color: #047857; }
.type-5 { background: #FEF3C7; color: #B45309; }
.type-6 { background: #FFEDD5; color: #C2410C; }
.favorite-difficulty {
  font-size: 12px;
  padding: 2px 10px;
  background: #F1F5F9;
  color: #475569;
  border-radius: 12px;
}
.favorite-question,
.review-question {
  font-size: 15px;
  font-weight: 500;
  color: #1E293B;
  line-height: 1.6;
  margin-bottom: 12px;
}
.favorite-meta,
.review-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid #F1F5F9;
  border-bottom: 1px solid #F1F5F9;
  margin-bottom: 12px;
  font-size: 13px;
  color: #475569;
}
.favorite-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.favorite-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid;
  font-weight: 500;
}
.btn-add-tag {
  padding: 3px 10px;
  border: 1px dashed #CBD5E1;
  border-radius: 20px;
  background: #F8FAFC;
  color: #64748B;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.favorite-card-footer,
.review-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.self-assess {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.assess-hint {
  font-size: 12px;
  color: #94A3B8;
}
.btn-assess {
  padding: 4px 12px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.btn-assess.remembered {
  background: #ECFDF5;
  border-color: #A7F3D0;
  color: #047857;
}
.btn-assess.forgot {
  background: #FEF2F2;
  border-color: #FECACA;
  color: #DC2626;
}
.btn-practice-tag {
  padding: 6px 14px;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  background: #EEF2FF;
  color: #4F46E5;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.btn-practice-tag:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-favorite-action {
  padding: 4px 10px;
  border: 1px solid #FECACA;
  border-radius: 6px;
  background: #FEF2F2;
  color: #DC2626;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-practice,
.btn-practice-all,
.btn-primary {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: #6366F1;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.btn-practice:disabled,
.btn-practice-all:disabled,
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  padding: 6px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.review-section { margin-bottom: 20px; }
.review-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 12px 0;
}

.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal-dialog {
  background: #fff;
  border-radius: 16px;
  width: min(520px, 95vw);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E2E8F0;
}
.modal-head h3 { margin: 0; font-size: 16px; color: #1E293B; }
.close-btn {
  border: 0;
  background: #F1F5F9;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}
.modal-body { padding: 20px; overflow: auto; }

.tag-manager h4 { font-size: 13px; color: #64748B; margin: 0 0 10px 0; }
.preset-tags { margin-bottom: 18px; }
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-chip {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tag-chip.editable { padding-right: 6px; }
.btn-delete-tag {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.08);
  color: inherit;
  font-size: 11px;
  cursor: pointer;
}
.tag-empty { font-size: 13px; color: #94A3B8; }
.create-tag {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F1F5F9;
}
.tag-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.tag-color {
  width: 44px; height: 36px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
}
.btn-create-tag {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #6366F1;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.tag-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid;
  cursor: pointer;
  font-size: 13px;
}
.tag-option input { margin: 0; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #4F46E5;
}
.stat-label {
  font-size: 12px;
  color: #64748B;
}
.stats-tags h4 { font-size: 14px; color: #1E293B; margin: 0 0 12px 0; }
.stats-tag-list { display: flex; flex-direction: column; gap: 10px; }
.stats-tag-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.stats-tag-name { width: 70px; font-weight: 500; }
.stats-bar-wrap {
  flex: 1;
  height: 10px;
  background: #F1F5F9;
  border-radius: 5px;
  overflow: hidden;
}
.stats-bar-fill { height: 100%; border-radius: 5px; }
.stats-tag-count { width: 30px; text-align: right; color: #64748B; }
.stats-empty { font-size: 13px; color: #94A3B8; }

.stats-curve, .stats-suggest {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #F1F5F9;
}
.stats-curve h4, .stats-suggest h4 { font-size: 14px; color: #1E293B; margin: 0 0 14px 0; }
.curve-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.curve-ring { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-value { font-size: 22px; font-weight: 700; color: #4F46E5; }
.ring-label { font-size: 11px; color: #94A3B8; margin-top: 2px; }
.curve-legend { flex: 1; min-width: 180px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #475569; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.curve-hint { font-size: 12px; color: #64748B; margin: 10px 0 0 0; line-height: 1.5; }

.suggest-list { display: flex; flex-direction: column; gap: 8px; }
.suggest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
}
.suggest-name { font-weight: 500; font-size: 13px; min-width: 60px; }
.suggest-count { font-size: 12px; color: #64748B; flex: 1; }
.btn-suggest {
  padding: 4px 12px;
  border: 1px solid #C7D2FE;
  border-radius: 6px;
  background: #EEF2FF;
  color: #4F46E5;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

@media (max-width: 768px) {
  .page-banner { flex-direction: column; text-align: center; }
  .review-tabs { flex-wrap: wrap; }
  .stats-overview { grid-template-columns: repeat(2, 1fr); }
  .favorite-toolbar,
  .review-toolbar { flex-direction: column; align-items: stretch; }
}

.favorite-search { display: flex; gap: 6px; }
.filter-search {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  width: 200px;
  font-family: inherit;
}
.filter-search:focus { outline: none; border-color: #6366F1; }
.btn-search {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
}
.btn-search:hover { background: #F1F5F9; }
</style>
