<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="$emit('close')">
        <div class="iq-modal iq-modal-lg">
          <div class="iq-modal-header">
            <div class="iq-modal-title-wrap">
              <div class="iq-modal-icon ai-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v1H7a3 3 0 0 0-3 3v2H3v4h1v2a3 3 0 0 0 3 3h2v1a3 3 0 0 0 6 0v-1h2a3 3 0 0 0 3-3v-2h1V9h-1V7a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3z"></path>
                  <path d="M9 12h.01"></path>
                  <path d="M15 12h.01"></path>
                  <path d="M10 16s1.5 2 2 2 2-2 2-2"></path>
                </svg>
              </div>
              <div>
                <h3 class="iq-modal-title">AI 自动出题</h3>
                <p class="iq-modal-subtitle">智能生成高质量题目草稿，一键入库</p>
              </div>
            </div>
            <button class="iq-modal-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 配置表单 -->
          <div v-if="!drafts.length" class="iq-modal-body">
            <div class="iq-form-grid ai-grid">
              <div class="iq-form-field">
                <label class="iq-form-label">科目 <span class="iq-req">*</span></label>
                <select v-model="form.科目" class="iq-select">
                  <option value="">请选择科目</option>
                  <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">章节</label>
                <input v-model="form.章节" type="number" class="iq-input" placeholder="不限留空" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">题型</label>
                <select v-model="form.题型" class="iq-select">
                  <option value="">不限</option>
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">难度</label>
                <select v-model="form.难度" class="iq-select">
                  <option value="">不限</option>
                  <option v-for="opt in difficultyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">数量 <span class="iq-req">*</span></label>
                <input v-model.number="form.数量" type="number" min="1" max="10" class="iq-input" placeholder="1-10" />
              </div>
            </div>
            <div class="iq-form-field">
              <label class="iq-form-label">知识点</label>
              <input v-model="form.知识点" class="iq-input" placeholder="如：循环结构、进程调度" />
            </div>
            <div class="iq-form-field">
              <label class="iq-form-label">补充说明</label>
              <textarea v-model="form.补充说明" class="iq-textarea" rows="2" placeholder="可选：对题目的额外要求"></textarea>
            </div>

            <div v-if="errorMsg" class="iq-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMsg }}
            </div>

            <div class="iq-modal-footer">
              <button type="button" class="iq-btn iq-btn-secondary" @click="$emit('close')">取消</button>
              <button class="iq-btn ai-gen-btn" :disabled="loading" @click="handleGenerate">
                <span v-if="loading" class="iq-btn-spinner"></span>
                {{ loading ? 'AI 生成中...' : '🤖 生成题目草稿' }}
              </button>
            </div>
          </div>

          <!-- 草稿审核列表 -->
          <div v-else class="iq-modal-body">
            <div class="ai-draft-header">
              <div class="ai-draft-info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--iq-primary);">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                共生成 <strong>{{ drafts.length }}</strong> 道草稿，勾选后入库（重复 ID 将自动跳过）
              </div>
              <div class="ai-draft-ops">
                <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="selectAll">全选</button>
                <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="drafts.forEach((d) => (d._checked = false))">清空</button>
              </div>
            </div>

            <div class="ai-draft-list">
              <div v-for="(d, idx) in drafts" :key="idx" class="ai-draft-card" :class="{ checked: d._checked }">
                <div class="ai-draft-head">
                  <label class="ai-check-label">
                    <input type="checkbox" class="iq-checkbox" v-model="d._checked" />
                    <span class="iq-id-chip">{{ d.id }}</span>
                    <span class="iq-type-tag" :class="`type-${d.题型}`">{{ getTypeName(d.题型) }}</span>
                  </label>
                  <button class="ai-draft-remove" @click="drafts.splice(idx, 1)" title="移除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="ai-draft-title">{{ d.题目 }}</div>
                <div v-if="d.选项" class="ai-draft-options">{{ d.选项 }}</div>
                <div class="ai-draft-footer">
                  <div class="ai-draft-answer">
                    <span class="ans-label">答案</span>
                    <span class="ans-value">{{ d.答案 }}</span>
                  </div>
                  <div v-if="d.解析" class="ai-draft-analysis">
                    <span class="ans-label">解析</span>
                    <span>{{ d.解析 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="errorMsg" class="iq-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMsg }}
            </div>

            <div class="iq-modal-footer">
              <button class="iq-btn iq-btn-secondary" @click="resetDrafts">重新生成</button>
              <button class="iq-btn iq-btn-primary" :disabled="saving || selectedCount === 0" @click="handleSave">
                <span v-if="saving" class="iq-btn-spinner"></span>
                {{ saving ? '入库中...' : `📥 入库选中（${selectedCount}）` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { generateQuestions, saveGenerated } from '@/api/ai';
import { getSubjects } from '@/api/subject';
import { TYPE_OPTIONS, DIFFICULTY_OPTIONS, getTypeName } from '@/utils/constants';

const props = defineProps({
  visible: { type: Boolean, default: false },
  role: { type: String, default: 'teacher' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'success']);

const form = reactive({
  科目: '',
  章节: '',
  题型: '',
  难度: '',
  数量: 3,
  知识点: '',
  补充说明: '',
});

const loading = ref(false);
const saving = ref(false);
const errorMsg = ref('');
const drafts = ref([]);
const allSubjects = ref([]);

const subjectOptions = computed(() => {
  if (props.role === 'teacher') return props.subjects || [];
  return allSubjects.value || [];
});

const loadSubjects = async () => {
  if (props.role === 'teacher') return;
  try {
    const data = await getSubjects();
    allSubjects.value = Array.isArray(data) ? data : [];
  } catch {
    allSubjects.value = [];
  }
};

const typeOptions = TYPE_OPTIONS;
const difficultyOptions = DIFFICULTY_OPTIONS;

const selectedCount = computed(() => drafts.value.filter((d) => d._checked).length);

const selectAll = () => {
  drafts.value.forEach((d) => (d._checked = true));
};

const resetDrafts = () => {
  drafts.value = [];
  errorMsg.value = '';
};

const handleGenerate = async () => {
  if (!form.科目) {
    errorMsg.value = '请选择入库科目';
    return;
  }
  if (!form.数量 || form.数量 < 1 || form.数量 > 10) {
    errorMsg.value = '数量需在 1-10 之间';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    const body = { 数量: form.数量 };
    if (form.章节 !== '' && form.章节 !== null) body.章节 = form.章节;
    if (form.题型 !== '' && form.题型 !== null) body.题型 = form.题型;
    if (form.难度 !== '' && form.难度 !== null) body.难度 = form.难度;
    if (form.知识点.trim()) body.知识点 = form.知识点.trim();
    if (form.补充说明.trim()) body.补充说明 = form.补充说明.trim();

    const list = await generateQuestions(body);
    if (!list || list.length === 0) {
      errorMsg.value = 'AI 未能生成有效题目，请调整条件后重试';
      return;
    }
    drafts.value = list.map((q) => ({ ...q, _checked: true }));
  } catch (err) {
    errorMsg.value = err.message || 'AI 生成失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  const selected = drafts.value.filter((d) => d._checked);
  if (selected.length === 0) return;
  if (!form.科目) {
    errorMsg.value = '请选择入库科目';
    return;
  }
  saving.value = true;
  errorMsg.value = '';
  try {
    const questions = selected.map(({ _checked, ...rest }) => rest);
    const result = await saveGenerated(questions, form.科目);
    emit('success', result);
  } catch (err) {
    errorMsg.value = err.message || '入库失败，请稍后重试';
  } finally {
    saving.value = false;
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    loadSubjects();
    if (props.role === 'teacher' && props.subjects?.length === 1) {
      form.科目 = props.subjects[0];
    }
  } else {
    setTimeout(() => {
      resetDrafts();
      form.科目 = '';
      form.章节 = '';
      form.题型 = '';
      form.难度 = '';
      form.数量 = 3;
      form.知识点 = '';
      form.补充说明 = '';
    }, 300);
  }
});
</script>

<style scoped>
.iq-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--iq-border);
}
.iq-modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.iq-modal-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--iq-radius-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.iq-modal-icon svg { width: 20px; height: 20px; }
.ai-icon {
  background: linear-gradient(135deg, var(--iq-primary-500), #8b5cf6);
  color: #fff;
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.4);
}
.iq-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--iq-neutral-900);
  margin: 0;
}
.iq-modal-subtitle {
  font-size: 12px;
  color: var(--iq-muted-foreground);
  margin: 2px 0 0;
}
.iq-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--iq-neutral-400);
  cursor: pointer;
  border-radius: var(--iq-radius-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.iq-modal-close:hover {
  background: var(--iq-neutral-100);
  color: var(--iq-neutral-700);
}
.iq-modal-close svg { width: 18px; height: 18px; }

.iq-modal-body {
  padding: 24px;
}

.ai-grid {
  grid-template-columns: repeat(4, 1fr);
}

.iq-form-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}
.iq-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.iq-form-grid .iq-form-field { margin-bottom: 0; }
.iq-form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--iq-neutral-700);
}
.iq-req {
  color: var(--iq-state-error);
  margin-left: 2px;
}

