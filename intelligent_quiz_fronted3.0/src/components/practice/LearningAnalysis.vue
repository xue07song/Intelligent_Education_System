<template>
  <div class="learning-page learning-dashboard">
    <!-- ===== 顶部横幅 ===== -->
    <header class="hero">
      <div>
        <span>{{ role === 'student' ? '📊 个人学习中心' : '📊 教学数据中心' }}</span>
        <h2>{{ role === 'student' ? '我的学习分析' : '学生个性化分析' }}</h2>
        <p>{{ role === 'student' ? '把试卷和自适应练习放在一起，找出真正掌握的内容和下一步练习方向。' : '汇总每名学生的试卷与自适应练习，快速找到需要帮助的学生和共同薄弱点。' }}</p>
      </div>
      <button class="refresh" @click="load" :disabled="loading">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        刷新数据
      </button>
    </header>

    <!-- ===== 加载状态 ===== -->
    <div v-if="loading" class="iq-card loading">
      <div class="loading-spinner"></div>
      <p>正在整理学习数据...</p>
    </div>

    <!-- ===== 教师端：学生列表 ===== -->
    <template v-else-if="role !== 'student' && !selectedId">
      <section class="overview-cards three">
        <div>
          <b>{{ overview.students.length }}</b>
          <span>👥 学生人数</span>
        </div>
        <div>
          <b>{{ startedCount }}</b>
          <span>📝 已有练习数据</span>
        </div>
        <div>
          <b>{{ attentionCount }}</b>
          <span>⚠️ 需要关注</span>
        </div>
      </section>

      <section class="iq-card section">
        <div class="section-head">
          <div>
            <h3>👥 {{ selectedClass ? selectedClass + '学生列表' : '班级学习状态' }}</h3>
            <p>{{ selectedClass ? '选择学生查看个人的试卷、自适应练习和各项学习指标' : '选择一个班级，进入班内学生分析' }}</p>
          </div>
          <button v-if="selectedClass" class="back" @click="selectedClass = ''">← 返回班级列表</button>
        </div>
        <div v-if="!selectedClass" class="class-browser">
          <button v-for="item in overview.classes" :key="item.id" class="class-browser-card" @click="selectedClass = item.name">
            <b>{{ item.name }}</b><span>{{ item.studentCount }} 名学生</span><em>查看班级 ›</em>
          </button>
          <div v-if="!overview.classes.length" class="empty">尚未创建班级</div>
        </div>
        <div v-else class="student-list">
          <button v-for="s in visibleStudents" :key="s.id" @click="openStudent(s.id)">
            <span class="avatar">{{ (s.nickname || s.username).slice(0, 1) }}</span>
            <span class="student-name">
              <b>{{ s.nickname || s.username }}</b>
              <em :class="statusClass(s)">{{ statusText(s) }}</em>
              <small v-if="s.concernReasons?.length">{{ s.concernReasons.join('；') }}</small>
            </span>
            <span class="source">📄 {{ s.coverage.examAnswers }} 题</span>
            <span class="source">🎯 {{ s.coverage.adaptiveAnswers }} 题</span>
            <strong>{{ s.answered ? s.accuracy + '%' : '未开始' }}</strong>
            <span class="arrow">›</span>
          </button>
        </div>
      </section>

      <section v-if="selectedClass" class="iq-card section">
        <div class="section-head">
          <div>
            <div class="explain-title">
              <h3>📉 班级薄弱点</h3>
              <span class="explain-trigger" tabindex="0">
                ?
                <span class="weak-tooltip">
                  <b>计算说明</b>
                  <p>以当前班级为单位，将普通试卷与自适应练习中同一知识点的答对题数相加，再除以两类练习的完成题数。至少有 2 名学生练习过才展示。</p>
                </span>
              </span>
            </div>
            <p>汇总多人共同练习过且正确率较低的知识点</p>
          </div>
          <button v-if="role === 'teacher'" class="primary" @click="$emit('navigate', 'generate')">
            进入智能组卷
          </button>
        </div>
        <div v-if="!selectedClassWeaknesses.length" class="empty">当前班级还没有足够的多人练习数据</div>
        <div class="weak-chart" aria-label="班级知识点综合正确率图">
          <article v-for="x in selectedClassWeaknesses" :key="x.key" class="weak-chart-row" tabindex="0">
            <div class="weak-chart-label">
              <b>{{ x.key }}</b>
              <span>{{ x.students }} 名学生 · {{ x.answered }} 题</span>
            </div>
            <div class="weak-bar-track">
              <span class="weak-bar-fill" :style="{ width: `${Math.max(2, x.accuracy)}%` }"></span>
              <div class="weak-point-tooltip">
                <b>{{ x.key }}</b>
                <p>综合正确率：{{ x.accuracy }}%</p>
                <p>当前班级 {{ x.students }} 名学生共完成 {{ x.answered }} 题，其中答对 {{ x.correct }} 题。</p>
                <p>计算方式：（试卷答对数 + 自适应练习答对数）÷（试卷完成数 + 自适应练习完成数）× 100%</p>
              </div>
            </div>
            <strong :class="scoreClass(x.accuracy)">{{ x.accuracy }}%</strong>
          </article>
        </div>
      </section>
    </template>

    <!-- ===== 学生端 / 学生详情 ===== -->
    <template v-else-if="data">
      <button v-if="role !== 'student'" class="back" @click="selectedId = null; data = null">← 返回学生列表</button>

      <section class="student-summary compact-summary">
        <div>
          <span>{{ role === 'student' ? '📊 本次学习画像' : (data.student.nickname || data.student.username) }}</span>
          <h2>{{ summaryTitle }}</h2>
          <p>{{ summarySentence }}</p>
        </div>
        <div class="score-pill">
          <b>{{ data.summary.accuracy }}%</b>
          <span>综合正确率</span>
        </div>
      </section>

      <section class="source-board">
        <div>
          <span>📄 普通试卷</span>
          <b>{{ data.coverage.examAnswers }} 题</b>
        </div>
        <div>
          <span>🎯 自适应练习</span>
          <b>{{ data.coverage.adaptiveAnswers }} 题</b>
        </div>
        <div>
          <span>📈 最近 10 题</span>
          <b>{{ data.summary.recentAccuracy }}%</b>
        </div>
        <div>
          <span>✅ 已重新掌握错题</span>
          <b>{{ data.summary.recovered }} 题</b>
        </div>
      </section>

      <!-- ===== 章节完成情况（2列 + 进度条） ===== -->
      <section class="iq-card section">
        <div class="section-head">
          <div>
            <h3>📚 章节完成情况</h3>
            <p>分别展示普通试卷和自适应练习在各章节的完成情况</p>
          </div>
        </div>
        <div class="chapter-grid-v2">
          <div v-for="x in data.chapters" :key="x.key" class="chapter-card-v2">
            <div class="chapter-header-v2">
              <span class="chapter-name-v2">{{ getChapterLabel(x.key) }}</span>
              <span class="chapter-status-v2" :class="masteryClass(x)">{{ masteryText(x) }}</span>
            </div>
            <div class="chapter-body-v2">
              <div class="chapter-row">
                <span class="chapter-row-label">📄 普通试卷</span>
                <span class="chapter-row-num">{{ x.examAnswered || 0 }} 题 · 答对 {{ x.examCorrect || 0 }} 题</span>
                <div class="chapter-progress">
                  <div
                      class="chapter-progress-fill"
                      :style="{ width: (x.examAnswered > 0 ? (x.examCorrect / x.examAnswered * 100) : 0) + '%' }"
                  ></div>
                </div>
                <span class="chapter-row-rate">{{ x.examAnswered > 0 ? Math.round(x.examCorrect / x.examAnswered * 100) : 0 }}%</span>
              </div>
              <div class="chapter-row">
                <span class="chapter-row-label">🎯 自适应练习</span>
                <span class="chapter-row-num">{{ x.adaptiveAnswered || 0 }} 题 · 答对 {{ x.adaptiveCorrect || 0 }} 题</span>
                <div class="chapter-progress">
                  <div
                      class="chapter-progress-fill adaptive"
                      :style="{ width: (x.adaptiveAnswered > 0 ? (x.adaptiveCorrect / x.adaptiveAnswered * 100) : 0) + '%' }"
                  ></div>
                </div>
                <span class="chapter-row-rate">{{ x.adaptiveAnswered > 0 ? Math.round(x.adaptiveCorrect / x.adaptiveAnswered * 100) : 0 }}%</span>
              </div>
            </div>
            <div class="chapter-footer-v2">
              合计完成 <b>{{ x.answered }}</b> 题，答对 <b>{{ x.correct }}</b> 题
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 题型表现（雷达图）+ 难度适应（折线图） ===== -->
      <div class="split">
        <section class="iq-card section">
          <div class="section-head">
            <div>
              <h3>📊 题型表现</h3>
              <p>多维度对比各题型掌握情况，雷达图面积越大表示整体越均衡</p>
            </div>
          </div>
          <div ref="radarChartRef" class="chart-container"></div>
        </section>

        <section class="iq-card section">
          <div class="section-head">
            <div>
              <h3>⭐ 难度适应情况</h3>
              <p>展示在不同难度等级上的表现变化趋势</p>
            </div>
          </div>
          <div ref="lineChartRef" class="chart-container"></div>
        </section>
      </div>

      <!-- ===== 每日学习趋势 ===== -->
      <section class="iq-card section">
        <div class="section-head">
          <div>
            <h3>📈 每日学习趋势</h3>
            <p>截至当天的累计正确率，累计口径可减少单日题量较少造成的大幅波动</p>
          </div>
          <div class="legend">
            <span class="exam-line">📄 普通试卷</span>
            <span class="adaptive-line">🎯 自适应练习</span>
          </div>
        </div>
        <div v-if="data.dailyTrend.length" class="line-chart">
          <svg viewBox="0 0 760 250" preserveAspectRatio="none">
            <line v-for="n in 5" :key="n" x1="45" :y1="n * 40" x2="740" :y2="n * 40" class="grid-line" />
            <text x="4" y="44">100%</text>
            <text x="12" y="124">50%</text>
            <text x="21" y="204">0%</text>
            <polyline
                :points="data.dailyTrend.map((d, i) => d.examCumulative === null ? '' : (55 + i * (670 / Math.max(1, data.dailyTrend.length - 1))) + ',' + (200 - d.examCumulative * 1.6)).filter(Boolean).join(' ')"
                class="exam-poly"
            />
            <polyline
                :points="data.dailyTrend.map((d, i) => d.adaptiveCumulative === null ? '' : (55 + i * (670 / Math.max(1, data.dailyTrend.length - 1))) + ',' + (200 - d.adaptiveCumulative * 1.6)).filter(Boolean).join(' ')"
                class="adaptive-poly"
            />
            <g v-for="(d, i) in data.dailyTrend" :key="d.date">
              <circle
                  v-if="d.examCumulative !== null"
                  :cx="55 + i * (670 / Math.max(1, data.dailyTrend.length - 1))"
                  :cy="200 - d.examCumulative * 1.6"
                  r="5"
                  class="exam-dot"
              />
              <circle
                  v-if="d.adaptiveCumulative !== null"
                  :cx="55 + i * (670 / Math.max(1, data.dailyTrend.length - 1))"
                  :cy="200 - d.adaptiveCumulative * 1.6"
                  r="5"
                  class="adaptive-dot"
              />
              <text :x="55 + i * (670 / Math.max(1, data.dailyTrend.length - 1))" y="232" class="date-label">
                {{ d.date.slice(5) }}
              </text>
            </g>
          </svg>
        </div>
        <div v-else class="empty">还没有可展示的每日练习趋势</div>

        <div class="trend-notes">
          <span>
            <b>📌 近期状态：</b>{{ trendText }}，{{ trendExplanation }}
          </span>
          <span>
            <b>🧠 知识保持：</b>{{ retentionText }}
          </span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getLearningAnalysis, getLearningAnalysisOverview, getStudentLearningAnalysis } from '@/api/practice';
