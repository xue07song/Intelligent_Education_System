<template>
  <div class="iq-stats">
    <div class="iq-page-header">
      <div>
        <h2 class="iq-text-xl iq-font-semibold" style="color: var(--iq-neutral-900); margin: 0;">📈 统计分析</h2>
        <p class="iq-text-sm iq-text-muted" style="margin: 4px 0 0;">全面分析你的答题表现和学习趋势</p>
      </div>
    </div>

    <div v-if="loading" class="iq-table-loading">
      <span class="iq-loading-spinner"></span>
      <span class="iq-text-sm iq-text-muted">加载中...</span>
    </div>

    <div v-else-if="!stats || stats.overview.total_attempts === 0" class="iq-card">
      <div class="iq-empty-row">
        <div class="iq-empty-box">
          <div class="iq-empty-icon">📊</div>
          <div class="iq-empty-text iq-text-base" style="color: var(--iq-neutral-600);">暂无练习数据</div>
          <div class="iq-text-sm iq-text-muted">完成一次答题练习后即可查看统计</div>
        </div>
      </div>
    </div>

    <div v-else>
      <!-- AI 错题分析 -->
      <div v-if="!userId" class="iq-card ai-section">
        <div class="ai-header">
          <div class="ai-header-title">
            <div class="ai-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v1H7a3 3 0 0 0-3 3v2H3v4h1v2a3 3 0 0 0 3 3h2v1a3 3 0 0 0 6 0v-1h2a3 3 0 0 0 3-3v-2h1V9h-1V7a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3z"></path>
              </svg>
            </div>
            <div>
              <div class="iq-font-semibold iq-text-base" style="color: var(--iq-neutral-900);">AI 智能错题分析</div>
              <div class="iq-text-xs iq-text-muted" style="margin-top: 2px;">深度分析薄弱点，定制学习建议</div>
            </div>
          </div>
          <button class="iq-btn ai-btn" :disabled="aiLoading" @click="loadWeakness">
            <span v-if="aiLoading" class="iq-btn-spinner"></span>
            {{ aiLoading ? 'AI 分析中...' : '🤖 开始分析' }}
          </button>
        </div>

        <div v-if="aiReport" class="ai-report">
          <div v-if="!aiReport.hasData" class="ai-empty">{{ aiReport.message }}</div>
          <template v-else>
            <div v-if="aiReport.analysis?.summary" class="report-block">
              <div class="block-title">📋 总体评价</div>
              <div class="block-text">{{ aiReport.analysis.summary }}</div>
            </div>
            <div v-if="aiReport.analysis?.weakTypes?.length" class="report-block">
              <div class="block-title">⚠️ 薄弱题型</div>
              <div v-for="(t, i) in aiReport.analysis.weakTypes" :key="i" class="weak-item">
                <span class="weak-name">{{ t.题型 }}</span>
                <span class="weak-acc">正确率 {{ t.正确率 }}%</span>
                <span class="weak-advice">{{ t.建议 }}</span>
              </div>
            </div>
            <div v-if="aiReport.analysis?.weakPoints?.length" class="report-block">
              <div class="block-title">🎯 薄弱知识点</div>
              <div v-for="(p, i) in aiReport.analysis.weakPoints" :key="i" class="point-item">
                <div class="point-head">
                  <span class="point-name">{{ p.知识点 }}</span>
                  <span class="point-chapter">第{{ p.章节 }}章</span>
                </div>
                <div class="point-reason">原因：{{ p.原因 }}</div>
                <div class="point-advice">建议：{{ p.建议 }}</div>
              </div>
            </div>
            <div v-if="aiReport.analysis?.studyPlan?.length" class="report-block">
              <div class="block-title">📚 学习建议</div>
              <ul class="plan-list">
                <li v-for="(s, i) in aiReport.analysis.studyPlan" :key="i">{{ s }}</li>
              </ul>
            </div>
            <div v-if="aiReport.analysis?.encouragement" class="report-encourage">
              💪 {{ aiReport.analysis.encouragement }}
            </div>
          </template>
        </div>
      </div>

      <!-- 总览卡片 -->
      <div class="overview-grid">
        <div class="iq-card stat-card">
          <div class="stat-icon" style="background: #eff6ff; color: #3b82f6;">📝</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.total_attempts }}</div>
            <div class="stat-label">练习次数</div>
          </div>
        </div>
        <div class="iq-card stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #d97706;">🎯</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.avg_accuracy }}<span class="stat-unit">%</span></div>
            <div class="stat-label">平均准确率</div>
          </div>
        </div>
        <div class="iq-card stat-card">
          <div class="stat-icon" style="background: #ecfdf5; color: #059669;">🏆</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.max_accuracy }}<span class="stat-unit">%</span></div>
            <div class="stat-label">最佳成绩</div>
          </div>
        </div>
        <div class="iq-card stat-card">
          <div class="stat-icon" style="background: #faf5ff; color: #7c3aed;">📚</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.total_questions }}</div>
            <div class="stat-label">累计答题</div>
          </div>
        </div>
        <div class="iq-card stat-card">
          <div class="stat-icon" style="background: #fef2f2; color: #dc2626;">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.total_correct }}</div>
            <div class="stat-label">累计正确</div>
          </div>
        </div>
      </div>

      <!-- 趋势图 -->
      <div class="iq-card chart-card">
        <h3 class="chart-title">📊 近期练习趋势（最近 {{ stats.trend.length }} 次）</h3>
        <div class="trend-chart" v-if="stats.trend.length > 0">
          <div class="trend-bars">
            <div v-for="(item, idx) in stats.trend" :key="item.id" class="trend-bar-wrapper">
              <div class="trend-bar" :style="{ height: barHeight(item.accuracy) + '%' }" :class="accuracyClass(item.accuracy)">
                <span class="bar-value">{{ item.accuracy }}%</span>
              </div>
              <span class="bar-label">#{{ idx + 1 }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-data">暂无趋势数据</div>
      </div>

      <!-- 按题型正确率 -->
      <div class="iq-card chart-card">
        <h3 class="chart-title">📋 按题型正确率</h3>
        <div class="type-list" v-if="stats.byType.length > 0">
          <div v-for="item in stats.byType" :key="item.question_type" class="type-row">
            <div class="type-name">{{ getTypeName(item.question_type) }}</div>
            <div class="type-bar-bg">
              <div class="type-bar" :style="{ width: item.accuracy + '%' }" :class="accuracyClass(item.accuracy)"></div>
            </div>
            <div class="type-detail">
              <span class="type-accuracy" :class="`${accuracyClass(item.accuracy)}-text`">{{ item.accuracy }}%</span>
              <span class="type-count">({{ item.correct }}/{{ item.total }})</span>
            </div>
          </div>
        </div>
        <div v-else class="no-data">暂无题型数据</div>
      </div>

      <!-- 每次答题明细 -->
      <div class="iq-card chart-card">
        <h3 class="chart-title">📝 每次答题明细（最近 {{ stats.trend.length }} 次）</h3>
        <div class="iq-table-wrap" v-if="stats.trend.length > 0">
          <table class="iq-table detail-table">
            <thead>
              <tr>
                <th>#</th>
                <th v-if="showSubmitter">提交人</th>
                <th>试卷</th>
                <th>提交时间</th>
                <th>得分</th>
                <th>准确率</th>
                <th>总题数</th>
                <th>已答</th>
                <th>正确</th>
                <th>错误</th>
                <th>未答</th>
                <th>用时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in [...stats.trend].reverse()" :key="item.id">
                <td>{{ idx + 1 }}</td>
                <td v-if="showSubmitter">
                  <div class="user-cell">
                    <span>{{ item.nickname || item.username || '-' }}</span>
                    <span v-if="item.role" class="iq-tag u-role" :class="item.role">{{ roleMap[item.role] || item.role }}</span>
                  </div>
                </td>
                <td class="iq-font-medium" style="color: var(--iq-neutral-800);">{{ item.exam_title || `试卷#${item.exam_id}` }}</td>
                <td class="iq-text-sm iq-text-muted">{{ formatTime(item.submitted_at) }}</td>
                <td><span class="score-tag" :class="scoreClass(item.score)">{{ item.score }}</span></td>
                <td><span class="iq-font-semibold" :class="`${accuracyClass(item.accuracy)}-text`">{{ item.accuracy }}%</span></td>
                <td>{{ item.total_count }}</td>
                <td>{{ item.answered_count }}</td>
                <td class="bar-good-text iq-font-semibold">{{ item.correct_count }}</td>
                <td class="bar-bad-text iq-font-semibold">{{ item.wrong_count }}</td>
                <td>{{ item.skipped_count }}</td>
                <td>{{ formatDuration(item.duration_seconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data">暂无答题记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getPracticeStats, adminGetUserStats } from '@/api/practice';
import { getWeakness } from '@/api/ai';
import { getTypeName } from '@/utils/constants';
import { formatTime } from '@/utils/format';

const roleMap = { admin: '管理员', teacher: '教师', student: '学生' };

const props = defineProps({
  userId: { type: [Number, String], default: null },
});

const showSubmitter = computed(() => !!props.userId);

const emit = defineEmits(['toast']);

const loading = ref(true);
const stats = ref(null);

const aiLoading = ref(false);
const aiReport = ref(null);

const loadWeakness = async () => {
  if (props.userId) {
    emit('toast', { message: '查看他人统计时不支持 AI 错题分析', type: 'warning' });
    return;
  }
  aiLoading.value = true;
  try {
    aiReport.value = await getWeakness();
  } catch (err) {
    emit('toast', { message: err.message || 'AI 分析失败', type: 'error' });
  } finally {
    aiLoading.value = false;
  }
};

const barHeight = (accuracy) => Math.max(5, accuracy);

const accuracyClass = (acc) => {
  if (acc >= 80) return 'bar-good';
  if (acc >= 60) return 'bar-mid';
  return 'bar-bad';
};

const scoreClass = (score) => {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-pass';
  return 'score-fail';
};

const formatDuration = (sec) => {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
};

const loadStats = async () => {
  loading.value = true;
  try {
    stats.value = props.userId
      ? await adminGetUserStats(props.userId)
      : await getPracticeStats();
  } catch (err) {
    emit('toast', { message: err.message || '加载统计数据失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStats();
});

defineExpose({ loadStats });
</script>

<style scoped>
.iq-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.iq-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.iq-table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  background: var(--iq-card);
  border-radius: var(--iq-radius-card);
}
.iq-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--iq-neutral-200);
  border-top-color: var(--iq-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.iq-empty-row { padding: 0 !important; }
.iq-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
}
.iq-empty-icon { font-size: 48px; opacity: 0.5; }

.ai-section {
  padding: 20px 24px;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.ai-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ai-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--iq-radius-medium);
  background: linear-gradient(135deg, var(--iq-primary-500), #8b5cf6);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.4);
}
.ai-btn {
  background: linear-gradient(135deg, var(--iq-primary-500), #8b5cf6);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px -4px rgba(99, 102, 241, 0.5);
}
.ai-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--iq-primary-600), #7c3aed);
  border-color: transparent;
}
.iq-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 6px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
.ai-report {
  margin-top: 18px;
  background: linear-gradient(135deg, var(--iq-primary-50), #faf5ff);
  border: 1px solid var(--iq-primary-100);
  border-radius: var(--iq-radius-card);
  padding: 18px 22px;
}
.ai-empty {
  text-align: center;
  color: var(--iq-neutral-500);
  font-size: 14px;
  padding: 20px 0;
}
.report-block {
  margin-bottom: 16px;
}
.report-block:last-child { margin-bottom: 0; }
.block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--iq-primary-700);
  margin-bottom: 8px;
}
.block-text {
  font-size: 14px;
  color: var(--iq-neutral-800);
  line-height: 1.8;
}
.weak-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: var(--iq-neutral-0);
  border-radius: var(--iq-radius-medium);
  margin-bottom: 6px;
  font-size: 13px;
  border: 1px solid var(--iq-neutral-100);
}
.weak-name {
  font-weight: 700;
  color: var(--iq-neutral-900);
  min-width: 80px;
}
.weak-acc {
  color: var(--iq-state-error);
  min-width: 90px;
  font-weight: 600;
}
.weak-advice {
  color: var(--iq-neutral-600);
  flex: 1;
}
.point-item {
  background: var(--iq-neutral-0);
  border-radius: var(--iq-radius-medium);
  padding: 12px 14px;
  margin-bottom: 8px;
  border: 1px solid var(--iq-neutral-100);
}
.point-head {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 4px;
}
.point-name {
  font-weight: 700;
  color: var(--iq-neutral-900);
  font-size: 14px;
}
.point-chapter {
  font-size: 12px;
  color: var(--iq-neutral-500);
  background: var(--iq-neutral-100);
  padding: 2px 10px;
  border-radius: var(--iq-radius-full);
  font-weight: 500;
}
.point-reason, .point-advice {
  font-size: 13px;
  color: var(--iq-neutral-600);
  line-height: 1.7;
}
.plan-list {
  margin: 0;
  padding-left: 20px;
}
.plan-list li {
  font-size: 14px;
  color: var(--iq-neutral-800);
  line-height: 1.9;
}
.report-encourage {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--iq-neutral-0);
  border-radius: var(--iq-radius-medium);
  font-size: 14px;
  color: var(--iq-state-success);
  font-weight: 600;
  text-align: center;
  border: 1px solid #a7f3d0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.stat-card {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--iq-radius-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--iq-neutral-900);
  line-height: 1.2;
}
.stat-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--iq-neutral-500);
}
.stat-label {
  font-size: 12px;
  color: var(--iq-neutral-500);
  margin-top: 2px;
  font-weight: 500;
}

