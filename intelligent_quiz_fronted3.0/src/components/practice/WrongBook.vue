<template>
  <div class="wrong-book-page">
    <!-- ===== 顶部横幅 ===== -->
    <div class="page-banner">
      <div class="banner-left">
        <span class="banner-icon">📕</span>
        <div>
          <h1>错题本</h1>
          <p>自动收集你做错的题目，集中回顾并重新练习</p>
        </div>
      </div>
      <div class="banner-right">
        <span class="banner-stat">{{ total }} 道错题</span>
        <button class="btn-refresh" :disabled="loading" @click="loadData">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          刷新
        </button>
      </div>
    </div>

    <!-- ===== 错题重练操作栏 ===== -->
    <div class="retry-bar">
      <div class="retry-left">
        <span class="retry-label">📝 错题重练</span>
        <span class="retry-hint">从当前错题中随机抽取生成一套新试卷，反复巩固易错点</span>
      </div>
      <div class="retry-controls">
        <input
            v-model="searchKeyword"
            class="filter-search"
            placeholder="搜索题目/知识点/章节"
            @keyup.enter="handleSearch"
        />
        <button class="btn-search" @click="handleSearch">🔍</button>
        <select v-model="retryChapter" class="filter-select" @change="loadData">
          <option value="">全部章节</option>
          <option v-for="i in 10" :key="i" :value="i">第{{ i }}章</option>
        </select>
        <select v-model="retryType" class="filter-select" @change="loadData">
          <option value="">全部题型</option>
          <option v-for="type in TYPE_OPTIONS" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
        <input v-model.number="retryCount" type="number" min="1" max="100" class="filter-input" />
        <button class="btn-retry" :disabled="generating || total === 0" @click="handleRetry">
          <span v-if="generating" class="btn-spinner"></span>
          {{ generating ? '组卷中...' : '🚀 错题重练' }}
        </button>
      </div>
    </div>

    <!-- ===== 加载状态 ===== -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- ===== 空状态 ===== -->
    <div v-else-if="list.length === 0" class="empty-state">
      <div class="empty-icon">🎉</div>
      <h3>暂无错题</h3>
      <p>太棒了！你目前没有错题，继续保持！</p>
    </div>

    <!-- ===== 错题卡片网格 ===== -->
    <div v-else class="wrong-grid">
      <div v-for="item in list" :key="item.id" class="wrong-card">
        <div class="wrong-card-header">
          <div class="wrong-card-left">
            <span class="wrong-id">#{{ item.id }}</span>
            <span class="wrong-type-tag" :class="`type-${item.question_type}`">
              {{ getTypeName(item.question_type) }}
            </span>
            <span class="wrong-difficulty">{{ getDifficultyLabel(item.difficulty) }}</span>
          </div>
          <span class="wrong-count-badge">错 {{ item.wrong_count }} 次</span>
        </div>

        <div class="wrong-question">{{ item.title }}</div>

        <div class="wrong-meta">
          <span class="meta-item">
            <span class="meta-label">章节</span>
            <span class="meta-value">第{{ item.chapter }}章</span>
          </span>
          <span class="meta-item">
            <span class="meta-label">知识点</span>
            <span class="meta-value">{{ item.knowledge_point || '未标注' }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-label">最近做错</span>
            <span class="meta-value">{{ formatTime(item.last_wrong_at) }}</span>
          </span>
          <span class="meta-item" v-if="item.exam_title">
            <span class="meta-label">来源试卷</span>
            <span class="meta-value">{{ item.exam_title }}</span>
          </span>
        </div>

        <div class="wrong-card-footer">
          <button class="btn-retry-single" @click="handleSingleRetry(item.id)">重练</button>
          <button class="btn-view" @click="handleView(item.id)">解析</button>
        </div>
      </div>
    </div>

    <!-- ===== 分页 ===== -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <Pagination
          v-model:page="page"
          v-model:pageSize="pageSize"
          :total="total"
          @change="loadData"
      />
    </div>

    <!-- ===== 单题解析弹窗 ===== -->
    <div v-if="detailVisible" class="modal-mask" @click.self="detailVisible = false">
      <div class="modal-dialog detail-dialog">
        <div class="modal-head">
          <h3>题目解析</h3>
          <button class="close-btn" @click="detailVisible = false">✕</button>
        </div>
        <div class="modal-body" v-if="detailLoading">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div class="modal-body" v-else-if="detailData">
          <div class="detail-section">
            <h4>题目</h4>
            <p class="detail-text">{{ detailData.title }}</p>
          </div>
          <div class="detail-section" v-if="detailData.options && detailData.options.length">
            <h4>选项</h4>
            <ul class="detail-options">
              <li v-for="(opt, idx) in detailData.options" :key="idx" :class="{ correct: detailData.correctAnswer === opt.label }">
                <span class="opt-label">{{ opt.label }}.</span> {{ opt.content }}
              </li>
            </ul>
          </div>
          <div class="detail-section">
            <h4>正确答案</h4>
            <p class="detail-answer">{{ detailData.correctAnswer }}</p>
          </div>
          <div class="detail-section" v-if="detailData.analysis">
            <h4>解析</h4>
            <p class="detail-text">{{ detailData.analysis }}</p>
          </div>
          <div class="detail-section" v-if="detailData.knowledgePoint">
            <h4>知识点</h4>
            <p class="detail-text">{{ detailData.knowledgePoint }}</p>
          </div>
        </div>
        <div class="modal-body" v-else>
          <p class="detail-text">暂无解析数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getWrongQuestions, createWrongExam, startSingleQuestionPractice } from '@/api/practice';
