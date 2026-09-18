<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="handleClose">
        <div class="iq-modal iq-modal-xl">
          <div class="iq-modal-header">
            <div class="iq-modal-title-wrap">
              <div class="iq-modal-icon" :style="{ background: isEdit ? 'var(--iq-state-warning-bg)' : 'var(--iq-primary-50)', color: isEdit ? 'var(--iq-state-warning)' : 'var(--iq-primary-600)' }">
                <svg v-if="!isEdit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="iq-modal-title">{{ isEdit ? '编辑题目' : '新增题目' }}</h3>
                <p class="iq-modal-subtitle">{{ isEdit ? '修改题目信息后点击确认保存' : '填写题目信息后点击确认创建' }}</p>
              </div>
            </div>
            <button class="iq-modal-close" @click="handleClose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form class="iq-modal-body" @submit.prevent="handleSubmit">
            <div class="iq-form-grid">
              <div class="iq-form-field">
                <label class="iq-form-label">ID <span class="iq-req">*</span></label>
                <input v-model="form.id" class="iq-input" placeholder="如 Q001" :disabled="isEdit" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">章节</label>
                <input v-model.number="form.章节" type="number" class="iq-input" placeholder="章节编号" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">科目 <span class="iq-req">*</span></label>
                <select v-model="form.科目" class="iq-select">
                  <option value="">请选择科目</option>
                  <option v-for="opt in subjectOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">题型 <span class="iq-req">*</span></label>
                <select v-model="form.题型" class="iq-select">
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">序号</label>
                <input v-model.number="form.序号" type="number" class="iq-input" placeholder="章节内排序" />
              </div>
            </div>

            <div class="iq-form-field">
              <label class="iq-form-label">题目内容 <span class="iq-req">*</span></label>
              <textarea v-model="form.题目" rows="4" class="iq-textarea" placeholder="请输入题目内容"></textarea>
            </div>

            <div class="iq-form-field">
              <label class="iq-form-label">选项</label>
              <textarea v-model="form.选项" rows="3" class="iq-textarea" placeholder="例如：A.北京 B.上海 C.广州 D.深圳"></textarea>
            </div>

            <div class="iq-form-grid">
              <div class="iq-form-field">
                <label class="iq-form-label">答案</label>
                <input v-model="form.答案" class="iq-input" placeholder="如 A" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">解析</label>
                <input v-model="form.解析" class="iq-input" placeholder="答案解析" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">难度 <span class="iq-req">*</span></label>
                <select v-model="form.难度" class="iq-select">
                  <option value="">请选择难度</option>
                  <option v-for="opt in difficultyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">知识点</label>
                <input v-model="form.知识点" class="iq-input" placeholder="关联知识点" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">使用频率</label>
                <input v-model="form.使用频度" class="iq-input" placeholder="如 0" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">出题人</label>
                <input v-model="form.出题人" class="iq-input" placeholder="出题人姓名" />
              </div>
            </div>

            <div class="iq-modal-footer">
              <button type="button" class="iq-btn iq-btn-secondary" @click="handleClose">取消</button>
              <button type="submit" class="iq-btn iq-btn-primary" :disabled="submitting.value">
                <span v-if="submitting.value" class="iq-btn-spinner"></span>
                {{ submitting.value ? '提交中...' : (isEdit ? '确认修改' : '确认新增') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, watch, ref, onMounted, computed } from 'vue';
import { confirmQuestionChange } from './questionSafety';
import { TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/utils/constants';
import { getSubjects } from '@/api/subject';

const props = defineProps({
  visible: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
  isEdit: { type: Boolean, default: false },
  role: { type: String, default: '' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'submit']);

const typeOptions = TYPE_OPTIONS;
const difficultyOptions = DIFFICULTY_OPTIONS;

const allSubjects = ref([]);

const subjectOptions = computed(() => {
  if (props.role === 'teacher') {
    return props.subjects || [];
  }
  return allSubjects.value || [];
});

const defaultForm = () => ({
  id: '',
  章节: '',
  题型: 2,
  序号: 0,
  题目: '',
  选项: '',
  答案: '',
  解析: '',
  难度: '',
  知识点: '',
  使用频度: '',
  出题人: '',
  科目: '',
});

const form = reactive(defaultForm());
const originalForm = ref({});
const changedFields = () => Object.keys(defaultForm()).filter(key => String(form[key] ?? '') !== String(originalForm.value[key] ?? ''));
let confirming = false;
const handleClose = async () => {
  if (confirming) return;
  confirming = true;
  try {
    if (changedFields().length && !await confirmQuestionChange('表单有未保存修改，确定放弃并关闭吗？', '未保存修改')) return;
    emit('close');
  } finally { confirming = false; }
};
const submitting = reactive({ value: false });

watch(
  () => [props.visible, props.data, props.isEdit],
  () => {
    if (props.visible) {
      Object.assign(form, defaultForm(), props.data);
      if (!form.题型) form.题型 = 2;
      originalForm.value = { ...form };
    }
  },
  { immediate: true }
);

const parseOptionKeys = (optionsText) => {
  const text = String(optionsText || '').trim();
  if (!text) return [];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 1) {
    const tokens = lines[0].split(/(?=[A-Za-z]\s*[.、)）:：])/).map((token) => token.trim()).filter(Boolean);
    if (tokens.length > 1) {
      lines.length = 0;
      lines.push(...tokens);
    }
  }
  const keys = [];
  lines.forEach((line) => {
    const match = line.match(/^([A-Za-z])\s*[.、)）:：]?\s*(.*)$/);
    if (match) keys.push(match[1].toUpperCase());
  });
  return keys;
};

