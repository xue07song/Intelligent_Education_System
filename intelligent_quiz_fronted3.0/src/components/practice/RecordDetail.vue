<template>
  <div class="iq-record-detail">
    <div v-if="loading" class="iq-table-loading">
      <span class="iq-loading-spinner"></span>
      <span class="iq-text-sm iq-text-muted">加载中...</span>
    </div>

    <div v-else-if="error" class="iq-card">
      <div class="iq-empty-row">
        <div class="iq-empty-box">
          <div class="iq-empty-icon">{{ error.icon }}</div>
          <div class="iq-empty-text iq-text-base" style="color: var(--iq-neutral-600);">{{ error.message }}</div>
          <button
              v-if="error.kind === 'failed'"
              class="iq-btn iq-btn-ghost iq-btn-sm"
              @click="loadRecord()"
          >
            重试
          </button>
          <button v-else class="iq-btn iq-btn-ghost iq-btn-sm" @click="$emit('back-list')">返回列表</button>
        </div>
      </div>
    </div>

    <div v-else-if="!record" class="iq-card">
      <div class="iq-empty-row">
        <div class="iq-empty-box">
          <div class="iq-empty-icon">❓</div>
          <div class="iq-empty-text iq-text-base" style="color: var(--iq-neutral-600);">记录不存在</div>
          <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="$emit('back-list')">返回列表</button>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="iq-card detail-header-card">
        <div class="detail-header">
          <div>
            <h2 class="iq-text-xl iq-font-semibold" style="color: var(--iq-neutral-900); margin: 0;">📝 答题详情</h2>
            <p class="iq-text-sm iq-text-muted" style="margin: 4px 0 0;">
              {{ record.exam_title || `试卷#${record.exam_id}` }}
              <template v-if="record.username">
                · 提交人：<span class="iq-font-medium" style="color: var(--iq-neutral-700);">{{ record.nickname || record.username }}</span>
                <template v-if="record.user_role">
                  <span class="iq-tag u-role" :class="record.user_role" style="margin-left: 4px;">{{ roleMap[record.user_role] || record.user_role }}</span>
                </template>
              </template>
              · 提交于 {{ formatTime(record.submitted_at) }}
            </p>
          </div>
          <button class="iq-btn iq-btn-ghost" @click="$emit('back')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            返回列表
          </button>
        </div>
      </div>

      <!-- 成绩概览 -->
      <div class="iq-card score-summary">
        <div class="score-circle" :class="scoreClass(record.score)">
          <div class="score-num">{{ record.score }}</div>
          <div class="score-text">分</div>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">准确率</span>
            <span class="value">{{ record.accuracy }}%</span>
          </div>
          <div class="summary-item">
            <span class="label">总题数</span>
            <span class="value">{{ record.total_count }}</span>
          </div>
          <div class="summary-item summary-good">
            <span class="label">正确</span>
            <span class="value">{{ record.correct_count }}</span>
          </div>
          <div class="summary-item summary-bad">
            <span class="label">错误</span>
            <span class="value">{{ record.wrong_count }}</span>
          </div>
          <div class="summary-item summary-skip">
            <span class="label">未答</span>
            <span class="value">{{ record.skipped_count }}</span>
          </div>
          <div class="summary-item">
            <span class="label">客观题</span>
            <span class="value">{{ record.objective_correct }}/{{ record.objective_total }}</span>
          </div>
          <div class="summary-item" style="grid-column: span 1;">
            <span class="label">用时</span>
            <span class="value" style="font-size: 16px;">{{ formatDuration(record.duration_seconds) }}</span>
          </div>
        </div>
      </div>

      <!-- 逐题详情 -->
      <h3 class="section-title">逐题详情</h3>
      <div class="answer-list">
        <div v-for="(a, idx) in record.answers" :key="a.id" class="iq-card answer-card" :class="answerClass(a)">
          <div class="a-header">
            <span class="a-num">第 {{ idx + 1 }} 题</span>
            <span class="q-type-tag" :class="`type-${a.question_type}`">{{ getTypeName(a.question_type) }}</span>
            <span class="a-status" :class="answerClass(a)">{{ statusText(a) }}</span>
          </div>
          <div class="a-title">{{ a.题目 }}</div>
          <div class="a-detail">
            <div class="a-row">
              <span class="a-label">你的答案：</span>
              <span class="a-value" :class="{ 'text-wrong': a.is_correct === 0, 'text-correct': a.is_correct === 1 }">
                {{ a.user_answer || '（未作答）' }}
              </span>
            </div>
            <div class="a-row">
              <span class="a-label">正确答案：</span>
              <span class="a-value text-correct">{{ a.correct_answer || '-' }}</span>
            </div>
            <div v-if="a.解析" class="a-row analysis-row">
              <span class="a-label">💡 解析：</span>
              <span class="a-value">{{ a.解析 }}</span>
            </div>
            <div v-if="reviewable && [4,5,6].includes(Number(a.question_type))" class="review-panel">
              <b>教师复核</b>
              <select v-model="reviewForms[a.id].status" class="iq-input"><option value="correct">判定正确</option><option value="partial">部分掌握</option><option value="incorrect">需要巩固</option></select>
              <label v-if="reviewForms[a.id].status==='partial'">本题得分 <input v-model.number="reviewForms[a.id].awardedScore" class="iq-input" type="number" min="0" :max="reviewForms[a.id].fullScore" step="0.5"> / {{reviewForms[a.id].fullScore}}分</label>
              <input v-model="reviewForms[a.id].comment" class="iq-input" placeholder="填写简洁的复核意见">
              <button class="iq-btn iq-btn-primary iq-btn-sm" :disabled="reviewing===a.id" @click="saveReview(a)">{{reviewing===a.id?'保存中...':'保存复核'}}</button>
              <small v-if="a.review_status">上次复核：{{reviewStatusText(a.review_status)}}<template v-if="a.review_comment"> · {{a.review_comment}}</template></small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { getRecord, adminGetRecord, reviewSubjectiveAnswer } from '@/api/practice';