import { getTypeName, getDifficultyLabel, TYPE_OPTIONS } from '@/utils/constants';
import { formatTime } from '@/utils/format';
import Pagination from '@/components/Pagination.vue';

const emit = defineEmits(['start-exam', 'toast']);

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const generating = ref(false);

const retryChapter = ref('');
const retryType = ref('');
const retryCount = ref(20);

const searchKeyword = ref('');
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref(null);

const loadData = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize: pageSize.value };
    if (retryChapter.value) params.chapter = retryChapter.value;
    if (retryType.value) params.questionType = retryType.value;
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim();
    const data = await getWrongQuestions(params);
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch (err) {
    emit('toast', { message: err.message || '加载错题失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  loadData();
};

const handleRetry = async () => {
  const count = Number(retryCount.value);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    emit('toast', { message: '题目数需为 1-100 之间的整数', type: 'warning' });
    return;
  }
  generating.value = true;
  try {
    const data = await createWrongExam({
      count,
      chapter: retryChapter.value || undefined,
      questionType: retryType.value || undefined,
    });
    if (data.truncated) {
      emit('toast', { message: `当前筛选下只有 ${data.availableCount} 道错题，已全部组卷`, type: 'warning' });
    } else {
      emit('toast', { message: `错题重练试卷已生成，共 ${data.total} 题`, type: 'success' });
    }
    emit('start-exam', data.examId);
  } catch (err) {
    emit('toast', { message: err.message || '生成错题练习失败', type: 'error' });
  } finally {
    generating.value = false;
  }
};

const handleSingleRetry = async (questionId) => {
  try {
    emit('toast', { message: '正在生成单题练习...', type: 'info' });
    const data = await startSingleQuestionPractice(questionId);
    emit('toast', { message: '单题练习已生成', type: 'success' });
    emit('start-exam', data.examId);
  } catch (err) {
    emit('toast', { message: err.message || '单题重练失败', type: 'error' });
  }
};

const handleView = async (questionId) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const data = await startSingleQuestionPractice(questionId);
    detailData.value = data.question || data;
  } catch (err) {
    emit('toast', { message: err.message || '加载解析失败', type: 'error' });
    detailData.value = null;
  } finally {
    detailLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});

defineExpose({ loadData });
</script>

