import request from '@/utils/request';


export const getQuestions = (params = {}) => {
    return request.get('/questions', { params });
};

export const getQuestionById = (id) => {
    return request.get(`/questions/${id}`);
};

export const addQuestion = (data) => {
    return request.post('/questions', data);
};

export const updateQuestion = (id, data) => {
    return request.put(`/questions/${id}`, data);
};

export const deleteQuestion = (id) => {
    return request.delete(`/questions/${id}`);
};

// 批量删除
export const batchDeleteQuestions = (ids) => {
    return request.post('/questions/batch-delete', { ids });
};

// 批量导入 Excel
export const batchImportQuestions = (file, subject) => {
  const formData = new FormData();
  formData.append('file', file);
  if (subject) {
    formData.append('subject', subject);
  }
  return request.post('/questions/batch-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const searchQuestions = (keyword) => {
    return request.get('/questions/search', { params: { keyword } });
};

export const getStatistics = () => {
    return request.get('/questions/statistics');
};