<template>
  <div class="iq-registration-audit">
    <!-- 搜索/过滤栏 -->
    <div class="iq-card iq-filter-card">
      <div class="iq-filter-grid">
        <div class="iq-filter-field">
          <label class="iq-filter-label">审核状态</label>
          <select v-model="statusFilter" class="iq-select" @change="loadData">
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        <div class="iq-filter-actions">
          <button class="iq-btn iq-btn-primary" @click="loadData">查询</button>
          <button class="iq-btn iq-btn-secondary" @click="resetFilter">重置</button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="iq-stat-grid">
      <div class="iq-card iq-stat-card">
        <div class="iq-stat-label">待审核</div>
        <div class="iq-stat-value iq-color-warning">{{ stats.pending }}</div>
      </div>
      <div class="iq-card iq-stat-card">
        <div class="iq-stat-label">已通过</div>
        <div class="iq-stat-value iq-color-success">{{ stats.approved }}</div>
      </div>
      <div class="iq-card iq-stat-card">
        <div class="iq-stat-label">已拒绝</div>
        <div class="iq-stat-value iq-color-error">{{ stats.rejected }}</div>
      </div>
      <div class="iq-card iq-stat-card">
        <div class="iq-stat-label">总计</div>
        <div class="iq-stat-value">{{ stats.total }}</div>
      </div>
    </div>

    <!-- 审核表格 -->
    <div class="iq-card">
      <div v-if="loading" class="iq-table-loading">
        <span class="iq-loading-spinner"></span>
        <span class="iq-text-sm iq-text-muted">加载中...</span>
      </div>
      <div v-else class="iq-table-wrap">
        <table class="iq-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>申请角色</th>
              <th>学院</th>
              <th>专业 / 科目</th>
              <th>学号 / 工号</th>
              <th>状态</th>
              <th>拒绝原因</th>
              <th>申请时间</th>
              <th style="width: 200px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td><span class="iq-id-chip">{{ item.id }}</span></td>
              <td>{{ item.username }}</td>
              <td>{{ item.nickname || '--' }}</td>
              <td>
                <span class="iq-role-tag" :class="item.role">{{ getRoleLabel(item.role) }}</span>
              </td>
              <td>{{ item.college || '--' }}</td>
              <td>
                <span v-if="item.role === 'student'">{{ item.major || '--' }}</span>
                <span v-else-if="item.role === 'teacher' && formatSubjects(item.subjects)" class="iq-subject-list">{{ formatSubjects(item.subjects) }}</span>
                <span v-else>--</span>
              </td>
              <td>{{ (item.role === 'student' ? item.student_no : item.employee_no) || '--' }}</td>
              <td>
                <span class="iq-status-tag" :class="item.status">{{ getStatusLabel(item.status) }}</span>
              </td>
              <td>
                <span class="iq-reject-reason" v-if="item.status === 'rejected'">{{ item.reject_reason || '--' }}</span>
                <span v-else>--</span>
              </td>
              <td class="iq-time-cell">{{ formatTime(item.created_at) }}</td>
              <td class="iq-action-cell">
                <template v-if="item.status === 'pending'">
                  <button class="iq-btn iq-btn-sm btn-approve" @click="handleApprove(item)">通过</button>
                  <button class="iq-btn iq-btn-sm btn-reject" @click="openRejectDialog(item)">拒绝</button>
                </template>
                <template v-else>
                  <span class="iq-text-muted iq-text-xs">已处理</span>
                </template>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td :colspan="11" class="iq-empty-row">
                <div class="iq-empty-box">
                  <div class="iq-empty-icon">📭</div>
                  <div class="iq-empty-text iq-text-sm iq-text-muted">暂无注册申请</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="iq-pagination" v-if="total > 0">
        <button class="iq-page-btn" :disabled="page <= 1" @click="page--; loadData()">‹</button>
        <span class="iq-page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="iq-page-btn" :disabled="page >= totalPages" @click="page++; loadData()">›</button>
        <select v-model.number="pageSize" class="iq-select iq-page-size" @change="page = 1; loadData()">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
      </div>
    </div>

    <!-- 拒绝弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="rejectVisible" class="iq-modal-overlay" @click.self="rejectVisible = false">
          <div class="iq-modal iq-modal-sm">
            <div class="iq-modal-header">
              <h3 class="iq-modal-title">拒绝注册申请</h3>
              <button class="iq-modal-close" @click="rejectVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form class="iq-modal-body" @submit.prevent="handleReject">
              <div class="iq-form-field">
                <label class="iq-form-label">拒绝原因 <span class="iq-form-required">*</span></label>
                <textarea
                  v-model="rejectReason"
                  class="iq-textarea"
                  placeholder="请填写拒绝该注册申请的原因"
                  rows="4"
                ></textarea>
              </div>
              <div class="iq-modal-footer">
                <button type="button" class="iq-btn iq-btn-secondary" @click="rejectVisible = false">取消</button>
                <button type="submit" class="iq-btn iq-btn-danger" :disabled="rejectLoading">
                  <span v-if="rejectLoading" class="iq-btn-spinner"></span>
                  {{ rejectLoading ? '提交中...' : '确认拒绝' }}
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
import { ref, computed, onMounted } from 'vue';
import { getRegistrations, approveRegistration, rejectRegistration } from '@/api/auth';

