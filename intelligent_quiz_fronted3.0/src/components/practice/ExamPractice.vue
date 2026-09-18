<template>
  <div class="exam-practice-page">
    <!-- ===== 顶部横幅（答题中） ===== -->
    <!-- `phase === 'error'` 时横幅整体不渲染：它的「✕ 退出」会把人从错误态带出去，
         而错误态的出口是下面卡片里那个**带明确语义**的「返回」。 -->
    <div v-if="phase === 'exam'" class="exam-header-banner">
      <div class="banner-left">
        <div class="banner-icon">📝</div>
        <div>
          <h2>{{ exam.title || '试卷' }}</h2>
          <div class="banner-meta">
            <span>共 {{ exam.questions?.length || 0 }} 题</span>
            <span class="dot">·</span>
            <span>客观题 {{ objectiveCount }} 题</span>
            <span class="dot">·</span>
            <span>已答 <strong class="answered-highlight">{{ answeredCount }}</strong> / {{ exam.questions?.length || 0 }} 题</span>
            <span class="dot">·</span>
            <span>⏱ {{ remainingSeconds !== null ? `剩余 ${formatRemaining(remainingSeconds)}` : elapsedText }}</span>
            <span v-if="draftSaved" class="draft-badge">💾 草稿已存</span>
          </div>
        </div>
      </div>
      <div class="banner-right">
        <button class="btn-exit" @click="handleExit">
          ✕ 退出
        </button>
      </div>
    </div>

    <!--
      ===== 明确结果（非法地址 / 404 / 403 / 可见但不可作答 / 其它失败）=====
      这四类以前一律走「toast + 立刻 emit('exit')」—— 用户看到的只是被弹回上一页，
      既不知道发生了什么，深链进来时更是**当场被送回**而不知道原因。
      现在每一类都在正文里给出**自己的标题与说明**，并且都有明确出口（重试 / 返回）。
      样式复用结果卡的类，不新增任何 CSS。
    -->
    <!-- 注意用 `v-if` 而不是 `v-else-if`：横幅那支是独立的 `v-if`，
         而 loading / 答题 / 结果三支是**另一条** v-if/v-else-if 链（见下）。
         把错误分支接进任何一条链都会把该链后面的正文整支吃掉。 -->
    <div v-if="phase === 'error'" class="result-phase">
      <div class="result-card">
        <div class="result-emoji">{{ errorState.emoji }}</div>
        <h2>{{ errorState.title }}</h2>
        <p class="result-sub">{{ errorState.message }}</p>
        <div class="result-actions">
          <button v-if="errorState.canRetry" class="btn-primary" @click="loadExam">重试</button>
          <button :class="errorState.canRetry ? 'btn-secondary' : 'btn-primary'" @click="handleExit">
            返回
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 加载中 ===== -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>试卷加载中...</p>
    </div>

    <!-- ===== 答题阶段 ===== -->
    <div v-else-if="phase === 'exam'" class="exam-body">
      <!-- 答题卡（题目数 > 4 时显示） -->
      <div v-if="exam.questions?.length > 4" class="answer-card-panel">
        <div class="answer-card-head">
          <span class="card-title">📋 答题卡</span>
          <span class="card-hint">已答 {{ answeredCount }} / {{ exam.questions?.length || 0 }}，点击编号跳转</span>
        </div>
        <div class="answer-card-grid">
          <button
              v-for="(q, idx) in exam.questions"
              :key="qid(q)"
              type="button"
              class="answer-cell"
              :class="{
              answered: isAnswered(q),
              active: activeQuestionId === qid(q)
            }"
              @click="scrollToQuestion(qid(q))"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </div>

      <!-- 题目列表 -->
      <div class="question-list">
        <div
            v-for="(q, idx) in exam.questions"
            :key="qid(q)"
            :id="`question-${qid(q)}`"
            class="question-card"
        >
          <div class="q-header">
            <div class="q-header-left">
              <span class="q-number">第 {{ idx + 1 }} 题</span>
              <span class="q-type-tag" :class="`type-${q.题型}`">
                {{ getTypeName(q.题型) }}
              </span>
              <span class="q-difficulty-tag" :class="getDifficultyClass(q.难度)">
                {{ getDifficultyLabel(q.难度) }}
              </span>
              <span v-if="!isObjective(q.题型)" class="q-manual-tag">📝 人工批阅</span>
            </div>
            <div class="q-header-right">
              <button
                  type="button"
                  class="btn-favorite"
                  :class="{ active: favoriteSet.has(qid(q)) }"
                  :disabled="favoriteLoading[qid(q)]"
                  @click="toggleFavorite(q)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                {{ favoriteSet.has(qid(q)) ? '已收藏' : '收藏' }}
              </button>
            </div>
          </div>

          <div class="q-title">{{ unescapeStem(q.题目) }}</div>

          <!-- 选项区域 -->
          <div v-if="[2, 3].includes(Number(q.题型)) && q.选项" class="q-options">
            <label
                v-for="opt in parseOptions(q.选项)"
                :key="opt.key"
                class="option-choice"
                :class="{
                selected: Number(q.题型) === 3
                  ? (multiAnswers[qid(q)] || []).includes(opt.key)
                  : answers[qid(q)] === opt.key
              }"
            >
              <input
                  v-if="Number(q.题型) === 2"
                  type="radio"
                  :name="`q-${qid(q)}`"
                  :value="opt.key"
                  v-model="answers[qid(q)]"
              />
              <input
                  v-else
                  type="checkbox"
                  :value="opt.key"
                  v-model="multiAnswers[qid(q)]"
                  @change="syncMulti(qid(q))"
              />
              <span class="option-text"><strong>{{ opt.key }}.</strong> {{ opt.text }}</span>
            </label>
          </div>

          <!-- 答题输入区 -->
          <div class="q-answer-area">
            <label class="q-answer-label">✏️ 你的答案：</label>

            <!-- 判断题 -->
            <div v-if="Number(q.题型) === 1" class="judge-group">
              <label class="judge-btn" :class="{ active: answers[qid(q)] === 'T' }">
                <input type="radio" :name="`q-${qid(q)}`" value="T" v-model="answers[qid(q)]" />
                ✅ 对
              </label>
              <label class="judge-btn" :class="{ active: answers[qid(q)] === 'F' }">
                <input type="radio" :name="`q-${qid(q)}`" value="F" v-model="answers[qid(q)]" />
                ❌ 错
              </label>
            </div>

            <!-- 单选题/多选题提示 -->
            <div v-else-if="Number(q.题型) === 2" class="choice-hint">
              👆 请直接点击上方选项
            </div>
            <div v-else-if="Number(q.题型) === 3" class="choice-hint">
              👆 请直接点击上方选项（可多选）
            </div>

            <!-- 填空题 -->
            <input
                v-else-if="Number(q.题型) === 4"
                v-model="answers[qid(q)]"
                class="input-field"
                placeholder="请输入答案..."
            />

            <!-- 简答/程序题 -->
            <textarea
                v-else
                v-model="answers[qid(q)]"
                class="textarea-field"
                placeholder="请输入你的解答..."
                rows="4"
            ></textarea>
          </div>

          <!-- AI 答疑 -->
          <div class="ai-tutor">
            <button v-if="!examMode" class="btn-ai-tutor" @click="toggleTutor(qid(q))">
              🤖 {{ tutorOpen[qid(q)] ? '收起答疑' : '问 AI 老师' }}
            </button>
            <div v-if="!examMode && tutorOpen[qid(q)]" class="tutor-panel">
              <div class="tutor-history">
                <div v-if="!tutorHistory[qid(q)]?.length" class="tutor-empty">
                  💡 遇到困难？向 AI 老师提问，获取解题思路提示。
                </div>
                <div v-for="(msg, mi) in tutorHistory[qid(q)] || []" :key="mi" class="tutor-msg" :class="msg.role">
                  <div class="msg-role">{{ msg.role === 'user' ? '🙋 我' : '🤖 AI 老师' }}</div>
                  <div class="msg-content">{{ msg.content }}</div>
                </div>
                <div v-if="tutorLoading[qid(q)]" class="tutor-loading">
                  <span class="mini-spinner"></span> AI 思考中...
                </div>
              </div>
              <div class="tutor-input">
                <input
                    v-model="tutorInput[qid(q)]"
                    class="input-field"
                    placeholder="输入你的问题..."
                    @keyup.enter="askTutor(q)"
                    :disabled="tutorLoading[qid(q)]"
                />
                <button
                    class="btn-send"
                    :disabled="tutorLoading[qid(q)] || !tutorInput[qid(q)]?.trim()"
                    @click="askTutor(q)"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 底部提交栏 ===== -->
      <div class="submit-bar">
        <div class="submit-info">
          已答 <strong class="answered-highlight">{{ answeredCount }}</strong>
          <span class="text-muted">/ {{ exam.questions?.length || 0 }} 题</span>
          <span v-if="answeredCount < (exam.questions?.length || 0)" class="warn-tag">
            ⚠️ 还有 {{ (exam.questions?.length || 0) - answeredCount }} 题未作答
          </span>
        </div>
        <button class="btn-submit" :disabled="submitting" @click="handleSubmit">
          <span v-if="submitting" class="btn-spinner"></span>
          {{ submitting ? '提交中...' : '📤 提交试卷' }}
        </button>
      </div>
    </div>

    <!-- ===== 结果阶段 ===== -->
    <div v-else-if="phase === 'result'" class="result-phase">
      <div class="result-card">
        <div class="result-emoji">🎉</div>
        <h2>答题完成！</h2>
        <p class="result-sub">系统已自动完成客观题评分</p>

        <div class="score-display" :class="scoreClass(result.score)">
          <span class="score-number">{{ result.score }}</span>
          <span class="score-unit">分</span>
        </div>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">准确率</span>
            <span class="value">{{ result.accuracy }}%</span>
          </div>
          <div class="result-item">
            <span class="label">总题数</span>
            <span class="value">{{ result.totalCount }}</span>
          </div>
          <div class="result-item result-good">
            <span class="label">✅ 正确</span>
            <span class="value">{{ result.correctCount }}</span>
          </div>
          <div class="result-item result-bad">
            <span class="label">❌ 错误</span>
            <span class="value">{{ result.wrongCount }}</span>
          </div>
          <div class="result-item result-skip">
            <span class="label">⏭ 未答</span>
            <span class="value">{{ result.skippedCount }}</span>
          </div>
          <div class="result-item">
            <span class="label">⏱ 用时</span>
            <span class="value">{{ formatDuration(result.durationSeconds) }}</span>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-primary" @click="$emit('view-record', result.recordId)">
            📋 查看详情
          </button>
          <button class="btn-secondary" @click="$emit('exit')">
            返回列表
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { getExam, submitExam, startExamApi, getExamDraftApi, saveExamDraftApi } from '@/api/practice';
import { getFavorites, addFavorite, removeFavorite } from '@/api/student';
import { askTutor as askTutorApi } from '@/api/ai';
import { getTypeName, getDifficultyLabel } from '@/utils/constants';