import * as echarts from 'echarts';

// ================================================================
// 工具函数
// ================================================================
const CHAPTER_NAMES = {
  1: '计算思维基础',
  2: '计算机系统基础',
  3: 'Python 程序设计',
  4: '算法与问题求解',
  5: '数字素养与数字化',
  6: '人工智能基础',
  7: '智能技术应用',
  8: '智能技术与机器学习',
  9: '大模型与办公实践',
  10: '科技伦理与治理',
};

const TYPE_NAMES = {
  1: '判断题',
  2: '单选题',
  3: '多选题',
  4: '填空题',
  5: '简答题',
  6: '程序论述题',
};

const getChapterLabel = (id) => {
  const num = Number(id);
  return `第${num}章 ${CHAPTER_NAMES[num] || '未命名章节'}`;
};

const getTypeName = (id) => {
  return TYPE_NAMES[id] || `题型${id}`;
};

// ================================================================
// 组件逻辑
// ================================================================
const props = defineProps({
  role: { type: String, required: true },
});

const emit = defineEmits(['toast', 'practice', 'navigate']);

const loading = ref(false);
const selectedClass = ref('');
const classNames = computed(() => [...new Set(overview.value.students.map((s) => s.className || '未分班'))]);
const visibleStudents = computed(() => selectedClass.value ? overview.value.students.filter((s) => (s.className || '未分班') === selectedClass.value) : []);
const selectedClassWeaknesses = computed(() => overview.value.classWeaknesses?.[selectedClass.value] || []);
const overview = ref({ students: [], classes: [], commonWeaknesses: [], classWeaknesses: {} });
const data = ref(null);
const selectedId = ref(null);

