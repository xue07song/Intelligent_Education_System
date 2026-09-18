<template>
  <div class="ar-page">
    <header class="ar-hero">
      <div>
        <span class="ar-badge">自适应复核</span>
        <h1>主观题复核</h1>
        <p>统一复核试卷练习和自适应练习中需要教师二次判断的答案</p>
      </div>
      <button class="ar-btn" @click="load">刷新</button>
    </header>

    <div class="ar-toolbar">
      <select v-model="status" class="ar-select" @change="page = 1; load()">
        <option value="pending">待复核</option>
        <option value="reviewed">已复核</option>
      </select>
      <span class="ar-total">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="ar-empty">加载中...</div>
    <div v-else-if="list.length === 0" class="ar-empty">暂无待复核的自适应主观题</div>
    <div v-else class="ar-list">
      <div v-for="item in list" :key="`${item.source}-${item.id}`" class="ar-card">
        <div class="ar-head">
          <span class="ar-id">#{{ item.id }}</span>
          <span class="ar-id">{{ item.source === 'exam' ? '试卷练习' : '自适应练习' }}</span>
          <span class="ar-student">{{ item.nickname || item.username }}</span>
          <span class="ar-time">{{ formatTime(item.answered_at) }}</span>
        </div>
        <div class="ar-question">{{ item.title || '题目已失效' }}</div>
        <div class="ar-grid">
          <div class="ar-box">
            <b>学生作答</b>
            <p>{{ item.user_answer || '（空）' }}</p>
          </div>
          <div class="ar-box">
            <b>参考答案</b>
            <p>{{ item.correct_answer || '（空）' }}</p>
          </div>
        </div>
        <div v-if="item.review_comment" class="ar-comment">复核意见：{{ item.review_comment }}</div>
        <div v-if="status === 'pending'" class="ar-actions">
          <button class="ar-btn ar-btn-ok" :disabled="reviewing" @click="review(item, 'correct')">判对</button>
          <button class="ar-btn ar-btn-warn" :disabled="reviewing" @click="review(item, 'partial')">部分正确</button>
          <button class="ar-btn ar-btn-danger" :disabled="reviewing" @click="review(item, 'incorrect')">判错</button>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="ar-pager">
      <button :disabled="page <= 1" @click="page -= 1; load()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page += 1; load()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { listAdaptiveAnswers, reviewAdaptiveAnswerApi, reviewSubjectiveAnswer } from '@/api/practice';
import { formatTime } from '@/utils/format';

const emit = defineEmits(['toast']);
const toast = (message, type = 'success') => emit('toast', { message, type });

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('pending');
const loading = ref(false);
const reviewing = ref(false);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const load = async () => {
  loading.value = true;
  try {
    const data = await listAdaptiveAnswers({ status: status.value, page: page.value, pageSize: pageSize.value });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch (err) {
    toast(err.message || '加载失败', 'error');
  } finally {
    loading.value = false;
  }
};

const review = async (item, result) => {
  const body = { status: result, fullScore: 100 };
  if (result === 'partial') {
    const score = window.prompt('部分正确得分（0-100）：', '50');
    if (score === null) return;
    body.awardedScore = Number(score);
    if (!Number.isFinite(body.awardedScore) || body.awardedScore <= 0 || body.awardedScore > 100) {
      toast('请填写 1-100 之间的得分', 'error');
      return;
    }
  }
  const comment = window.prompt('复核意见（可选）：', '') || '';
  body.comment = comment;
  reviewing.value = true;
  try {
    if (item.source === 'exam') await reviewSubjectiveAnswer(item.id, body);
    else await reviewAdaptiveAnswerApi(item.id, body);
    toast('复核结果已保存');
    await load();
  } catch (err) {
    toast(err.message || '复核失败', 'error');
  } finally {
    reviewing.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.ar-page { max-width: 1100px; margin: 0 auto; }
.ar-hero { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 26px 30px; border-radius: 14px; background: linear-gradient(135deg, #334155, #64748B); color: #fff; }
.ar-badge { font-size: 12px; opacity: .85; }
.ar-hero h1 { margin: 4px 0; font-size: 24px; }
.ar-hero p { margin: 0; opacity: .85; font-size: 13px; }
.ar-btn { padding: 8px 16px; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; color: #475569; cursor: pointer; font-size: 13px; }
.ar-btn-ok { background: #059669; border-color: #059669; color: #fff; }
.ar-btn-warn { background: #D97706; border-color: #D97706; color: #fff; }
.ar-btn-danger { background: #DC2626; border-color: #DC2626; color: #fff; }
.ar-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 18px 0; }
.ar-select { padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; }
.ar-total { color: #64748B; font-size: 13px; }
.ar-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
.ar-list { display: flex; flex-direction: column; gap: 14px; }
.ar-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; }
.ar-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ar-id { font-size: 12px; color: #94A3B8; font-family: monospace; }
.ar-student { font-size: 13px; font-weight: 600; color: #334155; }
.ar-time { font-size: 12px; color: #94A3B8; margin-left: auto; }
.ar-question { font-size: 15px; line-height: 1.7; color: #1E293B; margin-top: 12px; white-space: pre-wrap; }
.ar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.ar-box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; background: #F8FAFC; }
.ar-box b { font-size: 12px; color: #64748B; }
.ar-box p { margin: 6px 0 0; font-size: 13px; color: #334155; white-space: pre-wrap; }
.ar-comment { margin-top: 10px; color: #0F766E; font-size: 13px; }
.ar-actions { display: flex; gap: 10px; margin-top: 14px; }
.ar-pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 20px; }
.ar-pager button { padding: 6px 14px; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; cursor: pointer; }
.ar-pager button:disabled { opacity: .4; cursor: not-allowed; }
@media (max-width: 640px) {
  .ar-hero { flex-direction: column; align-items: stretch; text-align: center; }
  .ar-grid { grid-template-columns: 1fr; }
}
</style>
