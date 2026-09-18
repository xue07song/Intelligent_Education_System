import request from '@/utils/request';

export const getSubjects = (params = {}) => {
  return request.get('/subjects', { params });
};

export const createSubject = (name) => request.post('/subjects', { name });

export const getSubjectChapters = (name) =>
  request.get(`/subjects/${encodeURIComponent(name)}/chapters`);

export const getSubjectKnowledgePoints = (name, chapters = []) =>
  request.get(`/subjects/${encodeURIComponent(name)}/knowledge-points`, { params: { chapters: chapters.join(',') } });

export const updateMySubjects = (subjects) => request.put('/subjects/mine', { subjects });
