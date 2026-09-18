import request from '@/utils/request';

// 提交反馈
export const createFeedback = (data) => {
  return request.post('/feedback', data);
};

// 我的反馈列表
export const getMyFeedback = (params) => {
  return request.get('/feedback/mine', { params });
};

// 反馈详情
export const getFeedbackDetail = (id) => {
  return request.get(`/feedback/${id}`);
};

// 删除反馈
export const deleteFeedback = (id) => {
  return request.delete(`/feedback/${id}`);
};

// 管理员：查看所有反馈
export const getAllFeedback = (params) => {
  return request.get('/feedback', { params });
};

// 管理员：更新处理状态
export const updateFeedbackStatus = (id, status) => {
  return request.patch(`/feedback/${id}/status`, { status });
};

// 管理员：回复反馈
export const replyFeedback = (id, reply) => {
  return request.patch(`/feedback/${id}/reply`, { reply });
};