<style scoped>
/* ===== 页面容器 ===== */
.wrong-book-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== 顶部横幅 ===== */
.page-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border-radius: 16px;
  color: #fff;
  margin-bottom: 24px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.banner-icon {
  font-size: 36px;
  line-height: 1;
}
.banner-left h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #fff;
}
.banner-left p {
  font-size: 14px;
  opacity: 0.85;
  margin: 0;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.banner-stat {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 18px;
  border-radius: 10px;
  font-size: 14px;
  backdrop-filter: blur(4px);
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-refresh:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 错题重练操作栏 ===== */
.retry-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.retry-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.retry-label {
  font-weight: 600;
  font-size: 14px;
  color: #1E293B;
}
.retry-hint {
  font-size: 13px;
  color: #94A3B8;
}

.retry-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: #475569;
  font-family: inherit;
  height: 36px;
}
.filter-select:focus {
  outline: none;
  border-color: #6366F1;
}

.filter-input {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  width: 70px;
  font-family: inherit;
  text-align: center;
}
.filter-input:focus {
  outline: none;
  border-color: #6366F1;
}

.btn-retry {
  padding: 6px 18px;
  background: #6366F1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-retry:hover:not(:disabled) {
  background: #4F46E5;
}
.btn-retry:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 加载状态 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94A3B8;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E2E8F0;
  border-top: 3px solid #6366F1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-state h3 {
  font-size: 18px;
  color: #475569;
  margin: 0 0 4px 0;
}
.empty-state p {
  font-size: 14px;
  color: #94A3B8;
  margin: 0;
}

/* ===== 错题卡片网格 ===== */
.wrong-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.wrong-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px 22px;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.wrong-card:hover {
  border-color: #C7D2FE;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
}

.wrong-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.wrong-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.wrong-id {
  font-size: 12px;
  color: #94A3B8;
  font-family: monospace;
}

.wrong-type-tag {
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

.wrong-difficulty {
  font-size: 12px;
  padding: 2px 10px;
  background: #F1F5F9;
  color: #475569;
  border-radius: 12px;
}

.wrong-count-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 14px;
  background: #FEF2F2;
  color: #DC2626;
  border-radius: 20px;
}

.wrong-question {
  font-size: 15px;
  font-weight: 500;
  color: #1E293B;
  line-height: 1.6;
  margin-bottom: 12px;
}

.wrong-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid #F1F5F9;
  border-bottom: 1px solid #F1F5F9;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.meta-label {
  color: #94A3B8;
}
.meta-value {
  color: #475569;
  font-weight: 500;
}

.wrong-card-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-retry-single {
  padding: 6px 18px;
  background: #6366F1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-retry-single:hover {
  background: #4F46E5;
}

.btn-view {
  padding: 6px 18px;
  background: #F1F5F9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-view:hover {
  background: #E2E8F0;
}

/* ===== 分页 ===== */
.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-banner {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  .banner-left {
    flex-direction: column;
  }
  .retry-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .retry-left {
    flex-direction: column;
    text-align: center;
  }
  .retry-controls {
    justify-content: center;
  }
  .wrong-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .wrong-meta {
    flex-direction: column;
    gap: 6px;
  }
}

.filter-search {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 13px;
  width: 200px;
  font-family: inherit;
}
.filter-search:focus {
  outline: none;
  border-color: #6366F1;
}
.btn-search {
  padding: 6px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
}
.btn-search:hover {
  background: #F1F5F9;
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
  width: min(600px, 95vw);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.detail-dialog { width: min(640px, 95vw); }
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
.detail-section { margin-bottom: 16px; }
.detail-section h4 { font-size: 13px; color: #64748B; margin: 0 0 6px 0; }
.detail-text { font-size: 14px; color: #1E293B; line-height: 1.6; margin: 0; }
.detail-answer { font-size: 15px; color: #047857; font-weight: 600; margin: 0; }
.detail-options { list-style: none; padding: 0; margin: 0; }
.detail-options li {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  background: #F8FAFC;
}
.detail-options li.correct {
  background: #ECFDF5;
  color: #047857;
  font-weight: 500;
}
.opt-label { font-weight: 600; margin-right: 6px; }
</style>
