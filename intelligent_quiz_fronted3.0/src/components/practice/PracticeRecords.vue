<template>
  <div class="records-page">
    <!-- ===== 顶部横幅 ===== -->
    <div class="page-banner">
      <div class="banner-left">
        <span class="banner-icon">📊</span>
        <div>
          <h1>答题记录</h1>
          <p>查看过往答题的成绩与详细分析，追踪你的学习轨迹</p>
        </div>
      </div>
      <div class="banner-right">
        <span class="banner-stat">{{ total }} 条记录</span>
        <button class="btn-refresh" :disabled="loading" @click="loadRecords">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
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
      <h3>暂无答题记录</h3>
      <p>去练习吧，每次答题都会留下记录</p>
    </div>

    <!-- ===== 记录卡片列表 ===== -->
    <div v-else class="records-list">
      <div v-for="(r, index) in list" :key="r.id" class="record-card">
        <div class="record-card-header">
          <div class="record-left">
            <span class="record-index">#{{ (page - 1) * pageSize + index + 1 }}</span>
            <span class="record-title">{{ r.exam_title || `试卷#${r.exam_id}` }}</span>
            <span v-if="showSubmitter" class="record-submitter">
              <span class="submitter-avatar">{{ getAvatar(r.nickname || r.username) }}</span>
              {{ r.nickname || r.username || '未知用户' }}
              <span class="submitter-role" :class="r.role">{{ roleMap[r.role] || r.role }}</span>
            </span>
          </div>
          <span class="record-date">{{ formatTime(r.submitted_at) }}</span>
        </div>

        <div class="record-card-body">
          <div class="score-section">
            <div class="score-big" :class="scoreClass(r.score)">
              {{ r.score }}
              <span class="score-unit">分</span>
            </div>
            <div class="accuracy-badge">
              准确率 <strong>{{ r.accuracy }}%</strong>
            </div>
          </div>

          <div class="stats-section">
            <div class="stat-item">
              <span class="stat-label">总题数</span>
              <span class="stat-value">{{ r.total_count }}</span>
            </div>
            <div class="stat-item stat-correct">
              <span class="stat-label">✅ 正确</span>
              <span class="stat-value">{{ r.correct_count }}</span>
            </div>
            <div class="stat-item stat-wrong">
              <span class="stat-label">❌ 错误</span>
              <span class="stat-value">{{ r.wrong_count }}</span>
            </div>
            <div class="stat-item stat-skip">
              <span class="stat-label">⏭ 未答</span>
              <span class="stat-value">{{ r.skipped_count }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">⏱ 用时</span>
              <span class="stat-value">{{ formatDuration(r.duration_seconds) }}</span>
            </div>
          </div>
        </div>

        <div class="record-card-footer">
          <button class="btn-detail" @click="$emit('view-record', r.id)">查看详情</button>
        </div>
      </div>
    </div>

    <!-- ===== 分页 ===== -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <Pagination
          v-model:page="page"
          v-model:pageSize="pageSize"
          :total="total"
          @change="loadRecords"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getRecords } from '@/api/practice';
import { formatTime } from '@/utils/format';
import Pagination from '@/components/Pagination.vue';

const roleMap = { admin: '管理员', teacher: '教师', student: '学生' };

const props = defineProps({
  role: { type: String, default: 'student' },
});

const showSubmitter = computed(() => props.role === 'admin' || props.role === 'teacher');

const emit = defineEmits(['view-record', 'toast']);

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const formatDuration = (sec) => {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
};

const getAvatar = (name) => {
  if (!name) return 'U';
  return name.charAt(0).toUpperCase();
};

const scoreClass = (score) => {
  if (score >= 90) return 'score-excellent';
  if (score >= 60) return 'score-pass';
  return 'score-fail';
};

const loadRecords = async () => {
  loading.value = true;
  try {
    const data = await getRecords({ page: page.value, pageSize: pageSize.value });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch (err) {
    emit('toast', { message: err.message || '加载记录失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRecords();
});

defineExpose({ loadRecords });
</script>

<style scoped>
/* ===== 页面容器 ===== */
.records-page {
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

/* ===== 记录卡片列表 ===== */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px 22px;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.record-card:hover {
  border-color: #C7D2FE;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
}

/* 卡片头部 */
.record-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F1F5F9;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.record-index {
  font-size: 12px;
  color: #94A3B8;
  font-family: monospace;
  font-weight: 600;
}
.record-title {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
}

.record-submitter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748B;
  background: #F8FAFC;
  padding: 2px 10px 2px 6px;
  border-radius: 20px;
}
.submitter-avatar {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #EEF2FF;
  color: #4338CA;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
}
.submitter-role {
  font-size: 10px;
  padding: 0 6px;
  border-radius: 4px;
}
.submitter-role.admin { background: #FEF2F2; color: #DC2626; }
.submitter-role.teacher { background: #DBEAFE; color: #1D4ED8; }
.submitter-role.student { background: #DCFCE7; color: #15803D; }

.record-date {
  font-size: 13px;
  color: #94A3B8;
}

/* 卡片主体 */
.record-card-body {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  padding-right: 24px;
  border-right: 1px solid #F1F5F9;
}

.score-big {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}
.score-big .score-unit {
  font-size: 16px;
  font-weight: 600;
  color: #94A3B8;
}
.score-excellent { color: #059669; }
.score-pass { color: #4338CA; }
.score-fail { color: #DC2626; }

.accuracy-badge {
  font-size: 14px;
  color: #64748B;
}
.accuracy-badge strong {
  color: #1E293B;
  font-size: 18px;
}

.stats-section {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #94A3B8;
}
.stat-item .stat-value {
  font-weight: 600;
  color: #1E293B;
  font-size: 16px;
}
.stat-correct .stat-value { color: #059669; }
.stat-wrong .stat-value { color: #DC2626; }
.stat-skip .stat-value { color: #94A3B8; }

/* 卡片底部 */
.record-card-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #F1F5F9;
  display: flex;
  justify-content: flex-end;
}

.btn-detail {
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
.btn-detail:hover {
  background: #4F46E5;
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
  .record-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .record-card-body {
    flex-direction: column;
    gap: 12px;
  }
  .score-section {
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 12px;
  }
  .stats-section {
    gap: 10px;
  }
  .record-left {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>