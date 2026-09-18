<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="$emit('close')">
        <div class="iq-modal iq-modal-lg">
          <div class="iq-modal-header">
            <div class="iq-modal-title-wrap">
              <div class="iq-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <div>
                <h3 class="iq-modal-title">批量导入题目</h3>
                <p class="iq-modal-subtitle">支持 Excel .xlsx / .xls 格式，单文件 ≤ 5MB</p>
              </div>
            </div>
            <button class="iq-modal-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="iq-modal-body">
            <div
              class="iq-import-drop"
              :class="{ 'has-file': !!selectedFile, dragging: isDragging }"
              @click="$refs.fileInput.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls"
                style="display:none;"
                @change="handleFileChange"
              />
              <div v-if="!selectedFile" class="iq-import-empty">
                <div class="iq-import-big-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div class="iq-import-hint iq-text-md iq-font-medium">点击或拖拽 Excel 文件到这里</div>
                <div class="iq-import-subhint iq-text-sm iq-text-muted">仅支持 .xlsx 或 .xls 格式，文件大小不超过 5MB</div>
              </div>
              <div v-else class="iq-import-file">
                <div class="iq-import-file-icon">📊</div>
                <div class="iq-import-file-detail">
                  <div class="iq-import-file-name">{{ selectedFile.name }}</div>
                  <div class="iq-import-file-size iq-text-sm iq-text-muted">{{ formatSize(selectedFile.size) }}</div>
                </div>
                <button class="iq-import-remove" @click.stop="removeFile" title="移除文件">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div class="iq-form-field" style="margin-bottom: 16px;">
              <label class="iq-form-label">导入科目 <span class="iq-req">*</span></label>
              <select v-model="selectedSubject" class="iq-select">
                <option value="">请选择统一导入的科目</option>
                <option v-for="opt in subjectOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <div class="iq-text-sm iq-text-muted" style="margin-top: 4px;">
                本次导入的所有题目将归属到此科目
              </div>
            </div>

            <div class="iq-import-tips">
              <div class="iq-import-tips-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Excel 字段说明
              </div>
              <ul class="iq-import-tips-list">
                <li><strong class="tip-req">必填：</strong><code>题目</code> / <code>题型</code>（1判断 2单选 3多选 4填空 5简答 6程序论述）/ <code>难度</code>（1-5 或 1星-5星）</li>
                <li><strong class="tip-req">答案要求：</strong>判断、单选、多选、填空题必须填写<code>答案</code>；选择/填空题还需填写<code>选项</code>，答案须为有效选项字母</li>
                <li><strong class="tip-opt">可选：</strong><code>ID</code> / <code>章节</code> / <code>序号</code> / <code>解析</code> / <code>知识点</code> / <code>使用频率</code> / <code>出题人</code></li>
                <li>若 ID 与数据库已有记录重复则自动跳过</li>
              </ul>
            </div>

            <div v-if="errorMsg" class="iq-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMsg }}
            </div>

            <div v-if="result" class="iq-import-result" :class="{ 'has-warn': result.invalid > 0 || result.skipped > 0 }">
              <div class="iq-import-result-item success">
                <span class="result-dot"></span>
                <span>成功导入：<strong>{{ result.inserted }}</strong> 条</span>
              </div>
              <div v-if="result.skipped > 0" class="iq-import-result-item warn">
                <span class="result-dot"></span>
                <span>重复跳过：<strong>{{ result.skipped }}</strong> 条</span>
              </div>
              <div v-if="result.invalid > 0" class="iq-import-result-item error">
                <span class="result-dot"></span>
                <span>无效数据：<strong>{{ result.invalid }}</strong> 条</span>
              </div>
            </div>

            <div class="iq-modal-footer">
              <button class="iq-btn iq-btn-secondary" @click="$emit('close')">{{ result ? '关闭' : '取消' }}</button>
              <button
                v-if="!result"
                class="iq-btn iq-btn-primary"
                :disabled="!selectedFile || loading"
                @click="handleSubmit"
              >
                <span v-if="loading" class="iq-btn-spinner"></span>
                {{ loading ? '导入中...' : '开始导入' }}
              </button>
              <button v-else class="iq-btn iq-btn-primary" @click="resetAndContinue">继续导入</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { batchImportQuestions } from '@/api/question';
import { getSubjects } from '@/api/subject';

