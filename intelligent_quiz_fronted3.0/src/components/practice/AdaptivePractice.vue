<template>
  <div class="adaptive-page">
    <!-- ===== 顶部横幅 ===== -->
    <section v-if="phase === 'setup'" class="setup-shell">
      <div class="hero">
        <div>
          <span class="eyebrow">🎯 个性化训练</span>
          <h2>难度自适应练习</h2>
          <p>系统从 1 级简单题开始，根据你的表现逐步调整难度，精准提升</p>
        </div>
        <div class="hero-level">
          <span class="level-num">1</span>
          <span class="level-label">默认起点<br>简单</span>
        </div>
      </div>

      <!-- ===== 步骤指示器 ===== -->
      <div class="steps">
        <span class="step-item" :class="{ active: true }">1 选择章节</span>
        <span class="step-item" :class="{ active: report }">2 选择方案</span>
        <span class="step-item" :class="{ active: false }">3 开始练习</span>
      </div>

      <!-- ===== 步骤1：选择章节 ===== -->
      <section class="iq-card block">
        <div class="block-title">
          <div>
            <h3>📚 选择章节</h3>
            <p>可多选；点击「选择全部章节」会把 10 个章节全部标为已选择</p>
          </div>
          <button class="highlight-btn" :class="{ selected: allChaptersSelected }" @click="selectAllChapters">
            {{ allChaptersSelected ? '✅ 已选全部' : '☐ 选择全部章节' }}
          </button>
        </div>
        <el-select v-model="form.subject" filterable placeholder="请先选择练习科目" style="width:100%;margin-bottom:14px" @change="loadChapters">
          <el-option v-for="item in subjects" :key="item" :label="item" :value="item" />
        </el-select>

        <div class="chapter-grid">
          <button
              v-for="item in chapterOptions"
              :key="item.chapterNo"
              class="chapter"
              :class="{ active: form.chapters.includes(item.chapterNo) }"
              @click="toggleChapter(item.chapterNo)"
          >
            <b>第{{ item.chapterNo }}章</b><strong>{{ item.title }}</strong>
            <span>{{ form.chapters.includes(item.chapterNo) ? '✅ 已选' : `${item.questionCount}题` }}</span>
          </button>
        </div>

        <button class="iq-btn iq-btn-primary inspect" :disabled="checking" @click="loadPlans">
          {{ checking ? '⏳ 正在分析题库...' : '🔍 查看本章节可行方案' }}
        </button>
      </section>

      <!-- ===== 步骤2：选择方案 ===== -->
      <section v-if="report" class="iq-card block plans-block">
        <div class="block-title">
          <div>
            <h3>📋 推荐练习方案</h3>
            <p>这些方案已按当前章节库存计算，可以直接使用</p>
          </div>
          <button class="highlight-btn outline" @click="openManual">⚙️ 我要手动设置</button>
        </div>

        <div v-if="report.plans?.length" class="plan-grid">
          <button
              v-for="plan in report.plans"
              :key="plan.id"
              class="plan"
              :class="{ active: selectedPlan?.id === plan.id && mode === 'preset' }"
              @click="selectPlan(plan)"
          >
            <span class="plan-tag">✅ 可直接开始</span>
            <h4>{{ plan.name }}</h4>
            <p>{{ plan.description }}</p>
            <div>
              <b>{{ plan.questionCount }}</b> 题 <em>可用 {{ plan.totalAvailable }} 题</em>
            </div>
          </button>
        </div>

        <div v-else class="empty-plan">
          <b>⚠️ 所选章节不足 5 道可自动判分题目</b>
          <p>请增加章节，或选择全部章节后重新查看方案</p>
          <button class="iq-btn iq-btn-primary" @click="selectAllChapters(true)">选择全部章节并重新分析</button>
        </div>

        <!-- ===== 手动设置 ===== -->
        <div v-if="mode === 'manual'" class="manual">
          <div class="manual-head">
            <div>
              <h4>⚙️ 手动设置</h4>
              <p>适合想指定知识点或题型的情况，系统仍会先检查库存</p>
            </div>
            <button class="text-btn" @click="mode = 'preset'">← 返回推荐方案</button>
          </div>

          <div class="manual-grid">
            <label>
              <span>知识点关键词</span>
              <input v-model.trim="form.knowledgeKeyword" class="iq-input" placeholder="输入「循环」匹配「循环结构」等知识点">
            </label>
            <label>
              <span>题目数量</span>
              <input v-model.number="form.questionCount" class="iq-input" type="number" min="5" max="50">
            </label>
          </div>

          <div class="types">
            <b>题型</b>
            <label v-for="t in types" :key="t.value">
              <input v-model="form.questionTypes" type="checkbox" :value="t.value">
              {{ t.label }}
            </label>
          </div>

          <button class="iq-btn iq-btn-secondary" @click="checkManual">检查手动条件</button>
        </div>

        <!-- ===== 手动检查报告 ===== -->
        <div v-if="mode === 'manual' && manualReport" class="report" :class="manualReport.enough ? 'ok' : 'bad'">
          <h4>{{ manualReport.message }}</h4>
          <div class="stock">
            <span v-for="d in manualReport.byDifficulty" :key="d.difficulty">
              {{ d.difficulty }} 级 {{ d.label }} <b>{{ d.total }} 题</b>
            </span>
          </div>
          <p v-if="form.knowledgeKeyword">实际匹配：{{ manualReport.knowledgePoints?.join('、') || '没有匹配知识点' }}</p>
          <div v-if="!manualReport.enough" class="fixes">
            <b>一键调整：</b>
            <button v-for="s in manualReport.suggestions" :key="s.code" @click="apply(s)">{{ s.text }}</button>
          </div>
        </div>

        <!-- ===== 开始栏 ===== -->
        <div class="start-bar">
          <div>
            <b>{{ mode === 'preset' ? (selectedPlan ? selectedPlan.name : '请选择一个方案') : '手动设置' }}</b>
            <span>{{ ready ? '✅ 条件已通过检查，可以开始' : '完成选择并通过库存检查后才能开始' }}</span>
          </div>
          <button class="iq-btn iq-btn-primary" :disabled="!ready || starting" @click="start">
            {{ starting ? '⏳ 正在准备...' : '🚀 开始自适应练习' }}
          </button>
        </div>
      </section>

      <div v-if="errorText" class="error">{{ errorText }}</div>
    </section>

    <!-- ===== 答题阶段 ===== -->
    <section v-else-if="phase === 'question' && question" class="iq-card question-card">
      <!-- 进度条 -->
      <div class="progress-line">
        <span :style="{ width: `${(progress.answered / progress.total) * 100}%` }"></span>
      </div>

      <div class="question-head">
        <div>
          <small>第 {{ progress.answered + 1 }} / {{ progress.total }} 题</small>
          <div class="question-level">
            <h2>{{ question.difficulty }} 级 · {{ question.difficultyLabel }}</h2>
            <span class="difficulty-stars" :aria-label="`${question.difficulty} 星难度`">
              <b v-for="n in 5" :key="n" :class="{ active: n <= Number(question.difficulty) }">★</b>
            </span>
          </div>
        </div>
        <button class="iq-btn iq-btn-ghost" @click="reset">✕ 退出</button>
      </div>

      <div class="meta">
        <span>{{ getChapterLabel(question.chapter) }}</span>
        <span>{{ typeName(question.type) }}</span>
        <span>{{ question.knowledgePoint || '综合知识点' }}</span>
      </div>

      <div v-if="fallback" class="notice">{{ fallback }}</div>

      <h3 class="content">{{ question.content }}</h3>

      <!-- 客观题选项 -->
      <div v-if="options.length" class="options">
        <label v-for="o in options" :key="o.key" :class="{ selected: selected.includes(o.key) }">
          <input :type="question.type === 3 ? 'checkbox' : 'radio'" :value="o.key" v-model="answer">
          {{ o.key }}. {{ o.text }}
        </label>
      </div>

      <!-- 主观题 -->
      <textarea
          v-else-if="Number(question.type) >= 5"
          v-model="textAnswer"
          class="iq-input subjective-input"
          rows="8"
          placeholder="请写出结论、关键步骤和必要说明"
      ></textarea>

      <input v-else v-model="textAnswer" class="iq-input" placeholder="请输入答案">

      <button class="iq-btn iq-btn-primary submit" :disabled="submitting || !!feedback" @click="submit">
        {{ submitting ? '⏳ 正在评阅...' : '📤 提交本题' }}
      </button>

      <!-- ===== AI 答疑 ===== -->
      <div class="ai-tutor">
        <button class="iq-btn iq-btn-ghost iq-btn-sm ai-tutor-btn" @click="tutorOpen = !tutorOpen">
          {{ tutorOpen ? '收起答疑' : '🤖 问 AI' }}
        </button>

        <div v-if="tutorOpen" class="tutor-panel">
          <div class="tutor-history">
            <div v-if="!tutorHistory.length" class="tutor-empty">
              💡 遇到困难？向 AI 老师提问，获取解题思路提示
            </div>
            <div v-for="(msg, idx) in tutorHistory" :key="idx" class="tutor-msg" :class="msg.role">
              <div class="msg-role">{{ msg.role === 'user' ? '🙋 我' : '🤖 AI 老师' }}</div>
              <div class="msg-content">{{ msg.content }}</div>
            </div>
            <div v-if="tutorLoading" class="tutor-loading">AI 思考中...</div>
          </div>

          <div class="tutor-input">
            <input
                v-model="tutorInput"
                class="iq-input"
                placeholder="输入你的问题，如：这道题该从哪个角度思考？"
                :disabled="tutorLoading"
                @keyup.enter="askTutor"
            >
            <button class="iq-btn iq-btn-primary iq-btn-sm" :disabled="tutorLoading || !tutorInput.trim()" @click="askTutor">
              发送
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 反馈 ===== -->
      <div v-if="feedback" class="feedback" :class="feedback.isCorrect ? 'right' : 'wrong'">
        <h3>
          {{ feedback.evaluation?.reviewRequired ? '🔄 本题需要进一步复核' :
            feedback.evaluation?.status === 'partial' ? '💡 核心思路部分正确' :
                feedback.isCorrect ? '✅ 回答正确，继续保持！' : '❌ 这题需要继续巩固' }}
        </h3>
        <p v-if="feedback.evaluation?.reason">{{ feedback.evaluation.reason }}</p>
        <p v-if="feedback.evaluation?.matchedPoints?.length"><b>已覆盖：</b>{{ feedback.evaluation.matchedPoints.join('；') }}</p>
        <p v-if="feedback.evaluation?.missingPoints?.length"><b>还可补充：</b>{{ feedback.evaluation.missingPoints.join('；') }}</p>
        <p v-if="feedback.evaluation?.errors?.length"><b>需要修正：</b>{{ feedback.evaluation.errors.join('；') }}</p>
        <p v-if="!feedback.isCorrect && !feedback.evaluation?.reviewRequired">参考答案：{{ feedback.correctAnswer }}</p>
        <p v-if="feedback.explanation">{{ feedback.explanation }}</p>
        <div class="adjustment">{{ feedback.state.message }}</div>
        <button class="iq-btn iq-btn-primary" @click="next">
          {{ feedback.completed ? '📊 查看结果' : '下一题 →' }}
        </button>
      </div>
    </section>

    <!-- ===== 完成阶段 ===== -->
    <section v-else class="iq-card finish">
      <span class="finish-icon">🎉</span>
      <h2>{{ summary.accuracy }} 分</h2>
      <p>完成 {{ summary.answered }} 题，答对 {{ summary.correct }} 题，最终到达 {{ summary.difficulty }} 级</p>
      <div class="road">难度轨迹：{{ summary.trajectory.join(' → ') || '1' }}</div>
      <button class="iq-btn iq-btn-primary" @click="reset">选择新的练习</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { checkAdaptiveInventory, startAdaptivePractice, submitAdaptiveAnswer } from '@/api/practice';