// ===== 图表引用 =====
const radarChartRef = ref(null);
const lineChartRef = ref(null);
const chartResizeHandlers = [];

// ===== 雷达图数据 =====
const radarData = computed(() => {
  if (!data.value) return { indicators: [], values: [] };
  const types = data.value.types || [];
  const indicators = types.map(t => getTypeName(t.key));
  const values = types.map(t => t.accuracy || 0);
  return { indicators, values };
});

// ===== 折线图数据 =====
const lineData = computed(() => {
  if (!data.value) return { levels: [], values: [] };
  const levels = [1, 2, 3, 4, 5];
  const values = levels.map(n => {
    const item = data.value.difficulty?.find(d => Number(d.key) === n);
    return item ? item.accuracy || 0 : 0;
  });
  return { levels, values };
});

// ===== 渲染雷达图 =====
const initRadarChart = () => {
  if (!radarChartRef.value) return;
  const chart = echarts.init(radarChartRef.value);
  const d = radarData.value;
  if (!d.indicators.length) return;

  const option = {
    radar: {
      indicator: d.indicators.map(name => ({ name, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#475569', fontSize: 12 },
      splitLine: { lineStyle: { color: '#E2E8F0' } },
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'] } },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
    },
    series: [{
      type: 'radar',
      data: [{ value: d.values, name: '正确率' }],
      areaStyle: { color: 'rgba(99,102,241,0.3)' },
      lineStyle: { color: '#6366F1', width: 2 },
      itemStyle: { color: '#6366F1' },
    }],
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const values = params.data.value;
        const names = d.indicators;
        let html = `<b>题型掌握情况</b><br/>`;
        names.forEach((name, i) => {
          html += `${name}: ${values[i] || 0}%<br/>`;
        });
        return html;
      }
    }
  };

  chart.setOption(option);
  chartResizeHandlers.push(() => chart.resize());
};

// ===== 渲染折线图 =====
const initLineChart = () => {
  if (!lineChartRef.value) return;
  const chart = echarts.init(lineChartRef.value);
  const d = lineData.value;
  if (!d.levels.length) return;

  const levelLabels = ['⭐ 入门', '⭐⭐ 简单', '⭐⭐⭐ 中等', '⭐⭐⭐⭐ 困难', '⭐⭐⭐⭐⭐ 挑战'];

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0];
        return `<b>${levelLabels[p.dataIndex]}</b><br/>正确率：${p.value || 0}%`;
      }
    },
    grid: {
      left: 40,
      right: 20,
      top: 20,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: ['★1', '★2', '★3', '★4', '★5'],
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#94A3B8', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLabel: { color: '#94A3B8', fontSize: 11, formatter: '{value}%' },
      name: '正确率',
      nameTextStyle: { color: '#94A3B8', fontSize: 11 },
    },
    series: [{
      type: 'line',
      data: d.values,
      smooth: true,
      lineStyle: { color: '#6366F1', width: 3 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.3)' },
            { offset: 1, color: 'rgba(99,102,241,0.02)' }
          ]
        }
      },
      itemStyle: { color: '#6366F1' },
      symbol: 'circle',
      symbolSize: 8,
      markPoint: {
        data: [
          { type: 'max', name: '最高点' },
          { type: 'min', name: '最低点' }
        ]
      },
      markLine: {
        data: [
          { type: 'average', name: '平均正确率' },
          { yAxis: 60, name: '及格线', lineStyle: { color: '#F59E0B', type: 'dashed' } }
        ]
      }
    }]
  };

  chart.setOption(option);
  chartResizeHandlers.push(() => chart.resize());
};