.chart-card {
  padding: 20px 24px;
}
.chart-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--iq-neutral-900);
  margin: 0 0 18px;
}

.trend-chart {
  overflow-x: auto;
  padding: 10px 4px 0;
}
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  min-height: 220px;
  padding-bottom: 28px;
}
.trend-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 40px;
  height: 220px;
  justify-content: flex-end;
}
.trend-bar {
  width: 30px;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 6px;
  min-height: 12px;
  transition: height 0.4s ease;
}
.trend-bar.bar-good { background: linear-gradient(180deg, #10b981, #059669); }
.trend-bar.bar-mid { background: linear-gradient(180deg, #f59e0b, #d97706); }
.trend-bar.bar-bad { background: linear-gradient(180deg, #ef4444, #dc2626); }
.bar-value {
  font-size: 10px;
  color: #fff;
  font-weight: 700;
}
.bar-label {
  font-size: 11px;
  color: var(--iq-neutral-500);
  font-weight: 500;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.type-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.type-name {
  width: 90px;
  font-size: 14px;
  color: var(--iq-neutral-800);
  font-weight: 600;
  flex-shrink: 0;
}
.type-bar-bg {
  flex: 1;
  height: 22px;
  background: var(--iq-neutral-100);
  border-radius: var(--iq-radius-full);
  overflow: hidden;
}
.type-bar {
  height: 100%;
  border-radius: var(--iq-radius-full);
  transition: width 0.4s ease;
}
.type-bar.bar-good { background: linear-gradient(90deg, #34d399, #10b981); }
.type-bar.bar-mid { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.type-bar.bar-bad { background: linear-gradient(90deg, #f87171, #ef4444); }
.type-detail {
  display: flex;
  gap: 4px;
  font-size: 13px;
  white-space: nowrap;
  min-width: 110px;
  justify-content: flex-end;
}
.type-accuracy {
  font-weight: 700;
  color: var(--iq-neutral-900);
}
.type-count {
  color: var(--iq-neutral-500);
}
.bar-good-text { color: #059669 !important; }
.bar-mid-text { color: #d97706 !important; }
.bar-bad-text { color: #dc2626 !important; }

.no-data {
  text-align: center;
  color: var(--iq-neutral-400);
  padding: 40px 0;
  font-size: 14px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.u-role.iq-tag.admin { background: #fef2f2; color: #b91c1c; }
.u-role.iq-tag.teacher { background: #eff6ff; color: #1d4ed8; }
.u-role.iq-tag.student { background: #ecfdf5; color: #047857; }
.score-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--iq-radius-full);
  font-weight: 700;
  font-size: 12px;
  min-width: 40px;
  text-align: center;
}
.score-excellent { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.score-pass { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.score-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
