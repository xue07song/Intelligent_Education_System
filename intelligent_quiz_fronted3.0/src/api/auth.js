import request from '@/utils/request';

// 登录
export const login = (data) => {
  return request.post('/auth/login', data);
};

// 获取当前登录用户信息
export const getProfile = () => {
  return request.get('/auth/profile');
};

// 修改自己的密码
export const changePassword = (data) => {
  return request.post('/auth/change-password', data);
};

// ===== 注册审核接口 =====

// 提交注册申请（公开）
export const submitRegistration = (data) => {
  return request.post('/auth/register', data);
};

// 查询注册申请列表（管理员/老师）
export const getRegistrations = (params = {}) => {
  return request.get('/auth/registrations', { params });
};

// 审核通过
export const approveRegistration = (id) => {
  return request.patch(`/auth/registrations/${id}/approve`);
};

// 审核拒绝
export const rejectRegistration = (id, reason) => {
  return request.patch(`/auth/registrations/${id}/reject`, { reason });
};
