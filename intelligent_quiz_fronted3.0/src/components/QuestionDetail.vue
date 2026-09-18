<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="$emit('close')">
        <div class="iq-modal iq-modal-lg">
          <div class="iq-modal-header">
            <div class="iq-modal-title-wrap">
              <div class="iq-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div>
                <h3 class="iq-modal-title">题目详情</h3>
                <p class="iq-modal-subtitle">查看题目的完整信息</p>
              </div>
            </div>
            <button class="iq-modal-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div v-if="data.id" class="iq-modal-body">
            <div class="iq-detail-grid">
              <div class="iq-detail-item">
                <div class="iq-detail-label">ID</div>
                <div class="iq-detail-value">
                  <span class="iq-id-chip">{{ data.id }}</span>
                </div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">章节</div>
                <div class="iq-detail-value">{{ data.章节 || '--' }}</div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">题型</div>
                <div class="iq-detail-value">
                  <span class="iq-type-tag" :class="`type-${data.题型}`">{{ getTypeName(data.题型) }}</span>
                </div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">序号</div>
                <div class="iq-detail-value">{{ data.序号 }}</div>
              </div>
            </div>

            <div class="iq-detail-block">
              <div class="iq-detail-label-block">题目内容</div>
              <div class="iq-detail-content q-content">{{ data.题目 }}</div>
            </div>

            <div v-if="data.选项" class="iq-detail-block">
              <div class="iq-detail-label-block">选项</div>
              <div class="iq-detail-content q-options">{{ data.选项 }}</div>
            </div>

            <div class="iq-detail-grid">
              <div class="iq-detail-item">
                <div class="iq-detail-label">答案</div>
                <div class="iq-detail-value">
                  <span class="iq-answer-chip">{{ data.答案 || '--' }}</span>
                </div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">难度</div>
                <div class="iq-detail-value">
                  <span class="iq-diff-tag" :class="`diff-${data.难度}`">{{ getDifficultyLabel(data.难度) }}</span>
                </div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">知识点</div>
                <div class="iq-detail-value">{{ data.知识点 || '--' }}</div>
              </div>
              <div class="iq-detail-item">
                <div class="iq-detail-label">使用频率</div>
                <div class="iq-detail-value">{{ data.使用频率 ?? 0 }}</div>
              </div>
            </div>

            <div v-if="data.解析" class="iq-detail-block">
              <div class="iq-detail-label-block">解析</div>
              <div class="iq-detail-content q-analysis">{{ data.解析 }}</div>
            </div>

            <div class="iq-detail-grid">
              <div class="iq-detail-item">
                <div class="iq-detail-label">出题人</div>
                <div class="iq-detail-value">{{ data.出题人 || '--' }}</div>
              </div>
            </div>

            <div class="iq-modal-footer">
              <button class="iq-btn iq-btn-secondary" @click="$emit('close')">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { getTypeName, getDifficultyLabel } from '@/utils/constants';

defineProps({
  visible: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
});

defineEmits(['close']);
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
  background: var(--iq-state-info-bg);
  color: var(--iq-state-info);
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

.iq-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.iq-detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--iq-neutral-50);
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
}
.iq-detail-label {
  font-size: 12px;
  color: var(--iq-neutral-500);
}
.iq-detail-value {
  font-size: 14px;
  color: var(--iq-neutral-800);
  font-weight: 500;
  word-break: break-word;
}

.iq-detail-block {
  margin-bottom: 18px;
  padding: 16px 18px;
  background: var(--iq-neutral-50);
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
}
.iq-detail-label-block {
  font-size: 12px;
  font-weight: 600;
  color: var(--iq-neutral-600);
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
.iq-detail-content {
  font-size: 14px;
  color: var(--iq-neutral-800);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}
.q-content {
  font-size: 15px;
  color: var(--iq-neutral-900);
  font-weight: 500;
}
.q-analysis {
  color: var(--iq-neutral-600);
  padding: 10px 14px;
  background: var(--iq-state-info-bg);
  border-radius: var(--iq-radius-small);
  border-left: 3px solid var(--iq-state-info);
}
.q-options {
  padding: 10px 14px;
  background: var(--iq-neutral-0);
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-small);
  white-space: pre-line;
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
.iq-answer-chip {
  display: inline-block;
  min-width: 28px;
  text-align: center;
  padding: 2px 10px;
  background: var(--iq-primary-50);
  color: var(--iq-primary-700);
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
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

.iq-diff-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.diff-1, .diff-\31星 { background: #dcfce7; color: #166534; }
.diff-2, .diff-\32星 { background: #d9f99d; color: #3f6212; }
.diff-3, .diff-\33星 { background: #fef9c3; color: #854d0e; }
.diff-4, .diff-\34星 { background: #fed7aa; color: #9a3412; }
.diff-5, .diff-\35星 { background: #fee2e2; color: #991b1b; }

.iq-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  margin-top: 20px;
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
