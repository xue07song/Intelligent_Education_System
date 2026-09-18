<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="iq-modal-overlay registration-overlay" @click.self="$emit('close')">
        <div class="iq-modal iq-modal-md registration-dialog" role="dialog" aria-modal="true" aria-labelledby="registration-title">
          <div class="iq-modal-header">
            <div>
              <span class="registration-eyebrow">智能题库 · 新用户</span>
              <h3 id="registration-title" class="iq-modal-title">注册申请</h3>
              <p class="registration-subtitle">选择你的身份，填写信息，开启智慧学习与教学</p>
            </div>
            <button class="iq-modal-close" aria-label="关闭注册窗口" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form class="iq-modal-body" @submit.prevent="handleSubmit">
            <div class="iq-form-tip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              提交注册申请后，需等待管理员审核通过方可登录使用
            </div>

            <div class="iq-form-field registration-wide">
              <label class="iq-form-label">申请角色 <span class="iq-form-required">*</span></label>
              <div class="iq-role-selector">
                <button
                  type="button"
                  class="iq-role-option"
                  :class="{ active: form.role === 'student' }"
                  :aria-pressed="form.role === 'student'"
                  @click="form.role = 'student'"
                >
                  <span class="iq-role-icon">🎓</span>
                  <span class="iq-role-name">学生</span>
                </button>
                <button
                  type="button"
                  class="iq-role-option"
                  :class="{ active: form.role === 'teacher' }"
                  :aria-pressed="form.role === 'teacher'"
                  @click="form.role = 'teacher'"
                >
                  <span class="iq-role-icon">👨‍🏫</span>
                  <span class="iq-role-name">教师</span>
                </button>
              </div>
            </div>

            <h4 class="registration-section">账号信息</h4>
            <div class="iq-form-field">
              <label class="iq-form-label">用户名 <span class="iq-form-required">*</span></label>
              <input v-model="form.username" type="text" class="iq-input" placeholder="请输入用户名" />
            </div>

            <div class="iq-form-field">
              <label class="iq-form-label">昵称</label>
              <input v-model="form.nickname" type="text" class="iq-input" placeholder="选填，显示名称" />
            </div>

            <div class="iq-form-field">
              <label class="iq-form-label">密码 <span class="iq-form-required">*</span></label>
              <input v-model="form.password" type="password" class="iq-input" placeholder="至少6位" />
            </div>

            <div class="iq-form-field">
              <label class="iq-form-label">确认密码 <span class="iq-form-required">*</span></label>
              <input v-model="form.confirmPassword" type="password" class="iq-input" placeholder="再次输入密码" />
            </div>

            <h4 class="registration-section">{{ form.role === 'student' ? '学籍信息' : '教学信息' }}</h4>
            <!-- 学生专属字段 -->
            <template v-if="form.role === 'student'">
              <div class="iq-form-field">
                <label class="iq-form-label">学院 <span class="iq-form-required">*</span></label>
                <select v-model="form.college" class="iq-select">
                  <option value="">请选择学院</option>
                  <option v-for="c in collegeOptions" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">专业 <span class="iq-form-required">*</span></label>
                <select v-model="form.major" class="iq-select" :disabled="!form.college">
                  <option value="">请选择专业</option>
                  <option v-for="m in majorOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <div class="iq-form-field registration-wide">
                <label class="iq-form-label">学号 <span class="iq-form-required">*</span></label>
                <input v-model="form.student_no" type="text" class="iq-input" placeholder="请输入学号" maxlength="20" />
                <span class="iq-text-xs iq-text-muted">学号将用于注册后自动匹配对应年级/专业的必修班级；选修班级由任课教师在「班级管理」中添加</span>
              </div>
            </template>

            <!-- 教师专属字段 -->
            <template v-if="form.role === 'teacher'">
              <div class="iq-form-field">
                <label class="iq-form-label">工号 <span class="iq-form-required">*</span></label>
                <input v-model="form.employee_no" type="text" class="iq-input" placeholder="请输入工号" maxlength="20" />
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">学院 <span class="iq-form-required">*</span></label>
                <select v-model="form.college" class="iq-select">
                  <option value="">请选择学院</option>
                  <option v-for="c in collegeOptions" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="iq-form-field registration-wide">
                <label class="iq-form-label">所教科目 <span class="iq-form-required">*</span></label>
                <el-select v-model="form.subjects" multiple filterable allow-create default-first-option
                           placeholder="搜索或输入新科目后回车" style="width:100%">
                  <el-option v-for="opt in teacherSubjectOptions" :key="opt" :label="opt" :value="opt" />
                </el-select>
                <span class="iq-text-xs iq-text-muted">可多选；输入不存在的科目后按回车即可创建</span>
              </div>
            </template>

            <div v-if="errorMsg" class="iq-form-alert-error" role="alert">
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
                {{ loading ? '提交中...' : '提交申请' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch, onMounted, computed } from 'vue';
import { submitRegistration } from '@/api/auth';
import { getSubjects } from '@/api/subject';
import { COLLEGE_NAMES, getMajorsByCollege, getSubjectsByCollege, ALL_SUBJECTS } from '@/utils/colleges';

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'success']);

