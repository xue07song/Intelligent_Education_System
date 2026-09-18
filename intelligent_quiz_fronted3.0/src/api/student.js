import axios from 'axios';

// 学生个人中心接口统一走 /api/student（由后端 app.js 直接挂载）
const instance = axios.create({
  baseURL: '/api/student',
  timeout: 15000,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 兼容两种返回规范：code === 0 或 code === 200 都视为成功
    if (res.code === 0 || res.code === 200) {
      return res.data;
    }
    const err = new Error(res.message || '请求失败');
    err.code = res.code;
    err.errors = res.errors;
    return Promise.reject(err);
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '网络错误';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }

    return Promise.reject({
      message,
      status,
      code: error.response?.data?.code,
      errors: error.response?.data?.errors,
    });
  }
);

export const getStudentProfile = () => {
  return instance.get('/profile');
};

export const updateProfile = (data) => {
  return instance.put('/profile', data);
};

export const getHistoryQuestions = (params = {}) => {
  return instance.get('/history/questions', { params });
};

export const getHistoryExams = (params = {}) => {
  return instance.get('/history/exams', { params });
};

export const getExamRecords = (examId) => {
  return instance.get(`/history/exams/${examId}/records`);
};

export const getFavorites = (params = {}) => {
  return instance.get('/favorites', { params });
};

export const addFavorite = (questionId) => {
  return instance.post('/favorites', { questionId });
};

export const removeFavorite = (questionId) => {
  return instance.delete(`/favorites/${encodeURIComponent(questionId)}`);
};

// 收藏标签
export const getFavoriteTags = () => instance.get('/favorite-tags');
export const createFavoriteTag = (data) => instance.post('/favorite-tags', data);
export const deleteFavoriteTag = (tagId) => instance.delete(`/favorite-tags/${tagId}`);
export const getFavoriteQuestionTags = (questionId) => instance.get(`/favorites/${encodeURIComponent(questionId)}/tags`);
export const setFavoriteQuestionTags = (questionId, tagIds) => instance.put(`/favorites/${encodeURIComponent(questionId)}/tags`, { tagIds });

// 收藏复习（遗忘曲线）
export const getReviewSchedule = (params = {}) => instance.get('/review-schedule', { params });
export const submitFavoriteReview = (questionId, result) => instance.post(`/favorites/${encodeURIComponent(questionId)}/reviews`, { result });
export const getFavoriteStats = () => instance.get('/favorite-stats');
