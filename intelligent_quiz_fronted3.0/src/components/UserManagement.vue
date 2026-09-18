<template>
  <div class="iq-user-mgmt">
    <!-- 搜索栏 -->
    <div class="iq-card iq-filter-card">
      <div class="iq-filter-grid">
        <div class="iq-filter-field">
          <label class="iq-filter-label">搜索</label>
          <input v-model="keyword" class="iq-input" placeholder="搜索用户名/昵称" @keyup.enter="loadUsers" />
        </div>
        <div class="iq-filter-field">
          <label class="iq-filter-label">角色</label>
          <select v-model="roleFilter" class="iq-select" @change="loadUsers">
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="teacher">教师</option>
            <option value="student">学生</option>
          </select>
        </div>
        <div class="iq-filter-field">
          <label class="iq-filter-label">状态</label>
          <select v-model="statusFilter" class="iq-select" @change="loadUsers">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
        <div class="iq-filter-actions">
          <button class="iq-btn iq-btn-primary" @click="loadUsers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            查询
          </button>
          <button class="iq-btn iq-btn-secondary" @click="resetFilter">重置</button>
          <button class="iq-btn iq-btn-primary" style="margin-left: auto;" @click="openCreate">+ 新增用户</button>
        </div>
      </div>
    </div>

    <!-- 用户表格 -->
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
              <th>角色</th>
              <th>所教科目</th>
              <th>班级</th>
              <th>状态</th>
              <th>创建时间</th>
              <th style="width: 240px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in list" :key="user.id">
              <td><span class="iq-id-chip">{{ user.id }}</span></td>
              <td class="iq-font-medium" style="color: var(--iq-neutral-800);">{{ user.username }}</td>
              <td>{{ user.nickname || '--' }}</td>
              <td>
                <span class="iq-tag u-role" :class="user.role">{{ roleMap[user.role] }}</span>
              </td>
              <td>
                <template v-if="user.role === 'teacher' && user.subjects && user.subjects.length > 0">
                  <span
                    v-for="(s, idx) in user.subjects"
                    :key="idx"
                    class="iq-user-subject-tag"
                    style="margin-right: 4px;"
                  >{{ s }}</span>
                </template>
                <span v-else>--</span>
              </td>
              <td>
                <template v-if="user.role === 'student'">
                  <span v-if="user.className || user.class_name" class="iq-tag iq-tag-success">
                    {{ user.className || user.class_name }}
                  </span>
                  <span v-else class="iq-text-sm" style="color: var(--iq-neutral-500);">未分班</span>
                </template>
                <span v-else>--</span>
              </td>
              <td>
                <span class="iq-tag" :class="user.status === 1 ? 'iq-tag-success' : 'iq-tag-neutral'">
                  <span class="status-dot" :class="{ active: user.status === 1 }"></span>
                  {{ user.status === 1 ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="iq-text-sm iq-text-muted">{{ user.created_at }}</td>
              <td>
                <div class="iq-table-action">
                  <button class="iq-btn iq-btn-ghost iq-btn-sm act-edit" @click="openEdit(user)">编辑</button>
                  <button class="iq-btn iq-btn-ghost iq-btn-sm act-pwd" @click="handleResetPwd(user)">重置密码</button>
                  <button v-if="user.status === 1" class="iq-btn iq-btn-ghost iq-btn-sm act-warn" @click="handleToggleStatus(user, 0)">禁用</button>
                  <button v-else class="iq-btn iq-btn-ghost iq-btn-sm act-enable" @click="handleToggleStatus(user, 1)">启用</button>
                  <button class="iq-btn iq-btn-ghost iq-btn-sm act-del" :disabled="user.username === 'admin'" @click="handleDelete(user)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="9" class="iq-empty-row">
                <div class="iq-empty-box">
                  <div class="iq-empty-icon">📭</div>
                  <div class="iq-empty-text iq-text-sm iq-text-muted">暂无数据</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="iq-pagination" v-if="total > 0">
        <span class="iq-page-info">共 {{ total }} 条</span>
        <button class="iq-page-btn" :disabled="page === 1" @click="changePage(page - 1)">‹ 上一页</button>
        <span class="iq-page-info" style="margin: 0;">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="iq-page-btn" :disabled="page === totalPages" @click="changePage(page + 1)">下一页 ›</button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="dialogVisible" class="iq-modal-overlay" @click.self="dialogVisible = false">
          <div class="iq-modal iq-modal-md">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" :style="{ background: isEdit ? 'var(--iq-state-warning-bg)' : 'var(--iq-primary-50)', color: isEdit ? 'var(--iq-state-warning)' : 'var(--iq-primary-600)' }">
                  <svg v-if="!isEdit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                    <line x1="12" y1="11" x2="12" y2="17"></line>
                    <line x1="9" y1="14" x2="15" y2="14"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">{{ isEdit ? '编辑用户' : '新增用户' }}</h3>
                  <p class="iq-modal-subtitle">{{ isEdit ? '修改用户信息' : '填写用户账号信息' }}</p>
                </div>
              </div>
              <button class="iq-modal-close" @click="dialogVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form class="iq-modal-body" @submit.prevent="handleSubmit">
              <div class="iq-form-field">
                <label class="iq-form-label">用户名 <span class="iq-req">*</span></label>
                <input v-model="form.username" class="iq-input" :disabled="isEdit" placeholder="登录用户名" />
              </div>
              <div class="iq-form-field" v-if="!isEdit">
                <label class="iq-form-label">密码 <span class="iq-req">*</span></label>
                <input v-model="form.password" type="password" class="iq-input" placeholder="至少6位" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">昵称</label>
                <input v-model="form.nickname" class="iq-input" placeholder="显示昵称" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">角色 <span class="iq-req">*</span></label>
                <select v-model="form.role" class="iq-select">
                  <option value="admin">管理员</option>
                  <option value="teacher">教师</option>
                  <option value="student">学生</option>
                </select>
              </div>
              <div class="iq-form-field" v-if="form.role === 'teacher'">
                <label class="iq-form-label">学院</label>
                <select v-model="form.college" class="iq-select">
                  <option value="">请选择学院</option>
                  <option v-for="c in collegeOptions" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="iq-form-field" v-if="form.role === 'teacher'">
                <label class="iq-form-label">所教科目</label>
                <el-select v-model="form.subjects" multiple filterable allow-create default-first-option
                           placeholder="搜索、新增或取消科目" style="width:100%">
                  <el-option v-for="opt in teacherSubjectOptions" :key="opt" :label="opt" :value="opt" />
                </el-select>
              </div>
              <div class="iq-form-field" v-if="form.role === 'student'">
                <label class="iq-form-label">学院</label>
                <select v-model="form.college" class="iq-select">
                  <option value="">请选择学院</option>
                  <option v-for="c in collegeOptions" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="iq-form-field" v-if="form.role === 'student'">
                <label class="iq-form-label">专业</label>
                <select v-model="form.major" class="iq-select" :disabled="!form.college">
                  <option value="">请选择专业</option>
                  <option v-for="m in majorOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <div class="iq-form-field" v-if="form.role === 'student' && isEdit">
                <label class="iq-form-label">必修班级</label>
                <select v-model="form.class_id" class="iq-select">
                  <option :value="null">未分班</option>
                  <option v-for="cls in classList" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
                <span class="iq-text-xs iq-text-muted">必修班级由学号自动匹配，也可在此手动调整；选修班级请在「班级管理」中由任课教师添加</span>
              </div>
              <div class="iq-form-field" v-if="!isEdit">
                <label class="iq-form-label">状态</label>
                <select v-model="form.status" class="iq-select">
                  <option :value="1">启用</option>
                  <option :value="0">禁用</option>
                </select>
              </div>

              <div class="iq-modal-footer">
                <button type="button" class="iq-btn iq-btn-secondary" @click="dialogVisible = false">取消</button>
                <button type="submit" class="iq-btn iq-btn-primary">确定</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { getUsers, createUser, updateUser, resetUserPassword, toggleUserStatus, deleteUser } from '@/api/user';
import { getSubjects } from '@/api/subject';
import { getClasses } from '@/api/class';
import { COLLEGE_NAMES, getMajorsByCollege, getSubjectsByCollege } from '@/utils/colleges';

const emit = defineEmits(['toast']);

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const keyword = ref('');
const roleFilter = ref('');
const statusFilter = ref('');

const allSubjects = ref([]);
const classList = ref([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
  id: null,
  username: '',
  password: '',
  nickname: '',
  role: 'student',
  status: 1,
  college: '',
  major: '',
  subjects: [],
  class_id: null,
});

const collegeOptions = COLLEGE_NAMES;

const majorOptions = computed(() => {
  if (!form.college) return [];
  return getMajorsByCollege(form.college);
});

const teacherSubjectOptions = computed(() => {
  if (!form.college) return allSubjects.value;
  const byCollege = getSubjectsByCollege(form.college);
  return [...new Set([...allSubjects.value, ...byCollege])];
});

watch(() => form.college, () => {
  if (form.role === 'student') {
    if (form.major && !getMajorsByCollege(form.college).includes(form.major)) {
      form.major = '';
    }
  }
});

const roleMap = { admin: '管理员', teacher: '教师', student: '学生' };

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const showToast = (msg, type = 'success') => {
  emit('toast', { message: msg, type });
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize: pageSize.value };
    if (keyword.value) params.keyword = keyword.value;
    if (roleFilter.value) params.role = roleFilter.value;
    if (statusFilter.value !== '') params.status = statusFilter.value;

    const data = await getUsers(params);
    list.value = data.list;
    total.value = data.total;
  } catch (err) {
    showToast(err.message || '加载用户列表失败', 'error');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  keyword.value = '';
  roleFilter.value = '';
  statusFilter.value = '';
  page.value = 1;
  loadUsers();
};

const changePage = (newPage) => {
  page.value = newPage;
  loadUsers();
};

const openCreate = () => {
  isEdit.value = false;
  Object.assign(form, { id: null, username: '', password: '', nickname: '', role: 'student', status: 1, college: '', major: '', subjects: [], class_id: null });
  dialogVisible.value = true;
};

const openEdit = (user) => {
  isEdit.value = true;
  Object.assign(form, {
    id: user.id,
    username: user.username,
    password: '',
    nickname: user.nickname || '',
    role: user.role,
    status: user.status,
    college: user.college || '',
    major: user.major || '',
    subjects: Array.isArray(user.subjects) ? [...user.subjects] : [],
    class_id: user.class_id || user.classId || null,
  });
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      const updateData = { nickname: form.nickname, role: form.role };
      if (form.role === 'teacher') {
        updateData.college = form.college || '';
        updateData.subjects = form.subjects || [];
      }
      if (form.role === 'student') {
        updateData.college = form.college || '';
        updateData.major = form.major || '';
        updateData.class_id = form.class_id || null;
      }
      await updateUser(form.id, updateData);
      showToast('用户更新成功');
    } else {
      if (!form.username || !form.password) {
        showToast('用户名和密码不能为空', 'error');
        return;
      }
      if (form.password.length < 6) {
        showToast('密码至少6位', 'error');
        return;
      }
      const createData = {
        username: form.username,
        password: form.password,
        role: form.role,
        nickname: form.nickname,
        status: form.status,
      };
      if (form.role === 'teacher') {
        createData.college = form.college || '';
        createData.subjects = form.subjects || [];
      }
      if (form.role === 'student') {
        createData.college = form.college || '';
        createData.major = form.major || '';
      }
      await createUser(createData);
      showToast('用户创建成功');
    }
    dialogVisible.value = false;
    loadUsers();
  } catch (err) {
    showToast(err.message || '操作失败', 'error');
  }
};

