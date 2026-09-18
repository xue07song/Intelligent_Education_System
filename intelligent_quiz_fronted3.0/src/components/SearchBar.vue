<template>
  <div class="iq-search-bar">
    <div class="iq-search-grid">
      <div class="iq-search-field">
        <label class="iq-search-label">题目ID</label>
        <input
            v-model="filters.id"
            class="iq-input"
            placeholder="如 Q001"
            @keyup.enter="$emit('search', filters)"
        />
      </div>

      <div class="iq-search-field" style="grid-column: span 2;">
        <label class="iq-search-label">关键词</label>
        <div class="iq-kw-wrap">
          <input
              v-model="filters.关键词"
              class="iq-input"
              placeholder="搜索题目内容、选项、知识点..."
              @keyup.enter="$emit('search', filters)"
          />
          <div class="iq-kw-hint">
            <div class="hint-title iq-font-medium">关键词匹配范围</div>
            <ul class="hint-list">
              <li><strong>题目内容</strong> · 按题干文字片段匹配</li>
              <li><strong>选项</strong> · 按 A/B/C/D 选项文字匹配</li>
              <li><strong>知识点</strong> · 按知识点关键词匹配</li>
            </ul>
            <div class="hint-tip">可结合其他条件精准定位题目</div>
          </div>
        </div>
      </div>

      <div class="iq-search-field">
        <label class="iq-search-label">题型</label>
        <select v-model="filters.题型" class="iq-select" @change="$emit('search', filters)">
          <option value="">全部题型</option>
          <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div class="iq-search-field">
        <label class="iq-search-label">难度</label>
        <select v-model="filters.难度" class="iq-select" @change="$emit('search', filters)">
          <option value="">全部难度</option>
          <option v-for="opt in difficultyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div class="iq-search-field">
        <label class="iq-search-label">章节</label>
        <input
            v-model="filters.章节"
            type="number"
            class="iq-input"
            placeholder="章节号"
            @keyup.enter="$emit('search', filters)"
        />
      </div>

      <div class="iq-search-field">
        <label class="iq-search-label">出题人</label>
        <input
            v-model="filters.出题人"
            class="iq-input"
            placeholder="出题人"
            @keyup.enter="$emit('search', filters)"
        />
      </div>

      <div class="iq-search-field">
        <label class="iq-search-label">科目</label>
        <select v-model="filters.科目" class="iq-select" @change="$emit('search', filters)">
          <option value="">全部科目</option>
          <option v-for="opt in subjectOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <div class="iq-search-actions">
        <button class="iq-btn iq-btn-primary" @click="$emit('search', filters)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          查询
        </button>
        <button class="iq-btn iq-btn-secondary" @click="handleReset">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, onMounted } from 'vue';
import { TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/utils/constants';
import { getSubjects } from '@/api/subject';

const props = defineProps({
  initialFilters: { type: Object, default: () => ({}) },
  role: { type: String, default: '' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['search', 'reset']);

const allSubjects = ref([]);

const subjectOptions = computed(() => {
  if (props.role === 'teacher') {
    return props.subjects || [];
  }
  return allSubjects.value || [];
});

const filters = reactive({
  id: props.initialFilters.id || '',
  关键词: props.initialFilters.关键词 || '',
  题型: props.initialFilters.题型 || '',
  难度: props.initialFilters.难度 || '',
  章节: props.initialFilters.章节 || '',
  出题人: props.initialFilters.出题人 || '',
  科目: props.initialFilters.科目 || '',
});

const typeOptions = TYPE_OPTIONS;
const difficultyOptions = DIFFICULTY_OPTIONS;

const handleReset = () => {
  filters.id = '';
  filters.关键词 = '';
  filters.题型 = '';
  filters.难度 = '';
  filters.章节 = '';
  filters.出题人 = '';
  filters.科目 = '';
  emit('reset');
};

onMounted(async () => {
  if (props.role === 'admin') {
    try {
      allSubjects.value = await getSubjects();
    } catch (e) {
      console.warn('加载科目列表失败:', e);
    }
  }
});
</script>

<style scoped>
.iq-search-bar {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.iq-search-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px 16px;
  align-items: end;
}

.iq-search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.iq-search-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--iq-neutral-600);
}

.iq-kw-wrap {
  position: relative;
}

.iq-kw-hint {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 300px;
  background: var(--iq-popover);
  border: 1px solid var(--iq-border);
  border-radius: var(--iq-radius-medium);
  box-shadow: var(--iq-shadow-float);
  padding: 14px 16px;
  font-size: 12px;
  color: var(--iq-neutral-600);
  line-height: 1.7;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
  pointer-events: none;
}

.iq-kw-wrap:hover .iq-kw-hint {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.hint-title {
  font-size: 13px;
  color: var(--iq-neutral-900);
  margin-bottom: 8px;
}

.hint-list {
  margin: 0 0 10px;
  padding-left: 18px;
}

.hint-list li {
  margin-bottom: 2px;
}

.hint-list strong {
  color: var(--iq-primary-600);
}

.hint-tip {
  padding-top: 8px;
  border-top: 1px dashed var(--iq-border);
  color: var(--iq-neutral-500);
  font-size: 11px;
}

.iq-search-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 900px) {
  .iq-search-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .iq-search-grid {
    grid-template-columns: 1fr;
  }
}
</style>