import { askTutor as askTutorApi } from '@/api/ai';
import { getChapterLabel, getChapterName } from '@/utils/constants';
import { getSubjects, getSubjectChapters } from '@/api/subject';

const props = defineProps({
  initialFilters: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['toast']);

// ===== 状态 =====
const phase = ref('setup');
const mode = ref(Object.keys(props.initialFilters).length ? 'manual' : 'preset');
const checking = ref(false);
const starting = ref(false);
const submitting = ref(false);
const report = ref(null);
const manualReport = ref(null);
const selectedPlan = ref(null);
const errorText = ref('');

const sessionId = ref();
const question = ref();
const feedback = ref();
const fallback = ref('');
const progress = ref({ answered: 0, total: 10 });
const answer = ref('');
const textAnswer = ref('');
const summary = ref({ answered: 0, correct: 0, accuracy: 0, difficulty: 1, trajectory: [] });

// ===== 表单 =====
const form = ref({
  subject: props.initialFilters.subject || '',
  chapters: props.initialFilters.chapters || [],
  knowledgeKeyword: props.initialFilters.knowledgeKeyword || '',
  questionCount: 10,
  questionTypes: [1, 2, 3, 4, 5, 6, 7],
});
const subjects = ref([]), chapterOptions = ref([]);
const loadChapters = async () => { form.value.chapters=[]; chapterOptions.value=form.value.subject ? await getSubjectChapters(form.value.subject) : []; report.value=null; };
onMounted(async()=>{subjects.value=await getSubjects({hasQuestions:1});if(form.value.subject) await loadChapters();});

const types = [
  { value: 1, label: '判断题' },
  { value: 2, label: '单选题' },
  { value: 3, label: '多选题' },
  { value: 4, label: '填空题' },
  { value: 5, label: '简答题' },
  { value: 6, label: '程序论述题' },
];

// ===== 计算属性 =====
const allChaptersSelected = computed(() => chapterOptions.value.length > 0 && form.value.chapters.length === chapterOptions.value.length);

const ready = computed(() => {
  if (mode.value === 'preset') return !!selectedPlan.value;
  return !!manualReport.value?.enough;
});

const options = computed(() => {
  const opt = question.value?.options;
  if (!opt || opt === '[object Object]') return [];
  return String(opt)
      .split(/\s+(?=[A-Z][.、．])/)
      .map((p, i) => {
        const m = p.match(/^([A-Z])[.、．]?\s*(.*)$/);
        return { key: m?.[1] || String.fromCharCode(65 + i), text: m?.[2] || p };
      });
});

const selected = computed(() => {
  if (Array.isArray(answer.value)) return answer.value;
  return answer.value ? [answer.value] : [];
});

// ===== 方法 =====
const invalidate = () => {
  report.value = null;
  manualReport.value = null;
  selectedPlan.value = null;
  errorText.value = '';
};

const toggleChapter = (n) => {
  const i = form.value.chapters.indexOf(n);
  if (i >= 0) form.value.chapters.splice(i, 1);
  else form.value.chapters.push(n);
  invalidate();
};

const selectAllChapters = async (reload = false) => {
  form.value.chapters = chapterOptions.value.map(item=>item.chapterNo);
  invalidate();
  if (reload) await loadPlans();
};

const openManual = () => {
  mode.value = 'manual';
  manualReport.value = null;
  errorText.value = '';
  if (form.value.questionCount < 5) form.value.questionCount = 5;
};

const loadPlans = async () => {
  if (!form.value.subject) { errorText.value='请先选择练习科目'; return; }
  checking.value = true;
  errorText.value = '';
  try {
    report.value = await checkAdaptiveInventory({
      ...form.value,
      knowledgeKeyword: '',
      questionCount: 5,
    });
    selectedPlan.value = report.value.plans?.[0] || null;
    mode.value = 'preset';
  } catch (e) {
    errorText.value = e.message;
  } finally {
    checking.value = false;
  }
};

const selectPlan = (plan) => {
  selectedPlan.value = plan;
  mode.value = 'preset';
};

const checkManual = async () => {
  errorText.value = '';
  manualReport.value = null;
  if (Number(form.value.questionCount) < 5 || Number(form.value.questionCount) > 50) {
    errorText.value = '题目数量请设置为 5～50 题';
    return;
  }
  checking.value = true;
  try {
    manualReport.value = await checkAdaptiveInventory(form.value);
  } catch (e) {
    errorText.value = e.message;
  } finally {
    checking.value = false;
  }
};

const apply = (suggestion) => {
  if (suggestion.code === 'reduce-count') form.value.questionCount = suggestion.value;
  if (suggestion.code === 'remove-keyword') form.value.knowledgeKeyword = '';
  if (suggestion.code === 'all-objective-types') form.value.questionTypes = [1, 2, 3, 4];
  if (suggestion.code === 'all-chapters') form.value.chapters = chapterOptions.value.map(item=>item.chapterNo);
  checkManual();
};

const chosen = () => {
  if (mode.value === 'preset') {
    return {
      subject: form.value.subject,
      chapters: selectedPlan.value.chapters,
      knowledgeKeyword: '',
      questionCount: selectedPlan.value.questionCount,
      questionTypes: selectedPlan.value.questionTypes,
    };
  }
  return { ...form.value };
};

// ===== AI 答疑 =====
const tutorOpen = ref(false);
const tutorInput = ref('');
const tutorHistory = ref([]);
const tutorLoading = ref(false);

const clearTutor = () => {
  tutorOpen.value = false;
  tutorInput.value = '';
  tutorHistory.value = [];
  tutorLoading.value = false;
};

const askTutor = async () => {
  const input = tutorInput.value.trim();
  if (!input || tutorLoading.value || !question.value) return;

  tutorHistory.value.push({ role: 'user', content: input });
  tutorInput.value = '';
  tutorLoading.value = true;

  try {
    const data = await askTutorApi({
      question: question.value.content,
      options: question.value.options || '',
      questionType: Number(question.value.type),
      userQuestion: input,
      userAnswer: getUserAnswer(),
    });
    tutorHistory.value.push({ role: 'ai', content: data.reply || '暂时没有返回答疑内容，请稍后再试。' });
  } catch (e) {
    tutorHistory.value.push({ role: 'ai', content: e.message || '答疑服务暂时不可用，请稍后再试。' });
  } finally {
    tutorLoading.value = false;
  }
};

const getUserAnswer = () => {
  if (question.value.type === 3) {
    return Array.isArray(answer.value) ? answer.value.join('') : answer.value;
  }
  return options.value.length ? answer.value : textAnswer.value;
};

// ===== 开始 =====
const start = async () => {
  starting.value = true;
  try {
    const data = await startAdaptivePractice(chosen());
    sessionId.value = data.sessionId;
    question.value = data.question;
    progress.value = { answered: 0, total: chosen().questionCount };
    fallback.value = data.fallbackMessage;
    answer.value = question.value.type === 3 ? [] : '';
    clearTutor();
    phase.value = 'question';
  } catch (e) {
    errorText.value = e.message;
  } finally {
    starting.value = false;
  }
};

// ===== 提交 =====
const submit = async () => {
  const userAnswer = getUserAnswer();
  if (!userAnswer) {
    emit('toast', { message: '请先填写答案', type: 'warning' });
    return;
  }
  submitting.value = true;
  try {
    feedback.value = await submitAdaptiveAnswer(sessionId.value, {
      questionId: question.value.id,
      userAnswer,
    });
    progress.value = feedback.value.progress;
  } catch (e) {
    emit('toast', { message: e.message, type: 'error' });
  } finally {
    submitting.value = false;
  }
};

// ===== 下一题 =====
const next = () => {
  const correct = summary.value.correct + (feedback.value.isCorrect ? 1 : 0);
  const trail = [...summary.value.trajectory, feedback.value.state.difficulty];

  if (feedback.value.completed) {
    summary.value = {
      answered: feedback.value.progress.answered,
      correct,
      accuracy: Math.round((correct / feedback.value.progress.answered) * 100),
      difficulty: feedback.value.state.difficulty,
      trajectory: trail,
    };
    phase.value = 'finish';
    clearTutor();
    return;
  }

  summary.value.correct = correct;
  summary.value.trajectory = trail;
  question.value = feedback.value.nextQuestion;
  fallback.value = feedback.value.fallbackMessage;
  feedback.value = null;
  answer.value = question.value.type === 3 ? [] : '';
  textAnswer.value = '';
  clearTutor();
};

// ===== 重置 =====
const reset = () => {
  phase.value = 'setup';
  report.value = null;
  manualReport.value = null;
  selectedPlan.value = null;
  feedback.value = null;
  summary.value = { answered: 0, correct: 0, accuracy: 0, difficulty: 1, trajectory: [] };
  clearTutor();
};

const typeName = (t) => ({ 1: '判断题', 2: '单选题', 3: '多选题', 4: '填空题' }[t]);
</script>

<style scoped>
/* ===== 容器 ===== */
.adaptive-page {
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
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
  margin-bottom: 20px;
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
}
.eyebrow {
  font-size: 12px;
  letter-spacing: 2px;
  opacity: 0.8;
}

.hero-level {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}
.hero-level .level-num {
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
}
.hero-level .level-label {
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.9;
}

/* ===== 步骤指示器 ===== */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fff;
  border-radius: 12px;
  padding: 6px;
  border: 1px solid #E2E8F0;
  margin-bottom: 16px;
}
.steps .step-item {
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #94A3B8;
  transition: all 0.2s;
}
.steps .step-item.active {
  color: #4338CA;
  background: #EEF2FF;
}