import { getTypeName } from '@/utils/constants';
import { formatTime } from '@/utils/format';

const roleMap = { admin: '管理员', teacher: '教师', student: '学生' };

const props = defineProps({
  recordId: { type: [Number, String], required: true },
  adminMode: { type: Boolean, default: false },
  reviewable: { type: Boolean, default: false },
});

/**
 * `back`      —— 正常详情页头部那个「返回」：有可靠站内来源才后退，否则回列表（消费方决定）。
 * `back-list` —— **错误 / 空状态**里的「返回列表」：语义是「我要去列表」，不是「后退一步」。
 *                两者必须分开：A→B 之后按后退会落回 A 的详情，而用户点的是「返回列表」。
 */
const emit = defineEmits(['back', 'back-list', 'toast']);

const loading = ref(true);
const record = ref(null);
const reviewing = ref(null);
const reviewForms = ref({});
// 加载失败/非法 ID/无权限时的明确状态（原来是「静默 toast + 记录不存在」）
const error = ref(null);
// 请求序号，用于丢弃过期回包（见 loadRecord）
let reqSeq = 0;

/** 把接口错误归类成页面状态：403 无权限 / 404 不存在 / 其它 加载失败。 */
const classifyError = (err) => {
  const status = err?.status;
  if (status === 403) return { kind: 'forbidden', icon: '⛔', message: '无权查看该记录' };
  if (status === 404) return { kind: 'notfound', icon: '❓', message: '记录不存在或已被删除' };
  return { kind: 'failed', icon: '⚠️', message: err?.message || '加载记录失败，请稍后重试' };
};
const reviewStatusText = status => ({correct:'正确',partial:'部分掌握',incorrect:'需要巩固'}[status]||status);
const prepareReviewForms = () => { const full=Math.round((record.value?.total_count?100/Number(record.value.total_count):100)*100)/100;reviewForms.value = Object.fromEntries((record.value?.answers||[]).map(a=>[a.id,{status:a.review_status||'correct',awardedScore:Math.round((Number(a.review_score_rate)||0.5)*full*100)/100,fullScore:full,comment:a.review_comment||''}])); };
const saveReview = async a => { reviewing.value=a.id;try{await reviewSubjectiveAnswer(a.id,reviewForms.value[a.id]);emit('toast',{message:'复核结果已保存，成绩已更新',type:'success'});await loadRecord()}catch(err){emit('toast',{message:err.message||'保存复核失败',type:'error'})}finally{reviewing.value=null} };

