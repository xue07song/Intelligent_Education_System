import request from '@/utils/request';

// 班级接口统一走默认 axios 实例（baseURL=/api/v1，经 vite 代理到后端 3000 端口）
// 之前硬编码 3012 端口会导致老师端访问班级管理时全部 Network Error

// 班级列表
export const getClasses = (params = {}) => {
  return request.get('/classes', { params });
};

// 班级详情（含班内学生）
export const getClassById = (id) => {
  return request.get(`/classes/${id}`);
};

// 创建班级
export const createClass = (data) => {
  return request.post('/classes', data);
};

// 更新班级
export const updateClass = (id, data) => {
  return request.put(`/classes/${id}`, data);
};

// 删除班级
export const deleteClass = (id) => {
  return request.delete(`/classes/${id}`);
};

// 添加学生到班级（分班）
export const addStudentToClass = (classId, studentId) => {
  return request.post(`/classes/${classId}/students`, { studentId });
};

// 批量添加学生
export const addStudentsToClass = (classId, studentIds) => {
  return request.post(`/classes/${classId}/students/batch`, { studentIds });
};

// 调班（将学生从一个班转到另一个班）
export const transferStudent = (fromClassId, toClassId, studentId) => {
  return request.patch('/classes/transfer-student', { fromClassId, toClassId, studentId });
};

// 移出班级（学生变为未分班状态）
export const removeStudentFromClass = (classId, studentId) => {
  return request.delete(`/classes/${classId}/students/${studentId}`);
};

// 获取未分班的学生列表
export const getUnassignedStudents = (params = {}) => {
  return request.get('/classes/unassigned-students', { params });
};

export const getTeacherOptions = (params = {}) => request.get('/classes/teachers/options', { params });
export const getAllClassOptions = (params = {}) => request.get('/classes/options/all', { params });
export const getMyClassIds = () => request.get('/classes/mine');
export const updateMyClassIds = (classIds) => request.put('/classes/mine', { classIds });
export const getAcademicStructure = () => request.get('/classes/academic/structure');
export const createCollege = (name) => request.post('/classes/academic/colleges', { name });
export const createMajor = (collegeId, name) => request.post('/classes/academic/majors', { collegeId, name });

// 学生自主加入某个班级（选修或必修，权限依赖后端允许）
export const joinClassAsStudent = (classId, studentId) => {
  return request.post(`/classes/${classId}/students/join`, { studentId });
};