const props = defineProps({
  examId: { type: [Number, String], required: true },
});

// `update-exam-id` 在 R2B 去掉了：AI 助手需要的 exam 上下文现在由**路由派生**
// （`App.vue` 的 `currentExamId` computed 读 `#/exam/:examId`），不再由本组件上报。
// 留着它会出现「两个写入方」——R2A 就是被同一份导航状态的第二个写入方坑过一次。
const emit = defineEmits(['exit', 'view-record', 'update-question-id', 'update-question', 'toast']);

const OBJECTIVE_TYPES = [1, 2, 3, 4];

/**
 * **本次实例负责的试卷身份**：进入时固定，之后永不改变。
 *
 * 草稿的读写键、服务端草稿保存、开始作答、提交、AI 答疑全部以它为准。
 * 好处是「A 的草稿只可能写回 A」成为**结构性**保证，而不是依赖调用时机正确 ——
 * 即使将来有人把这个组件塞进一个不换 key 的父容器、把 `props.examId` 改成 B，
 * 这个实例也仍然只会操作 A（B 由新实例接管）。
 */
const examId = String(props.examId);

// ===== 状态 =====
const loading = ref(true);
const submitting = ref(false);
const phase = ref('exam');
const examMode = ref(false);
const exam = ref({ questions: [] });
const answers = reactive({});
const multiAnswers = reactive({});
const result = ref(null);
const favoriteSet = ref(new Set());
const favoriteLoading = reactive({});
const draftSaved = ref(false);
const activeQuestionId = ref(null);
const startedAt = ref(null);
const elapsedSeconds = ref(0);
const remainingSeconds = ref(null);
const expired = ref(false);
/**
 * 明确的失败结果。`null` = 没有错误。
 * `{ kind, emoji, title, message, canRetry }`，`kind` 取值：
 *   `invalid` 地址里的 id 不是正整数（**不发请求**）
 *   `not-found` 404 试卷不存在
 *   `forbidden` 403 无权查看（含未发布/已关闭）
 *   `not-answerable` 卷可见、`/start` 被服务端拒（已截止 / 未开始 / 次数用尽）
 *   `error` 其它（网络、5xx）
 * 分桶依据是**实测的真实响应**（见 R2B 报告 §探针），不是猜的。
 */