/* ===== 卡片 ===== */
.iq-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.block {
  padding: 24px 28px;
}
.block-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.block-title h3 {
  margin: 0;
  font-size: 18px;
  color: #1E293B;
}
.block-title p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748B;
}

/* ===== 高亮按钮 ===== */
.highlight-btn {
  padding: 8px 18px;
  border: 1px solid #6366F1;
  background: #6366F1;
  color: #fff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}
.highlight-btn:hover {
  background: #4F46E5;
  border-color: #4F46E5;
}
.highlight-btn.selected {
  background: #4338CA;
  border-color: #4338CA;
}
.highlight-btn.outline {
  background: transparent;
  color: #6366F1;
}
.highlight-btn.outline:hover {
  background: #EEF2FF;
}

/* ===== 章节网格 ===== */
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.chapter {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-height: 90px;
}
.chapter:hover {
  border-color: #A5B4FC;
}
.chapter b {
  font-size: 13px;
  color: #475569;
}
.chapter strong {
  font-size: 13px;
  color: #334155;
  line-height: 1.4;
  font-weight: 500;
}
.chapter span {
  font-size: 12px;
  color: #94A3B8;
}
.chapter.active {
  border-color: #6366F1;
  background: #EEF2FF;
}
.chapter.active b,
.chapter.active strong {
  color: #4338CA;
}
.chapter.active span {
  color: #6366F1;
  font-weight: 500;
}

/* ===== 主按钮 ===== */
.iq-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
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
.iq-btn-primary:hover:not(:disabled) {
  background: #4F46E5;
  border-color: #4F46E5;
}
.iq-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.iq-btn-secondary {
  background: #F1F5F9;
  color: #475569;
  border-color: #E2E8F0;
}
.iq-btn-secondary:hover {
  background: #E2E8F0;
}
.iq-btn-ghost {
  background: transparent;
  color: #64748B;
  border-color: transparent;
}
.iq-btn-ghost:hover {
  background: #F1F5F9;
}
.iq-btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.inspect {
  margin-top: 16px;
}

/* ===== 方案网格 ===== */
.plan-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.plan {
  text-align: left;
  padding: 16px 18px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.plan:hover,
.plan.active {
  border-color: #6366F1;
  background: #F5F3FF;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.1);
}
.plan h4 {
  font-size: 16px;
  margin: 10px 0 4px;
  color: #1E293B;
}
.plan p {
  height: 40px;
  color: #64748B;
  font-size: 13px;
  margin: 0 0 8px;
  overflow: hidden;
}
.plan div b {
  font-size: 22px;
  color: #4338CA;
}
.plan em {
  float: right;
  font-size: 12px;
  color: #15803D;
  font-style: normal;
}
.plan-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  background: #DCFCE7;
  color: #15803D;
  display: inline-block;
}

/* ===== 空方案 ===== */
.empty-plan {
  text-align: center;
  padding: 30px;
  background: #FEF3C7;
  border-radius: 10px;
}
.empty-plan b {
  color: #B45309;
}
.empty-plan p {
  color: #92400E;
  margin: 4px 0 12px;
}

/* ===== 手动设置 ===== */
.manual {
  margin-top: 18px;
  padding: 18px 20px;
  background: #F8FAFC;
  border-radius: 12px;
}
.manual-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.manual-head h4 {
  margin: 0;
  color: #1E293B;
}
.manual-head p {
  margin: 2px 0 0;
  color: #64748B;
  font-size: 13px;
}
.text-btn {
  border: 0;
  background: transparent;
  color: #6366F1;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
}
.text-btn:hover {
  color: #4F46E5;
}

.manual-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}
.manual-grid label {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: #475569;
}