const emit = defineEmits(['toast', 'update:pending']);

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const statusFilter = ref('');

const rejectVisible = ref(false);
const rejectLoading = ref(false);
const rejectReason = ref('');
const rejectTarget = ref(null);

const pendingTotal = ref(0);
const approvedTotal = ref(0);
const rejectedTotal = ref(0);

const stats = computed(() => ({
  pending: pendingTotal.value,
  approved: approvedTotal.value,
  rejected: rejectedTotal.value,
  total: total.value,
}));

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const getRoleLabel = (role) => {
  const map = { admin: '管理员', teacher: '教师', student: '学生' };
  return map[role] || role;
};

const getStatusLabel = (status) => {
  const map = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
  return map[status] || status;
};

const formatSubjects = (subjects) => {
  if (Array.isArray(subjects)) return subjects.filter(Boolean).join('、');
  return String(subjects || '').split(',').map((item) => item.trim()).filter(Boolean).join('、');
};

const formatTime = (t) => {
  if (!t) return '--';
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const loadData = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize: pageSize.value };
    if (statusFilter.value) params.status = statusFilter.value;
    const data = await getRegistrations(params);
    list.value = data.list;
    total.value = data.total;
  } catch (error) {
    emit('toast', { message: error.message || '加载失败', type: 'error' });
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  statusFilter.value = '';
  page.value = 1;
  loadData();
};

const handleApprove = async (item) => {
  if (!window.confirm(`确定通过用户「${item.username}」的${getRoleLabel(item.role)}注册申请吗？`)) return;
  try {
    await approveRegistration(item.id);
    emit('toast', { message: '✅ 审核通过成功', type: 'success' });
    emit('update:pending');
    loadData();
    loadStats();
  } catch (error) {
    emit('toast', { message: error.message || '审核失败', type: 'error' });
  }
};

const openRejectDialog = (item) => {
  rejectTarget.value = item;
  rejectReason.value = '';
  rejectVisible.value = true;
};

const handleReject = async () => {
  if (!rejectReason.value.trim()) {
    emit('toast', { message: '请填写拒绝原因', type: 'warning' });
    return;
  }
  rejectLoading.value = true;
  try {
    await rejectRegistration(rejectTarget.value.id, rejectReason.value.trim());
    emit('toast', { message: '✅ 已拒绝该注册申请', type: 'success' });
    emit('update:pending');
    rejectVisible.value = false;
    loadData();
    loadStats();
  } catch (error) {
    emit('toast', { message: error.message || '操作失败', type: 'error' });
  } finally {
    rejectLoading.value = false;
  }
};

const loadStats = async () => {
  try {
    const [p, a, r] = await Promise.all([
      getRegistrations({ status: 'pending', pageSize: 1 }),
      getRegistrations({ status: 'approved', pageSize: 1 }),
      getRegistrations({ status: 'rejected', pageSize: 1 }),
    ]);
    pendingTotal.value = p.total;
    approvedTotal.value = a.total;
    rejectedTotal.value = r.total;
  } catch (e) {
    // ignore stats error
  }
};

onMounted(() => {
  loadData();
  loadStats();
});
</script>

<style scoped>
.iq-registration-audit { display: flex; flex-direction: column; gap: 16px; }