const handleResetPwd = async (user) => {
  const newPwd = window.prompt(`重置用户「${user.username}」的密码（至少6位）：`);
  if (!newPwd) return;
  if (newPwd.length < 6) {
    showToast('密码至少6位', 'error');
    return;
  }
  try {
    await resetUserPassword(user.id, newPwd);
    showToast('密码重置成功');
  } catch (err) {
    showToast(err.message || '重置失败', 'error');
  }
};

const handleToggleStatus = async (user, status) => {
  try {
    await toggleUserStatus(user.id, status);
    showToast(status === 1 ? '已启用' : '已禁用');
    loadUsers();
  } catch (err) {
    showToast(err.message || '操作失败', 'error');
  }
};

const handleDelete = async (user) => {
  if (user.username === 'admin') {
    showToast('不能删除超级管理员', 'error');
    return;
  }
  if (!window.confirm(`确定删除用户「${user.username}」吗？`)) return;
  try {
    await deleteUser(user.id);
    showToast('删除成功');
    loadUsers();
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
};

onMounted(async () => {
  loadUsers();
  try {
    allSubjects.value = await getSubjects();
  } catch (e) {
    console.warn('加载科目列表失败:', e);
  }
  try {
    const data = await getClasses();
    classList.value = Array.isArray(data) ? data : (data.list || []);
  } catch (e) {
    console.warn('加载班级列表失败:', e);
  }
});
</script>

<style scoped>
.iq-user-mgmt {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.iq-filter-card {
  padding: 18px 20px;
}
.iq-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 16px;
  align-items: end;
}
.iq-filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.iq-filter-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--iq-neutral-600);
}
.iq-filter-actions {
  grid-column: span 3;
  display: flex;
  gap: 8px;
  align-items: center;
}

