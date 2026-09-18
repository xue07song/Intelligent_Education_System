<template>
  <div class="iq-pagination">
    <span class="iq-page-info">共 {{ total }} 条</span>
    <button class="iq-page-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹ 上一页</button>
    <button
      v-for="p in pageNumbers"
      :key="p"
      class="iq-page-btn"
      :class="{ active: p === page }"
      @click="changePage(p)"
    >{{ p }}</button>
    <button class="iq-page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页 ›</button>
    <select :value="pageSize" class="iq-select" style="width: auto; height: 32px; padding: 0 8px;" @change="changePageSize">
      <option v-for="s in [10, 20, 50, 100]" :key="s" :value="s">{{ s }}条/页</option>
    </select>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
});

const emit = defineEmits(['update:page', 'update:pageSize', 'change']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

const pageNumbers = computed(() => {
  const pages = [];
  const maxShow = 7;
  let start = Math.max(1, props.page - Math.floor(maxShow / 2));
  let end = Math.min(totalPages.value, start + maxShow - 1);
  start = Math.max(1, end - maxShow + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const changePage = (p) => {
  if (p < 1 || p > totalPages.value || p === props.page) return;
  emit('update:page', p);
  emit('change', { page: p, pageSize: props.pageSize });
};

const changePageSize = (e) => {
  const newSize = Number(e.target.value);
  emit('update:pageSize', newSize);
  emit('change', { page: 1, pageSize: newSize });
};
</script>
