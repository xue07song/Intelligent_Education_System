<template>
  <div class="overview-page">
    <!-- ===== 顶部横幅（与题库管理风格一致） ===== -->
    <header class="iq-page-hero">
      <div class="hero-content">
        <span class="hero-badge">📊 教学数据</span>
        <h1 class="hero-title">自适应学情</h1>
        <p class="hero-desc">查看学生真正完成的自适应练习，不把仅打开页面或启动失败算作练习</p>
      </div>
      <div class="hero-actions">
        <button class="iq-btn iq-btn-secondary-light" :disabled="loading" @click="load">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          刷新数据
        </button>
      </div>
    </header>

    <!-- ===== 加载状态 ===== -->
    <div v-if="loading" class="iq-card empty">
      <div class="loading-spinner"></div>
      <p>正在读取学生练习情况...</p>
    </div>

    <template v-else>
      <!-- ===== 统计口径说明 ===== -->
      <div class="scope-note">
        <span>📌</span>
        <span><strong>统计口径：</strong>学生成功提交至少 1 道题后才计入；“完成题数”是已经提交的题数，“正确率”是答对题数 ÷ 完成题数</span>
      </div>

      <!-- ===== 统计卡片 ===== -->
      <div class="metric-grid">
        <div class="metric">
          <b>{{ data.users.length }}</b>
          <span>👥 学生账号总数</span>
          <small>包括尚未练习的学生</small>
        </div>
        <div class="metric">
          <b>{{ activeStudents }}</b>
          <span>📝 实际练习人数</span>
          <small>至少提交过 1 道题</small>
        </div>
        <div class="metric">
          <b>{{ totalSessions }}</b>
          <span>📊 有效练习次数</span>
          <small>不统计 0 题空记录</small>
        </div>
        <div class="metric">
          <b>{{ overallAccuracy }}%</b>
          <span>🎯 已答题整体正确率</span>
          <small>答对题数 ÷ 完成题数</small>
        </div>
      </div>

      <!-- ===== 学生表现表格 ===== -->
      <div class="iq-card table-card">
        <div class="card-title">
          <h3>👥 {{ selectedClass ? selectedClass + '学生表现' : '班级与学生表现' }}</h3>
          <button v-if="selectedClass" class="iq-btn iq-btn-secondary" @click="selectedClass = ''">← 返回班级列表</button>
        </div>
        <div v-if="!selectedClass" class="class-overview-grid">
          <button v-for="c in classSummaries" :key="c.name" class="class-overview-card" @click="selectedClass = c.name">
            <b>{{ c.name }}</b><span>{{ c.total }} 名学生</span><small>{{ c.active }} 人已练习 · 班级正确率 {{ c.accuracy }}%</small><em>查看班级 ›</em>
          </button>
          <div v-if="!classSummaries.length" class="empty-mini">尚未创建班级</div>
        </div>
        <table v-else>
          <thead>
          <tr>
            <th>学生</th>
            <th>有效练习</th>
            <th>练习进度</th>
            <th>已完成题数</th>
            <th>正确率</th>
            <th>最高难度</th>
            <th>最近练习</th>
            <th>建议关注</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="u in filteredUsers" :key="u.userId">
            <td>
              <b>{{ u.nickname || u.username }}</b>
              <small>{{ u.username }}</small>
            </td>
            <td>{{ u.sessionCount }} 次</td>
            <td>{{ progressOf(u) }}%</td>
            <td>{{ u.answeredCount }} 题</td>
            <td>
                <span class="accuracy" :class="accuracyClass(u.accuracy)">
                  {{ u.accuracy }}%
                </span>
            </td>
            <td>
              {{ Number(u.sessionCount) ? `${u.highestDifficulty}级（${difficultyLabel(u.highestDifficulty)}）` : '-' }}
            </td>
            <td>{{ formatTime(u.lastPracticeAt) }}</td>
            <td>{{ advice(u) }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== 最近有效练习 ===== -->
      <div v-if="selectedClass" class="iq-card recent-card">
        <div class="card-title">
          <h3>📋 最近有效练习</h3>
          <span>只展示至少完成 1 道题的记录</span>
        </div>
        <div v-if="!filteredSessions.length" class="empty-mini">
          当前班级还没有有效的自适应练习
        </div>
        <div v-else class="session-list">
          <div v-for="s in filteredSessions.slice(0, 12)" :key="s.id" class="session">
            <div>
              <b>{{ s.nickname || s.username }}</b>
              <span>{{ rangeText(s) }}</span>
            </div>
            <div>
              <b>已完成 {{ s.answered_count }}/{{ s.planned_count }} 题</b>
              <span>答对 {{ s.correct_count }} 题 · 当前 {{ s.current_difficulty }} 级</span>
            </div>
            <em :class="s.status">{{ statusText(s) }}</em>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getAdaptiveOverview } from '@/api/practice';

