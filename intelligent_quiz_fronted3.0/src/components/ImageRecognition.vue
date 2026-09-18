<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="handleOverlayClick">
        <div class="iq-modal iq-modal-ocr">
          <div class="iq-modal-header">
            <div class="iq-modal-title-wrap">
              <div class="ocr-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <div>
                <h3 class="iq-modal-title">图片识别导入</h3>
                <p class="iq-modal-subtitle">上传题目图片，识别后转为题库格式，确认后导入</p>
              </div>
            </div>
            <button class="iq-modal-close" @click="$emit('close')" aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="iq-modal-body ocr-body">
            <div v-if="!questions.length" class="ocr-upload">
              <div
                class="ocr-drop"
                :class="{ dragging: isDragging }"
                @click="fileInput && fileInput.click()"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style="display: none;"
                  @change="handleFileChange"
                />
                <div v-if="!file" class="ocr-empty">
                  <div class="ocr-big-icon">🖼</div>
                  <div class="ocr-hint">点击或拖拽题目图片到这里</div>
                  <div class="ocr-subhint">支持 PNG / JPG / WebP，单张不超过 5MB</div>
                </div>
                <div v-else class="ocr-preview">
                  <img :src="previewUrl" alt="题目图片预览" />
                  <div class="ocr-preview-meta">
                    <div class="ocr-file-name">{{ file.name }}</div>
                    <div class="ocr-file-size">{{ formatSize(file.size) }}</div>
                    <button class="ocr-remove-file" @click.stop="removeFile">移除图片</button>
                  </div>
                </div>
              </div>

              <div class="ocr-field">
                <label class="ocr-label">导入科目 <span class="ocr-required">*</span></label>
                <select v-model="selectedSubject" class="iq-select">
                  <option value="">请选择导入科目</option>
                  <option v-for="opt in subjectOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <div class="ocr-tip">识别确认后的题目将统一归属到该科目</div>
              </div>
            </div>

            <div v-else class="ocr-result">
              <div class="ocr-summary">
                <span>已识别 <strong>{{ questions.length }}</strong> 道题</span>
                <span>已选择 <strong>{{ selectedCount }}</strong> 道</span>
                <button class="ocr-link-btn" @click="resetAll">重新上传</button>
              </div>

              <div v-if="isMockResult" class="ocr-mock-warning">
                ⚠️ 当前为模拟识别数据，仅用于调试，不能导入正式题库。请配置 GLM_API_KEY 后重新识别。
              </div>

              <div class="ocr-list">
                <div v-for="(q, index) in questions" :key="index" class="ocr-item">
                  <div class="ocr-item-head">
                    <label class="ocr-checkbox-label">
                      <input type="checkbox" v-model="q._selected" class="iq-checkbox" />
                      <span>第 {{ index + 1 }} 题</span>
                    </label>
                    <button class="ocr-remove-btn" @click="removeQuestion(index)">删除</button>
                  </div>

                  <div class="ocr-grid">
                    <div class="ocr-field">
                      <label class="ocr-label">题型</label>
                      <select v-model="q.题型" class="iq-select">
                        <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>
                    <div class="ocr-field">
                      <label class="ocr-label">难度</label>
                      <select v-model="q.难度" class="iq-select">
                        <option v-for="opt in DIFFICULTY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="ocr-field">
                    <label class="ocr-label">题目 <span class="ocr-required">*</span></label>
                    <textarea v-model="q.题目" class="iq-input ocr-textarea" rows="2"></textarea>
                  </div>
                  <div class="ocr-field">
                    <label class="ocr-label">选项</label>
                    <textarea v-model="q.选项" class="iq-input ocr-textarea" rows="3" placeholder="A. ...&#10;B. ..."></textarea>
                  </div>
                  <div class="ocr-grid">
                    <div class="ocr-field">
                      <label class="ocr-label">答案</label>
                      <input v-model="q.答案" type="text" class="iq-input" />
                    </div>
                    <div class="ocr-field">
                      <label class="ocr-label">知识点</label>
                      <input v-model="q.知识点" type="text" class="iq-input" />
                    </div>
                  </div>
                  <div class="ocr-field">
                    <label class="ocr-label">解析</label>
                    <textarea v-model="q.解析" class="iq-input ocr-textarea" rows="2"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="errorMsg" class="ocr-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>
          </div>

          <div class="iq-modal-footer">
            <button type="button" class="iq-btn iq-btn-secondary" @click="handleCancel">
              {{ questions.length ? '关闭' : '取消' }}
            </button>
            <button
              v-if="!questions.length"
              type="button"
              class="iq-btn iq-btn-primary"
              :disabled="recognizing || !file"
              @click="handleRecognize"
            >
              <span v-if="recognizing" class="ocr-spinner"></span>
              {{ recognizing ? '识别中...' : '开始识别' }}
            </button>
            <template v-else>
              <button type="button" class="iq-btn iq-btn-secondary" :disabled="importing" @click="resetQuestions">重新识别</button>
              <button type="button" class="iq-btn iq-btn-primary" :disabled="importing || isMockResult || selectedCount === 0" @click="handleImport">
                <span v-if="importing" class="ocr-spinner"></span>
                {{ importing ? '导入中...' : `导入所选 (${selectedCount})` }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/utils/constants';
import { getSubjects } from '@/api/subject';
import { recognizeQuestionImage, importRecognizedQuestions } from '@/api/formatRecognition';

const props = defineProps({
  visible: { type: Boolean, default: false },
  role: { type: String, default: '' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'success']);

const fileInput = ref(null);
const file = ref(null);
const previewUrl = ref('');
const isDragging = ref(false);
const selectedSubject = ref('');
const recognizing = ref(false);
const importing = ref(false);
const errorMsg = ref('');
const questions = ref([]);
const allSubjects = ref([]);
const isMockResult = ref(false);

const subjectOptions = computed(() => {
  if (props.role === 'teacher') return props.subjects || [];
  return allSubjects.value || [];
});

const selectedCount = computed(() => questions.value.filter((q) => q._selected).length);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadSubjects();
      if (props.role === 'teacher' && props.subjects?.length === 1) {
        selectedSubject.value = props.subjects[0];
      }
    } else {
      setTimeout(resetAll, 200);
    }
  }
);