const subjectOptions = ref([]);

// 接口失败时的兜底科目列表（避免教师注册被阻塞）
const FALLBACK_SUBJECTS = ['高等数学', '线性代数', '概率论与数理统计', '大学物理', 'C语言程序设计', '数据结构', '操作系统', '计算机网络', '数据库原理', '软件工程', '人工智能', '机器学习', 'Python程序设计', 'Java程序设计', '英语', '思政'];

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: 'student',
  nickname: '',
  // 学生专属
  college: '',
  major: '',
  student_no: '',
  // 教师专属
  employee_no: '',
  subjects: [],
});

// 学院下拉选项
const collegeOptions = COLLEGE_NAMES;

// 学生专业选项（按所选学院联动）
const majorOptions = computed(() => {
  if (!form.college) return [];
  return getMajorsByCollege(form.college);
});

// 教师可选科目（按所选学院联动；接口失败时用 ALL_SUBJECTS 兜底）
const teacherSubjectOptions = computed(() => {
  if (!form.college) return subjectOptions.value.length ? subjectOptions.value : ALL_SUBJECTS;
  const byCollege = getSubjectsByCollege(form.college);
  return [...new Set([...(subjectOptions.value.length ? subjectOptions.value : ALL_SUBJECTS), ...byCollege])];
});

// 学院切换时重置非法的专业/科目
watch(() => form.college, () => {
  if (form.role === 'student') {
    if (form.major && !getMajorsByCollege(form.college).includes(form.major)) {
      form.major = '';
    }
  }
});

const loading = ref(false);
const errorMsg = ref('');

const loadSubjects = async () => {
  try {
    const data = await getSubjects();
    // 兼容数组或 {list}
    const list = Array.isArray(data) ? data : (data?.list || []);
    const parsed = list.map((s) => (typeof s === 'string' ? s : (s.name || s.subject || ''))).filter(Boolean);
    subjectOptions.value = parsed.length ? parsed : FALLBACK_SUBJECTS;
  } catch (e) {
    // 接口失败（如后端字段缺失）时使用兜底科目，避免阻塞教师注册
    subjectOptions.value = FALLBACK_SUBJECTS;
  }
};

onMounted(loadSubjects);

watch(() => props.visible, (val) => {
  if (!val) {
    setTimeout(() => {
      Object.assign(form, {
        username: '', password: '', confirmPassword: '', role: 'student', nickname: '',
        college: '', major: '', student_no: '', employee_no: '', subjects: [],
      });
      errorMsg.value = '';
    }, 200);
  }
});

const handleSubmit = async () => {
  errorMsg.value = '';

  if (!form.username || !form.password) {
    errorMsg.value = '用户名和密码不能为空';
    return;
  }
  if (form.password.length < 6) {
    errorMsg.value = '密码长度不能少于6位';
    return;
  }
  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致';
    return;
  }
  if (!['student', 'teacher'].includes(form.role)) {
    errorMsg.value = '角色无效';
    return;
  }

  // 角色专属字段校验
  if (form.role === 'student') {
    if (!form.college.trim()) { errorMsg.value = '请填写学院'; return; }
    if (!form.major.trim()) { errorMsg.value = '请填写专业'; return; }
    if (!form.student_no.trim()) { errorMsg.value = '请填写学号'; return; }
  } else if (form.role === 'teacher') {
    if (!form.employee_no.trim()) { errorMsg.value = '请填写工号'; return; }
    if (!form.college.trim()) { errorMsg.value = '请填写学院'; return; }
    if (!form.subjects.length) { errorMsg.value = '请至少选择一个所教科目'; return; }
  }

  loading.value = true;
  try {
    const payload = {
      username: form.username,
      password: form.password,
      role: form.role,
      nickname: form.nickname || null,
      college: form.college.trim() || null,
    };
    if (form.role === 'student') {
      payload.major = form.major.trim() || null;
      payload.student_no = form.student_no.trim() || null;
    } else {
      payload.employee_no = form.employee_no.trim() || null;
      payload.subjects = form.subjects;
    }
    await submitRegistration(payload);
    emit('success');
    Object.assign(form, {
      username: '', password: '', confirmPassword: '', role: 'student', nickname: '',
      college: '', major: '', student_no: '', employee_no: '', subjects: [],
    });
  } catch (err) {
    errorMsg.value = err.message || '注册申请提交失败';
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

.iq-form-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--iq-state-info-bg);
  color: var(--iq-state-info);
  border: 1px solid #bfdbfe;
  padding: 10px 14px;
  border-radius: var(--iq-radius-medium);
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
}
.iq-form-tip svg { flex-shrink: 0; margin-top: 2px; }

