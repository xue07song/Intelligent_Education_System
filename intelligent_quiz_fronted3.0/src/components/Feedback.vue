<template>
  <div class="iq-feedback">
    <!-- 列表视图 -->
    <template v-if="view === 'list'">
      <div class="iq-page-header">
        <div>
          <h2 class="iq-text-xl iq-font-semibold" style="color: var(--iq-neutral-900); margin: 0;">
            💬 用户反馈
          </h2>
          <p class="iq-text-sm iq-text-muted" style="margin: 4px 0 0;">
            {{ isAdmin ? '查看和处理所有用户反馈' : '提交建议、报告问题，帮助我们改进系统' }}
          </p>
        </div>
        <button class="iq-btn iq-btn-primary" @click="openCreateModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          提交反馈
        </button>
      </div>

      <!-- 筛选栏 -->
      <div class="iq-card iq-filter-card">
        <div class="iq-filter-grid">
          <div class="iq-filter-field">
            <label class="iq-filter-label">分类</label>
            <select v-model="filters.category" class="iq-select" @change="handleFilterChange">
              <option value="">全部</option>
              <option value="bug">🐛 Bug 故障</option>
              <option value="suggestion">💡 功能建议</option>
              <option value="other">📝 其他</option>
            </select>
          </div>
          <div class="iq-filter-field">
            <label class="iq-filter-label">状态</label>
            <select v-model="filters.status" class="iq-select" @change="handleFilterChange">
              <option value="">全部</option>
              <option value="pending">⏳ 待处理</option>
              <option value="processing">🔄 处理中</option>
              <option value="resolved">✅ 已处理</option>
              <option value="closed">🔒 已关闭</option>
            </select>
          </div>
          <div class="iq-filter-actions">
            <button class="iq-btn iq-btn-secondary" @click="resetFilter">重置</button>
          </div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="iq-table-loading">
        <span class="iq-loading-spinner"></span>
        <span class="iq-text-sm iq-text-muted">加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="list.length === 0" class="iq-card">
        <div class="iq-empty-box">
          <div class="iq-empty-icon">📭</div>
          <div class="iq-text-base" style="color: var(--iq-neutral-600);">暂无反馈记录</div>
          <div class="iq-text-sm iq-text-muted">点击「提交反馈」告诉我们你的想法</div>
        </div>
      </div>

      <!-- 反馈列表 -->
      <div v-else class="iq-card">
        <div class="iq-table-wrap">
          <table class="iq-table">
            <thead>
            <tr>
              <th>ID</th>
              <th v-if="isAdmin">用户名</th>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>回复</th>
              <th>提交时间</th>
              <th style="width: 160px;">操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in list" :key="item.id">
              <td><span class="iq-id-chip">{{ item.id }}</span></td>
              <td v-if="isAdmin">
                <span class="iq-id-chip">{{ item.user_name || item.user_id }}</span>
              </td>
              <td class="iq-font-medium" style="color: var(--iq-neutral-800);">{{ item.title }}</td>
              <td><span class="iq-tag" :class="categoryTagClass(item.category)">{{ categoryLabel(item.category) }}</span></td>
              <td><span class="iq-tag" :class="statusTagClass(item.status)">{{ statusLabel(item.status) }}</span></td>
              <td>
                <span v-if="item.replied_at" class="iq-tag iq-tag-success">已回复</span>
                <span v-else class="iq-tag iq-tag-neutral">-</span>
              </td>
              <td class="iq-text-sm iq-text-muted">{{ formatTime(item.created_at) }}</td>
              <td>
                <div class="iq-action-group">
                  <button class="iq-btn iq-btn-primary iq-btn-sm" @click="openDetail(item.id)">详情</button>
                  <button class="iq-btn iq-btn-danger iq-btn-sm" @click="handleDelete(item)">删除</button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <Pagination
            v-model:page="page"
            v-model:pageSize="pageSize"
            :total="total"
            @change="loadList"
        />
      </div>
    </template>

    <!-- 详情视图 -->
    <template v-if="view === 'detail'">
      <div class="iq-sub-header">
        <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="backToList">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回列表
        </button>
      </div>

      <div v-if="detailLoading" class="iq-table-loading">
        <span class="iq-loading-spinner"></span>
        <span class="iq-text-sm iq-text-muted">加载中...</span>
      </div>

      <template v-else-if="detail">
        <!-- 反馈内容卡片 -->
        <div class="iq-card iq-feedback-detail">
          <div class="iq-detail-header">
            <div class="iq-detail-title-row">
              <h3 class="iq-text-lg iq-font-semibold" style="color: var(--iq-neutral-900); margin: 0;">
                {{ detail.title }}
              </h3>
              <span class="iq-tag" :class="statusTagClass(detail.status)">{{ statusLabel(detail.status) }}</span>
            </div>
            <div class="iq-detail-meta">
              <span class="iq-tag" :class="categoryTagClass(detail.category)">{{ categoryLabel(detail.category) }}</span>
              <span class="iq-text-sm iq-text-muted">反馈 #{{ detail.id }}</span>
              <span v-if="isAdmin" class="iq-text-sm iq-text-muted">用户名: {{ detail.user_name || detail.user_id }}</span>
              <span class="iq-text-sm iq-text-muted">提交于 {{ formatTime(detail.created_at) }}</span>
            </div>
          </div>

          <div class="iq-detail-content">
            <div class="iq-content-label">反馈内容</div>
            <div class="iq-content-text">{{ detail.content }}</div>
          </div>

          <div v-if="detail.contact" class="iq-detail-contact">
            <span class="iq-text-sm iq-text-muted">联系方式：</span>
            <span class="iq-text-sm iq-font-medium" style="color: var(--iq-neutral-700);">{{ detail.contact }}</span>
          </div>
        </div>

        <!-- 管理员回复区 -->
        <div v-if="detail.reply" class="iq-card iq-reply-card">
          <div class="iq-reply-header">
            <div class="iq-reply-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span class="iq-font-semibold iq-text-base" style="color: var(--iq-neutral-900);">管理员回复</span>
            <span class="iq-text-sm iq-text-muted" style="margin-left: auto;">{{ formatTime(detail.replied_at) }}</span>
          </div>
          <div class="iq-reply-text">{{ detail.reply }}</div>
        </div>

        <!-- 管理员操作区 -->
        <div v-if="isAdmin" class="iq-card iq-admin-actions">
          <div class="iq-admin-action-row">
            <div class="iq-action-label">
              <span class="iq-font-semibold iq-text-base" style="color: var(--iq-neutral-900);">处理状态</span>
            </div>
            <select
                :value="detail.status"
                class="iq-select"
                style="width: auto; min-width: 160px;"
                @change="handleStatusChange($event.target.value)"
            >
              <option value="pending">⏳ 待处理</option>
              <option value="processing">🔄 处理中</option>
              <option value="resolved">✅ 已处理</option>
              <option value="closed">🔒 已关闭</option>
            </select>
          </div>

          <div class="iq-admin-action-row">
            <div class="iq-action-label">
              <span class="iq-font-semibold iq-text-base" style="color: var(--iq-neutral-900);">回复反馈</span>
              <span class="iq-text-xs iq-text-muted" style="margin-top: 2px;">回复后状态将自动变为「已处理」</span>
            </div>
            <div class="iq-reply-form">
              <textarea
                  v-model="replyText"
                  class="iq-textarea"
                  placeholder="输入回复内容..."
                  rows="3"
              ></textarea>
              <button
                  class="iq-btn iq-btn-primary"
                  :disabled="!replyText.trim() || replyLoading"
                  @click="handleReply"
              >
                <span v-if="replyLoading" class="iq-btn-spinner"></span>
                {{ replyLoading ? '提交中...' : '发送回复' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="iq-card">
        <div class="iq-empty-box">
          <div class="iq-empty-icon">❓</div>
          <div class="iq-text-base" style="color: var(--iq-neutral-600);">反馈不存在或已被删除</div>
        </div>
      </div>
    </template>

    <!-- 提交反馈弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="createVisible" class="iq-modal-overlay" @click.self="closeCreateModal">
          <div class="iq-modal iq-modal-md">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" style="background: var(--iq-primary-50); color: var(--iq-primary-600);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">提交反馈</h3>
                  <p class="iq-modal-subtitle">告诉我们你的建议或遇到的问题</p>
                </div>
              </div>
              <button class="iq-modal-close" @click="closeCreateModal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form class="iq-modal-body" @submit.prevent="handleCreate">
              <div class="iq-form-field">
                <label class="iq-form-label">反馈类型</label>
                <div class="iq-category-grid">
                  <label
                      v-for="cat in categories"
                      :key="cat.value"
                      class="iq-category-option"
                      :class="{ active: form.category === cat.value }"
                  >
                    <input type="radio" :value="cat.value" v-model="form.category" />
                    <span class="iq-cat-icon">{{ cat.icon }}</span>
                    <span class="iq-cat-text">{{ cat.label }}</span>
                  </label>
                </div>
              </div>

              <div class="iq-form-field">
                <label class="iq-form-label">标题 <span class="iq-req">*</span></label>
                <input
                    v-model="form.title"
                    class="iq-input"
                    placeholder="简短描述问题或建议"
                    maxlength="100"
                />
              </div>

              <div class="iq-form-field">
                <label class="iq-form-label">详细内容 <span class="iq-req">*</span></label>
                <textarea
                    v-model="form.content"
                    class="iq-textarea"
                    placeholder="请详细描述你遇到的问题或建议..."
                    rows="5"
                ></textarea>
              </div>

              <div class="iq-form-field">
                <label class="iq-form-label">联系方式 <span class="iq-text-xs iq-text-muted">（可选）</span></label>
                <input
                    v-model="form.contact"
                    class="iq-input"
                    placeholder="填写邮箱或中国大陆手机号"
                    maxlength="100"
                    @input="contactError = ''"
                />
                <div v-if="contactError" class="iq-contact-error">{{ contactError }}</div>
              </div>

              <div class="iq-modal-footer">
                <button type="button" class="iq-btn iq-btn-secondary" @click="closeCreateModal">取消</button>
                <button type="submit" class="iq-btn iq-btn-primary" :disabled="createLoading">
                  <span v-if="createLoading" class="iq-btn-spinner"></span>
                  {{ createLoading ? '提交中...' : '提交反馈' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  createFeedback,
  getMyFeedback,
  getFeedbackDetail,
  deleteFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  replyFeedback,
} from '@/api/feedback';
import { formatTime } from '@/utils/format';
import Pagination from '@/components/Pagination.vue';

const props = defineProps({
  role: { type: String, required: true },
});

const emit = defineEmits(['toast']);

const isAdmin = computed(() => props.role === 'admin');

// ===== 视图状态 =====
const view = ref('list');

// ===== 列表 =====
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const filters = reactive({
  category: '',
  status: '',
});

const loadList = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;

    const data = isAdmin.value
        ? await getAllFeedback(params)
        : await getMyFeedback(params);
    list.value = data.list;
    total.value = data.total;
  } catch (err) {
    emit('toast', { message: err.message || '加载反馈列表失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = () => {
  page.value = 1;
  loadList();
};

const resetFilter = () => {
  filters.category = '';
  filters.status = '';
  page.value = 1;
  loadList();
};

// ===== 详情 =====
const detail = ref(null);
const detailLoading = ref(false);

const openDetail = async (id) => {
  view.value = 'detail';
  detailLoading.value = true;
  try {
    detail.value = await getFeedbackDetail(id);
  } catch (err) {
    emit('toast', { message: err.message || '加载详情失败', type: 'error' });
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
};

const backToList = () => {
  view.value = 'list';
  detail.value = null;
  replyText.value = '';
  loadList();
};

// ===== 删除 =====
const handleDelete = async (item) => {
  if (!window.confirm(`确定要删除反馈「${item.title}」吗？`)) return;
  try {
    await deleteFeedback(item.id);
    emit('toast', { message: '✅ 反馈已删除', type: 'success' });
    if (list.value.length === 1 && page.value > 1) {
      page.value--;
    }
    loadList();
  } catch (err) {
    emit('toast', { message: err.message || '删除失败', type: 'error' });
  }
};

// ===== 提交反馈 =====
const createVisible = ref(false);
const createLoading = ref(false);
const contactError = ref('');

const categories = [
  { value: 'bug', label: 'Bug 故障', icon: '🐛' },
  { value: 'suggestion', label: '功能建议', icon: '💡' },
  { value: 'other', label: '其他', icon: '📝' },
];

const form = reactive({
  category: 'suggestion',
  title: '',
  content: '',
  contact: '',
});

const openCreateModal = () => {
  form.category = 'suggestion';
  form.title = '';
  form.content = '';
  form.contact = '';
  contactError.value = '';
  createVisible.value = true;
};

const closeCreateModal = () => {
  createVisible.value = false;
};

const handleCreate = async () => {
  if (!form.title.trim()) {
    emit('toast', { message: '请填写反馈标题', type: 'warning' });
    return;
  }
  if (!form.content.trim()) {
    emit('toast', { message: '请填写反馈内容', type: 'warning' });
    return;
  }
  const contact = form.contact.trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const validPhone = /^1[3-9]\d{9}$/.test(contact);
  if (contact && !validEmail && !validPhone) {
    contactError.value = '请填写正规手机号码或邮箱';
    return;
  }

  createLoading.value = true;
  try {
    await createFeedback({
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      contact: contact || undefined,
    });
    emit('toast', { message: '✅ 反馈提交成功，感谢你的建议！', type: 'success' });
    createVisible.value = false;
    page.value = 1;
    loadList();
  } catch (err) {
    emit('toast', { message: err.message || '提交失败', type: 'error' });
  } finally {
    createLoading.value = false;
  }
};

// ===== 管理员：状态更新 =====
const handleStatusChange = async (newStatus) => {
  try {
    await updateFeedbackStatus(detail.value.id, newStatus);
    detail.value.status = newStatus;
    emit('toast', { message: '✅ 状态更新成功', type: 'success' });
  } catch (err) {
    emit('toast', { message: err.message || '状态更新失败', type: 'error' });
  }
};

// ===== 管理员：回复 =====
const replyText = ref('');
const replyLoading = ref(false);

const handleReply = async () => {
  if (!replyText.value.trim()) return;
  replyLoading.value = true;
  try {
    await replyFeedback(detail.value.id, replyText.value.trim());
    detail.value = await getFeedbackDetail(detail.value.id);
    replyText.value = '';
    emit('toast', { message: '✅ 回复成功', type: 'success' });
  } catch (err) {
    emit('toast', { message: err.message || '回复失败', type: 'error' });
  } finally {
    replyLoading.value = false;
  }
};

// ===== 工具函数 =====
const categoryLabel = (cat) => {
  const map = { bug: '🐛 Bug', suggestion: '💡 建议', other: '📝 其他' };
  return map[cat] || cat;
};

const categoryTagClass = (cat) => {
  const map = { bug: 'iq-tag-error', suggestion: 'iq-tag-info', other: 'iq-tag-neutral' };
  return map[cat] || 'iq-tag-neutral';
};

const statusLabel = (status) => {
  const map = {
    pending: '⏳ 待处理',
    processing: '🔄 处理中',
    resolved: '✅ 已处理',
    closed: '🔒 已关闭',
  };
  return map[status] || status;
};

const statusTagClass = (status) => {
  const map = {
    pending: 'iq-tag-warning',
    processing: 'iq-tag-info',
    resolved: 'iq-tag-success',
    closed: 'iq-tag-neutral',
  };
  return map[status] || 'iq-tag-neutral';
};

onMounted(() => {
  loadList();
});

defineExpose({ loadList });
</script>

<style scoped>
.iq-feedback {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.iq-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

/* 筛选栏 */
.iq-filter-card { padding: 16px 20px; }
.iq-filter-grid {
  display: grid;
  grid-template-columns: 200px 200px auto;
  gap: 16px;
  align-items: end;
}
.iq-filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.iq-filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--iq-neutral-500);
}
.iq-filter-actions {
  display: flex;
  gap: 8px;
}

/* 加载/空状态 */
.iq-table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  background: var(--iq-card);
  border-radius: var(--iq-radius-large);
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
.iq-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
}
.iq-empty-icon { font-size: 48px; opacity: 0.5; }

/* 表格 */
.iq-table-wrap { overflow-x: auto; }
.iq-id-chip {
  display: inline-block;
  padding: 2px 10px;
  background: var(--iq-neutral-100);
  color: var(--iq-neutral-700);
  border-radius: var(--iq-radius-full);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--iq-font-mono);
}
.iq-action-group {
  display: flex;
  gap: 6px;
}

/* 详情 */
.iq-sub-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.iq-feedback-detail { padding: 24px; }
.iq-contact-error {
  margin-top: 6px;
  color: #dc2626;
  font-size: 12px;
}
.iq-detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--iq-neutral-100);
}
.iq-detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.iq-detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.iq-detail-content {
  margin-bottom: 16px;
}
.iq-content-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--iq-neutral-500);
  margin-bottom: 8px;
}
.iq-content-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--iq-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
}
.iq-detail-contact {
  padding: 12px 16px;
  background: var(--iq-neutral-50);
  border-radius: var(--iq-radius-medium);
  border: 1px solid var(--iq-neutral-100);
}

