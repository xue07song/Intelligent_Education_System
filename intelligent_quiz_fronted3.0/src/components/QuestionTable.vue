<template>
  <div class="iq-card">
    <div v-if="loading" class="iq-table-loading">
      <span class="iq-loading-spinner"></span>
      <span class="iq-text-sm iq-text-muted">加载中...</span>
    </div>
    <div v-else class="iq-table-wrap">
      <table class="iq-table q-table">
        <colgroup>
          <col v-if="canEdit" class="col-check-col" />
          <col class="col-id-col" />
          <col class="col-chapter-col" />
          <col class="col-subject-col" />
          <col class="col-type-col" />
          <col class="col-title-col" />
          <col v-if="!compact" class="col-opt-col" />
          <col v-if="!compact" class="col-answer-col" />
          <col v-if="!compact" class="col-ana-col" />
          <col class="col-diff-col" />
          <col class="col-kp-col" />
          <col class="col-act-col" />
        </colgroup>
        <thead>
          <tr>
            <th v-if="canEdit" class="col-check">
              <input
                type="checkbox"
                class="iq-checkbox"
                :checked="isAllSelected"
                :indeterminate.prop="isIndeterminate"
                @change="toggleAll"
              />
            </th>
            <th>ID</th>
            <th>章节</th>
            <th>科目</th>
            <th>题型</th>
            <th class="col-title">题目内容</th>
            <th v-if="!compact" class="col-opt">选项</th>
            <th v-if="!compact">答案</th>
            <th v-if="!compact" class="col-ana">解析</th>
            <th>难度</th>
            <th class="col-kp">知识点</th>
            <th class="col-act">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td v-if="canEdit" class="col-check">
              <input
                type="checkbox"
                class="iq-checkbox"
                :checked="isSelected(item.id)"
                @change="toggleOne(item.id)"
              />
            </td>
            <td><span class="iq-id-chip">{{ item.id }}</span></td>
            <td>{{ item.章节 }}</td>
            <td>
              <span v-if="item.科目" class="iq-subject-tag">{{ item.科目 }}</span>
              <span v-else class="iq-text-muted">--</span>
            </td>
            <td>
              <span class="iq-type-tag" :class="`type-${item.题型}`">{{ getTypeName(item.题型) }}</span>
            </td>
            <td class="col-title">
              <span class="iq-truncate" :title="formatText(item.题目)">{{ formatText(item.题目) }}</span>
            </td>
            <td v-if="!compact" class="col-opt">
              <span class="iq-truncate" :title="formatOptions(item.选项)">{{ formatOptions(item.选项) }}</span>
            </td>
            <td v-if="!compact">
              <span class="iq-answer-chip">{{ item.答案 }}</span>
            </td>
            <td v-if="!compact" class="col-ana">
              <span class="iq-truncate" :title="formatText(item.解析)">{{ formatText(item.解析) || '--' }}</span>
            </td>
            <td>
              <span class="iq-diff-tag" :class="getDiffClass(item.难度)">{{ getDifficultyLabel(item.难度) }}</span>
            </td>
            <td class="col-kp">
              <span class="iq-truncate" :title="formatText(item.知识点)">{{ formatText(item.知识点) || '--' }}</span>
            </td>
            <td class="col-act">
              <div class="iq-table-action">
                <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="$emit('view', item)">查看</button>
                <button v-if="canEdit" class="iq-btn iq-btn-ghost iq-btn-sm act-edit" @click="$emit('edit', item)">编辑</button>
                <button v-if="canEdit" class="iq-btn iq-btn-ghost iq-btn-sm act-del" @click="$emit('delete', item)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="list.length === 0">
            <td :colspan="emptyColspan" class="iq-empty-row">
              <div class="iq-empty-box">
                <div class="iq-empty-icon">📭</div>
                <div class="iq-empty-text iq-text-sm iq-text-muted">暂无数据</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTypeName, getDifficultyLabel } from '@/utils/constants';