.iq-role-selector {
  display: flex;
  gap: 10px;
}
.iq-role-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  border: 2px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
  background: var(--iq-card);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--iq-neutral-600);
}
.iq-role-option:hover {
  border-color: var(--iq-primary-300);
}
.iq-role-option.active {
  border-color: var(--iq-primary-500);
  background: var(--iq-primary-50);
  color: var(--iq-primary-700);
}
.iq-role-icon { font-size: 22px; }
.iq-role-name { font-size: 13px; font-weight: 500; }

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
.iq-form-required {
  color: var(--iq-state-error);
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

/* 注册弹窗加宽以容纳科目多选 */
.iq-modal-md { max-width: 560px; }

.iq-subject-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 10px 12px;
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
  background: var(--iq-card);
  max-height: 160px;
  overflow-y: auto;
}
.iq-checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--iq-neutral-700);
  cursor: pointer;
  user-select: none;
}
.iq-checkbox {
  width: 15px;
  height: 15px;
  accent-color: var(--iq-primary-500);
  cursor: pointer;
}
.iq-text-xs { font-size: 12px; }
.iq-text-muted { color: var(--iq-neutral-500); }

/* 独立注册样式，不影响其他业务弹窗。 */
.registration-overlay { padding: 24px; background: rgb(15 23 42 / 48%); backdrop-filter: blur(5px); }
.registration-dialog { width: 100%; max-width: 680px; max-height: calc(100dvh - 48px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgb(255 255 255 / 70%); border-radius: 24px; box-shadow: 0 24px 80px rgb(15 23 42 / 24%); }
.registration-dialog .iq-modal-header { flex: none; align-items: flex-start; padding: 24px 28px 20px; background: linear-gradient(135deg, #eff6ff, #f8fafc 70%); }
.registration-eyebrow { display: block; margin-bottom: 8px; color: #2563eb; font-size: 12px; font-weight: 600; letter-spacing: 1px; }
.registration-dialog .iq-modal-title { font-size: 24px; letter-spacing: -.5px; }
.registration-subtitle { margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.6; }
.registration-dialog .iq-modal-close { background: white; border: 1px solid #e2e8f0; color: #64748b; flex: none; }
.registration-dialog .iq-modal-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px 20px; margin: 0; padding: 20px 28px 0; overflow-y: auto; min-height: 0; }
.registration-wide, .registration-section, .registration-dialog .iq-form-tip, .registration-dialog .iq-form-alert-error, .registration-dialog .iq-modal-footer { grid-column: 1 / -1; }
.registration-dialog .iq-form-tip { margin: 0; border: 0; background: #eff6ff; color: #475569; font-size: 12px; }
.registration-section { margin: 4px 0 -4px; display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; color: #334155; }
.registration-section::after { content: ''; height: 1px; flex: 1; background: #e2e8f0; }
.registration-dialog .iq-form-field { min-width: 0; margin-bottom: 0; gap: 8px; }
.registration-dialog .iq-role-option { flex-direction: row; justify-content: center; gap: 10px; padding: 12px; border-width: 1px; border-radius: 12px; }
.registration-dialog .iq-role-option.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgb(59 130 246 / 10%); }
.registration-dialog .iq-role-name { font-size: 14px; font-weight: 600; }
.registration-dialog .iq-input, .registration-dialog .iq-select { width: 100%; min-height: 42px; border-radius: 10px; background: #f8fafc; }
.registration-dialog .iq-input:focus, .registration-dialog .iq-select:focus { background: white; outline: 2px solid rgb(59 130 246 / 18%); outline-offset: 1px; }
.registration-dialog :deep(.el-select__wrapper) { min-height: 42px; border-radius: 10px; background: #f8fafc; }
.registration-dialog .iq-text-muted { line-height: 1.6; }
.registration-dialog .iq-form-alert-error { margin: 0; }
.registration-dialog .iq-modal-footer { position: sticky; bottom: 0; margin: 0 -28px; padding: 16px 28px; background: rgb(255 255 255 / 98%); border-top: 1px solid #e2e8f0; z-index: 1; }
.registration-dialog .iq-modal-footer .iq-btn { min-width: 100px; border-radius: 10px; }
@media (max-width: 560px) {
  .registration-overlay { padding: 12px; }
  .registration-dialog { max-height: calc(100dvh - 24px); border-radius: 18px; }
  .registration-dialog .iq-modal-header { padding: 20px; }
  .registration-dialog .iq-modal-title { font-size: 22px; }
  .registration-dialog .iq-modal-body { grid-template-columns: minmax(0, 1fr); padding: 16px 20px 0; gap: 14px; }
  .registration-dialog .iq-modal-footer { margin: 0 -20px; padding: 14px 20px; }
}
</style>