.iq-table-wrap {
  overflow-x: auto;
}
.iq-table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
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
.u-role.iq-tag.admin { background: var(--iq-state-error-bg); color: #b91c1c; }
.u-role.iq-tag.teacher { background: var(--iq-state-info-bg); color: #1d4ed8; }
.u-role.iq-tag.student { background: var(--iq-state-success-bg); color: #047857; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--iq-neutral-400);
}
.status-dot.active {
  background: var(--iq-state-success);
}

.act-edit { color: var(--iq-state-warning) !important; }
.act-edit:hover:not(:disabled) { background: var(--iq-state-warning-bg) !important; color: #b45309 !important; }
.act-pwd { color: var(--iq-state-info) !important; }
.act-pwd:hover:not(:disabled) { background: var(--iq-state-info-bg) !important; color: #1d4ed8 !important; }
.act-warn { color: #ea580c !important; }
.act-warn:hover:not(:disabled) { background: #fff7ed !important; color: #c2410c !important; }
.act-enable { color: var(--iq-state-success) !important; }
.act-enable:hover:not(:disabled) { background: var(--iq-state-success-bg) !important; color: #047857 !important; }
.act-del { color: var(--iq-state-error) !important; }
.act-del:hover:not(:disabled) { background: var(--iq-state-error-bg) !important; color: #b91c1c !important; }

.iq-user-subject-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-weight: 500;
}

.iq-subject-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 8px 0;
}
.iq-checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--iq-neutral-700);
}
.iq-checkbox-item input[type="checkbox"].iq-checkbox {
  width: 15px;
  height: 15px;
  accent-color: var(--iq-primary);
  cursor: pointer;
}

.iq-empty-row { padding: 0 !important; }
.iq-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
}
.iq-empty-icon { font-size: 40px; opacity: 0.5; }

/* 弹窗通用样式 */
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