const formatDuration = (sec) => {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
};

const scoreClass = (score) => {
  if (score >= 90) return 'score-excellent';
  if (score >= 60) return 'score-pass';
  return 'score-fail';
};

const answerClass = (a) => {
  if (a.is_correct === 1) return 'correct';
  if (a.is_correct === 0) return 'wrong';
  if (a.is_correct === 3) return 'subjective';
  return 'skip';
};

const statusText = (a) => {
  if (a.is_correct === 1) return '✅ 正确';
  if (a.is_correct === 0) return '❌ 错误';
  if (a.is_correct === 3) return '📝 人工批阅';
  return '⏭️ 未答';
};

const loadRecord = async () => {
  // 每次加载自增序号：回包时序号已经不是最新的，就丢弃这次结果。
  // 目的：快速切换 A→B 时，A 的慢响应不能覆盖 B 的记录。
  const seq = ++reqSeq;
  const targetId = String(props.recordId ?? '').trim();

  // 切记录前先清掉上一份数据，避免 A 的内容短暂显示在 B 的标题下
  record.value = null;
  error.value = null;
  reviewForms.value = {};
  reviewing.value = null;

  // 非法 ID：不发请求，直接给出明确状态
  if (!/^\d+$/.test(targetId) || Number(targetId) <= 0) {
    loading.value = false;
    error.value = { kind: 'invalid', icon: '🚫', message: '记录编号无效，无法查看' };
    return;
  }

  loading.value = true;
  try {
    const data = props.adminMode
      ? await adminGetRecord(targetId)
      : await getRecord(targetId);
    if (seq !== reqSeq) return;
    record.value = data || null;
    if (record.value) prepareReviewForms();
  } catch (err) {
    if (seq !== reqSeq) return;
    error.value = classifyError(err);
    // 页面里给结论，toast 里保留服务端原文，便于排查
    emit('toast', { message: err?.message || error.value.message, type: 'error' });
  } finally {
    if (seq === reqSeq) loading.value = false;
  }
};

// recordId 变化（路由参数 /records/1 → /records/2，或父组件换 props）时重新加载。
// 用参数监听而不是组件 key：key 只能重建组件，监听能精确控制「清旧数据 → 拉新数据」，
// 而且对「同一个组件实例内换 props」的用法同样有效。
watch(() => props.recordId, loadRecord, { immediate: true });
</script>

<style scoped>
.iq-record-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 920px;
  margin: 0 auto;
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

