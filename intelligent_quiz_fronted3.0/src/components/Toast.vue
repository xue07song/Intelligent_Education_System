<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="visible" class="iq-toast" :class="`iq-toast-${type}`">
        <span class="iq-toast-icon">{{ icon }}</span>
        <span class="iq-toast-message">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' },
  duration: { type: Number, default: 3000 },
});

const visible = ref(false);

const icon = computed(() => {
  const map = { success: '✓', error: '✕', warning: '!', info: 'i' };
  return map[props.type] || 'i';
});

watch(
  () => props.message,
  (val) => {
    if (val) {
      visible.value = true;
      setTimeout(() => {
        visible.value = false;
      }, props.duration);
    }
  }
);
</script>

<style scoped>
.iq-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: var(--iq-radius-medium);
  font-size: 14px;
  z-index: 9999;
  box-shadow: var(--iq-shadow-float);
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  min-width: 240px;
}
.iq-toast-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.iq-toast-success {
  background: var(--iq-state-success-bg);
  color: #047857;
  border: 1px solid #a7f3d0;
}
.iq-toast-success .iq-toast-icon {
  background: var(--iq-state-success);
  color: #fff;
}
.iq-toast-error {
  background: var(--iq-state-error-bg);
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.iq-toast-error .iq-toast-icon {
  background: var(--iq-state-error);
  color: #fff;
}
.iq-toast-warning {
  background: var(--iq-state-warning-bg);
  color: #b45309;
  border: 1px solid #fde68a;
}
.iq-toast-warning .iq-toast-icon {
  background: var(--iq-state-warning);
  color: #fff;
}
.iq-toast-info {
  background: var(--iq-state-info-bg);
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}
.iq-toast-info .iq-toast-icon {
  background: var(--iq-state-info);
  color: #fff;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px);
}
</style>
