import request from '@/utils/request';

// AI 接口调用大模型耗时较长（后端 GLM 默认 60s），单独放宽到 120s，避免被全局 10s timeout 误杀
const AI_TIMEOUT = 120000;

// AI 配置状态（前端可据此提示用户）
export const getAiStatus = () => {
  return request.get('/ai/status');
};

// AI 答疑助手（做题时使用）
// body: { question, options, questionType, userQuestion, userAnswer }
// 返回: { reply }
export const askTutor = (data) => {
  return request.post('/ai/tutor', data, { timeout: AI_TIMEOUT });
};

// AI 智能组卷（基于学生近期表现 + 章节/难度要求）
// body: { 章节, 题型, 难度, count, focusWeakPoints }
// 返回: { examId, title, strategy, distribution, total, objectiveCount, questions }
export const smartExam = (data) => {
  return request.post('/ai/smart-exam', data, { timeout: AI_TIMEOUT });
};

// AI 错题分析（分析本人，薄弱知识点 + 建议）
// 返回: { hasData, message?, overview, byType, trend, wrongSampleCount, analysis }
export const getWeakness = () => {
  return request.get('/ai/weakness', { timeout: AI_TIMEOUT });
};

// AI 自动出题（仅教师/管理员，生成草稿不入库）
// body: { 章节, 知识点, 题型, 数量, 难度, 补充说明 }
// 返回: [题目数组]
export const generateQuestions = (data) => {
  return request.post('/ai/generate', data, { timeout: AI_TIMEOUT });
};

// 入库审核后的题目（仅教师/管理员）
// body: { questions: [...] }
// 返回: { inserted, skipped, ... }
export const saveGenerated = (questions, subject) => {
  return request.post('/ai/generate/save', { questions, subject });
};