.types {
  display: flex;
  gap: 14px;
  margin: 14px 0;
  flex-wrap: wrap;
  align-items: center;
}
.types b {
  font-size: 13px;
  color: #475569;
}
.types label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
}

/* ===== 报告 ===== */
.report {
  padding: 16px 20px;
  margin-top: 16px;
  border-radius: 10px;
}
.report.ok {
  background: #ECFDF5;
  color: #047857;
}
.report.bad {
  background: #FEF2F2;
  color: #B91C1C;
}
.report h4 {
  margin: 0 0 6px;
}
.stock {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stock span {
  padding: 4px 10px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  font-size: 13px;
}
.stock b {
  color: #1E293B;
}

.fixes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.fixes b {
  font-size: 13px;
  color: #475569;
}
.fixes button {
  padding: 4px 12px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: all 0.2s;
}
.fixes button:hover {
  border-color: #6366F1;
  background: #EEF2FF;
}

/* ===== 开始栏 ===== */
.start-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 14px 20px;
  background: #EEF2FF;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 12px;
}
.start-bar div {
  display: grid;
}
.start-bar b {
  font-size: 15px;
  color: #1E293B;
}
.start-bar span {
  font-size: 12px;
  color: #64748B;
}

/* ===== 错误 ===== */
.error {
  padding: 14px 18px;
  background: #FEF2F2;
  color: #B91C1C;
  border-radius: 10px;
  margin-top: 12px;
}