const loadSubjects = async () => {
  if (props.role === 'teacher') return;
  try {
    const data = await getSubjects();
    allSubjects.value = Array.isArray(data) ? data : [];
  } catch (e) {
    allSubjects.value = [];
  }
};

const handleFileChange = (e) => {
  const f = e.target.files?.[0];
  if (f) setFile(f);
  e.target.value = '';
};

const handleDrop = (e) => {
  isDragging.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) setFile(f);
};

const setFile = (f) => {
  errorMsg.value = '';
  const validType = ['image/png', 'image/jpeg', 'image/webp'].includes(f.type);
  if (!validType && !/\.(png|jpe?g|webp)$/i.test(f.name)) {
    errorMsg.value = '文件格式错误，仅支持 PNG / JPG / JPEG / WebP';
    return;
  }
  if (f.size > 5 * 1024 * 1024) {
    errorMsg.value = '文件过大，不能超过 5MB';
    return;
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = f;
  previewUrl.value = URL.createObjectURL(f);
};

const removeFile = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = null;
  previewUrl.value = '';
  errorMsg.value = '';
};

const resetQuestions = () => {
  questions.value = [];
  errorMsg.value = '';
  isMockResult.value = false;
};

const resetAll = () => {
  resetQuestions();
  removeFile();
  selectedSubject.value = '';
};

const handleRecognize = async () => {
  if (!file.value) {
    errorMsg.value = '请先选择一张题目图片';
    return;
  }
  if (!selectedSubject.value) {
    errorMsg.value = '请先选择导入科目';
    return;
  }
  recognizing.value = true;
  errorMsg.value = '';
  try {
    const data = await recognizeQuestionImage(file.value);
    questions.value = (data.questions || []).map((q) => ({ ...q, _selected: true }));
    isMockResult.value = data.isMock === true;
    if (!questions.value.length) {
      errorMsg.value = data.rawText || '图片中未识别到有效题目';
    }
  } catch (err) {
    errorMsg.value = err.message || '图片识别失败，请稍后重试';
  } finally {
    recognizing.value = false;
  }
};

const removeQuestion = (index) => {
  questions.value.splice(index, 1);
};

const handleImport = async () => {
  const selected = questions.value.filter((q) => q._selected);
  if (!selected.length) {
    errorMsg.value = '请至少选择一道要导入的题目';
    return;
  }
  importing.value = true;
  errorMsg.value = '';
  try {
    const data = await importRecognizedQuestions(selected, selectedSubject.value);
    emit('success', data);
  } catch (err) {
    errorMsg.value = err.message || '导入失败，请稍后重试';
  } finally {
    importing.value = false;
  }
};

const handleCancel = () => {
  if (questions.value.length) {
    if (!window.confirm('确定关闭吗？识别结果尚未导入')) return;
  }
  emit('close');
};

const handleOverlayClick = () => {
  if (recognizing.value || importing.value) return;
  handleCancel();
};

const formatSize = (b) => {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
};
</script>

<style scoped>
.iq-modal-ocr {
  max-width: 960px;
  width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}

.ocr-modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ocr-modal-icon svg {
  width: 20px;
  height: 20px;
}

.ocr-body {
  overflow: auto;
  padding: 20px 24px;
}

.ocr-drop {
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  padding: 18px;
  margin-bottom: 16px;
  text-align: center;
  transition: all 0.2s;
}

.ocr-drop:hover,
.ocr-drop.dragging {
  border-color: #a5b4fc;
  background: #eef2ff;
}

.ocr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
}

.ocr-big-icon {
  font-size: 40px;
}

.ocr-hint {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.ocr-subhint,
.ocr-tip,
.ocr-file-size {
  font-size: 12px;
  color: #94a3b8;
}

.ocr-preview {
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
}

.ocr-preview img {
  max-height: 220px;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  object-fit: contain;
}

.ocr-preview-meta {
  flex: 1;
  min-width: 0;
}

.ocr-file-name {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  word-break: break-all;
}

.ocr-remove-file {
  margin-top: 8px;
  border: 1px solid #fecaca;
  color: #b91c1c;
  background: #fff;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

.ocr-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.ocr-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.ocr-required {
  color: #dc2626;
}

.ocr-tip {
  margin-top: 2px;
}

.ocr-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  border-radius: 10px;
  color: #4338ca;
  font-size: 13px;
}

.ocr-summary strong {
  font-size: 15px;
}

.ocr-link-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #4f46e5;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.ocr-list {
  overflow: auto;
  max-height: 50vh;
  display: grid;
  gap: 14px;
  padding-right: 4px;
}

.ocr-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  background: #fff;
}

.ocr-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.ocr-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
}

.ocr-remove-btn {
  border: 1px solid #fecaca;
  color: #b91c1c;
  background: #fff;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

.ocr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ocr-textarea {
  width: 100%;
  resize: vertical;
}

.ocr-error {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 12px;
}

.ocr-mock-warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 12px;
}

.ocr-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ocr-spin 0.7s linear infinite;
  margin-right: 6px;
  flex-shrink: 0;
}

@keyframes ocr-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .ocr-grid {
    grid-template-columns: 1fr;
  }
  .ocr-preview {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
