import request from '@/utils/request';

// 用户列表（分页 + 筛选）
export const getUsers = (params = {}) => {
  return request.get('/users', { params });
};

// 查询单个用户
export const getUserById = (id) => {
  return request.get(`/users/${id}`);
};

// 创建用户
export const createUser = (data) => {
  return request.post('/users', data);
};

// 更新用户
export const updateUser = (id, data) => {
  return request.put(`/users/${id}`, data);
};

// 修改用户密码（管理员重置）
export const resetUserPassword = (id, password) => {
  return request.patch(`/users/${id}/password`, { password });
};

// 切换用户启停状态
export const toggleUserStatus = (id, status) => {
  return request.patch(`/users/${id}/status`, { status });
};

// 删除用户
export const deleteUser = (id) => {
  return request.delete(`/users/${id}`);
};