// ================================================================
// 计算属性
// ================================================================
const startedCount = computed(() => overview.value.students.filter((x) => x.answered > 0).length);
const attentionCount = computed(() =>
    overview.value.students.filter((x) => x.answered >= 5 && (x.accuracy < 60 || x.change <= -10)).length
);

const load = async () => {
  loading.value = true;
  try {
    if (props.role === 'student') {
      data.value = await getLearningAnalysis();
    } else {
      const payload = await getLearningAnalysisOverview();
      overview.value = {
        students: [], classes: [], commonWeaknesses: [], classWeaknesses: {},
        ...(payload || {}),
      };
    }
  } catch (e) {
    emit('toast', { message: e.message || '读取分析失败', type: 'error' });
  } finally {
    loading.value = false;
    setTimeout(() => {
      initRadarChart();
      initLineChart();
    }, 300);
  }
};

const openStudent = async (id) => {
  loading.value = true;
  try {
    data.value = await getStudentLearningAnalysis(id);
    selectedId.value = id;
    setTimeout(() => {
      initRadarChart();
      initLineChart();
    }, 300);
  } catch (e) {
    emit('toast', { message: e.message || '读取学生分析失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

// ===== 状态判断 =====
const statusText = (s) => {
  if (!s.answered) return '尚未开始';
  if (s.answered < 20) return '数据积累中';
  if (s.change <= -10) return '近期有波动';
  if (s.accuracy < 60) return '建议加强练习';
  if (s.change >= 10) return '近期进步明显';
  return '学习表现稳定';
};

const statusClass = (s) => {
  if (!s.answered) return 'empty';
  if (s.answered < 20) return 'building';
  if (s.accuracy < 60 || s.change <= -10) return 'attention';
  return 'stable';
};

const scoreClass = (n) => {
  if (n >= 80) return 'good';
  if (n >= 60) return 'medium';
  return 'weak';
};

const masteryText = (x) => {
  if (x.answered < 3) return '样本较少';
  if (x.accuracy >= 80) return '掌握良好 ✅';
  if (x.accuracy >= 60) return '基本掌握 📖';
  return '需要巩固 ⚠️';
};

const masteryClass = (x) => {
  if (x.answered < 3) return 'sample';
  if (x.accuracy >= 80) return 'good';
  if (x.accuracy >= 60) return 'medium';
  return 'weak';
};

const summaryTitle = computed(() => {
  if (!data.value?.summary?.answered) return '还没有练习记录';
  if (data.value.summary.accuracy >= 80) return '🎉 整体掌握良好';
  if (data.value.summary.accuracy >= 60) return '📖 正在稳步掌握';
  return '💪 建议从基础内容开始巩固';
});

const summarySentence = computed(() =>
    `分析依据：${data.value.coverage.examAnswers} 道试卷题和 ${data.value.coverage.adaptiveAnswers} 道自适应练习题。`
);

const trendText = computed(() => {
  if (data.value.summary.change == null) return '数据积累中';
  if (data.value.summary.change >= 10) return '近期进步 📈';
  if (data.value.summary.change <= -10) return '近期有波动 📉';
  return '表现较稳定 ✅';
});

const trendExplanation = computed(() => {
  if (data.value.summary.change == null) return '再完成一些题目后，可以比较前后变化。';
  return `最近 10 题正确率为 ${data.value.summary.recentAccuracy}%，与此前 10 题相差 ${Math.abs(data.value.summary.change)} 个百分点。`;
});

const retentionText = computed(() => {
  if (data.value.insights.retention.length) {
    return `${data.value.insights.retention.map((x) => x.key).join('、')} 曾经掌握较好，但已有一段时间未练习。`;
  }
  return '已掌握较好的知识点目前没有明显的长期未练情况。';
});

// ===== 生命周期 =====
onMounted(() => {
  load();
  window.addEventListener('resize', () => {
    chartResizeHandlers.forEach(fn => fn());
  });
});

onUnmounted(() => {
  chartResizeHandlers.length = 0;
});
</script>

<style scoped>
/* ================================================================
   学情分析页面样式（紫色主题）
   ================================================================ */
.learning-page {
  display: grid;
  gap: 18px;
  max-width: 1240px;
  margin: 0 auto;
  color: #1E293B;
}

/* ===== 顶部横幅 ===== */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 34px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.25);
}

.hero h2 {
  margin: 6px 0 4px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}
.hero p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  max-width: 760px;
  line-height: 1.6;
}
.hero > div > span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
}

.refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}
.refresh:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}
.refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 加载状态 ===== */
.loading {
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
  to {
    transform: rotate(360deg);
  }
}

/* ===== 卡片 ===== */
.iq-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section {
  padding: 22px 24px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.section-head h3 {
  margin: 0;
  font-size: 18px;
  color: #1E293B;
}
.section-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748B;
}

.empty {
  padding: 36px;
  text-align: center;
  color: #94A3B8;
}

/* ===== 图表容器 ===== */
.chart-container {
  width: 100%;
  height: 300px;
}

/* ===== 概览卡片 ===== */
.overview-cards,
.source-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.overview-cards > div,
.source-board > div {
  display: grid;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #fff;
}
.overview-cards b,
.source-board b {
  font-size: 26px;
  font-weight: 700;
  color: #6366F1;
}
.overview-cards span,
.source-board span {
  font-size: 13px;
  color: #64748B;
}

.overview-cards.three {
  grid-template-columns: repeat(3, 1fr);
}

/* ===== 学生列表 ===== */
.student-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.student-list > button {
  display: grid;
  grid-template-columns: 40px 1fr auto auto 60px 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #FAFCFF;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.student-list > button:hover {
  border-color: #A5B4FC;
  background: #F5F3FF;
}
.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #EEF2FF;
  color: #4338CA;
  font-weight: 700;
}
.student-name {
  display: grid;
  gap: 2px;
}
.student-name b {
  font-size: 14px;
  color: #1E293B;
}
.student-name em {
  width: max-content;
  padding: 1px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-style: normal;
}
.student-name small {
  font-size: 11px;
  color: #B91C1C;
  line-height: 1.3;
}
.source {
  font-size: 12px;
  color: #64748B;
}
.student-list strong {
  color: #6366F1;
  text-align: right;
  font-size: 14px;
}
.arrow {
  font-size: 20px;
  color: #A5B4FC;
}