const errorState = ref(null);

let timer = null;
let draftTimer = null;

/**
 * 失效保护（两道，**不能靠父组件的 `:key` 重建替代**）：
 * - `disposed`：本实例已卸载 → 任何在飞的回包都不得再写状态、不得再创建计时器/定时器；
 * - `loadToken`：每次加载自增，回包落地前比对；旧加载（A）不得覆盖新加载（B）。
 * 两者都在 `onUnmounted` 里立即生效，所以「卸载后重新创建计时器」在结构上不可能发生。
 */
let disposed = false;
let loadToken = 0;

// ===== AI 答疑 =====
const tutorOpen = reactive({});
const tutorInput = reactive({});
const tutorHistory = reactive({});
const tutorLoading = reactive({});

// ===== 计算属性 =====
const objectiveCount = computed(() =>
    exam.value.questions?.filter((q) => isObjective(q.题型)).length || 0
);

const answeredCount = computed(() =>
    exam.value.questions?.filter((q) => isAnswered(q)).length || 0
);

const elapsedText = computed(() => formatDuration(elapsedSeconds.value));

const formatRemaining = (sec) => {
  const m = Math.floor(Number(sec) / 60);
  const s = Math.floor(Number(sec) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ===== 方法 =====
function qid(q) {
  // 统一用字符串 key，避免 number/string/NaN 混用导致的串值/找不到
  return String(q.id ?? q.question_id ?? q.questionId ?? '');
}

function unescapeStem(s) {
  if (s === null || s === undefined) return '';
  let t = String(s);
  // 反义：数据库里可能多转义一层，导致页面出现 \" 或 \\"
  t = t.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  return t;
}

function isObjective(type) {
  return OBJECTIVE_TYPES.includes(Number(type));
}

function isAnswered(q) {
  const k = qid(q);
  if (Number(q.题型) === 3) {
    return (multiAnswers[k] || []).length > 0;
  }
  const value = answers[k];
  return value !== undefined && value !== '' && value !== null;
}

function parseOptions(raw) {
  if (raw === null || raw === undefined) return [];
  // 1. 对象数组形式: [{ key:'A', text:'xxx' }] 或 { A:'xxx', B:'yyy' }
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((o, i) => {
        if (o && typeof o === 'object') {
          const k = String(o.key ?? o.opt ?? o.option ?? o.label ?? '').trim() || String.fromCharCode(65 + i);
          const t = String(o.text ?? o.value ?? o.content ?? o.answer ?? '').trim();
          return { key: k.toUpperCase().slice(0, 1) || String.fromCharCode(65 + i), text: stripOptionKey(t) };
        }
        const t = String(o).trim();
        return { key: String.fromCharCode(65 + i), text: stripOptionKey(t) };
      })
      .filter((o) => o.text);
  }
  if (raw && typeof raw === 'object') {
    const keys = Object.keys(raw);
    if (keys.length) {
      return keys
        .filter((k) => /^[A-Fa-f0-9]/.test(k))
        .map((k, idx) => {
          const letter = /^[A-Fa-f]/.test(k) ? k[0].toUpperCase() : String.fromCharCode(65 + idx);
          return { key: letter, text: stripOptionKey(String(raw[k] || '').trim()) };
        })
        .filter((o) => o.text);
    }
  }
  // 2. 字符串形式
  const str = String(raw).trim();
  if (!str) return [];
  const lines = str.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.map((line, i) => {
      const m = line.match(/^([A-Fa-f])\s*[.、)）:：\-]?\s*(.*)$/);
      if (m) return { key: m[1].toUpperCase(), text: stripOptionKey(m[2].trim()) };
      return { key: String.fromCharCode(65 + i), text: stripOptionKey(line) };
    }).filter((o) => o.text);
  }
  // 单行: A.xx B.yy 或 A)xx B)yy
  const regex = /([A-Fa-f])\s*[.、)）:：\-]?\s*([^A-F].*?)(?=\s*[A-Fa-f]\s*[.、)）:：\-]|$)/g;
  const matches = [];
  let mm;
  while ((mm = regex.exec(str)) !== null) {
    matches.push({ key: mm[1].toUpperCase(), text: stripOptionKey(mm[2].trim()) });
  }
  if (matches.length > 1) return matches;
  // 兜底：用标点/空格分隔并分配字母
  const parts = str.split(/\s*[，,;；|｜]\s*/).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((p, i) => ({ key: String.fromCharCode(65 + i), text: stripOptionKey(p.trim()) })).filter((o) => o.text);
  }
  return [{ key: 'A', text: stripOptionKey(str) }];
}