const props = defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  role: { type: String, default: '' },
  modelValue: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(['view', 'edit', 'delete', 'update:modelValue', 'selection-change']);

/**
 * 写入口（勾选列 + 编辑 + 删除）**仅管理员**。
 *
 * 迁移前这里是 `role === 'admin' || role === 'teacher'`；按经用户确认的权限裁决
 * 「教师只能查看自己所教科目的题库，所有题库写能力仅管理员可用」收成仅管理员。
 *
 * 教师仍然完整保留**查看**能力：`查看` 按钮不受这个开关影响，列表、筛选、
 * 分页、详情也都不受影响 —— 教师看到的是同一张表，只是没有勾选框与编辑/删除列。
 *
 * ⚠️ 这只是 UI 层。真正的拦截在服务端（`routes/question.js` 的 7 条写路由已收成
 * `requireRoles('admin')`）；把这些按钮藏起来**不能**当作权限已生效的证据。
 */
const canEdit = computed(() => props.role === 'admin');

const emptyColspan = computed(() => {
  let cols = 8; // base: id + chapter + subject + type + title + diff + kp + act
  if (canEdit.value) cols += 1; // checkbox
  if (!props.compact) cols += 3; // options + answer + analysis
  return cols;
});

// 格式化选项字段：处理对象、数组、字符串等多种格式
const formatOptions = (options) => {
  if (options == null) return '--';
  if (typeof options === 'string') {
    // 检测"[object Object]"字符串（后端序列化问题），返回占位提示
    if (options === '[object Object]') return '（格式错误，需重新编辑）';
    return options;
  }
  if (typeof options === 'number') return String(options);
  if (Array.isArray(options)) {
    return options.map((o, i) => {
      if (o == null) return `${String.fromCharCode(65 + i)}.`;
      if (typeof o === 'object') {
        try {
          const entries = Object.entries(o);
          if (entries.length > 0) {
            return entries.map(([k, v]) => `${k}.${v}`).join(' ');
          }
        } catch { return String(o); }
        return JSON.stringify(o);
      }
      return `${String.fromCharCode(65 + i)}.${o}`;
    }).join(' ');
  }
  if (typeof options === 'object') {
    // 处理 {A: "选项A", B: "选项B"} 格式
    try {
      const entries = Object.entries(options);
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}.${v}`).join(' ');
      }
    } catch { return '（格式错误）'; }
    return '（空选项）';
  }
  return String(options);
};

// 格式化题目字段：处理可能的对象格式
const formatText = (text) => {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'number') return String(text);
  if (typeof text === 'object') return JSON.stringify(text);
  return String(text);
};

// 获取难度对应的 CSS 类名（支持数字和文字格式）
const getDiffClass = (difficulty) => {
  const diffMap = {
    '1': 'diff-1', '入门': 'diff-1',
    '2': 'diff-2', '简单': 'diff-2', '容易': 'diff-2',
    '3': 'diff-3', '中等': 'diff-3', '一般': 'diff-3',
    '4': 'diff-4', '困难': 'diff-4', '较难': 'diff-4',
    '5': 'diff-5', '挑战': 'diff-5',
  };
  return diffMap[String(difficulty)] || 'diff-3';
};

const isAllSelected = computed(() => {
  if (props.list.length === 0) return false;
  return props.list.every((item) => props.modelValue.includes(item.id));
});

const isIndeterminate = computed(() => {
  const c = props.list.filter((item) => props.modelValue.includes(item.id)).length;
  return c > 0 && c < props.list.length;
});

const isSelected = (id) => props.modelValue.includes(id);

const emitUpdate = (newList) => {
  emit('update:modelValue', newList);
  emit('selection-change', newList);
};

const toggleAll = (e) => {
  if (e.target.checked) {
    emitUpdate(props.list.map((item) => item.id));
  } else {
    emitUpdate([]);
  }
};

const toggleOne = (id) => {
  const idx = props.modelValue.indexOf(id);
  const next = idx === -1
    ? [...props.modelValue, id]
    : props.modelValue.filter((x) => x !== id);
  emitUpdate(next);
};
</script>

<style scoped>
.iq-table-wrap {
  overflow-x: auto;
}
.q-table {
  min-width: 700px;
  table-layout: fixed;
}
.q-table col.col-check-col { width: 44px; }
.q-table col.col-id-col { width: 70px; }
.q-table col.col-chapter-col { width: 60px; }
.q-table col.col-subject-col { width: 90px; }
.q-table col.col-type-col { width: 80px; }
.q-table col.col-title-col { width: 240px; }
.q-table col.col-opt-col { width: 160px; }
.q-table col.col-answer-col { width: 60px; }
.q-table col.col-ana-col { width: 140px; }
.q-table col.col-diff-col { width: 70px; }
.q-table col.col-kp-col { width: 120px; }
.q-table col.col-act-col { width: 120px; }

.iq-table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
}
.iq-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--iq-neutral-200);
  border-top-color: var(--iq-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.col-check {
  width: 44px;
  text-align: center !important;
}
.iq-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--iq-primary);
  cursor: pointer;
}

.col-title, .col-opt, .col-ana, .col-kp {
  overflow: hidden;
  text-overflow: ellipsis;
}
.col-title { width: 220px; }
.col-opt   { width: 180px; }
.col-ana   { width: 160px; }
.col-kp    { width: 120px; }
.col-act   { white-space: nowrap; width: 120px; }

/* 让 truncate span 填满单元格 */
:deep(.iq-truncate) {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.iq-id-chip {
  display: inline-block;
  font-family: var(--iq-font-mono);
  font-size: 12px;
  padding: 2px 8px;
  background: var(--iq-neutral-100);
  color: var(--iq-neutral-700);
  border-radius: 4px;
  font-weight: 500;
}
.iq-subject-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-weight: 500;
}
.iq-answer-chip {
  display: inline-block;
  min-width: 28px;
  text-align: center;
  padding: 2px 8px;
  background: var(--iq-primary-50);
  color: var(--iq-primary-700);
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.iq-type-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--iq-radius-full);
  font-size: 12px;
  font-weight: 500;
}
.type-1 { background: #ede9fe; color: #6d28d9; }  /* 判断 紫色 */
.type-2 { background: #dbeafe; color: #1d4ed8; }  /* 单选 蓝色 */
.type-3 { background: #fce7f3; color: #be185d; }  /* 多选 粉色 */
.type-4 { background: #d1fae5; color: #047857; }  /* 填空 绿色 */
.type-5 { background: #fef3c7; color: #b45309; }  /* 简答 琥珀 */
.type-6 { background: #ffedd5; color: #c2410c; }  /* 程序论述 橙色 */

.iq-diff-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.diff-1, .diff-\31星 { background: #dcfce7; color: #166534; }  /* 1 */
.diff-2, .diff-\32星 { background: #d9f99d; color: #3f6212; }  /* 2 */
.diff-3, .diff-\33星 { background: #fef9c3; color: #854d0e; }  /* 3 */
.diff-4, .diff-\34星 { background: #fed7aa; color: #9a3412; }  /* 4 */
.diff-5, .diff-\35星 { background: #fee2e2; color: #991b1b; }  /* 5 */

.act-edit { color: var(--iq-state-warning) !important; }
.act-edit:hover:not(:disabled) { background: var(--iq-state-warning-bg) !important; color: #b45309 !important; }
.act-del { color: var(--iq-state-error) !important; }
.act-del:hover:not(:disabled) { background: var(--iq-state-error-bg) !important; color: #b91c1c !important; }

.iq-empty-row {
  padding: 0 !important;
}
.iq-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
}
.iq-empty-icon {
  font-size: 40px;
  opacity: 0.5;
}
</style>