/* ===== 状态标签 ===== */
.stable {
  background: #DCFCE7;
  color: #15803D;
}
.attention {
  background: #FEE2E2;
  color: #B91C1C;
}
.building {
  background: #FEF3C7;
  color: #A16207;
}
.empty-state {
  background: #F1F5F9;
  color: #64748B;
}

/* ===== 得分颜色 ===== */
.good {
  color: #059669;
}
.medium {
  color: #B45309;
}
.weak {
  color: #B91C1C;
}
.sample {
  color: #94A3B8;
}

/* ===== 薄弱点网格 ===== */
.weak-chart { display:grid; gap:12px; padding:4px 0; }
.weak-chart-row { position:relative; display:grid; grid-template-columns:minmax(150px, 240px) 1fr 56px; align-items:center; gap:16px; padding:8px 10px; border-radius:8px; outline:none; }
.weak-chart-row:hover, .weak-chart-row:focus { background:#F8FAFF; }
.weak-chart-label { display:grid; gap:3px; min-width:0; }
.weak-chart-label b { overflow:hidden; color:#1E293B; font-size:14px; text-overflow:ellipsis; white-space:nowrap; }
.weak-chart-label span { color:#64748B; font-size:12px; }
.weak-bar-track { position:relative; height:14px; border-radius:7px; background:#E8ECF5; }
.weak-bar-fill { display:block; height:100%; max-width:100%; border-radius:7px; background:#6366F1; transition:width .25s ease; }
.weak-chart-row > strong { font-size:16px; text-align:right; }
.weak-point-tooltip { display:none; position:absolute; z-index:20; left:50%; bottom:24px; width:min(390px, 70vw); padding:13px 15px; border:1px solid #C7D2FE; border-radius:8px; background:#fff; box-shadow:0 12px 30px rgba(30,41,59,.16); color:#1E293B; transform:translateX(-50%); }
.weak-point-tooltip b { font-size:14px; }
.weak-point-tooltip p { margin:5px 0 0; color:#475569; font-size:12px; line-height:1.55; }
.weak-chart-row:hover .weak-point-tooltip, .weak-chart-row:focus .weak-point-tooltip { display:block; }

/* ===== 学生摘要 ===== */
.student-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 26px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #fff;
}
.student-summary > div > span {
  font-size: 12px;
  color: #6366F1;
  letter-spacing: 1px;
}
.student-summary h2 {
  margin: 4px 0 2px;
  font-size: 24px;
  color: #1E293B;
}
.student-summary p {
  margin: 0;
  color: #64748B;
  font-size: 14px;
}

.score-pill {
  display: grid;
  min-width: 100px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #EEF2FF;
  text-align: center;
}
.score-pill b {
  font-size: 26px;
  color: #4338CA;
}
.score-pill span {
  font-size: 11px;
  color: #64748B;
}

/* ================================================================
   章节完成情况（2列 + 进度条）
   ================================================================ */
.chapter-grid-v2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.chapter-card-v2 {
  padding: 16px 18px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #FAFCFF;
  transition: border-color 0.2s;
}
.chapter-card-v2:hover {
  border-color: #A5B4FC;
}

.chapter-header-v2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F1F5F9;
}

.chapter-name-v2 {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
}

.chapter-status-v2 {
  font-size: 12px;
  font-weight: 500;
}
.chapter-status-v2.good {
  color: #059669;
}
.chapter-status-v2.medium {
  color: #B45309;
}
.chapter-status-v2.weak {
  color: #B91C1C;
}
.chapter-status-v2.sample {
  color: #94A3B8;
}

.chapter-body-v2 {
  display: grid;
  gap: 8px;
}

.chapter-row {
  display: grid;
  grid-template-columns: 90px 1fr 1fr 36px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.chapter-row-label {
  color: #64748B;
  font-weight: 500;
}

.chapter-row-num {
  color: #1E293B;
  font-weight: 500;
}

.chapter-progress {
  height: 6px;
  background: #F1F5F9;
  border-radius: 4px;
  overflow: hidden;
}

.chapter-progress-fill {
  height: 100%;
  background: #6366F1;
  border-radius: 4px;
  transition: width 0.6s ease;
}
.chapter-progress-fill.adaptive {
  background: #10B981;
}

.chapter-row-rate {
  font-weight: 600;
  color: #1E293B;
  text-align: right;
}

.chapter-footer-v2 {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #F1F5F9;
  font-size: 13px;
  color: #64748B;
  text-align: right;
}
.chapter-footer-v2 b {
  color: #1E293B;
}

/* ===== 两栏布局 ===== */
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

/* ===== 学习趋势 ===== */
.legend {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #64748B;
}
.legend span::before {
  content: '';
  display: inline-block;
  width: 18px;
  height: 3px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 2px;
}
.exam-line::before {
  background: #6366F1;
}
.adaptive-line::before {
  background: #10B981;
}

.line-chart {
  height: 280px;
  padding: 8px;
  background: #FAFAFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
}
.line-chart svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.grid-line {
  stroke: #E2E8F0;
  stroke-width: 1;
}
.line-chart text {
  fill: #94A3B8;
  font-size: 11px;
}
.exam-poly {
  fill: none;
  stroke: #6366F1;
  stroke-width: 3;
}
.adaptive-poly {
  fill: none;
  stroke: #10B981;
  stroke-width: 3;
}
.exam-dot {
  fill: #6366F1;
  stroke: #fff;
  stroke-width: 2;
}
.adaptive-dot {
  fill: #10B981;
  stroke: #fff;
  stroke-width: 2;
}
.date-label {
  text-anchor: middle;
  font-size: 10px !important;
}

.trend-notes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}
.trend-notes span {
  padding: 10px 14px;
  border-radius: 8px;
  background: #F5F3FF;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}
.trend-notes b {
  color: #1E293B;
}

/* ===== 按钮 ===== */
.primary,
.secondary {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
}
.primary {
  background: #6366F1;
  color: #fff;
}
.primary:hover {
  background: #4F46E5;
}
.secondary {
  background: #EEF2FF;
  color: #4338CA;
  border: 1px solid #C7D2FE;
}
.secondary:hover {
  background: #E0E7FF;
}

.back {
  justify-self: start;
  padding: 6px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  color: #6366F1;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.back:hover {
  background: #F5F3FF;
}

/* ===== 解释提示 ===== */
.explain-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.explain-trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid #C7D2FE;
  border-radius: 50%;
  color: #6366F1;
  font-size: 12px;
  font-weight: 700;
  cursor: help;
}
.weak-tooltip {
  display: none !important;
  position: absolute;
  z-index: 12;
  left: 26px;
  top: -10px;
  width: 320px;
  padding: 14px;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.15);
  color: #1E293B;
  font-weight: 400;
}
.weak-tooltip b {
  font-weight: 600;
  color: #1E293B;
}
.weak-tooltip p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748B;
  line-height: 1.6;
}
.explain-trigger:hover .weak-tooltip,
.explain-trigger:focus .weak-tooltip {
  display: block !important;
}

/* ================================================================
   响应式
   ================================================================ */
@media (max-width: 1000px) {
  .chapter-grid-v2 {
    grid-template-columns: 1fr 1fr !important;
  }
  .student-list {
    grid-template-columns: 1fr;
  }
  .student-list > button {
    grid-template-columns: 40px 1fr auto auto 60px 18px;
  }
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 22px 20px;
  }
  .overview-cards,
  .source-board {
    grid-template-columns: 1fr 1fr !important;
  }
  .overview-cards.three {
    grid-template-columns: 1fr 1fr !important;
  }
  .split {
    grid-template-columns: 1fr;
  }
  .chapter-grid-v2 {
    grid-template-columns: 1fr !important;
  }
  .student-list > button {
    grid-template-columns: 40px 1fr 60px 18px !important;
  }
  .student-list .source {
    display: none;
  }
  .trend-notes {
    grid-template-columns: 1fr;
  }
  .student-summary {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  .weak-chart-row { grid-template-columns:1fr 52px; gap:8px; }
  .weak-chart-label { grid-column:1 / -1; }
  .weak-tooltip {
    left: auto;
    right: -8px;
    width: min(300px, 80vw);
  }
}

@media (max-width: 540px) {
  .overview-cards,
  .source-board {
    grid-template-columns: 1fr !important;
  }
  .overview-cards.three {
    grid-template-columns: 1fr !important;
  }
  .section {
    padding: 14px 16px;
  }
  .hero h2 {
    font-size: 22px;
  }
  .score-pill b {
    font-size: 22px;
  }
  .chart-container {
    height: 250px;
  }
  .chapter-row {
    grid-template-columns: 70px 1fr 1fr 32px;
    gap: 6px;
    font-size: 12px;
  }
}
.class-browser { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; }
.class-browser-card { min-height:105px; padding:18px; border:1px solid #dbe5f5; background:#f8fbff; text-align:left; display:grid; gap:7px; cursor:pointer; }
.class-browser-card:hover { border-color:#6d75ed; background:#f3f5ff; }
.class-browser-card b { font-size:16px; color:#14213d; }
.class-browser-card span { color:#64748b; }
.class-browser-card em { color:#4f46e5; font-style:normal; }
</style>