/* ===== 答题阶段 ===== */
.question-card {
  padding: 28px 32px;
  max-width: 900px;
  margin: 0 auto;
}

.progress-line {
  height: 6px;
  background: #E2E8F0;
  border-radius: 4px;
  overflow: hidden;
}
.progress-line span {
  display: block;
  height: 100%;
  background: #6366F1;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.question-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 16px;
  gap: 12px;
}
.question-head small {
  font-size: 13px;
  color: #94A3B8;
}
.question-head h2 {
  font-size: 20px;
  margin: 4px 0 0;
  color: #1E293B;
}

.question-level {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.difficulty-stars {
  display: inline-flex;
  gap: 2px;
  padding: 3px 10px;
  border-radius: 10px;
  background: #F8FAFC;
}
.difficulty-stars b {
  color: #D7DDE7;
  font-size: 15px;
}
.difficulty-stars b.active {
  color: #EAB308;
}

.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0 10px;
}
.meta span {
  padding: 3px 12px;
  border-radius: 10px;
  background: #EEF2FF;
  color: #4338CA;
  font-size: 13px;
}

.notice {
  padding: 12px 16px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 8px;
  margin: 10px 0;
  font-size: 14px;
}

.content {
  font-size: 16px;
  line-height: 1.8;
  margin: 20px 0 18px;
  color: #1E293B;
}

