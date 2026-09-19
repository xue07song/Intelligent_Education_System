# 智能题库管理系统 — 项目长期笔记

## 定位
前后端分离的智能题库/考试练习系统（大学计算机基础等课程题库，约 400 题、10 章节）。
- 后端：`intelligent_quiz_backend3.0/` — Express 5 + mysql2 + JWT + bcryptjs + multer + docx/xlsx 导出，入口 `src/app.js`（commonjs）。
- 前端：`intelligent_quiz_fronted3.0/` — Vue 3 组合式 API + Vite + Element Plus + ECharts + vue-router（hash 模式），入口 `src/main.js`。

## 关键架构
- 后端 MVC 分层：routes → controllers → services → models，中间件 auth(JWT)/permission(requireRoles)/validator/errorHandler，统一响应 `{code, message, data}`，API 前缀 `/api/v1`；另有 `/api/student` 前缀。
- 三种角色：student / teacher / admin。模块：题目 CRUD、科目/章节/知识点、班级、注册审核（registration_requests）、练习/考试（practice，含试卷生成 examRuleEngine、难度调整 difficultyAdjustment）、自适应练习（adaptivePractice）、学习分析（learningAnalysis）、AI 出题与 AI 助手（aiService/aiAssistant，utils/aiClient）、图片格式识别（formatRecognition）、反馈（feedback）、试卷导出（examExportService，docx/xlsx）。
- 前端路由：`src/router/routes.js` 用「组件键名 + meta.roles/migrated/context/tab」设计，`index.js` 才映射真实组件，可用 Node 内存跑 guard-matrix 测试；学生端页面 /papers、/exam/:examId、/adaptive、/records、/analysis 等；教师/管理端 manage.* 与 admin.*。路由历史已全量迁移（R3），无遗留分支。
- 后端同时托管前端 dist（`intelligent_quiz_fronted3.0/dist`），生产单端口 3000；开发时前端 Vite 5173，request.js baseURL 指向 localhost:3000/api/v1。
- 启动时自动建表（schemaCompatibility + questionSeed 自播种）。JWT_SECRET 默认值会告警。HOST 可由启动器注入（默认 0.0.0.0，离线部署 127.0.0.1）。
- 数据库 MySQL `program1`，中文列名题库表（id 如 Q001、章节、题型 1-6、难度 1-5 星等）；多个 migrate_*.sql 记录增量迁移（classes/subjects/university/registration/logic_fixes）。

## 注意事项
- 两份 README 均为 v1 旧文档，仅描述题目 CRUD，与现状差距大；实际功能远多于文档。
- 前端根目录散落若干 python 脚本（PPT/截图处理）与 cropped_shots 截图，属辅助产物。
- 后端 `.fp/` 目录为前端原型复制品（App.vue/Login.vue 等）。

## 环境
- 本机 Bash 工具异常（PATH 缺失，ls/dirname 找不到），用 Glob/Read/Grep/PowerShell 替代。