const validateForm = () => {
  if (!form.id || !form.id.trim()) return 'ID不能为空';
  if (!form.题目 || !form.题目.trim()) return '题目内容不能为空';
  if (!form.科目 || !form.科目.trim()) return '科目不能为空';
  if (!form.难度) return '难度不能为空';
  const type = Number(form.题型);
  const answer = String(form.答案 || '').trim();
  const optionsText = String(form.选项 || '').trim();
  if (type === 1) {
    if (!answer) return '判断题必须填写答案';
    if (!/^(对|错|正确|错误|T|F|√|×|是|否|1|0)$/i.test(answer)) {
      return '判断题答案需为 对/错、T/F、正确/错误、√/× 等';
    }
  } else if (type === 2 || type === 3) {
    const keys = parseOptionKeys(optionsText);
    if (keys.length < 2) return '选择题至少需要两个选项';
    if (!answer) return '选择题必须填写答案';
    const answerLetters = answer.toUpperCase().replace(/[；;，,、\s]/g, '').split('').filter((ch) => /^[A-Z]$/.test(ch));
    if (answerLetters.length === 0) return '答案中未识别出有效选项字母';
    const invalid = answerLetters.filter((ch) => !keys.includes(ch));
    if (invalid.length) return `答案包含不存在的选项：${invalid.join('、')}`;
    if (type === 2 && answerLetters.length !== 1) return '单选题答案只能是一个选项';
    if (type === 3 && new Set(answerLetters).size < 2) return '多选题答案至少需要两个选项';
  } else if (type === 4) {
    if (!answer) return '填空题必须填写答案';
  }
  return '';
};

const handleSubmit = async () => {
  if (confirming || submitting.value) return;
  const errorMsg = validateForm();
  if (errorMsg) {
    alert(errorMsg);
    return;
  }
  if (props.isEdit) {
    confirming = true;
    try {
      if (!await confirmQuestionChange(`题目 ID：${form.id}\n题干摘要：${String(form.题目).slice(0, 80)}\n变化字段：${changedFields().join('、') || '无'}`, '确认修改题目')) return;
    } finally { confirming = false; }
  }
  submitting.value = true;
  try {
    const payload = { ...form };
    if (payload.章节 === '' || payload.章节 === null) payload.章节 = 0;
    if (payload.序号 === '' || payload.序号 === null) payload.序号 = 0;
    await emit('submit', payload);
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  if (props.role === 'admin') {
    try {
      allSubjects.value = await getSubjects();
    } catch (e) {
      console.warn('加载科目列表失败:', e);
    }
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

.iq-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.iq-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.iq-form-grid .iq-form-field {
  margin-bottom: 0;
}
.iq-form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--iq-neutral-700);
}
.iq-req {
  color: var(--iq-state-error);
  margin-left: 2px;
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
