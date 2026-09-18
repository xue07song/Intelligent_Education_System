import { defineComponent, h, onUnmounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';

export async function confirmQuestionChange(message, title = '请确认') {
  try {
    await ElMessageBox.confirm(message, title, { confirmButtonText: '确认', cancelButtonText: '取消', distinguishCancelAndClose: true });
    return true;
  } catch { return false; }
}

export async function confirmQuestionDeletion(item) {
  const summary = String(item.题目 || '').slice(0, 80);
  if (!await confirmQuestionChange(`题目 ID：${item.id}\n题干：${summary}\n删除后无法恢复，是否继续？`, '删除题目')) return false;
  return new Promise((resolve) => {
    let accepted = false;
    const Countdown = defineComponent({
      setup() {
        const remaining = ref(3);
        const deadline = Date.now() + 3000;
        const timer = setInterval(() => { remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); }, 100);
        onUnmounted(() => clearInterval(timer));
        return () => h('div', [
          h('p', `题目 ID：${item.id}。请再次确认永久删除。`),
          h('button', { class: 'iq-btn iq-btn-primary', disabled: remaining.value > 0, onClick: () => {
            if (Date.now() < deadline) return;
            accepted = true;
            ElMessageBox.close();
            resolve(true);
          } }, remaining.value ? `请等待 ${remaining.value} 秒` : '确认永久删除'),
        ]);
      },
    });
    ElMessageBox({ title: '第二次删除确认', message: h(Countdown), showConfirmButton: false,
      showCancelButton: true, cancelButtonText: '取消', closeOnClickModal: false,
    }).then(() => resolve(accepted), () => resolve(accepted));
  });
}