.detail-header-card {
  padding: 18px 24px;
  background: linear-gradient(135deg, var(--iq-primary-50), #eef2ff);
  border: 1px solid var(--iq-primary-100);
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.u-role.iq-tag.admin { background: #fef2f2; color: #b91c1c; }
.u-role.iq-tag.teacher { background: #eff6ff; color: #1d4ed8; }
.u-role.iq-tag.student { background: #ecfdf5; color: #047857; }

.score-summary {
  display: flex;
  gap: 30px;
  align-items: center;
  padding: 24px 28px;
}
.score-circle {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 4px solid;
}
.score-circle.score-excellent { background: #ecfdf5; border-color: #10b981; }
.score-circle.score-pass { background: #eff6ff; border-color: #3b82f6; }
.score-circle.score-fail { background: #fef2f2; border-color: #ef4444; }
.score-num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}
.score-circle.score-excellent .score-num { color: #059669; }
.score-circle.score-pass .score-num { color: #2563eb; }
.score-circle.score-fail .score-num { color: #dc2626; }
.score-text {
  font-size: 13px;
  color: var(--iq-neutral-500);
  font-weight: 600;
  margin-top: 2px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  flex: 1;
}
.summary-item {
  background: var(--iq-neutral-50);
  border-radius: var(--iq-radius-medium);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 1px solid var(--iq-neutral-100);
}
.summary-item.summary-good { background: #ecfdf5; border-color: #a7f3d0; }
.summary-item.summary-bad { background: #fef2f2; border-color: #fecaca; }
.summary-item.summary-skip { background: #f8fafc; border-color: var(--iq-neutral-200); }
.summary-item .label {
  font-size: 11px;
  color: var(--iq-neutral-500);
  font-weight: 500;
}
.summary-item .value {
  font-size: 22px;
  font-weight: 700;
  color: var(--iq-neutral-900);
  line-height: 1.2;
}
.summary-item.summary-good .value { color: #059669; }
.summary-item.summary-bad .value { color: #dc2626; }

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--iq-neutral-900);
  margin: 8px 0 4px;
}
.answer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.answer-card {
  padding: 18px 22px;
  border-left: 4px solid var(--iq-neutral-300);
}
.answer-card.correct { border-left-color: var(--iq-state-success); background: linear-gradient(90deg, #ecfdf5 0%, var(--iq-card) 20%); }
.answer-card.wrong { border-left-color: var(--iq-state-error); background: linear-gradient(90deg, #fef2f2 0%, var(--iq-card) 20%); }
.answer-card.subjective { border-left-color: var(--iq-state-warning); background: linear-gradient(90deg, #fffbeb 0%, var(--iq-card) 20%); }
.answer-card.skip { border-left-color: var(--iq-neutral-400); }

.a-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.a-num {
  font-weight: 700;
  color: var(--iq-neutral-900);
  font-size: 14px;
}
.q-type-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--iq-radius-full);
  font-size: 12px;
  font-weight: 500;
}
.type-1 { background: #ede9fe; color: #6d28d9; }
.type-2 { background: #dbeafe; color: #1d4ed8; }
.type-3 { background: #fce7f3; color: #be185d; }
.type-4 { background: #d1fae5; color: #047857; }
.type-5 { background: #fef3c7; color: #b45309; }
.type-6 { background: #ffedd5; color: #c2410c; }

.a-status {
  font-size: 12px;
  font-weight: 600;
}
.a-status.correct { color: var(--iq-state-success); }
.a-status.wrong { color: var(--iq-state-error); }
.a-status.subjective { color: var(--iq-state-warning); }
.a-status.skip { color: var(--iq-neutral-500); }

.a-title {
  font-size: 15px;
  color: var(--iq-neutral-900);
  line-height: 1.7;
  margin-bottom: 12px;
  font-weight: 500;
}
.a-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--iq-neutral-50);
  border-radius: var(--iq-radius-medium);
  border: 1px solid var(--iq-neutral-100);
}
.a-row {
  font-size: 14px;
  display: flex;
  gap: 6px;
  line-height: 1.7;
}
.analysis-row {
  padding-top: 8px;
  border-top: 1px dashed var(--iq-neutral-200);
}
.a-label {
  color: var(--iq-neutral-500);
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
  font-size: 13px;
}
.a-value {
  color: var(--iq-neutral-800);
  word-break: break-word;
  flex: 1;
}
.text-correct { color: var(--iq-state-success); font-weight: 600; }
.text-wrong { color: var(--iq-state-error); font-weight: 600; }
.review-panel{display:grid;grid-template-columns:110px 150px 180px 1fr auto;align-items:center;gap:9px;margin-top:10px;padding:12px;border-top:1px dashed var(--iq-neutral-200);background:#f5f7ff}.review-panel label{display:flex;align-items:center;gap:6px;font-size:12px}.review-panel small{grid-column:1/-1;color:var(--iq-neutral-500)}@media(max-width:760px){.review-panel{grid-template-columns:1fr}.review-panel small{grid-column:auto}}
</style>