.options {
  display: grid;
  gap: 10px;
}
.options label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #475569;
}
.options label:hover {
  border-color: #A5B4FC;
}
.options label.selected {
  background: #EEF2FF;
  border-color: #6366F1;
}
.options input {
  accent-color: #6366F1;
}

.subjective-input {
  min-height: 150px;
  resize: vertical;
  line-height: 1.7;
  font-family: inherit;
  padding: 12px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  width: 100%;
  font-size: 14px;
}
.subjective-input:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.iq-input {
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  width: 100%;
}
.iq-input:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.submit {
  margin-top: 18px;
}

/* ===== AI 答疑 ===== */
.ai-tutor {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed #E2E8F0;
}
.ai-tutor-btn {
  border: 1px solid #C7D2FE;
  background: #EEF2FF;
  color: #4338CA;
}
.ai-tutor-btn:hover {
  background: #E0E7FF;
}

.tutor-panel {
  margin-top: 10px;
  padding: 14px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #F8FAFC;
}
.tutor-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.tutor-empty {
  text-align: center;
  color: #64748B;
  font-size: 13px;
  padding: 14px;
}
.tutor-loading {
  text-align: center;
  color: #64748B;
  font-size: 13px;
  padding: 8px;
}

.tutor-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.msg-role {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 600;
}
.msg-content {
  padding: 10px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}