.ai-gen-btn {
  background: linear-gradient(135deg, var(--iq-primary-500), #8b5cf6);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px -4px rgba(99, 102, 241, 0.5);
}
.ai-gen-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--iq-primary-600), #7c3aed);
  border-color: transparent;
  opacity: 0.95;
}

.iq-alert-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--iq-state-error-bg);
  color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 10px 14px;
  border-radius: var(--iq-radius-medium);
  font-size: 13px;
  margin-bottom: 16px;
}

.iq-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
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
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 草稿审核区 */
.ai-draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--iq-primary-50);
  border: 1px solid var(--iq-primary-100);
  border-radius: var(--iq-radius-medium);
  margin-bottom: 16px;
}
.ai-draft-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--iq-neutral-700);
}
.ai-draft-info strong {
  color: var(--iq-primary-700);
}
.ai-draft-ops {
  display: flex;
  gap: 8px;
}

.ai-draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 4px;
}
.ai-draft-card {
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
  padding: 14px 16px;
  transition: all 0.2s;
  background: var(--iq-neutral-0);
}
.ai-draft-card.checked {
  border-color: var(--iq-primary);
  background: var(--iq-primary-50);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}
.ai-draft-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ai-check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.iq-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--iq-primary);
  cursor: pointer;
}
.iq-id-chip {
  display: inline-block;
  font-family: var(--iq-font-mono);
  font-size: 12px;
  padding: 2px 8px;
  background: var(--iq-neutral-100);
  color: var(--iq-neutral-700);
  border-radius: 4px;
  font-weight: 500;
}
.iq-type-tag {
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

.ai-draft-remove {
  width: 28px;
  height: 28px;
  border: 1px solid var(--iq-border);
  background: var(--iq-neutral-0);
  color: var(--iq-neutral-500);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.ai-draft-remove:hover {
  border-color: var(--iq-state-error);
  color: var(--iq-state-error);
  background: var(--iq-state-error-bg);
}
.ai-draft-remove svg { width: 14px; height: 14px; }

.ai-draft-title {
  font-size: 14px;
  color: var(--iq-neutral-900);
  line-height: 1.7;
  margin-bottom: 8px;
  font-weight: 500;
}
.ai-draft-options {
  font-size: 13px;
  color: var(--iq-neutral-600);
  white-space: pre-wrap;
  background: var(--iq-neutral-50);
  border-radius: var(--iq-radius-small);
  padding: 8px 12px;
  margin-bottom: 8px;
  line-height: 1.7;
}
.ai-draft-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-draft-answer,
.ai-draft-analysis {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.ans-label {
  color: var(--iq-neutral-500);
  flex-shrink: 0;
  font-size: 12px;
  padding: 1px 6px;
  background: var(--iq-neutral-100);
  border-radius: 4px;
}
.ans-value {
  color: var(--iq-state-success);
  font-weight: 600;
}
.ai-draft-analysis {
  color: var(--iq-neutral-600);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-active .iq-modal,
.modal-fade-leave-active .iq-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .iq-modal,
.modal-fade-leave-to .iq-modal {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
