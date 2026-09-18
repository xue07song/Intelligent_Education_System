<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay" @click.self="$emit('close')">
        <div class="iq-modal iq-modal-sm">
          <div class="iq-modal-header">
            <h3 class="iq-modal-title">修改密码</h3>
            <button class="iq-modal-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form class="iq-modal-body" @submit.prevent="handleSubmit">
            <div class="iq-form-field">
              <label class="iq-form-label">原密码</label>
              <input v-model="form.oldPassword" type="password" class="iq-input" placeholder="请输入原密码" />
            </div>
            <div class="iq-form-field">
              <label class="iq-form-label">新密码</label>
              <input v-model="form.newPassword" type="password" class="iq-input" placeholder="至少6位" />
            </div>
            <div class="iq-form-field">
              <label class="iq-form-label">确认新密码</label>
              <input v-model="form.confirmPassword" type="password" class="iq-input" placeholder="再次输入新密码" />
            </div>

            <div v-if="errorMsg" class="iq-form-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMsg }}
            </div>

            <div class="iq-modal-footer">
              <button type="button" class="iq-btn iq-btn-secondary" @click="$emit('close')">取消</button>
              <button type="submit" class="iq-btn iq-btn-primary" :disabled="loading">
                <span v-if="loading" class="iq-btn-spinner"></span>
                {{ loading ? '提交中...' : '确认修改' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { changePassword } from '@/api/auth';

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'success']);

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const loading = ref(false);
const errorMsg = ref('');

watch(() => props.visible, (val) => {
  if (!val) {
    setTimeout(() => {
      Object.assign(form, { oldPassword: '', newPassword: '', confirmPassword: '' });
      errorMsg.value = '';
    }, 200);
  }
});

const handleSubmit = async () => {
  errorMsg.value = '';

  if (!form.oldPassword || !form.newPassword) {
    errorMsg.value = '原密码和新密码不能为空';
    return;
  }
  if (form.newPassword.length < 6) {
    errorMsg.value = '新密码长度不能少于6位';
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    errorMsg.value = '两次输入的新密码不一致';
    return;
  }

  loading.value = true;
  try {
    await changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });
    emit('success');
    Object.assign(form, { oldPassword: '', newPassword: '', confirmPassword: '' });
  } catch (err) {
    errorMsg.value = err.message || '密码修改失败';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.iq-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--iq-border);
}
.iq-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--iq-neutral-900);
  margin: 0;
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

.iq-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.iq-form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--iq-neutral-700);
}
.iq-form-alert-error {
  display: flex;
  align-items: center;
  gap: 6px;
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
