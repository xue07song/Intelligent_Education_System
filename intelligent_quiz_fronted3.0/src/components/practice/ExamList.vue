<template>
  <div class="exam-list-page">
    <!-- ===== 顶部横幅 ===== -->
    <div class="page-banner">
      <div class="banner-icon">📋</div>
      <div class="banner-content">
        <h1>{{ role === 'teacher' ? '我创建的试卷' : '教师试卷' }}</h1>
        <p>{{ role === 'student' ? '选择教师发布的试卷开始答题' : role === 'admin' ? '查看所有教师创建的试卷和题目内容' : '管理自己创建的试卷' }}</p>
      </div>
      <div class="banner-stats">
        <span class="stat-number">{{ total }}</span>
        <span class="stat-label">张试卷</span>
      </div>
    </div>

    <!-- ===== 操作栏 ===== -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="result-info">共 <strong>{{ total }}</strong> 张试卷</span>
      </div>
      <div class="toolbar-right">
        <button v-if="role === 'teacher'" class="btn-primary" @click="$emit('generate')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新建试卷
        </button>
        <button class="btn-refresh" @click="loadExams">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
          刷新
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
      <div class="empty-icon">📭</div>
      <h3>暂无试卷</h3>
      <p>{{ role === 'teacher' ? '点击「新建试卷」开始组卷' : '教师还没有发布试卷，请耐心等待' }}</p>
    </div>

    <!-- ===== 试卷卡片网格 ===== -->
    <div v-else class="paper-grid">
      <div
          v-for="exam in list"
          :key="exam.id"
          class="paper-card"
          @click="handleCardClick(exam)"
      >
        <div class="paper-card-header">
          <span class="paper-type-badge" :class="getTypeClass(exam)">
            {{ isOpenAll(exam) ? '全开放' : '定向' }}
          </span>
          <span class="paper-status" :class="exam.status || 'published'">{{ statusText(exam.status) }}</span>
          <span class="paper-id">#{{ exam.id }}</span>
        </div>

        <h3 class="paper-title">{{ exam.title }}</h3>

        <div class="paper-meta">
          <span class="meta-item">
            <span class="meta-icon">📊</span>
            {{ exam.total_count || 0 }} 题
          </span>
          <span class="meta-item">
            <span class="meta-icon">⭐</span>
            {{ exam.difficulty ? getDifficultyLabel(exam.difficulty) : '不限' }}
          </span>
          <span class="meta-item">
            <span class="meta-icon">👥</span>
            {{ exam.attempt_count || 0 }} 次练习
          </span>
          <span v-if="exam.subject" class="meta-item">
            <span class="meta-icon">📚</span>
            {{ exam.subject }}
          </span>
        </div>

        <div class="paper-card-footer">
          <span class="paper-date">{{ formatTime(exam.created_at) }}</span>
          <div class="footer-actions">
            <button v-if="role === 'teacher' || role === 'admin'" class="btn-export" @click.stop="openExport(exam)">📥 导出</button>
            <button v-if="(role === 'teacher' || role === 'admin') && (!exam.status || exam.status === 'draft')" class="btn-export" @click.stop="handlePublish(exam)">🚀 发布</button>
            <button v-if="(role === 'teacher' || role === 'admin') && exam.status === 'published'" class="btn-export" @click.stop="handleClose(exam)">⏹ 关闭</button>
            <button v-if="role === 'teacher' || role === 'admin'" class="btn-export" @click.stop="handleDelete(exam)">🗑 删除</button>
            <button class="btn-start" @click.stop="handleStartExam(exam.id)">
              {{ role === 'student' ? '📝 开始答题' : '查看题目' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 分页 ===== -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <Pagination
          v-model:page="page"
          v-model:pageSize="pageSize"
          :total="total"
          @change="loadExams"
      />
    </div>

    <!-- ===== 预览弹窗（教师/管理员用） ===== -->
    <div v-if="previewVisible" class="preview-mask" @click.self="closePreview">
      <div class="preview-dialog">
        <div class="preview-head">
          <div>
            <h2>{{ previewExam.title }}</h2>
            <p>创建教师：{{ previewExam.creator_name?.trim() || previewExam.creator_username || '-' }} · 共 {{ previewExam.questions?.length || 0 }} 题</p>
          </div>
          <button class="close-btn" @click="closePreview">✕</button>
        </div>
        <div v-if="previewLoading" class="preview-loading">正在读取试卷题目...</div>
        <div v-else class="preview-body">
          <div v-if="previewExam.examNature" class="preview-cover">
            <h1>{{ previewExam.examNature.university || 'XXXX大学' }}</h1>
            <h2 v-if="previewExam.examNature.yearStart && previewExam.examNature.yearEnd">{{ previewExam.examNature.yearStart }}—{{ previewExam.examNature.yearEnd }}学年{{ previewExam.examNature.semester || '秋季' }}学期</h2>
            <h1>《{{ previewExam.examNature.examPrefix || '计算机导论' }}》期末考试试卷</h1>
            <p>（{{ previewExam.examNature.paperType || 'A' }}卷）</p>
            <p>考试方式：{{ previewExam.examNature.examMethod || '闭卷' }}</p>
          </div>
          <div v-for="group in previewGroups" :key="group.name" class="preview-group">
            <h3 class="preview-group-title">{{ group.name }}</h3>
            <div v-for="(q, index) in group.questions" :key="q.id || index" class="preview-question">
              <div class="preview-number">{{ index + 1 }}</div>
              <div>
                <div class="preview-meta">
                  <span>{{ getTypeName(q.题型) }}</span>
                  <span>难度 {{ q.难度 }}</span>
                  <span>{{ q.知识点 || '未标注知识点' }}</span>
                </div>
                <h4>{{ q.题目 }}</h4>
                <p v-if="q.选项" class="preview-options">{{ q.选项 }}</p>
                <details class="preview-details">
                  <summary>查看答案与解析</summary>
                  <p><b>答案：</b>{{ q.答案 }}</p>
                  <p v-if="q.解析"><b>解析：</b>{{ q.解析 }}</p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 导出弹窗 ===== -->
    <ExamExportDialog
        :visible="exportVisible"
        :exam-id="exportExamData?.id || null"
        :title="exportExamData?.title || ''"
        @close="exportVisible = false"
        @toast="(e) => emit('toast', e)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getExams, getExam, updateExamStatusApi, deleteExamApi } from '@/api/practice';
import { getTypeName, getDifficultyLabel } from '@/utils/constants';
import { formatTime } from '@/utils/format';
import Pagination from '@/components/Pagination.vue';
import ExamExportDialog from '@/components/ExamExportDialog.vue';

const props = defineProps({
  role: { type: String, default: 'student' },
});

const emit = defineEmits(['generate', 'start-exam', 'toast']);

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(12);
const loading = ref(false);

// 预览相关
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewExam = ref({ questions: [] });

// 导出相关
const exportVisible = ref(false);
const exportExamData = ref(null);

const openExport = (exam) => {
  exportExamData.value = exam;
  exportVisible.value = true;
};

const statusText = (status) => ({
  draft: '草稿',
  published: '已发布',
  closed: '已关闭',
}[status] || '已发布');

const handlePublish = async (exam) => {
  if (!window.confirm(`确认发布试卷「${exam.title}」？发布后学生可以开始答题。`)) return;
  try {
    await updateExamStatusApi(exam.id, 'published');
    emit('toast', { message: '试卷已发布', type: 'success' });
    await loadExams();
  } catch (err) {
    emit('toast', { message: err.message || '发布失败', type: 'error' });
  }
};

const handleClose = async (exam) => {
  if (!window.confirm(`确认关闭试卷「${exam.title}」？关闭后学生无法继续作答。`)) return;
  try {
    await updateExamStatusApi(exam.id, 'closed');
    emit('toast', { message: '试卷已关闭', type: 'success' });
    await loadExams();
  } catch (err) {
    emit('toast', { message: err.message || '关闭失败', type: 'error' });
  }
};

const handleDelete = async (exam) => {
  if (!window.confirm(`确认删除试卷「${exam.title}」？仅无作答记录的试卷可以删除。`)) return;
  try {
    await deleteExamApi(exam.id);
    emit('toast', { message: '试卷已删除', type: 'success' });
    await loadExams();
  } catch (err) {
    emit('toast', { message: err.message || '删除失败', type: 'error' });
  }
};

const loadExams = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize: pageSize.value };
    const data = await getExams(params);
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch (err) {
    emit('toast', { message: err.message || '加载试卷列表失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

const handleStartExam = (examId) => {
  if (props.role === 'student') {
    emit('start-exam', examId);
  } else {
    openPreview(examId);
  }
};

const handleCardClick = (exam) => {
  if (props.role === 'student') {
    emit('start-exam', exam.id);
  }
};

const openPreview = async (id) => {
  previewVisible.value = true;
  previewLoading.value = true;
  try {
    previewExam.value = await getExam(id);
  } catch (err) {
    emit('toast', { message: err.message || '读取试卷失败', type: 'error' });
    previewVisible.value = false;
  } finally {
    previewLoading.value = false;
  }
};

const closePreview = () => {
  previewVisible.value = false;
  previewExam.value = { questions: [] };
};

const TYPE_ORDER = { 1: '一、判断题', 2: '二、单选题', 3: '三、多选题', 4: '四、填空题', 5: '五、简答题', 7: '六、组合题', 6: '七、程序论述题' };
const SCORE_RULES = { 1: 1, 2: 1, 3: 2, 4: 1, 5: 5, 6: 10, 7: 10 };

const previewGroups = computed(() => {
  const questions = previewExam.value.questions || [];
  const grouped = {};
  questions.forEach(q => {
    const type = Number(q.题型 || q.question_type || 0);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(q);
  });
  return [1, 2, 3, 4, 5, 7, 6].filter(t => grouped[t]?.length).map(t => {
    const count = grouped[t].length;
    const score = SCORE_RULES[t] || 1;
    return { name: `${TYPE_ORDER[t]}（共${count}题，每题${score}分，共${count * score}分）`, questions: grouped[t] };
  });
});

const isOpenAll = (exam) => {
  const hasLegacy = exam.class_id != null || exam.classId != null;
  const hasClassIds = Array.isArray(exam.class_ids) && exam.class_ids.length > 0;
  return !hasLegacy && !hasClassIds;
};

const getTypeClass = (exam) => {
  return isOpenAll(exam) ? 'badge-open' : 'badge-directed';
};

onMounted(() => {
  loadExams();
});

defineExpose({ loadExams });
</script>

<style scoped>
/* ===== 页面容器 ===== */
.exam-list-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== 顶部横幅 ===== */
.page-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border-radius: 16px;
  color: #fff;
  margin-bottom: 24px;
}

.banner-icon { font-size: 36px; line-height: 1; }
.banner-content { flex: 1; }
.banner-content h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #fff;
}
.banner-content p {
  font-size: 14px;
  opacity: 0.85;
  margin: 0;
}

.banner-stats {
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 20px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}
.banner-stats .stat-number {
  font-size: 28px;
  font-weight: 700;
}
.banner-stats .stat-label {
  font-size: 14px;
  opacity: 0.85;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.result-info {
  font-size: 14px;
  color: #64748B;
}
.result-info strong { color: #1E293B; }

.toolbar-right {
  display: flex;
  gap: 10px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #6366F1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-primary:hover { background: #4F46E5; }

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-refresh:hover { background: #F8FAFC; border-color: #CBD5E1; }

/* ===== 试卷卡片网格 ===== */
.paper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* ===== 单个卡片 ===== */
.paper-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px 22px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}
.paper-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.12);
  border-color: #C7D2FE;
}

/* 卡片头部 */
.paper-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.paper-type-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 20px;
}
.badge-open {
  background: #DCFCE7;
  color: #15803D;
}
.badge-directed {
  background: #DBEAFE;
  color: #1D4ED8;
}

.paper-id {
  font-size: 12px;
  color: #94A3B8;
  font-family: monospace;
}

/* 标题 */
.paper-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 14px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 元数据 */
.paper-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid #F1F5F9;
  border-bottom: 1px solid #F1F5F9;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748B;
}
.meta-icon { font-size: 14px; }

/* 底部 */
.paper-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.paper-date {
  font-size: 12px;
  color: #94A3B8;
}

.btn-start {
  padding: 6px 16px;
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
.btn-start:hover {
  background: #4F46E5;
  transform: scale(1.02);
}

.footer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-export {
  padding: 6px 14px;
  background: #fff;
  color: #6366F1;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-export:hover {
  background: #EEF2FF;
  border-color: #6366F1;
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
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94A3B8;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state h3 {
  font-size: 18px;
  color: #475569;
  margin: 0 0 4px 0;
}
.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* ===== 分页 ===== */
.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 预览弹窗 ===== */
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
  padding: 30px;
  backdrop-filter: blur(4px);
}
.preview-dialog {
  width: min(900px, 95vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 25px 70px rgba(15, 23, 42, 0.4);
}
.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 22px 26px;
  border-bottom: 1px solid #E2E8F0;
}
.preview-head h2 { margin: 0; font-size: 18px; }
.preview-head p { margin: 5px 0 0; color: #64748B; font-size: 14px; }
.close-btn {
  border: 0;
  background: #F1F5F9;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.close-btn:hover { background: #E2E8F0; }

.preview-body {
  overflow: auto;
  padding: 20px 26px;
}
.preview-loading { padding: 70px 0; text-align: center; color: #94A3B8; }
.preview-cover { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #E2E8F0; }
.preview-cover h1 { font-size: 20px; margin: 8px 0; }
.preview-cover h2 { font-size: 16px; margin: 6px 0; color: #475569; }
.preview-cover p { margin: 4px 0; font-size: 14px; color: #64748B; }
.preview-group { margin-bottom: 24px; }
.preview-group-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; padding: 8px 12px; background: #F1F5F9; border-left: 4px solid #7C3AED; border-radius: 4px; }
.preview-question {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid #F1F5F9;
}
.preview-number {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  background: #EEF2FF;
  color: #4338CA;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
}
.preview-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.preview-meta span {
  font-size: 12px;
  padding: 2px 10px;
  background: #F1F5F9;
  border-radius: 12px;
  color: #475569;
}
.preview-question h4 {
  font-size: 15px;
  margin: 0 0 6px 0;
  color: #1E293B;
  font-weight: 500;
}
.preview-options {
  white-space: pre-wrap;
  color: #475569;
  font-size: 14px;
  margin: 6px 0;
}
.preview-details {
  margin-top: 8px;
  padding: 10px 14px;
  background: #F8FAFC;
  border-radius: 8px;
}
.preview-details summary {
  cursor: pointer;
  color: #4F46E5;
  font-weight: 600;
  font-size: 13px;
}
.preview-details p {
  font-size: 13px;
  margin: 4px 0;
}

@media (max-width: 640px) {
  .page-banner {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  .paper-grid {
    grid-template-columns: 1fr;
  }
  .preview-dialog { max-height: 95vh; }
  .preview-head { flex-direction: column; gap: 12px; }
}
</style>