.iq-filter-card { padding: 20px 24px; }
.iq-filter-grid { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.iq-filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
.iq-filter-label { font-size: 13px; font-weight: 500; color: var(--iq-neutral-700); }
.iq-filter-actions { display: flex; gap: 10px; margin-left: auto; }

.iq-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.iq-stat-card { text-align: center; padding: 20px; }
.iq-stat-label { font-size: 13px; color: var(--iq-neutral-500); margin-bottom: 8px; }
.iq-stat-value { font-size: 28px; font-weight: 700; color: var(--iq-neutral-900); }
.iq-color-warning { color: #d97706; }
.iq-color-success { color: #059669; }
.iq-color-error { color: #dc2626; }

.iq-table-wrap { overflow-x: auto; }
.iq-table { width: 100%; border-collapse: collapse; }
.iq-table th, .iq-table td {
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid var(--iq-border);
  white-space: nowrap;
}
.iq-table th {
  font-weight: 600;
  color: var(--iq-neutral-600);
  background: var(--iq-neutral-50);
  font-size: 12px;
}
.iq-table tbody tr:hover { background: var(--iq-neutral-50); }

.iq-id-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--iq-neutral-100);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.iq-role-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.iq-role-tag.teacher { background: var(--iq-state-info-bg); color: var(--iq-state-info); }
.iq-role-tag.student { background: var(--iq-state-success-bg); color: var(--iq-state-success); }

.iq-status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.iq-status-tag.pending { background: #fef3c7; color: #92400e; }
.iq-status-tag.approved { background: var(--iq-state-success-bg); color: var(--iq-state-success); }
.iq-status-tag.rejected { background: var(--iq-state-error-bg); color: var(--iq-state-error); }

.iq-reject-reason {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--iq-state-error);
  font-size: 12px;
}

.iq-time-cell { color: var(--iq-neutral-500); font-size: 12px; }
.iq-action-cell { white-space: nowrap; }

.iq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.iq-btn-sm { padding: 6px 12px; font-size: 12px; }
.iq-btn-primary { background: var(--iq-primary-500); color: #fff; }
.iq-btn-primary:hover { background: var(--iq-primary-600); }
.iq-btn-secondary { background: var(--iq-neutral-100); color: var(--iq-neutral-700); }
.iq-btn-secondary:hover { background: var(--iq-neutral-200); }
.iq-btn-danger { background: var(--iq-state-error); color: #fff; }
.iq-btn-danger:hover { opacity: 0.9; }

.btn-approve { background: #10b981; color: #fff; margin-right: 6px; }
.btn-approve:hover { background: #059669; }
.btn-reject { background: #fff; color: #dc2626; border: 1px solid #fecaca; }
.btn-reject:hover { background: #fef2f2; }

.iq-text-muted { color: var(--iq-neutral-400); }
.iq-text-xs { font-size: 12px; }
.iq-text-sm { font-size: 13px; }

.iq-empty-row { text-align: center; padding: 48px 0; }
.iq-empty-box { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.iq-empty-icon { font-size: 40px; }

.iq-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--iq-border);
}
.iq-page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--iq-border);
  background: var(--iq-card);
  border-radius: 4px;
  cursor: pointer;
  color: var(--iq-neutral-600);
}
.iq-page-btn:hover:not(:disabled) { border-color: var(--iq-primary-400); color: var(--iq-primary-600); }
.iq-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.iq-page-info { font-size: 13px; color: var(--iq-neutral-600); margin: 0 8px; }
.iq-page-size { height: 32px; }

.iq-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--iq-border);
  border-top-color: var(--iq-primary-500);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal styles */
.iq-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.iq-modal {
  background: var(--iq-card);
  border-radius: 12px;
  box-shadow: 0 20px 50px -20px rgba(15, 23, 42, 0.3);
  max-height: 90vh;
  overflow: auto;
}
.iq-modal-sm { width: 420px; }
.iq-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--iq-border);
}
.iq-modal-title { font-size: 16px; font-weight: 600; margin: 0; }
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
}
.iq-modal-close:hover { background: var(--iq-neutral-100); }
.iq-modal-close svg { width: 18px; height: 18px; }
.iq-modal-body { padding: 24px; }
.iq-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}

.iq-form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.iq-form-label { font-size: 13px; font-weight: 500; color: var(--iq-neutral-700); }
.iq-form-required { color: var(--iq-state-error); }
.iq-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}
.iq-textarea:focus { outline: none; border-color: var(--iq-primary-400); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }

.iq-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 6px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.iq-subject-list {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