.tutor-msg.user .msg-content {
  margin-left: 20px;
  background: #EEF2FF;
  border-color: #C7D2FE;
}
.tutor-msg.ai .msg-content {
  margin-right: 20px;
}

.tutor-input {
  display: flex;
  gap: 8px;
}
.tutor-input .iq-input {
  flex: 1;
}

/* ===== 反馈 ===== */
.feedback {
  padding: 18px 22px;
  margin-top: 18px;
  border-radius: 10px;
}
.feedback.right {
  background: #ECFDF5;
  color: #047857;
}
.feedback.wrong {
  background: #FEF2F2;
  color: #B91C1C;
}
.feedback h3 {
  margin: 0 0 6px;
  font-size: 16px;
}
.feedback p {
  margin: 4px 0;
  font-size: 14px;
}
.feedback .adjustment {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  margin: 8px 0 12px;
  font-size: 13px;
}

/* ===== 完成 ===== */
.finish {
  max-width: 700px;
  padding: 50px 40px;
  text-align: center;
  margin: 0 auto;
}
.finish-icon {
  font-size: 56px;
}
.finish h2 {
  font-size: 56px;
  font-weight: 800;
  color: #6366F1;
  margin: 8px 0 4px;
}
.finish p {
  font-size: 16px;
  color: #64748B;
}
.road {
  margin: 20px 0 28px;
  padding: 14px 20px;
  background: #F8FAFC;
  border-radius: 10px;
  font-size: 14px;
  color: #475569;
}

/* ===== 响应式 ===== */
@media (max-width: 850px) {
  .chapter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .plan-grid {
    grid-template-columns: 1fr 1fr;
  }
  .manual-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  .hero-level {
    margin-top: 12px;
  }
  .block {
    padding: 16px;
  }
  .chapter-grid {
    grid-template-columns: 1fr 1fr;
  }
  .plan-grid {
    grid-template-columns: 1fr;
  }
  .question-card {
    padding: 16px;
  }
  .question-head {
    flex-direction: column;
  }
  .tutor-input {
    flex-direction: column;
  }
  .start-bar {
    flex-direction: column;
    text-align: center;
  }
  .finish {
    padding: 30px 20px;
  }
  .finish h2 {
    font-size: 40px;
  }
}
</style>