const props = defineProps({
  visible: { type: Boolean, default: false },
  role: { type: String, default: '' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'success']);

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const result = ref(null);
const allSubjects = ref([]);
const selectedSubject = ref('');

const subjectOptions = computed(() => {
  if (props.role === 'teacher') {
    return props.subjects || [];
  }
  return allSubjects.value || [];
});

watch(() => props.visible, (val) => {
  if (val) {
    // 教师单科目时自动选中
    if (props.role === 'teacher' && props.subjects?.length === 1) {
      selectedSubject.value = props.subjects[0];
    }
  } else {
    setTimeout(() => {
      selectedFile.value = null;
      result.value = null;
      errorMsg.value = '';
      selectedSubject.value = '';
    }, 200);
  }
});

const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (file) setFile(file);
  e.target.value = '';
};

const handleDrop = (e) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) setFile(file);
};

const setFile = (file) => {
  errorMsg.value = '';
  result.value = null;

  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    errorMsg.value = '文件格式错误，仅支持 .xlsx 或 .xls';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = '文件过大，不能超过 5MB';
    return;
  }
  selectedFile.value = file;
};

const removeFile = () => {
  selectedFile.value = null;
  errorMsg.value = '';
  result.value = null;
};

const formatSize = (b) => {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
};

const handleSubmit = async () => {
  if (!selectedFile.value) return;
  if (!selectedSubject.value) {
    errorMsg.value = '请先选择要导入的科目';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await batchImportQuestions(selectedFile.value, selectedSubject.value);
    result.value = {
      inserted: data.inserted ?? 0,
      skipped: data.skipped ?? 0,
      invalid: data.invalid ?? 0,
    };
    emit('success', result.value);
  } catch (err) {
    errorMsg.value = err.message || '导入失败，请稍后重试';
    result.value = null;
  } finally {
    loading.value = false;
  }
};

const resetAndContinue = () => {
  selectedFile.value = null;
  result.value = null;
  errorMsg.value = '';
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
  background: var(--iq-primary-50);
  color: var(--iq-primary-600);
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

.iq-import-drop {
  border: 2px dashed var(--iq-border);
  border-radius: var(--iq-radius-large);
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
  background: var(--iq-neutral-50);
}
.iq-import-drop:hover,
.iq-import-drop.dragging {
  border-color: var(--iq-primary);
  background: var(--iq-primary-50);
}
.iq-import-drop.has-file {
  border-style: solid;
  cursor: default;
  background: var(--iq-neutral-0);
}
.iq-import-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.iq-import-big-icon {
  width: 56px;
  height: 56px;
  background: var(--iq-primary-50);
  color: var(--iq-primary-500);
  border-radius: var(--iq-radius-large);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.iq-import-big-icon svg { width: 28px; height: 28px; }
.iq-import-hint { color: var(--iq-neutral-800); }
.iq-import-subhint { margin-top: 2px; }

.iq-import-file {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.iq-import-file-icon {
  font-size: 36px;
  flex-shrink: 0;
}
.iq-import-file-detail {
  text-align: left;
  flex: 1;
  max-width: 360px;
}
.iq-import-file-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--iq-neutral-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.iq-import-remove {
  width: 32px;
  height: 32px;
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
.iq-import-remove:hover {
  border-color: var(--iq-state-error);
  color: var(--iq-state-error);
  background: var(--iq-state-error-bg);
}
.iq-import-remove svg { width: 16px; height: 16px; }

.iq-import-tips {
  background: var(--iq-neutral-50);
  border-radius: var(--iq-radius-medium);
  padding: 14px 18px;
  margin-bottom: 16px;
  border: 1px solid var(--iq-border);
}
.iq-import-tips-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--iq-neutral-800);
  margin-bottom: 8px;
}
.iq-import-tips-list {
  margin: 0;
  padding-left: 22px;
  font-size: 13px;
  color: var(--iq-neutral-600);
}
.iq-import-tips-list li {
  line-height: 1.9;
}
.iq-import-tips-list code {
  background: var(--iq-neutral-0);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--iq-font-mono);
  font-size: 12px;
  color: var(--iq-primary-700);
  border: 1px solid var(--iq-border);
}
.tip-req { color: var(--iq-state-error); }
.tip-opt { color: var(--iq-state-info); }

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

.iq-import-result {
  background: var(--iq-state-success-bg);
  border: 1px solid #a7f3d0;
  border-radius: var(--iq-radius-medium);
  padding: 14px 18px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.iq-import-result.has-warn {
  background: var(--iq-state-warning-bg);
  border-color: #fde68a;
}
.iq-import-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--iq-neutral-700);
}
.result-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.iq-import-result-item.success { color: #047857; }
.iq-import-result-item.success .result-dot { background: var(--iq-state-success); }
.iq-import-result-item.warn { color: #b45309; }
.iq-import-result-item.warn .result-dot { background: var(--iq-state-warning); }
.iq-import-result-item.error { color: #b91c1c; }
.iq-import-result-item.error .result-dot { background: var(--iq-state-error); }

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