/* 回复卡片 */
.iq-reply-card {
  padding: 20px 24px;
  border-left: 4px solid var(--iq-state-success);
}
.iq-reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.iq-reply-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--iq-radius-medium);
  background: var(--iq-state-success-bg);
  color: var(--iq-state-success);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.iq-reply-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--iq-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
  padding-left: 40px;
}

/* 管理员操作区 */
.iq-admin-actions {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.iq-admin-action-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.iq-action-label {
  display: flex;
  flex-direction: column;
  min-width: 100px;
  flex-shrink: 0;
  padding-top: 6px;
}
.iq-reply-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.iq-reply-form .iq-btn {
  align-self: flex-end;
}

/* 弹窗 */
.iq-modal-header {
  display: flex;
  align-items: flex-start;
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
.iq-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--iq-neutral-900);
  margin: 0;
}
.iq-modal-subtitle {
  font-size: 13px;
  color: var(--iq-neutral-500);
  margin: 2px 0 0;
}
.iq-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--iq-neutral-400);
  padding: 4px;
  display: inline-flex;
}
.iq-modal-close:hover {
  color: var(--iq-neutral-600);
}
.iq-modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.iq-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

/* 表单 */
.iq-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.iq-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--iq-neutral-700);
}
.iq-req {
  color: var(--iq-state-error);
}

/* 分类选择卡片 */
.iq-category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.iq-category-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 2px solid var(--iq-neutral-200);
  border-radius: var(--iq-radius-medium);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.iq-category-option input {
  position: absolute;
  opacity: 0;
}
.iq-category-option:hover {
  border-color: var(--iq-primary-300);
  background: var(--iq-primary-50);
}
.iq-category-option.active {
  border-color: var(--iq-primary);
  background: var(--iq-primary-50);
}
.iq-cat-icon {
  font-size: 22px;
}
.iq-cat-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--iq-neutral-700);
}
.iq-category-option.active .iq-cat-text {
  color: var(--iq-primary-700);
  font-weight: 600;
}

/* Spinner */
.iq-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 6px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .iq-filter-grid {
    grid-template-columns: 1fr;
  }
  .iq-category-grid {
    grid-template-columns: 1fr;
  }
  .iq-admin-action-row {
    flex-direction: column;
  }
  .iq-action-label {
    min-width: auto;
  }
}
</style>