function stripOptionKey(t) {
  // 去掉文本前缀多余的 "A. / A) / A、" 等，防止显示为 "A. A. xxx"
  return String(t || '').replace(/^[A-Fa-f]\s*[.、)）:：\-]\s*/, '').trim();
}

function syncMulti(rawQid) {
  const k = String(rawQid);
  // 防御：若 multiAnswers[k] 被意外写成字符串/对象，先转成数组，避免 "arr is not iterable"
  let raw = multiAnswers[k];
  let arr;
  if (Array.isArray(raw)) {
    arr = raw.filter((v) => typeof v === 'string');
  } else if (raw === null || raw === undefined) {
    arr = [];
  } else if (typeof raw === 'string') {
    arr = raw.split('').filter((c) => /^[A-Fa-f]$/.test(c)).map((c) => c.toUpperCase());
  } else {
    arr = [];
  }
  multiAnswers[k] = arr;
  answers[k] = [...arr].sort().join('');
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDifficultyClass(level) {
  const map = { 1: 'diff-easy', 2: 'diff-easy', 3: 'diff-medium', 4: 'diff-hard', 5: 'diff-hard' };
  return map[Number(level)] || 'diff-easy';
}

function scoreClass(score) {
  if (score >= 90) return 'score-excellent';
  if (score >= 60) return 'score-pass';
  return 'score-fail';
}

function scrollToQuestion(qidRaw) {
  const k = String(qidRaw);
  activeQuestionId.value = k;
  emit('update-question-id', k);
  const el = document.getElementById(`question-${k}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 计时器 =====
/** 停表。幂等：重复调用不会留下第二个 interval。 */
const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

/** 起表。**先停再起** —— 同一实例里重复加载（例如错误态点「重试」）不会叠出两个计时器。 */
const startTimer = () => {
  stopTimer();
  timer = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startedAt.value.getTime()) / 1000);
    if (remainingSeconds.value !== null) {
      remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
      if (remainingSeconds.value <= 0) expired.value = true;
    }
  }, 1000);
};

/** 清掉那次 400ms 防抖的草稿保存。提交成功时必须调，否则它会把已清除的草稿**写回来**。 */
const clearDraftTimer = () => {
  if (draftTimer) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
};

// ===== 草稿 =====
const draftKey = () => `iq_exam_draft_${examId}`;

const saveDraft = () => {
  /**
   * 只在**答题中**写草稿。这一条同时挡掉两种「写完又活过来」：
   *   1. 提交成功后 phase 已是 'result'，此时任何一次迟到的防抖定时器、或卸载时的收尾保存
   *      都不该再落盘 —— 服务端已收卷，本地草稿必须保持清除状态；
   *   2. 错误 / 加载失败时没有题目，本来也无需保存。
   */
  if (phase.value !== 'exam') return;
  if (!exam.value.questions?.length || answeredCount.value === 0) return;
  const payload = {
    answers: { ...answers },
    multiAnswers: Object.fromEntries(Object.entries(multiAnswers).map(([k, v]) => [k, [...v]])),
    startedAt: startedAt.value ? startedAt.value.toISOString() : null,
    elapsedSeconds: elapsedSeconds.value,
    savedAt: Date.now(),
  };
  localStorage.setItem(draftKey(), JSON.stringify(payload));
  saveExamDraftApi(examId, {
    answers: { ...answers },
    durationSeconds: Math.floor(elapsedSeconds.value),
  }).catch(() => { /* 服务端草稿保存失败不影响本地答题 */ });
  draftSaved.value = true;
};

const normalizeQuestionKey = (raw) => String(raw ?? '');

const restoreDraft = (loadedExam, serverDraft = null, serverStartedAt = null) => {
  let draft = null;
  if (serverDraft?.answers && Object.keys(serverDraft.answers).length) {
    draft = { answers: serverDraft.answers, elapsedSeconds: serverDraft.duration_seconds ?? serverDraft.durationSeconds };
  } else {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return false;
    try {
      draft = JSON.parse(raw);
    } catch {
      return false;
    }
  }
  try {
    if (!draft?.answers) return false;
    // 先把草稿 answers / multiAnswers 的 key 做一次归一化（兼容 number 与 string 两种 key）
    const normAnswers = Object.fromEntries(
      Object.entries(draft.answers).map(([k, v]) => [normalizeQuestionKey(k), v])
    );
    const normMulti = draft.multiAnswers
      ? Object.fromEntries(Object.entries(draft.multiAnswers).map(([k, v]) => [normalizeQuestionKey(k), Array.isArray(v) ? v : []]))
      : {};
    let restoredAny = false;
    loadedExam.questions.forEach((q) => {
      const k = qid(q);
      if (Number(q.题型) === 3) {
        const restored = normMulti[k] || [];
        multiAnswers[k] = restored;
        if (restored.length) {
          answers[k] = [...restored].sort().join('');
          restoredAny = true;
        } else if (normAnswers[k]) {
          // 后端 draft 可能只存 answers 字符串（例如 "AC"），拆回 multiAnswers
          const chars = String(normAnswers[k]).split('').filter((c) => /^[A-Fa-f]$/.test(c));
          multiAnswers[k] = chars.map((c) => c.toUpperCase());
          answers[k] = chars.sort().join('');
          restoredAny = restoredAny || chars.length > 0;
        }
      } else if (normAnswers[k] !== undefined) {
        answers[k] = normAnswers[k];
        if (answers[k] !== '' && answers[k] !== null && answers[k] !== undefined) restoredAny = true;
      }
    });
    /**
     * 草稿里的 `startedAt` **只在服务端没给的时候**采用。
     *
     * 时限以服务端 attempt 为准（`/start` 返回的 `startedAt` + `remainingSeconds`），
     * 而草稿是本地的、可能来自更早的一次作答。让本地值覆盖服务端值，会让「用时」显示错，
     * 并且提交时把这个偏掉的时间回传给后端 —— 刷新后「时间不重置」就无从谈起。
     * `loadExam` 里服务端的值是先写的，这里判断一下就不会被覆盖。
     */
    if (draft.startedAt && !serverStartedAt) {
      const start = new Date(draft.startedAt);
      if (!isNaN(start.getTime())) startedAt.value = start;
    }
    if (draft.elapsedSeconds !== undefined || draft.duration_seconds !== undefined) {
      elapsedSeconds.value = Math.max(0, Number(draft.elapsedSeconds ?? draft.duration_seconds) || 0);
    }
    return restoredAny;
  } catch {
    return false;
  }
};

// ===== 收藏 =====
/**
 * `isStale` 由 `loadExam` 传入（同一份 `loadToken` 判定）：收藏列表要翻多页，
 * 是这里**最慢**的请求 —— 不加这道判定，A 的收藏会在切到 B 之后覆盖 B 的高亮状态。
 */
const loadFavorites = async (isStale = () => false) => {
  try {
    const ids = new Set();
    let page = 1;
    let guard = 0;
    while (guard++ < 20) {
      const data = await getFavorites({ page, size: 100 });
      if (isStale()) return;
      // 兼容后端返回的多种字段名
      const rows = Array.isArray(data) ? data : (data?.list || data?.rows || data?.items || []);
      rows.forEach((f) => {
        const v = f.questionId ?? f.question_id ?? f.id;
        if (v !== undefined && v !== null) ids.add(String(v));
      });
      const total = Number(data?.total ?? data?.totalCount ?? rows.length);
      if (rows.length === 0 || ids.size >= total) break;
      page += 1;
    }
    if (isStale()) return;
    favoriteSet.value = ids;
  } catch (e) {
    // ignore
  }
};

const toggleFavorite = async (q) => {
  const qidStr = qid(q);
  if (!qidStr || qidStr === 'undefined' || qidStr === 'NaN') {
    emit('toast', { message: '题目ID异常，无法收藏', type: 'error' });
    return;
  }
  if (favoriteLoading[qidStr]) return;
  favoriteLoading[qidStr] = true;
  try {
    if (favoriteSet.value.has(qidStr)) {
      await removeFavorite(qidStr);
      if (disposed) return; // 已离开答题页：不再回填高亮、不再提示
      const next = new Set(favoriteSet.value);
      next.delete(qidStr);
      favoriteSet.value = next;
      emit('toast', { message: '已取消收藏', type: 'success' });
    } else {
      await addFavorite(qidStr);
      if (disposed) return;
      const next = new Set(favoriteSet.value);
      next.add(qidStr);
      favoriteSet.value = next;
      emit('toast', { message: '已收藏', type: 'success' });
    }
  } catch (err) {
    if (disposed) return;
    emit('toast', { message: err.message || '收藏操作失败', type: 'error' });
  } finally {
    favoriteLoading[qidStr] = false;
  }
};

// ===== AI 答疑 =====
const toggleTutor = (rawQid) => {
  const k = String(rawQid);
  tutorOpen[k] = !tutorOpen[k];
  if (!tutorHistory[k]) tutorHistory[k] = [];
};

const askTutor = async (q) => {
  const k = qid(q);
  const inputText = (tutorInput[k] || '').trim();
  if (!inputText || tutorLoading[k]) return;

  tutorHistory[k].push({ role: 'user', content: inputText });
  tutorInput[k] = '';
  tutorLoading[k] = true;

  try {
    const data = await askTutorApi({
      question: q.题目,
      options: q.选项 || '',
      questionType: Number(q.题型),
      userQuestion: inputText,
      userAnswer: answers[k] || '',
      examId,
    });
    if (disposed) return;
    tutorHistory[k].push({ role: 'ai', content: data.reply || '（AI 未返回内容）' });
  } catch (err) {
    if (disposed) return;
    tutorHistory[k].push({ role: 'ai', content: `❌ ${err.message || 'AI 调用失败'}` });
  } finally {
    tutorLoading[k] = false;
  }
};

// ===== 加载试卷 =====
/** 合法的试卷编号：正整数。`abc` / `0` / `-1` / `1.5` 一律**不发请求**（后端对它们都回 404，分不出「写错了」）。 */
const isValidExamId = (v) => /^\d+$/.test(String(v)) && Number(v) > 0;

/**
 * 把真实响应分桶。依据是**实测**（`GET /exams/99999`→404/40401、`GET /exams/6`→403/40301、
 * `POST /exams/18/start`→403/40301「考试已截止」）。
 *
 * 关键点：**403 有两种，靠「哪个阶段失败」区分**，不能靠状态码 ——
 *   · 加载阶段 403 = 无权查看（未发布 / 不在课程范围）；
 *   · 开始作答阶段 403 = 卷子看得见但当前不可作答（已截止 / 未开始 / 次数用尽）。
 * 服务端给的中文 message 一律**原样展示**，不做二次加工，避免前端改写服务端口径。
 */
const bucketError = (err, stage) => {
  const status = err?.status;
  const message = err?.message || '加载试卷失败';
  if (status === 404) {
    return { kind: 'not-found', emoji: '🔍', title: '试卷不存在', message, canRetry: false };
  }
  if (status === 403 && stage === 'start') {
    return { kind: 'not-answerable', emoji: '⛔', title: '当前无法作答这份试卷', message, canRetry: false };
  }
  if (status === 403) {
    return { kind: 'forbidden', emoji: '🔒', title: '无法查看这份试卷', message, canRetry: false };
  }
  return { kind: 'error', emoji: '⚠️', title: '试卷加载失败', message, canRetry: true };
};

const loadExam = async () => {
  const token = ++loadToken;
  /** 本次加载是否已作废：实例已卸载，或又发起了新一次加载。 */
  const isStale = () => disposed || token !== loadToken;

  loading.value = true;
  errorState.value = null;
  phase.value = 'exam';

  if (!isValidExamId(examId)) {
    errorState.value = {
      kind: 'invalid',
      emoji: '🚫',
      title: '试卷地址无效',
      message: `「${examId}」不是合法的试卷编号，请从试卷列表重新进入。`,
      canRetry: false,
    };
    phase.value = 'error';
    loading.value = false;
    return;
  }

  try {
    const data = await getExam(examId);
    if (isStale()) return;
    exam.value = data;
    examMode.value = Boolean(data.duration_minutes || data.end_at || data.max_attempts || data.status === 'draft' || data.status === 'closed');

    /**
     * 开始/继续作答。刷新时这一步**没有业务副作用**（已实测：同一份未提交的作答，
     * 重复调用返回同一个 `attemptNo` 与 `startedAt`，不新增次数、不重置时限）——
     * 所以「刷新仍停留同一试卷、时间不重置」不需要任何额外补偿逻辑。
     * 服务端的拒绝（已截止 / 未开始 / 次数用尽）在这一步发生，归入 `not-answerable`。
     */
    let started = null;
    try {
      started = await startExamApi(examId);
    } catch (err) {
      if (isStale()) return;
      errorState.value = bucketError(err, 'start');
      phase.value = 'error';
      return;
    }
    if (isStale()) return;

    let serverStartedAt = null;
    if (started?.startedAt) {
      const serverStart = new Date(started.startedAt);
      if (!isNaN(serverStart.getTime())) {
        serverStartedAt = serverStart;
        startedAt.value = serverStart;
      }
    }
    remainingSeconds.value = started?.remainingSeconds ?? null;
    expired.value = remainingSeconds.value === 0;

    let serverDraft = null;
    try {
      serverDraft = await getExamDraftApi(examId);
    } catch { /* 无服务端草稿 */ }
    if (isStale()) return;

    // 先清空旧状态（防止组件复用）
    Object.keys(answers).forEach((k) => delete answers[k]);
    Object.keys(multiAnswers).forEach((k) => delete multiAnswers[k]);
    data.questions.forEach((q) => {
      const k = qid(q);
      if (Number(q.题型) === 3) {
        multiAnswers[k] = [];
      } else {
        answers[k] = '';
      }
    });
    if (data.questions.length > 0) {
      const firstKey = qid(data.questions[0]);
      activeQuestionId.value = firstKey;
      emit('update-question-id', firstKey);
      emit('update-question', data.questions[0]);
    }
    const restored = restoreDraft(data, serverDraft, serverStartedAt);
    if (!startedAt.value) startedAt.value = new Date();
    if (restored) {
      emit('toast', { message: '已恢复上次答题草稿', type: 'info' });
    }
    loadFavorites(isStale);
    /**
     * 起表放在**所有** stale 检查之后：卸载之后绝不可能再创建计时器。
     */
    startTimer();
  } catch (err) {
    if (isStale()) return;
    errorState.value = bucketError(err, 'load');
    phase.value = 'error';
  } finally {
    if (!isStale()) loading.value = false;
  }
};

// ===== 提交 =====
const handleSubmit = async () => {
  /**
   * 快速连点提交**只发一次请求**：`submitting` 在第一次进入时同步置位（`await` 之前），
   * 所以第二次点击在 `submitting.value` 上就被挡住了，不会走到 `submitExam`。
   * `phase !== 'exam'` 是第二道闸：结果页/错误态下这个按钮本就不该有提交语义。
   */
  if (submitting.value || phase.value !== 'exam') return;
  if (expired.value) {
    emit('toast', { message: '答题时间已到，无法提交', type: 'error' });
    return;
  }
  const qs = exam.value.questions || [];
  const total = qs.length;
  if (answeredCount.value < total) {
    if (!window.confirm(`还有 ${total - answeredCount.value} 题未作答，确定提交吗？`)) {
      return;
    }
  }
  submitting.value = true;
  try {
    const answersArr = qs.map((q) => {
      const k = qid(q);
      const ua = Number(q.题型) === 3
        ? (multiAnswers[k] || []).sort().join('')
        : (answers[k] || '');
      // 同时传 questionId / question_id 做兼容，避免后端只认某一种时出现 null
      return {
        questionId: q.id ?? q.questionId ?? q.question_id,
        question_id: q.id ?? q.question_id ?? q.questionId,
        userAnswer: ua,
      };
    });
    const data = await submitExam(examId, {
      answers: answersArr,
      startedAt: startedAt.value.toISOString(),
    });
    /**
     * —— 收卷之后的两件事必须在**任何 `disposed` 判断之前**做 ——
     *
     * 服务端已经收卷了，这是既成事实，与「用户是否已经离开这一页」无关。所以：
     *   1. `clearDraftTimer()`：那枚 400ms 防抖定时器如果还挂着，会在下面 `removeItem`
     *      **之后**触发 `saveDraft`，把刚清掉的草稿原样写回来（刷新后又能"恢复"出一份
     *      已经交过的答案）。必须先杀掉它。
     *   2. `removeItem(draftKey())`：本地草稿清掉。
     * 顺序不能反 —— 先清定时器再清存储。
     */
    clearDraftTimer();
    localStorage.removeItem(draftKey());
    /** 已离页：状态、toast、emit 全部不再需要（父组件可能已经不在了）。 */
    if (disposed) return;
    result.value = data;
    phase.value = 'result';
    stopTimer();
    emit('update-question-id', null);
    emit('update-question', null);
    draftSaved.value = false;
    emit('toast', { message: `提交成功！得分 ${data.score} 分`, type: 'success' });
  } catch (err) {
    if (disposed) return;
    emit('toast', { message: err.message || '提交失败', type: 'error' });
  } finally {
    submitting.value = false;
  }
};

const handleExit = () => {
  /**
   * 提交请求在飞时**不退出**：此刻退出，用户无从知道这次提交成没成 ——
   * 与其让他猜，不如明确挡住并给出可见提示（"提交中离页行为明确"）。
   * 提交完成后本函数恢复正常；离页清理（计时器 / 草稿）由 `onUnmounted` 统一兜底。
   */
  if (submitting.value) {
    emit('toast', { message: '正在提交试卷，请稍候…', type: 'info' });
    return;
  }
  if (answeredCount.value > 0) {
    if (!window.confirm('答题进度已保存，确定退出吗？')) return;
  }
  emit('update-question-id', null);
  emit('update-question', null);
  emit('exit');
};

// ===== 监听 =====
watch([answers, multiAnswers], () => {
  if (!exam.value.questions?.length) return;
  clearDraftTimer();
  draftTimer = setTimeout(saveDraft, 400);
}, { deep: true });

// ===== 生命周期 =====
onMounted(() => {
  loadExam();
});

/**
 * 卸载 = 这个实例彻底作废。三件事，缺一不可：
 *
 * 1. **先置 `disposed`**：所有在飞的 `await`（加载、收藏、AI、提交）回来时都会在
 *    `if (disposed) return` 处丢弃 —— 这是「旧请求不回填新页面」的**权威防护**。
 *    `:key` 重建只是父组件侧换了个实例，**管不住已经在飞的回包**，两者不能互相替代。
 * 2. `clearDraftTimer()` + 收尾保存：防抖定时器必须杀掉，否则它会在组件已经卸载之后
 *    触发 `saveDraft` —— **在 A 的卸载里用 A 的 examId 写草稿**（目标仍正确，但时机已晚，
 *    且若那次点击是「提交」就会与提交的清草稿打架）。收尾保存只针对**未提交**的答题。
 * 3. `stopTimer()`：清掉 interval。之后的任何一次 tick 都不存在了。
 *    （`clearDraftTimer` / `stopTimer` 都幂等，`onUnmounted` 里不会重复清理。）
 */
onUnmounted(() => {
  disposed = true;
  loadToken += 1;
  clearDraftTimer();
  if (phase.value === 'exam' && exam.value.questions?.length && answeredCount.value > 0) saveDraft();
  stopTimer();
});
</script>

<style scoped>
/* ===== 页面容器 ===== */
.exam-practice-page {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 100px;
}

/* ===== 顶部横幅 ===== */
.exam-header-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
  border-radius: 16px;
  border: 1px solid #C7D2FE;
  margin-bottom: 24px;
}
.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.banner-icon { font-size: 32px; }
.banner-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1E293B;
}
.banner-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748B;
}
.banner-meta .dot { color: #CBD5E1; }
.answered-highlight { color: #6366F1; font-weight: 700; }
.draft-badge {
  font-size: 11px;
  padding: 2px 10px;
  background: #DCFCE7;
  color: #15803D;
  border-radius: 12px;
  margin-left: 6px;
}
.btn-exit {
  padding: 6px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  color: #64748B;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-exit:hover { background: #F1F5F9; }

/* ===== 加载状态 ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
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

/* ===== 答题卡 ===== */
.answer-card-panel {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.answer-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.answer-card-head .card-title {
  font-weight: 600;
  font-size: 14px;
  color: #1E293B;
}
.answer-card-head .card-hint {
  font-size: 12px;
  color: #94A3B8;
}
.answer-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
}
.answer-cell {
  height: 36px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #F8FAFC;
  color: #64748B;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.answer-cell:hover { border-color: #C7D2FE; }
.answer-cell.answered {
  background: #DCFCE7;
  border-color: #86EFAC;
  color: #15803D;
}
.answer-cell.active {
  background: #6366F1;
  border-color: #6366F1;
  color: #fff;
}

/* ===== 题目列表 ===== */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.question-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 22px 24px;
  scroll-margin-top: 80px;
}

/* 题目头部 */
.q-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F1F5F9;
}
.q-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.q-number {
  font-weight: 600;
  font-size: 14px;
  color: #1E293B;
}
.q-type-tag {
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

.q-difficulty-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 12px;
}
.diff-easy { background: #DCFCE7; color: #15803D; }
.diff-medium { background: #FEF3C7; color: #B45309; }
.diff-hard { background: #FEE2E2; color: #B91C1C; }

.q-manual-tag {
  font-size: 11px;
  padding: 2px 10px;
  background: #FEF3C7;
  color: #B45309;
  border-radius: 12px;
}
.btn-favorite {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  background: #fff;
  color: #94A3B8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-favorite:hover { border-color: #FCD34D; background: #FFFBEB; }
.btn-favorite.active {
  background: #FEF3C7;
  border-color: #FBBF24;
  color: #B45309;
}

/* 题目内容 */
.q-title {
  font-size: 15px;
  font-weight: 500;
  color: #1E293B;
  line-height: 1.8;
  margin-bottom: 12px;
}

/* 选项 */
.q-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.option-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #475569;
  min-width: 80px;
}
.option-choice:hover { border-color: #C7D2FE; }
.option-choice.selected {
  border-color: #6366F1;
  background: #EEF2FF;
  color: #4338CA;
}
.option-choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.option-key { font-weight: 600; }

/* 答题区 */
.q-answer-area {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px dashed #E2E8F0;
}
.q-answer-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  display: block;
  margin-bottom: 8px;
}
.judge-group {
  display: flex;
  gap: 16px;
}
.judge-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-family: inherit;
}
.judge-btn:hover { border-color: #C7D2FE; }
.judge-btn.active {
  border-color: #6366F1;
  background: #EEF2FF;
}
.judge-btn input { display: none; }

.choice-hint {
  font-size: 13px;
  color: #94A3B8;
  padding: 4px 0;
}
.input-field {
  width: 100%;
  padding: 8px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}
.input-field:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
.textarea-field {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}
.textarea-field:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ===== AI 答疑 ===== */
.ai-tutor {
  margin-top: 14px;
  border-top: 1px dashed #E2E8F0;
  padding-top: 14px;
}
.btn-ai-tutor {
  padding: 6px 16px;
  border: 1px solid #C7D2FE;
  border-radius: 20px;
  background: #EEF2FF;
  color: #4338CA;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-ai-tutor:hover { background: #E0E7FF; }
.tutor-panel {
  margin-top: 10px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px;
}
.tutor-history {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.tutor-empty {
  text-align: center;
  color: #94A3B8;
  font-size: 13px;
  padding: 16px 0;
}
.tutor-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.msg-role {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
}
.msg-content {
  font-size: 14px;
  line-height: 1.7;
  padding: 10px 14px;
  border-radius: 8px;
  white-space: pre-wrap;
}
.tutor-msg.user .msg-content {
  background: #EEF2FF;
  color: #4338CA;
  margin-left: 20px;
}
.tutor-msg.ai .msg-content {
  background: #fff;
  border: 1px solid #E2E8F0;
  color: #1E293B;
  margin-right: 20px;
}
.tutor-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94A3B8;
  font-size: 13px;
  padding: 8px 0;
}
.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #E2E8F0;
  border-top: 2px solid #6366F1;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
.tutor-input {
  display: flex;
  gap: 8px;
}
.tutor-input .input-field { flex: 1; }
.btn-send {
  padding: 8px 18px;
  background: #6366F1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.btn-send:hover:not(:disabled) { background: #4F46E5; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 底部提交栏 ===== */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(900px, 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
  z-index: 50;
}
.submit-info {
  font-size: 14px;
  color: #64748B;
}
.submit-info .text-muted { color: #94A3B8; }
.warn-tag {
  font-size: 12px;
  padding: 2px 10px;
  background: #FEF3C7;
  color: #B45309;
  border-radius: 12px;
  margin-left: 8px;
}
.btn-submit {
  padding: 10px 28px;
  background: #10B981;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-submit:hover:not(:disabled) { background: #059669; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

/* ===== 结果页 ===== */
.result-phase {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}
.result-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 40px 48px;
  width: 560px;
  max-width: 100%;
  text-align: center;
}
.result-emoji { font-size: 56px; margin-bottom: 8px; }
.result-card h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #1E293B;
}
.result-sub {
  color: #94A3B8;
  font-size: 14px;
  margin: 0 0 24px;
}
.score-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 20px 30px;
  border-radius: 12px;
  margin-bottom: 24px;
}
.score-excellent { background: #ECFDF5; }
.score-pass { background: #EEF2FF; }
.score-fail { background: #FEF2F2; }

.score-number {
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
}
.score-excellent .score-number { color: #059669; }
.score-pass .score-number { color: #4338CA; }
.score-fail .score-number { color: #DC2626; }

.score-unit {
  font-size: 20px;
  color: #94A3B8;
  font-weight: 600;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.result-item {
  background: #F8FAFC;
  border-radius: 8px;
  padding: 12px 10px;
}
.result-item .label {
  display: block;
  font-size: 12px;
  color: #94A3B8;
  margin-bottom: 2px;
}
.result-item .value {
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
}
.result-item.result-good .value { color: #059669; }
.result-item.result-bad .value { color: #DC2626; }
.result-item.result-skip .value { color: #94A3B8; }

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn-primary {
  padding: 10px 28px;
  background: #6366F1;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary:hover { background: #4F46E5; }
.btn-secondary {
  padding: 10px 28px;
  background: #F1F5F9;
  color: #475569;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.btn-secondary:hover { background: #E2E8F0; }

@media (max-width: 640px) {
  .exam-header-banner { flex-direction: column; text-align: center; }
  .banner-left { flex-direction: column; }
  .result-card { padding: 24px 20px; }
  .result-grid { grid-template-columns: repeat(2, 1fr); }
  .submit-bar { flex-direction: column; gap: 10px; padding: 12px 16px; }
}
</style>