const emit = defineEmits(['toast']);

const loading = ref(false);
const data = ref({ users: [], recentSessions: [], classes: [] });
const selectedClass = ref('');
const classSummaries = computed(() => {
  const map = new Map((data.value.classes || []).map(c => [c.name, { name:c.name, total:Number(c.studentCount||0), active:0, answered:0, correct:0 }]));
  data.value.users.forEach((u) => {
    const name = u.className || '未分班';
    const item = map.get(name) || { name, total: 0, active: 0, answered: 0, correct: 0 };
    if (!map.has(name)) item.total += 1;
    item.active += Number(u.sessionCount) > 0 ? 1 : 0;
    item.answered += Number(u.answeredCount); item.correct += Number(u.correctCount); map.set(name, item);
  });
  return [...map.values()].map((c) => ({ ...c, accuracy: c.answered ? Math.round(c.correct * 100 / c.answered) : 0 }));
});
const filteredUsers = computed(() => data.value.users.filter((u) => (u.className || '未分班') === selectedClass.value));
const filteredSessions = computed(() => data.value.recentSessions.filter((s) => (s.className || '未分班') === selectedClass.value));

const load = async () => {
  loading.value = true;
  try {
    data.value = await getAdaptiveOverview();
  } catch (e) {
    emit('toast', { message: e.message || '读取失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

const activeStudents = computed(() =>
    data.value.users.filter((u) => Number(u.sessionCount) > 0).length
);

const totalSessions = computed(() =>
    data.value.users.reduce((s, u) => s + Number(u.sessionCount), 0)
);

const overallAccuracy = computed(() => {
  const answered = data.value.users.reduce((s, u) => s + Number(u.answeredCount), 0);
  const correct = data.value.users.reduce((s, u) => s + Number(u.correctCount), 0);
  return answered ? Math.round((correct / answered) * 100) : 0;
});

const difficultyLabel = (n) => {
  const num = Number(n);
  if (num <= 2) return '简单';
  if (num <= 4) return '中等';
  return '困难';
};

const accuracyClass = (n) => {
  const num = Number(n);
  if (num >= 80) return 'good';
  if (num <= 40) return 'weak';
  return 'normal';
};

const progressOf = (u) => {
  const planned = Number(u.plannedCount || 0);
  const answered = Number(u.answeredCount || 0);
  return planned ? Math.min(100, Math.round(answered * 100 / planned)) : 0;
};

const advice = (u) => {
  if (!Number(u.sessionCount)) return '尚未开始';
  if (Number(u.accuracy) <= 40) return '需要重点巩固 ⚠️';
  if (Number(u.accuracy) >= 80) return '表现稳定 ✅';
  return '继续观察 📖';
};

const statusText = (s) => {
  if (s.status === 'completed') return '✅ 按计划完成';
  return `⏳ 未完成，还差 ${Math.max(0, Number(s.planned_count) - Number(s.answered_count))} 题`;
};

const rangeText = (s) => {
  const chapters = s.chapters ? `第${String(s.chapters).replaceAll(',', '、')}章` : '全部章节';
  return `${chapters} · ${s.knowledge_keyword || '不限知识点'}`;
};

const formatTime = (v) => {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '-';
  }
};

onMounted(() => {
  load();
});
</script>

<style scoped>
/* ================================================================
   页面容器
   ================================================================ */
.overview-page {
  display: grid;
  gap: 18px;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
}
.class-select { min-width: 320px; padding: 9px 12px; border: 1px solid #dbe3f0; border-radius: 6px; background: #fff; }

/* ================================================================
   顶部横幅（与题库管理风格一致）
   ================================================================ */
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
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.iq-btn-secondary-light:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

.iq-btn-secondary-light:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ================================================================
   加载状态
   ================================================================ */
.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #E2E8F0;
  border-top-color: #6366F1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.iq-card.empty {
  padding: 60px 0;
  text-align: center;
  color: #94A3B8;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
}

/* ================================================================
   统计口径说明
   ================================================================ */
.scope-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  color: #4338CA;
  font-size: 13px;
  line-height: 1.6;
}

.scope-note strong {
  color: #1E293B;
}

/* ================================================================
   统计卡片
   ================================================================ */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.metric {
  display: grid;
  padding: 20px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.metric b {
  font-size: 28px;
  font-weight: 700;
  color: #6366F1;
}

.metric span {
  color: #475569;
  font-weight: 500;
  margin-top: 2px;
}

.metric small {
  color: #94A3B8;
  margin-top: 4px;
  font-size: 12px;
}

/* ================================================================
   卡片
   ================================================================ */
.iq-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.table-card,
.recent-card {
  padding: 22px 24px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.card-title span {
  color: #94A3B8;
  font-size: 13px;
}

/* ================================================================
   表格
   ================================================================ */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #F1F5F9;
  text-align: left;
  color: #475569;
  vertical-align: middle;
}

th {
  background: #F8FAFC;
  color: #1E293B;
  font-weight: 600;
  font-size: 12px;
}

td b {
  color: #1E293B;
}

td small {
  display: block;
  color: #94A3B8;
  font-size: 11px;
}

tbody tr:hover {
  background: #F8FAFC;
}

/* ===== 正确率标签 ===== */
.accuracy {
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 13px;
  display: inline-block;
}

.accuracy.good {
  background: #DCFCE7;
  color: #15803D;
}

.accuracy.normal {
  background: #FEF3C7;
  color: #A16207;
}

.accuracy.weak {
  background: #FEE2E2;
  color: #B91C1C;
}

/* ================================================================
   最近练习列表
   ================================================================ */
.session-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.session {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #F8FAFC;
  border-radius: 10px;
  border: 1px solid #F1F5F9;
  gap: 12px;
  flex-wrap: wrap;
}

.session div {
  display: grid;
  gap: 2px;
}

.session div b {
  font-size: 14px;
  color: #1E293B;
}

.session div span {
  font-size: 12px;
  color: #64748B;
}

.session em {
  font-style: normal;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #FEF3C7;
  color: #A16207;
  white-space: nowrap;
}

.session em.completed {
  background: #DCFCE7;
  color: #15803D;
}

/* ================================================================
   空状态
   ================================================================ */
.empty-mini {
  padding: 40px 0;
  text-align: center;
  color: #94A3B8;
  font-size: 14px;
}

/* ================================================================
   响应式
   ================================================================ */
@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }

  .session-list {
    grid-template-columns: 1fr;
  }

  .table-card {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .iq-page-hero {
    flex-direction: column;
    text-align: center;
    padding: 22px 20px;
    gap: 16px;
  }

  .hero-actions {
    justify-content: center;
  }

  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }

  .card-title {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .session {
    flex-direction: column;
    align-items: flex-start;
  }

  .scope-note {
    flex-direction: column;
    text-align: center;
  }
}
.class-overview-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; padding:8px 0; }
.class-overview-card { min-height:120px; padding:18px; border:1px solid #dbe5f5; background:#f8fbff; text-align:left; display:grid; gap:7px; cursor:pointer; }
.class-overview-card:hover { border-color:#6d75ed; background:#f3f5ff; }
.class-overview-card b { color:#14213d; font-size:16px; }
.class-overview-card span,.class-overview-card small { color:#64748b; }
.class-overview-card em { color:#4f46e5; font-style:normal; }
</style>
