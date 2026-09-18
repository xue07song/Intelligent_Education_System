<template>
  <div class="exam-builder">
    <!-- ===== 顶部横幅（与题库管理风格一致） ===== -->
    <header class="iq-page-hero">
      <div class="hero-content">
        <span class="hero-badge">📝 出卷管理</span>
        <h1 class="hero-title">智能组卷</h1>
        <p class="hero-desc">按照章节、七种题型、五级难度和知识点要求生成结构合理的试卷</p>
      </div>
    </header>

    <section v-if="builderStep === 1" class="iq-card section-card">
      <div class="section-title"><b>1. 选择卷型</b><span>选择卷型后自动进入方案选择</span></div>
      <div class="paper-presets">
        <button v-for="preset in paperPresets" :key="preset.key" type="button" class="paper-preset" :class="{ active: activePaperPreset === preset.key }" @click="selectPaperPreset(preset)">
          <span class="preset-name">{{ preset.name }}<small>{{ preset.tag }}</small></span>
          <span class="preset-description">{{ preset.description }}</span>
          <span class="preset-detail">{{ preset.detail }}</span>
        </button>
      </div>
    </section>

    <section v-if="builderStep === 2 && currentPaperPreset" class="iq-card section-card">
      <div class="section-title"><b>2. 选择方案</b><span>选择一套方案后自动进入范围设置</span></div>
      <div class="variant-panel">
      <div class="variant-panel-head"><b>{{ currentPaperPreset.name }}可选方案</b><span>选择一套方案后进入下一步设置范围；期末卷可选择手动自定义。</span></div>
        <div class="variant-grid">
          <button v-for="variant in currentPaperPreset.variants" :key="variant.key" type="button" class="variant-card" :class="{ active: activePaperVariant === variant.key }" @click="applyPaperVariant(currentPaperPreset, variant)">
            <span class="variant-title">{{ variant.name }}<small>{{ variant.scene }}</small></span>
            <span>{{ variant.description }}</span>
            <span><b>题型：</b>{{ presetTypeText(variant) }}</span>
            <span><b>难度：</b>{{ presetDifficultyText(variant) }}</span>
            <span><b>规模：</b>{{ variant.count }}题，至少{{ variant.knowledge }}个知识点</span>
          </button>
          <button v-if="currentPaperPreset.key === 'final'" type="button" class="variant-card manual-variant" :class="{ active: isFinalCustomMode }" @click="selectFinalCustom">
            <span class="variant-title">手动自定义<small>期末卷</small></span>
            <span>在期末卷基础上自行调整题型、难度与数量</span>
            <span><b>说明：</b>下一步可修改全部结构参数</span>
          </button>
        </div>
      </div>
      <div v-if="presetNotice" class="preset-notice">{{ presetNotice }}</div>
      <div class="step-actions"><button type="button" class="iq-btn iq-btn-secondary" @click="builderStep = 1">上一步</button></div>
    </section>

    <section v-if="builderStep === 3" class="iq-card section-card">
      <div class="section-title"><b>3. 设置范围</b><span v-if="inventory">当前范围可用 {{ inventory.total }} 题 · {{ inventory.knowledgePoints.length }} 个知识点</span></div>
      <div class="mode-status"><b>当前方案：</b><span>{{ configurationModeText }}</span><button type="button" @click="builderStep = 2">返回选择方案</button></div>
      <div class="base-grid">
        <label><span>组卷科目 <b style="color:#dc2626;">*</b></span>
          <select v-model="form.subject" class="iq-input" style="height:38px;border:1px solid var(--iq-border);border-radius:8px;padding:0 10px;background:#fff;" @change="handleSubjectChange">
            <option value="">请选择科目</option>
            <option
                v-for="s in subjectOptions"
                :key="s"
                :value="s"
            >{{ s }}</option>
          </select>
        </label>
        <label><span>目标班级（可多选）</span>
          <el-select v-model="form.classIds" multiple filterable clearable placeholder="搜索并选择自己管理的班级" style="width:100%">
            <el-option v-for="c in availableClasses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </label>
        <label><span>试卷标题</span><input v-model="form.title" class="iq-input" placeholder="留空则自动生成" /></label>
        <label><span>总题数</span><input v-model.number="form.count" type="number" min="1" max="100" class="iq-input" :disabled="isLockedPlan" @change="handleCountChange" /></label>
        <label><span>最少知识点覆盖</span><input v-model.number="form.minKnowledgePoints" type="number" min="1" :max="inventory?.knowledgePoints.length || 111" class="iq-input" :disabled="isLockedPlan" @input="markTypeCustom" /></label>
        <label><span>指定知识点（可多选）</span>
          <el-select v-model="form.knowledgePoints" multiple filterable clearable placeholder="搜索并选择知识点" style="width:100%">
            <el-option v-for="point in knowledgeOptions" :key="point.name" :label="`${point.name}（${point.questionCount}题）`" :value="point.name" />
          </el-select>
        </label>
        <label><span>考试时长（分钟，留空不限）</span><input v-model.number="form.durationMinutes" type="number" min="1" class="iq-input" /></label>
        <label><span>截止时间（可选）</span><input v-model="form.endAt" type="datetime-local" class="iq-input" /></label>
        <label><span>最多作答次数（留空不限）</span><input v-model.number="form.maxAttempts" type="number" min="1" class="iq-input" /></label>
      </div>
      <div class="chapter-selector">
        <div class="chapter-selector-head">
          <div><b>章节范围</b><small>点击章节卡片选择/取消，不选则默认全部章节</small></div>
          <div class="chapter-actions">
            <button type="button" class="chapter-action" @click="clearChapters">不限章节</button>
            <button type="button" class="chapter-action" @click="selectAllChapters">选择全部</button>
          </div>
        </div>
        <div v-if="form.subject && chapterOptions.length" class="chapter-grid">
          <div v-for="chapter in chapterOptions" :key="chapter.chapterNo"
               class="chapter-card" :class="{ active: form.chapters.includes(chapter.chapterNo) }"
               @click="toggleChapter(chapter.chapterNo)">
            <span class="chapter-card-no">第{{ chapter.chapterNo }}章</span>
            <span class="chapter-card-title">{{ chapter.title }}</span>
            <span class="chapter-card-count">{{ chapter.questionCount }}题</span>
          </div>
        </div>
        <p v-else class="chapter-help" style="text-align:center;padding:12px">请先选择科目</p>
        <p class="chapter-help">{{ selectedChapterDetail }}</p>
      </div>
      <div class="step-actions"><button type="button" class="iq-btn iq-btn-secondary" @click="builderStep = 2">上一步</button><button type="button" class="iq-btn iq-btn-primary" @click="goToStructure">下一步：设置题型与难度</button></div>
    </section>

    <section v-if="builderStep === 4" class="iq-card section-card">
      <div class="section-title"><b>4. 题型结构</b><span :class="sumClass(typeSum)">已分配 {{ typeSum }}/{{ form.count }} 题</span></div>
      <div class="distribution-grid">
        <label v-for="type in structureTypeOptions" :key="type.value" class="distribution-item">
          <span>{{ type.label }} <small>{{ type.value <= 4 ? '自动判分' : '人工查看' }}</small></span>
          <b>库存 {{ inventory?.byType?.[type.value] || 0 }}</b>
          <input v-model.number="form.typeDistribution[type.value]" type="number" min="0" :max="inventory?.byType?.[type.value] || 0" class="iq-input" :disabled="isLockedPlan" @input="markTypeCustom" />
        </label>
      </div>
      <div v-if="subjectiveCount" class="info-note">本试卷包含 {{ subjectiveCount }} 道主观题，简答题和程序论述题不计入自动判分正确率。</div>
      <div class="section-title structure-title"><b>5. 五级难度结构</b><span :class="sumClass(difficultySum)">已分配 {{ difficultySum }}/{{ form.count }} 题</span></div>
      <div class="template-actions">
        <button v-for="item in templates" :key="item.key" class="iq-btn iq-btn-secondary iq-btn-sm" :class="{ selected: activeTemplate === item.key && !isFinalCustomMode }" :disabled="isLockedPlan" @click="applyTemplate(item.key)">{{ item.label }}</button>
      </div>
      <div class="distribution-grid difficulty-grid">
        <label v-for="level in 5" :key="level" class="distribution-item"><span>难度 {{ level }} <small>{{ difficultyNames[level] }}</small></span><b>库存 {{ inventory?.byDifficulty?.[level] || 0 }}</b><input v-model.number="form.difficultyDistribution[level]" type="number" min="0" :max="inventory?.byDifficulty?.[level] || 0" class="iq-input" :disabled="isLockedPlan || (!!activeTemplate && !isFinalCustomMode)" @input="markCustomConfig" /></label>
      </div>
      <div class="section-title structure-title"><b>6. 组卷检查</b><span>同分候选题优先选择历史使用次数较少的题目</span></div>
      <div v-if="inventoryLoading" class="info-note">正在读取题库库存...</div>
      <div v-else class="check-list">
        <span :class="typeSum === form.count ? 'ok' : 'bad'">{{ typeSum === form.count ? '✓' : '!' }} 题型合计</span>
        <span :class="difficultySum === form.count ? 'ok' : 'bad'">{{ difficultySum === form.count ? '✓' : '!' }} 难度合计</span>
        <span :class="form.count <= (inventory?.total || 0) ? 'ok' : 'bad'">{{ form.count <= (inventory?.total || 0) ? '✓' : '!' }} 总库存</span>
        <span :class="form.minKnowledgePoints <= (inventory?.knowledgePoints.length || 0) ? 'ok' : 'bad'">{{ form.minKnowledgePoints <= (inventory?.knowledgePoints.length || 0) ? '✓' : '!' }} 知识点库存</span>
        <span :class="combinationCheckClass">{{ combinationCheckIcon }} 题型与难度组合</span>
      </div>
      <div v-if="previewLoading" class="info-note">正在检查题型与难度能否同时满足...</div>
      <div v-else-if="preview && !preview.feasible" class="feasibility-note">
        <div class="feasibility-title"><b>当前设置不能生成完整试卷</b><span v-if="isCombinationConflict">最多可匹配 {{ preview.maxAssignable }}/{{ form.count }} 题</span></div>
        <ul><li v-for="reason in preview.reasons" :key="reason">{{ formatReason(reason) }}</li></ul>
        <div v-if="preview.alternativePlans?.length" class="alternative-section">
          <div class="alternative-heading"><b>请选择一套可行调整方案</b><span>以下方案均已按当前章节库存重新验证</span></div>
          <div class="alternative-grid">
            <div v-for="plan in preview.alternativePlans" :key="plan.id" class="alternative-card">
              <div><b>{{ plan.title }}</b><span>{{ plan.description }}</span></div>
              <p><strong>题型：</strong>{{ typeDistributionText(plan.typeDistribution) }}</p>
              <p><strong>难度：</strong>{{ difficultyDistributionText(plan.difficultyDistribution) }}</p>
              <button type="button" class="iq-btn iq-btn-secondary iq-btn-sm" @click="applyAlternativePlan(plan)">采用这套方案</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="preview?.feasible" class="success-note">题型、难度和章节库存的交叉组合检查通过，可以生成 {{ form.count }} 题试卷。</div>
      <div v-if="errorMsg" class="error-note">{{ errorMsg }}</div>
      <div class="section-title structure-title"><b>7. 考试性质</b><span>用于生成试卷封面信息</span></div>
      <div class="base-grid">
        <label><span>大学名称</span><input v-model="form.examNature.university" class="iq-input" placeholder="如：中国石油大学" /></label>
        <label><span>学年（起始年）</span><input v-model="form.examNature.yearStart" class="iq-input" placeholder="如：2024" /></label>
        <label><span>学年（结束年）</span><input v-model="form.examNature.yearEnd" class="iq-input" placeholder="如：2025" /></label>
        <label><span>学期</span>
          <select v-model="form.examNature.semester" class="iq-input" style="height:38px;border:1px solid var(--iq-border);border-radius:8px;padding:0 10px;background:#fff;">
            <option value="春季">春季</option>
            <option value="夏季">夏季</option>
            <option value="秋季">秋季</option>
          </select>
        </label>
        <label><span>考试名称前缀</span><input v-model="form.examNature.examPrefix" class="iq-input" placeholder="如：计算机导论" /></label>
        <label><span>卷型</span>
          <select v-model="form.examNature.paperType" class="iq-input" style="height:38px;border:1px solid var(--iq-border);border-radius:8px;padding:0 10px;background:#fff;">
            <option value="A">A卷</option>
            <option value="B">B卷</option>
            <option value="C">C卷</option>
            <option value="D">D卷</option>
          </select>
        </label>
        <label><span>考试方式</span>
          <select v-model="form.examNature.examMethod" class="iq-input" style="height:38px;border:1px solid var(--iq-border);border-radius:8px;padding:0 10px;background:#fff;">
            <option value="闭卷">闭卷</option>
            <option value="开卷">开卷</option>
          </select>
        </label>
      </div>
      <div class="action-row"><button type="button" class="iq-btn iq-btn-secondary" @click="builderStep = 3">上一步</button><button class="iq-btn iq-btn-primary" :disabled="!canGenerate" @click="handleGenerate">{{ loading ? '正在组卷...' : '生成试卷' }}</button><button class="iq-btn ai-btn" :disabled="aiLoading" @click="handleSmartExam">{{ aiLoading ? '辅助组卷中...' : '辅助组卷' }}</button></div>
    </section>

    <section v-if="builderStep === 5 && assistPlans.length" class="iq-card section-card assistant-plan-page">
      <div class="result-head"><div><h3>可行组卷方案</h3><p>当前设置无法直接生成试卷，请选择一套方案；系统将生成 5 套不同试卷供你选择。</p></div><div class="result-actions"><button type="button" class="iq-btn iq-btn-secondary" @click="builderStep = 4">返回调整</button></div></div>
      <div class="assistant-plan-grid">
        <article v-for="plan in assistPlans" :key="plan.id" class="assistant-plan-card">
          <div class="assistant-plan-head"><span class="paper-type-badge">可行方案</span><span class="paper-id">{{ plan.changedField === 'knowledge' ? '知识点调整' : '结构调整' }}</span></div>
          <h3>{{ plan.title }}</h3>
          <p class="assistant-plan-description">{{ plan.description }}</p>
          <div class="assistant-plan-meta"><span>📋 {{ typeDistributionText(plan.typeDistribution) }}</span><span>⭐ {{ difficultyDistributionText(plan.difficultyDistribution) }}</span><span>📚 至少 {{ plan.minKnowledgePoints || form.minKnowledgePoints }} 个知识点</span></div>
          <div class="assistant-plan-footer"><span>将生成 5 套不同试卷</span><button type="button" class="iq-btn iq-btn-primary" :disabled="planGenerating" @click="generateFiveFromPlan(plan)">{{ planGenerating ? '正在生成...' : '选择此方案' }}</button></div>
        </article>
      </div>
      <div v-if="errorMsg" class="error-note">{{ errorMsg }}</div>
    </section>

    <section v-if="builderStep === 6 && result" class="iq-card section-card result-card">
      <template v-if="generatedExams.length">
        <div class="result-head"><div><h3>已生成 5 套试卷</h3><p>可查看并修改每份试卷，勾选单套或多套后确定最终版本。</p></div><div class="result-actions"><button type="button" class="iq-btn iq-btn-secondary" @click="builderStep = 4">上一步</button><button type="button" class="iq-btn iq-btn-secondary" :disabled="planGenerating" @click="regenerateFive">{{ planGenerating ? '正在重新生成...' : '重新生成 5 套' }}</button><button type="button" class="iq-btn iq-btn-secondary" @click="startNewExam">继续组卷</button></div></div>
        <div class="selection-toolbar"><span>已选择 {{ selectedExamIds.length }} 套试卷</span><button type="button" class="iq-btn iq-btn-primary" :disabled="!selectedExamIds.length || selectionSaving" @click="confirmFinalSelection">{{ selectionSaving ? '正在确认...' : '确定最终版本' }}</button></div>
        <div class="generated-exam-grid">
          <article v-for="exam in visibleGeneratedExams" :key="exam.examId" class="generated-exam-card" :class="{ selected: selectedExamIds.includes(exam.examId) }">
            <div class="assistant-plan-head"><label class="exam-select"><input v-model="selectedExamIds" type="checkbox" :value="exam.examId" /> 选择为最终版本</label><span class="paper-id">#{{ exam.examId }}</span></div>
            <h3>{{ exam.title }}</h3>
            <div class="assistant-plan-meta"><span>📊 {{ exam.total }} 题</span><span>⭐ 客观题 {{ exam.objectiveCount }} 题</span><span>📚 {{ form.subject || '全部科目' }}</span></div>
            <div v-if="exam.report" class="generated-report"><div><b>题型：</b><span v-for="type in typeOptions" :key="type.value">{{ type.label }} {{ exam.report.actualTypeDistribution[type.value] || 0 }}题</span></div><div><b>难度：</b><span v-for="level in 5" :key="level">{{ level }}级 {{ exam.report.actualDifficultyDistribution[level] || 0 }}题</span></div><div><b>知识点：</b>{{ exam.report.knowledgePoints?.join('、') || '按方案覆盖' }}</div></div>
            <div class="assistant-plan-footer"><button v-if="activePaperPreset === 'final'" type="button" class="iq-btn iq-btn-secondary" @click="openExamEditor(exam)">手动自定义</button><button type="button" class="iq-btn iq-btn-secondary" @click="openGeneratedExport(exam)">导出试卷</button><button type="button" class="iq-btn iq-btn-primary" @click="openExamViewer(exam)">查看试卷</button></div>
          </article>
        </div>
        <div v-if="confirmedExamIds.length" class="step-actions" style="justify-content:center"><button type="button" class="iq-btn iq-btn-primary" @click="startNewExam">完成</button></div>
      </template>
    </section>

    <ExamExportDialog
      :visible="exportVisible"
      :exam-id="result?.examId || null"
      :title="result?.title || ''"
      @close="exportVisible = false"
      @toast="(e) => emit('toast', e)"
    />
    <div v-if="editorVisible" class="editor-mask" @click.self="editorVisible = false">
      <section class="editor-dialog">
        <div v-if="editorMode === 'edit'" class="editor-head"><div><h2>手动自定义试卷</h2><p>可直接在卷面中修改题干、选项、答案和解析；保存只影响这一份试卷。</p></div><button type="button" @click="editorVisible = false">×</button></div><button v-else type="button" class="viewer-close" aria-label="关闭预览" @click="editorVisible = false">×</button>
        <template v-if="editorMode === 'edit'"><label class="editor-title"><span>试卷标题</span><input v-model="editableExam.title" class="iq-input" /></label><article v-for="question in editableExam.questions" :key="question.sort_order" class="editor-question"><b>第 {{ question.sort_order }} 题</b><textarea v-model="question.题目" rows="3" class="iq-input"></textarea><textarea v-model="question.选项" rows="2" class="iq-input" placeholder="选项"></textarea><div class="editor-two-col"><input v-model="question.答案" class="iq-input" placeholder="答案" /><input v-model="question.解析" class="iq-input" placeholder="解析" /></div></article><div class="editor-actions"><button type="button" class="iq-btn iq-btn-secondary" @click="editorVisible = false">取消</button><button type="button" class="iq-btn iq-btn-primary" :disabled="editorSaving" @click="saveExamEditor">{{ editorSaving ? '正在保存...' : '保存修改' }}</button></div></template>
        <template v-else><article class="paper-preview"><h1>{{ editableExam.examNature?.university || 'XXXX大学' }}</h1><h2>{{ editableExam.examNature?.yearStart && editableExam.examNature?.yearEnd ? `${editableExam.examNature.yearStart}—${editableExam.examNature.yearEnd}学年${editableExam.examNature.semester || '秋季'}学期` : 'XXXX—XXXX学年XX学期' }}</h2><h1>《{{ editableExam.examNature?.examPrefix || '计算机导论' }}》期末考试试卷</h1><p>（{{ editableExam.examNature?.paperType || 'A' }}卷）</p><p>考试方式：{{ editableExam.examNature?.examMethod || '闭卷' }}</p><p>班级：______________　姓名：______________　学号：______________</p><table><tbody><tr><th>题号</th><th v-for="group in previewQuestionGroups" :key="'h' + group.numeral">{{ group.numeral }}</th><th>总分</th></tr><tr><th>得分</th><td v-for="group in previewQuestionGroups" :key="'s' + group.numeral"></td><td></td></tr></tbody></table><section v-for="group in previewQuestionGroups" :key="group.name"><h3>{{ group.name }}</h3><article v-for="(question, index) in group.questions" :key="question.sort_order"><b>{{ index + 1 }}. {{ question.题目 }}</b><p v-for="line in optionLines(question.选项)" :key="line">{{ line }}</p></article></section></article><div class="editor-actions"><button type="button" class="iq-btn iq-btn-primary" @click="editorVisible = false">返回</button></div></template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { generateRuleExam, getExamInventory, previewRuleExam, getExam, updateExamContentApi, deleteExamApi, updateExamStatusApi } from '@/api/practice';

import { TYPE_OPTIONS } from '@/utils/constants';
import { getSubjects, getSubjectChapters, getSubjectKnowledgePoints } from '@/api/subject';
import { getClasses } from '@/api/class';
import ExamExportDialog from '@/components/ExamExportDialog.vue';


const props = defineProps({
  role: { type: String, default: 'teacher' },
  subjects: { type: Array, default: () => [] },
});
const emit = defineEmits(['toast']);
const typeOptions = TYPE_OPTIONS;
const structureTypeOptions = [1, 2, 3, 4, 5, 7, 6].map(v => TYPE_OPTIONS.find(t => t.value === v));
const difficultyNames = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '挑战' };
const templates = [{ key: 'basic', label: '基础练习' }, { key: 'standard', label: '标准练习' }, { key: 'advanced', label: '提升练习' }];
const weights = { basic: [35,30,20,10,5], standard: [20,20,25,25,10], advanced: [5,10,25,35,25] };
const paperPresets = [
  { key:'foundation', name:'基础巩固卷', tag:'适合复习', description:'基础题为主，客观题占比高', detail:'提供基础均衡、客观强化和章节复习三套方案', variants:[
      { key:'foundation-balanced', name:'基础均衡', scene:'日常复习', description:'兼顾四类客观题，少量简答题', count:20, knowledge:4, typeWeights:[25,40,15,15,5,0,0], difficultyWeights:[40,30,20,10,0] },
      { key:'foundation-objective', name:'客观强化', scene:'快速检测', description:'判断和单选占比较高，全部自动判分', count:20, knowledge:4, typeWeights:[30,45,15,10,0,0,0], difficultyWeights:[35,30,20,10,5] },
      { key:'foundation-review', name:'章节复习', scene:'单章回顾', description:'题型更完整，保留少量主观题', count:20, knowledge:5, typeWeights:[20,40,15,15,10,0,0], difficultyWeights:[30,30,25,10,5] },
    ]},
  { key:'final', name:'期末卷', tag:'期末考查', description:'覆盖题型与难度，适合阶段或期末测验', detail:'提供综合均衡、客观测验、主客观结合和手动自定义', variants:[
      { key:'final-balanced', name:'主客观综合', scene:'期末测验', description:'按课程期末规格设置 45 题、100 分，包含组合题与程序题', count:45, knowledge:5, fixedTypeDistribution:{1:10,2:10,3:10,4:10,5:2,6:1,7:2}, fixedDifficultyDistribution:{1:8,2:9,3:12,4:10,5:6}, typeWeights:[10,30,20,15,10,5,10], difficultyWeights:[10,15,30,25,20] },
      { key:'final-objective', name:'客观测验', scene:'自动判分', description:'全部使用可自动判分题型', count:20, knowledge:5, typeWeights:[25,40,20,15,0,0,0], difficultyWeights:[20,25,25,20,10] },
      { key:'final-mixed', name:'主客观结合', scene:'综合考查', description:'保留一定比例简答题', count:20, knowledge:5, typeWeights:[20,35,15,15,15,0,0], difficultyWeights:[15,20,30,25,10] },
    ]},
  { key:'advanced', name:'难点提升卷', tag:'查漏补缺', description:'增加多选、简答和高难度题', detail:'提供难题突破、思维强化和综合挑战三套方案', variants:[
      { key:'advanced-breakthrough', name:'难题突破', scene:'专项提高', description:'困难题为主，并纳入程序论述题', count:20, knowledge:6, typeWeights:[10,30,20,10,20,10,0], difficultyWeights:[5,10,25,35,25] },
      { key:'advanced-thinking', name:'思维强化', scene:'能力训练', description:'提高多选、简答和程序论述题占比', count:20, knowledge:6, typeWeights:[10,25,25,10,20,10,0], difficultyWeights:[5,10,25,35,25] },
      { key:'advanced-comprehensive', name:'综合挑战', scene:'阶段测试', description:'覆盖六种题型并保持高难度', count:20, knowledge:6, typeWeights:[10,30,20,10,20,10,0], difficultyWeights:[10,15,25,30,20] },
    ]},
];
const form = reactive({ title: '', chapters: [], knowledgePoints: [], count: 20, minKnowledgePoints: 5, typeDistribution: {1:4,2:8,3:3,4:3,5:2,6:0,7:0}, difficultyDistribution: {1:4,2:4,3:5,4:5,5:2}, subject: '', classIds: [], durationMinutes: '', endAt: '', maxAttempts: '', examNature: { university: '', yearStart: '', yearEnd: '', semester: '秋季', examPrefix: '计算机导论', paperType: 'A', examMethod: '闭卷' } });
const builderStep = ref(1);
const inventory = ref(null), inventoryLoading = ref(false), preview = ref(null), previewLoading = ref(false), loading = ref(false), aiLoading = ref(false), planGenerating = ref(false), result = ref(null), errorMsg = ref(''), presetNotice = ref(''), activeTemplate = ref(''), activePaperPreset = ref(''), activePaperVariant = ref('');
const assistPlans = ref([]);
const generatedExams = ref([]);
const selectedExamIds = ref([]);
const confirmedExamIds = ref([]);
const selectionSaving = ref(false);
const lastGenerationPlan = ref(null);
const editorVisible = ref(false);
const editorMode = ref('view');
const editorSaving = ref(false);
const editableExam = ref({ title: '', questions: [] });
const exportVisible = ref(false);
const allSubjects = ref([]);
const chapterOptions = ref([]);
const knowledgeOptions = ref([]);
const classList = ref([]);
const availableClasses = computed(()=>classList.value.filter(c=>!form.subject || c.subject===form.subject));
const visibleGeneratedExams = computed(() => confirmedExamIds.value.length
  ? generatedExams.value.filter(item => confirmedExamIds.value.includes(item.examId))
  : generatedExams.value);
const chapterCounts = computed(() => {
  const counts = {};
  Object.entries(inventory.value?.byChapter || {}).forEach(([key, value]) => {
    counts[Number(key)] = Number(value);
  });
  return counts;
});
const typeSum = computed(() => Object.values(form.typeDistribution).reduce((s,v)=>s+(Number(v)||0),0));
const difficultySum = computed(() => Object.values(form.difficultyDistribution).reduce((s,v)=>s+(Number(v)||0),0));
const subjectiveCount = computed(() => (Number(form.typeDistribution[5])||0)+(Number(form.typeDistribution[6])||0)+(Number(form.typeDistribution[7])||0));
const combinationCheckClass = computed(() => previewLoading.value ? '' : preview.value?.feasible ? 'ok' : 'bad');
const combinationCheckIcon = computed(() => previewLoading.value ? '…' : preview.value?.feasible ? '✓' : '!');
const canGenerate = computed(() => builderStep.value === 4 && !loading.value && !inventoryLoading.value && !previewLoading.value && preview.value?.feasible === true && !!activePaperVariant.value);
const isCombinationConflict = computed(() => preview.value?.checks && Object.values(preview.value.checks).every(Boolean));
const currentPaperPreset = computed(() => paperPresets.find(item => item.key === activePaperPreset.value) || null);
const currentPaperVariant = computed(() => currentPaperPreset.value?.variants.find(item => item.key === activePaperVariant.value) || null);
const isFinalCustomMode = computed(() => activePaperPreset.value === 'final' && activePaperVariant.value === 'final-custom');
const isLockedPlan = computed(() => !!activePaperPreset.value && !isFinalCustomMode.value);
const configurationModeText = computed(() => {
  const paper = paperPresets.find(item => item.key === activePaperPreset.value);
  if (isFinalCustomMode.value) return '期末卷－手动自定义（可调整题型、难度和数量）';
  if (paper && currentPaperVariant.value) return `${paper.name}－${currentPaperVariant.value.name}（参数只读，系统按章节库存校验）`;
  if (paper) return `${paper.name}（请选择下方一套具体方案）`;
  const difficulty = templates.find(item => item.key === activeTemplate.value);
  if (difficulty) return `${difficulty.label}难度模板（题型仍可手动修改）`;
  return '尚未选择方案';
});
const selectedChapterTitle = computed(() => form.chapters.length ? `已选择 ${form.chapters.length} 个章节` : '当前使用全部章节');
const selectedChapterDetail = computed(() => form.chapters.length
    ? chapterOptions.value.filter(item => form.chapters.includes(item.chapterNo)).map(item => `第${item.chapterNo}章 ${item.title}`).join('、')
    : `共${chapterOptions.value.length}个章节，${inventory.value?.total ?? 0}道题`);
const sumClass = (sum) => sum === form.count ? 'sum-ok' : 'sum-bad';
const clearChapters = () => { form.chapters = []; };
const selectAllChapters = () => { form.chapters = chapterOptions.value.map(item => item.chapterNo); };
const toggleChapter = (chapterNo) => {
  const idx = form.chapters.indexOf(chapterNo);
  if (idx >= 0) { form.chapters.splice(idx, 1); }
  else { form.chapters.push(chapterNo); }
};
const allocate = (total, values) => { const raw=values.map(v=>total*v/100); const out=raw.map(Math.floor); let left=total-out.reduce((a,b)=>a+b,0); raw.map((v,i)=>({i,r:v%1})).sort((a,b)=>b.r-a.r).forEach(x=>{if(left>0){out[x.i]++;left--;}}); return out; };
const variantTypeDistribution = (variant) => variant.fixedTypeDistribution
  ? { ...variant.fixedTypeDistribution }
  : Object.fromEntries(allocate(variant.count, variant.typeWeights).map((value, index) => [index + 1, value]));
const variantDifficultyDistribution = (variant) => variant.fixedDifficultyDistribution
  ? { ...variant.fixedDifficultyDistribution }
  : Object.fromEntries(allocate(variant.count, variant.difficultyWeights).map((value, index) => [index + 1, value]));
const presetTypeText = (variant) => typeOptions.map((type,index) => `${type.label}${allocate(variant.count,variant.typeWeights)[index]}题`).join('、');
const presetDifficultyText = (variant) => allocate(variant.count,variant.difficultyWeights).map((count,index) => `${index+1}级${count}题`).join('、');
const applyTemplate = (key) => { if (!weights[key]) return; if (!isFinalCustomMode.value) { activePaperPreset.value=''; activePaperVariant.value=''; } presetNotice.value=''; activeTemplate.value=key; allocate(Number(form.count)||0,weights[key]).forEach((value,index)=>{form.difficultyDistribution[index+1]=value;}); };
const markCustomConfig = () => {
  if (!isFinalCustomMode.value) { activePaperPreset.value = ''; activePaperVariant.value = ''; }
  activeTemplate.value = '';
  presetNotice.value = '';
};
const markTypeCustom = () => {
  if (!isFinalCustomMode.value) { activePaperPreset.value = ''; activePaperVariant.value = ''; }
  activeTemplate.value = '';
  presetNotice.value = '';
};
const selectPaperPreset = async (preset) => {
  activePaperPreset.value = preset.key;
  activePaperVariant.value = '';
  activeTemplate.value = '';
  presetNotice.value = `请选择“${preset.name}”下的一套具体方案。方案参数将只读展示，无需手动修改。`;
  preview.value = null;
  builderStep.value = 2;
  if (preset.key === 'final') {
    const defaultPlan = preset.variants[0];
    await applyPaperVariant(preset, defaultPlan);
    await generateFiveFromPlan({
      id: 'final-direct', title: '期末卷', description: '期末卷默认方案',
      typeDistribution: variantTypeDistribution(defaultPlan),
      difficultyDistribution: variantDifficultyDistribution(defaultPlan),
      minKnowledgePoints: defaultPlan.knowledge,
    });
  }
};
const selectFinalCustom = () => {
  activePaperPreset.value = 'final';
  activePaperVariant.value = 'final-custom';
  activeTemplate.value = '';
  presetNotice.value = '已选择期末卷的手动自定义方案，可在最后一步调整题型、难度与数量。';
  preview.value = null;
  builderStep.value = 3;
};
const applyPaperVariant = async (preset, variant) => {
  activePaperPreset.value = preset.key;
  activePaperVariant.value = variant.key;
  presetNotice.value = '';
  activeTemplate.value = preset.key === 'foundation' ? 'basic' : preset.key === 'advanced' ? 'advanced' : 'standard';
  form.count = variant.count;
  const typeDistribution = variantTypeDistribution(variant);
  const difficultyDistribution = variantDifficultyDistribution(variant);
  [1,2,3,4,5,6,7].forEach(type => { form.typeDistribution[type] = typeDistribution[type] || 0; });
  [1,2,3,4,5].forEach(level => { form.difficultyDistribution[level] = difficultyDistribution[level] || 0; });
  form.minKnowledgePoints = Math.min(variant.knowledge, inventory.value?.knowledgePoints.length || variant.knowledge);
  builderStep.value = 3;
  try {
    const checked = await previewRuleExam(buildRulePayload());
    preview.value = checked;
    previewLoading.value = false;
    if (!checked.feasible && checked.alternativePlans?.length) {
      setAlternativePlan(checked.alternativePlans[0], true);
      presetNotice.value = `${variant.name}的原始比例与当前章节库存不完全匹配，系统已${checked.alternativePlans[0].description}，调整后的只读方案已经过可行性验证。`;
    } else if (checked.feasible) {
      presetNotice.value = `${preset.name}－${variant.name}与当前章节库存匹配，可以直接生成。`;
    }
  } catch (err) {
    errorMsg.value = err.message || '快速方案检查失败';
  }
};
const handleCountChange = () => {
  if (isLockedPlan.value) return;
  applyTemplate(activeTemplate.value);
};
const buildRulePayload = () => ({
  title: form.title,
  chapters: [...form.chapters],
  knowledgePoints: [...form.knowledgePoints],
  count: Number(form.count),
  minKnowledgePoints: Number(form.minKnowledgePoints),
  typeDistribution: { ...form.typeDistribution },
  difficultyDistribution: { ...form.difficultyDistribution },
  subject: form.subject || undefined,
  classIds: form.classIds,
  durationMinutes: form.durationMinutes || undefined,
  endAt: form.endAt || undefined,
  maxAttempts: form.maxAttempts || undefined,
  examNature: { ...form.examNature },
});
const subjectOptions = computed(() => {
  // 教师：限自己所教科目；管理员：全部科目
  if (props.role === 'teacher') {
    // 科目迁移后旧会话不匹配时也不能放宽到全部科目；更新所教科目后再选择。
    return (props.subjects || []).filter(item => allSubjects.value.includes(item));
  }
  return allSubjects.value;
});
const handleSubjectChange = async () => {
  // 切换科目：重载库存与预览
  form.chapters = [];
  form.knowledgePoints = [];
  form.classIds = form.classIds.filter(id => classList.value.some(c => c.id === id && c.subject === form.subject));
  chapterOptions.value = form.subject ? await getSubjectChapters(form.subject) : [];
  knowledgeOptions.value = form.subject ? await getSubjectKnowledgePoints(form.subject) : [];
  preview.value = null;
  await loadInventory();
};
onMounted(async () => {
  try {
    // 加载科目和班级列表
    allSubjects.value = await getSubjects({ hasQuestions: 1 });
    try {
      const clsData = await getClasses();
      classList.value = Array.isArray(clsData) ? clsData : (clsData.list || []);
    } catch { /* ignore */ }
    // 仅在当前角色可用科目范围内默认选择。
    if (props.role === 'teacher' && props.subjects?.length === 1 && allSubjects.value.includes(props.subjects[0])) {
      form.subject = props.subjects[0];
      chapterOptions.value = await getSubjectChapters(form.subject);
      knowledgeOptions.value = await getSubjectKnowledgePoints(form.subject);
    } else if (subjectOptions.value.length === 1) {
      form.subject = subjectOptions.value[0];
      chapterOptions.value = await getSubjectChapters(form.subject);
      knowledgeOptions.value = await getSubjectKnowledgePoints(form.subject);
    }
  } catch { /* ignore */ }
  loadInventory();
});
let previewTimer;
let previewRequestId = 0;
const loadPreview = async () => {
  const requestId = ++previewRequestId;
  previewLoading.value = true;
  try {
    const data = await previewRuleExam(buildRulePayload());
    if (requestId === previewRequestId) preview.value = data;
  } catch (err) {
    if (requestId === previewRequestId) {
      preview.value = null;
      errorMsg.value = err.message || '组合检查失败，请确认后端服务是否正常';
    }
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false;
  }
};
const schedulePreview = () => {
  clearTimeout(previewTimer);
  preview.value = null;
  previewTimer = setTimeout(loadPreview, 300);
};
const loadInventory = async () => {
  inventoryLoading.value=true;
  errorMsg.value='';
  try { inventory.value=await getExamInventory(form.chapters, form.subject); }
  catch(err){errorMsg.value=err.message||'读取题库库存失败';}
  finally{
    inventoryLoading.value=false;
    const preset = paperPresets.find(item => item.key === activePaperPreset.value);
    const variant = preset?.variants.find(item => item.key === activePaperVariant.value);
    if (preset && variant) applyPaperVariant(preset, variant); else schedulePreview();
  }
};
watch(() => [...form.chapters], async () => {
  knowledgeOptions.value = form.subject ? await getSubjectKnowledgePoints(form.subject, form.chapters) : [];
  form.knowledgePoints = form.knowledgePoints.filter(point => knowledgeOptions.value.some(item => item.name === point));
  loadInventory();
});
watch(() => [form.count, form.minKnowledgePoints, ...Object.values(form.typeDistribution), ...Object.values(form.difficultyDistribution)], schedulePreview);
const validateSubject = () => {
  if (props.role === 'teacher' && !form.subject) {
    return '请选择组卷科目（教师必填）';
  }
  return '';
};
const goToStructure = () => {
  const subjectError = validateSubject();
  if (subjectError) {
    errorMsg.value = subjectError;
    emit('toast', { message: subjectError, type: 'warning' });
    return;
  }
  errorMsg.value = '';
  builderStep.value = 4;
  schedulePreview();
};
const validate = () => {
  const subErr = validateSubject();
  if (subErr) return subErr;
  if(!Number.isInteger(form.count)||form.count<1||form.count>100)return '总题数需为1-100之间的整数'; if(typeSum.value!==form.count)return `题型合计为${typeSum.value}，应为${form.count}`; if(difficultySum.value!==form.count)return `难度合计为${difficultySum.value}，应为${form.count}`; if(form.count>(inventory.value?.total||0))return '当前章节范围题目库存不足'; if(form.minKnowledgePoints>(inventory.value?.knowledgePoints.length||0))return '知识点覆盖要求超过当前库存'; return ''; };
const formatReason = (reason) => reason.replace(/题型1/g, '判断题').replace(/题型2/g, '单选题').replace(/题型3/g, '多选题').replace(/题型4/g, '填空题').replace(/题型5/g, '简答题').replace(/题型6/g, '程序论述题').replace(/题型7/g, '组合题');
const typeDistributionText = (distribution) => typeOptions.map(type => `${type.label}${Number(distribution?.[type.value]) || 0}题`).join('、');
const difficultyDistributionText = (distribution) => [1,2,3,4,5].map(level => `${level}级${Number(distribution?.[level]) || 0}题`).join('、');
const setAlternativePlan = (plan, keepPreset = false) => {
  [1,2,3,4,5,6,7].forEach(type => { form.typeDistribution[type] = Number(plan.typeDistribution?.[type]) || 0; });
  [1,2,3,4,5].forEach(level => { form.difficultyDistribution[level] = Number(plan.difficultyDistribution?.[level]) || 0; });
  activeTemplate.value = '';
  if (!keepPreset) { activePaperPreset.value = ''; activePaperVariant.value = ''; }
};
const applyAlternativePlan = (plan) => { presetNotice.value = ''; setAlternativePlan(plan, !!activePaperPreset.value); };
const startNewExam = () => {
  result.value = null;
  assistPlans.value = [];
  generatedExams.value = [];
  selectedExamIds.value = [];
  confirmedExamIds.value = [];
  lastGenerationPlan.value = null;
  errorMsg.value = '';
  builderStep.value = 1;
};
const handleGenerate = async () => { errorMsg.value=validate(); if(errorMsg.value)return; if(!preview.value?.feasible){errorMsg.value='当前设置未通过题型与难度组合检查，请先调整后再生成';return;} await generateFiveFromPlan({ id: 'current-config', title: form.title || '组卷方案', typeDistribution: { ...form.typeDistribution }, difficultyDistribution: { ...form.difficultyDistribution }, minKnowledgePoints: form.minKnowledgePoints }); };
const buildAssistPlans = () => {
  if (preview.value?.alternativePlans?.length) return preview.value.alternativePlans;
  const availablePoints = form.knowledgePoints.length || inventory.value?.knowledgePoints?.length || 0;
  if (availablePoints > 0) {
    return [{
      id: 'available-knowledge',
      title: '按当前知识点范围生成',
      description: `保留当前题型和难度结构，将知识点覆盖调整为当前可用的 ${availablePoints} 个。`,
      typeDistribution: { ...form.typeDistribution },
      difficultyDistribution: { ...form.difficultyDistribution },
      minKnowledgePoints: Math.min(Number(form.minKnowledgePoints) || 1, availablePoints),
      changedField: 'knowledge',
    }];
  }
  return [];
};
const openGeneratedExport = (exam) => {
  const latest = generatedExams.value.find(item => Number(item.examId) === Number(exam.examId));
  result.value = latest ? { ...exam, ...latest } : exam;
  exportVisible.value = true;
};
const confirmFinalSelection = async () => {
  const finalIds = [...selectedExamIds.value];
  if (!finalIds.length) return;
  selectionSaving.value = true;
  try {
    const unselected = generatedExams.value.filter(exam => !finalIds.includes(exam.examId));
    await Promise.all([...unselected.map(exam => deleteExamApi(exam.examId)), ...finalIds.map(examId => updateExamStatusApi(examId, 'published'))]);
    generatedExams.value = generatedExams.value.filter(exam => finalIds.includes(exam.examId));
    selectedExamIds.value = [...finalIds];
    confirmedExamIds.value = [...finalIds];
    result.value = generatedExams.value[0] || null;
    emit('toast', { message: `已确定 ${confirmedExamIds.value.length} 套最终试卷，未选择的候选试卷已移除`, type: 'success' });
  } catch (err) {
    emit('toast', { message: err.message || '确认最终版本失败，请重试', type: 'error' });
  } finally {
    selectionSaving.value = false;
  }
};
const regenerateFive = async () => {
  if (lastGenerationPlan.value) await generateFiveFromPlan(lastGenerationPlan.value);
};
const openExamEditor = async (exam) => {
  try {
    const detail = await getExam(exam.examId);
    editableExam.value = { title: detail.title, examId: exam.examId, questions: (detail.questions || []).map(item => ({ ...item })), examNature: detail.examNature || form.examNature };
    editorMode.value = 'edit';
    editorVisible.value = true;
  } catch (err) { emit('toast', { message: err.message || '读取试卷内容失败', type: 'error' }); }
};
const openExamViewer = async (exam) => {
  try {
    const detail = await getExam(exam.examId);
    editableExam.value = { title: detail.title, examId: exam.examId, questions: (detail.questions || []).map(item => ({ ...item })), examNature: detail.examNature || form.examNature };
    editorMode.value = 'view';
    editorVisible.value = true;
  } catch (err) { emit('toast', { message: err.message || '读取试卷内容失败', type: 'error' }); }
};
const optionLines = (options) => String(options || '').split(/\r?\n/).filter(Boolean);
const previewQuestionGroups = computed(() => {
  const rules = { 1: ['判断题', 1], 2: ['单选题', 1], 3: ['多选题', 2], 4: ['填空题', 1], 5: ['问答题', 10], 7: ['组合题', 10], 6: ['程序题', 10] };
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const grouped = (editableExam.value.questions || []).reduce((groups, question) => {
    const type = Number(question.题型 || question.question_type || 0);
    if (!groups[type]) groups[type] = [];
    groups[type].push(question);
    return groups;
  }, {});
  const groups = [1, 2, 3, 4, 5, 7, 6].filter(type => grouped[type]?.length).map((type, index) => {
    const [name, score] = rules[type] || ['未知题型', 0];
    const count = grouped[type].length;
    const numeral = numerals[index] || String(index + 1);
    return { numeral, name: `${numeral}、${name}（共${count}题，每题${score}分，共${count * score}分）`, questions: grouped[type] };
  });
  return groups;
});
const saveExamEditor = async () => {
  editorSaving.value = true;
  try {
    await updateExamContentApi(editableExam.value.examId, {
      title: editableExam.value.title,
      questions: editableExam.value.questions.map(question => ({ sortOrder: question.sort_order, content: question.题目, options: question.选项, answer: question.答案, explanation: question.解析 })),
    });
    const index = generatedExams.value.findIndex(item => Number(item.examId) === Number(editableExam.value.examId));
    if (index >= 0) generatedExams.value[index] = { ...generatedExams.value[index], title: editableExam.value.title };
    if (Number(result.value?.examId) === Number(editableExam.value.examId)) result.value = { ...result.value, title: editableExam.value.title };
    editorVisible.value = false;
    emit('toast', { message: '试卷修改已保存', type: 'success' });
  } catch (err) { emit('toast', { message: err.message || '保存修改失败', type: 'error' }); }
  finally { editorSaving.value = false; }
};
const generateFiveFromPlan = async (plan) => {
  planGenerating.value = true;
  errorMsg.value = '';
  try {
    lastGenerationPlan.value = {
      ...plan,
      typeDistribution: { ...plan.typeDistribution },
      difficultyDistribution: { ...plan.difficultyDistribution },
    };
    const baseTitle = String(form.title || plan.title || '组卷方案').trim();
    const exams = [];
    for (let index = 1; index <= 5; index += 1) {
      const payload = {
        ...buildRulePayload(),
        title: `${baseTitle}-${index}`,
        typeDistribution: { ...plan.typeDistribution },
        difficultyDistribution: { ...plan.difficultyDistribution },
        minKnowledgePoints: Number(plan.minKnowledgePoints || form.minKnowledgePoints),
        status: 'draft',
      };
      exams.push(await generateRuleExam(payload));
    }
    generatedExams.value = exams;
    selectedExamIds.value = [];
    confirmedExamIds.value = [];
    result.value = exams[0];
    assistPlans.value = [];
    builderStep.value = 6;
    emit('toast', { message: '已生成 5 套不同试卷', type: 'success' });
  } catch (err) {
    errorMsg.value = err.message || '生成试卷失败，请调整方案后重试';
  } finally {
    planGenerating.value = false;
  }
};
const handleSmartExam = async () => {
  errorMsg.value = '';
  if (!preview.value?.feasible) {
    assistPlans.value = buildAssistPlans();
    if (assistPlans.value.length) { builderStep.value = 5; return; }
    errorMsg.value = '当前范围没有可用的调整方案，请返回上一步调整科目、章节或知识点要求。';
    return;
  }
  await generateFiveFromPlan({ id: 'assisted-config', title: form.title || '辅助组卷方案', typeDistribution: { ...form.typeDistribution }, difficultyDistribution: { ...form.difficultyDistribution }, minKnowledgePoints: form.minKnowledgePoints });
};
</script>

<style scoped>
.exam-builder{display:flex;flex-direction:column;gap:16px;max-width:1240px;margin:0 auto;width:100%}

/* ===== 顶部横幅 ===== */
.iq-page-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 34px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.25);
}
.hero-content .hero-badge {
  font-size: 12px;
  opacity: 0.8;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 4px;
}
.hero-content .hero-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.hero-content .hero-desc {
  font-size: 14px;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
  margin: 4px 0 0;
}

.section-card{padding:22px 26px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.section-title,.result-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
.base-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.base-grid label,.distribution-item{display:flex;flex-direction:column;gap:6px;font-size:13px}
.inline-actions,.template-actions,.action-row{display:flex;justify-content:center;gap:24px;margin-top:12px}
.distribution-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.difficulty-grid{grid-template-columns:repeat(5,1fr)}
.distribution-item{padding:12px;border:1px solid var(--iq-neutral-200);border-radius:8px}
.distribution-item span{font-weight:600}
.distribution-item small{font-weight:400;color:var(--iq-neutral-500)}
.distribution-item b{font-size:12px;color:var(--iq-neutral-500)}
.sum-ok,.ok{color:#059669!important}
.sum-bad,.bad{color:#dc2626!important}
.info-note,.error-note,.success-note{padding:11px 13px;border-radius:8px;margin-top:12px;font-size:13px}
.info-note{background:#eff6ff;color:#1d4ed8}
.error-note{background:#fef2f2;color:#b91c1c}
.success-note{background:#ecfdf5;color:#047857}
.check-list{display:flex;flex-wrap:wrap;gap:18px;font-size:13px}
.ai-btn{background:#7c3aed;color:#fff;border-color:#7c3aed}
.result-card{border-left:4px solid #10b981}
.result-head h3{margin:0}

.chapter-selector{margin-top:20px;padding:18px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc}
.chapter-selector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
.chapter-selector-head>div:first-child{display:flex;flex-direction:column;gap:3px}
.chapter-selector-head b{font-size:14px;color:#172033}
.chapter-selector-head small{font-size:12px;color:#64748b}
.chapter-actions{display:flex;gap:8px}
.chapter-action{padding:7px 12px;border:1px solid #c7d2fe;border-radius:7px;background:#fff;color:#4f46e5;font-size:12px;font-weight:600;cursor:pointer}
.chapter-action:hover{background:#eef2ff}
.chapter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:8px}
.chapter-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border:2px solid #dbe3f0;border-radius:10px;background:#fff;cursor:pointer;transition:all .15s ease;text-align:center}
.chapter-card:hover{border-color:#818cf8;background:#eef2ff}
.chapter-card.active{border-color:#4f46e5;background:#4f46e5;color:#fff}
.chapter-card-no{font-size:11px;opacity:.7;font-weight:600}
.chapter-card-title{font-size:14px;font-weight:700;line-height:1.2}
.chapter-card-count{font-size:11px;opacity:.6}
.chapter-card.active .chapter-card-count{color:#c7d2fe}
.selected-summary{display:flex;align-items:center;gap:10px;padding:11px 13px;margin-bottom:12px;border:1px solid #a5b4fc;border-radius:9px;background:#eef2ff;color:#3730a3}
.selected-summary.empty{border-color:#cbd5e1;background:#fff;color:#475569}
.summary-icon{display:inline-flex;width:25px;height:25px;align-items:center;justify-content:center;border-radius:50%;background:#4f46e5;color:#fff;font-weight:700}
.selected-summary.empty .summary-icon{background:#94a3b8}
.selected-summary>div{display:flex;flex-direction:column;gap:2px}
.selected-summary b{font-size:13px}
.selected-summary small{font-size:12px;color:#6366f1}
.selected-summary.empty small{color:#64748b}
.chapter-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.chapter-chip{position:relative;display:grid;grid-template-columns:24px 1fr;grid-template-rows:auto auto;align-items:center;column-gap:8px;min-height:64px;padding:10px 11px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;color:#334155;text-align:left;cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s,transform .15s}
.chapter-chip:hover{border-color:#a5b4fc;background:#f8faff;transform:translateY(-1px)}
.chapter-chip.active{border-color:#4f46e5;background:#eef2ff;color:#312e81;box-shadow:0 0 0 2px rgba(79,70,229,.1)}
.chapter-check{grid-row:1/3;display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border:2px solid #cbd5e1;border-radius:6px;background:#fff;color:#fff;font-size:14px;font-weight:800}
.chapter-chip.active .chapter-check{border-color:#4f46e5;background:#4f46e5}
.chapter-name{font-size:13px;font-weight:700}
.chapter-chip small{font-size:11px;color:#64748b}
.chapter-chip.active small{color:#6366f1}
.chapter-help{margin:10px 0 0;color:#64748b;font-size:12px}
.feasibility-note{padding:14px;margin-top:12px;border:1px solid #fecaca;border-radius:9px;background:#fff7f7;color:#991b1b;font-size:13px}
.feasibility-title{display:flex;justify-content:space-between;gap:12px}
.feasibility-title span{color:#b91c1c}
.feasibility-note ul{margin:9px 0 0;padding-left:20px}
.feasibility-note li+li{margin-top:5px}
.suggestion-box{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 12px;margin-top:12px;border-radius:8px;background:#fff;color:#334155}
.suggestion-box>div{display:flex;flex-direction:column;gap:4px}
.suggestion-box span{font-size:12px;color:#64748b}

.paper-presets{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:10px}
.paper-preset{display:flex;flex-direction:column;gap:8px;min-height:122px;padding:22px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;text-align:left;color:#334155;cursor:pointer}
.paper-preset:nth-child(2){order:3}
.paper-preset:nth-child(3){order:2}
.paper-preset:hover{border-color:#a5b4fc}
.paper-preset.active{border-color:#4f46e5;background:#eef2ff}
.manual-variant{border-style:dashed}
.manual-variant.active{border-color:#0f766e;background:#f0fdfa}
.preset-name{display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:700}
.preset-name small{padding:2px 7px;border-radius:12px;background:#eef2ff;color:#4f46e5;font-size:11px}
.paper-preset.active .preset-name small{background:#fff}
.preset-description{font-size:14px;color:#475569}
.preset-detail,.preset-help{font-size:12px;color:#64748b}
.preset-help{margin:0 0 8px}
.mode-status{display:flex;align-items:center;gap:7px;padding:8px 11px;margin-bottom:8px;border-radius:8px;background:#f8fafc;color:#475569;font-size:12px}
.mode-status span{color:#334155}
.mode-status button{margin-left:auto;border:0;background:transparent;color:#4f46e5;font-size:12px;font-weight:600;cursor:pointer}
.mode-status button:hover{text-decoration:underline}
.preset-notice{padding:9px 11px;margin-bottom:14px;border-radius:8px;background:#f0fdf4;color:#047857;font-size:12px}
.step-actions{display:flex;justify-content:center;gap:24px;margin-top:16px}
.alternative-section{margin-top:13px}
.alternative-heading{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}
.alternative-heading span{font-size:12px;color:#64748b}
.alternative-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
.alternative-card{padding:11px;border:1px solid #fecaca;border-radius:8px;background:#fff;color:#334155}
.alternative-card>div{display:flex;flex-direction:column;gap:2px}
.alternative-card>div span,.alternative-card p{font-size:12px;color:#64748b}
.alternative-card p{margin:7px 0}
.alternative-card strong{color:#334155}
.result-actions{display:flex;gap:8px}
.assistant-plan-page,.result-card{max-width:1180px;margin-left:auto;margin-right:auto}
.assistant-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}
.generated-exam-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:18px}
.assistant-plan-card,.generated-exam-card{display:flex;flex-direction:column;min-height:230px;padding:20px;border:1px solid #dbe3f0;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.04)}
.assistant-plan-card:hover,.generated-exam-card:hover{border-color:#a5b4fc;box-shadow:0 8px 18px rgba(79,70,229,.1)}
.generated-exam-card.selected{border-color:#6366f1;background:#f8faff}
.assistant-plan-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.exam-select{display:flex;align-items:center;gap:6px;color:#4338ca;font-size:12px;font-weight:700;cursor:pointer}.exam-select input{accent-color:#6366f1}
.selection-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;margin-top:14px;border:1px solid #c7d2fe;border-radius:9px;background:#eef2ff;color:#3730a3;font-size:13px}
.paper-type-badge{padding:4px 9px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700}
.paper-id{font-size:12px;color:#94a3b8}
.assistant-plan-card h3,.generated-exam-card h3{margin:16px 0 8px;color:#172033;font-size:16px;line-height:1.45}
.assistant-plan-description{min-height:36px;margin:0;color:#64748b;font-size:13px;line-height:1.55}
.assistant-plan-meta{display:flex;flex-direction:column;gap:7px;margin-top:15px;color:#475569;font-size:12px;line-height:1.5}
.generated-report{display:flex;flex-direction:column;gap:7px;margin-top:13px;padding:11px;border-radius:8px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.6}
.generated-report span{display:inline-block;margin-right:9px;color:#334155}
.assistant-plan-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:15px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px}
.editor-mask{position:fixed;inset:0;z-index:1000;display:flex;justify-content:center;padding:4vh 16px;background:rgba(15,23,42,.45);overflow:auto}
.editor-dialog{width:min(900px,100%);max-height:90vh;overflow:auto;padding:24px;border-radius:14px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.28)}
.editor-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px}.editor-head h2{margin:0;color:#172033}.editor-head p{margin:5px 0 0;color:#64748b;font-size:13px}.editor-head button{border:0;background:transparent;font-size:28px;color:#64748b;cursor:pointer}
.viewer-close{display:block;margin-left:auto;border:0;background:transparent;font-size:28px;line-height:1;color:#64748b;cursor:pointer}
.editor-title{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:13px;font-weight:700}.editor-question{display:flex;flex-direction:column;gap:8px;padding:14px;margin-top:12px;border:1px solid #dbe3f0;border-radius:10px;background:#fff}.editor-question textarea{resize:vertical;line-height:1.55}.editor-two-col{display:grid;grid-template-columns:1fr 2fr;gap:8px}.editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.paper-preview{width:min(720px,100%);margin:0 auto;padding:42px 52px;border:1px solid #222;background:#fff;color:#111;line-height:1.75;font-family:"SimSun","宋体",serif}.paper-preview h1,.paper-preview h2{text-align:center;color:#000;font-family:"SimHei","黑体",sans-serif}.paper-preview h1{font-size:25px;margin:22px 0}.paper-preview h2{font-size:21px;margin:18px 0}.paper-preview>p{text-align:center;font-size:16px}.paper-preview table{width:100%;border-collapse:collapse;margin:35px 0}.paper-preview th,.paper-preview td{height:28px;border:1px solid #222;text-align:center}.paper-preview section{margin-top:26px;padding-top:20px;break-before:page}.paper-preview section h3{color:#000;font-size:19px}.paper-preview section article{margin:12px 0}.paper-preview section article p{margin:4px 0 4px 28px}
.variant-panel{padding:14px;margin:10px 0;border:1px solid #c7d2fe;border-radius:10px;background:#f8faff}
.variant-panel-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;color:#312e81}
.variant-panel-head span{font-size:12px;color:#64748b}
.variant-grid{display:grid;grid-template-columns:1fr;gap:12px}
.variant-card{display:flex;flex-direction:column;gap:7px;min-height:122px;padding:15px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;color:#475569;text-align:left;font-size:12px;cursor:pointer}
.variant-card:hover{border-color:#a5b4fc}
.variant-card.active{border-color:#4f46e5;background:#eef2ff}
.variant-title{display:flex;align-items:center;justify-content:space-between;color:#1e293b;font-size:14px;font-weight:700}
.variant-title small{padding:2px 6px;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:10px}
.variant-card b{color:#334155}
.iq-input:disabled{background:#f1f5f9;color:#475569;cursor:not-allowed;opacity:1}
.distribution-item:has(.iq-input:disabled){background:#f8fafc}
.result-actions{display:flex;gap:8px}

.iq-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.2s;
}
.iq-btn-primary {
  background: #6366F1;
  color: #fff;
  border-color: #6366F1;
}
.iq-btn-primary:hover {
  background: #4F46E5;
  border-color: #4F46E5;
}
.iq-btn-secondary {
  background: #FFFFFF;
  color: #64748B;
  border-color: #E2E8F0;
}
.iq-btn-secondary:hover {
  background: #F1F5F9;
}
.iq-btn-sm { padding: 6px 12px; font-size: 13px; }

@media(max-width:900px){.chapter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.difficulty-grid{grid-template-columns:repeat(3,1fr)}.assistant-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.base-grid,.distribution-grid,.alternative-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.base-grid,.distribution-grid,.difficulty-grid,.paper-presets,.alternative-grid,.variant-grid,.assistant-plan-grid{grid-template-columns:1fr}.chapter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.chapter-selector-head,.alternative-heading,.variant-panel-head,.result-head{flex-direction:column}.chapter-actions{width:100%}.chapter-action{flex:1}.result-actions,.step-actions{width:100%;flex-direction:column}.step-actions .iq-btn{justify-content:center}.assistant-plan-footer{flex-direction:column;align-items:stretch}.assistant-plan-footer .iq-btn{justify-content:center}.editor-two-col{grid-template-columns:1fr}}
.chapter-chip{grid-template-columns:24px minmax(0,1fr);min-height:78px}.chapter-name{display:grid;gap:2px;min-width:0}.chapter-name b{font-size:13px}.chapter-name em{font-size:12px;line-height:1.35;font-style:normal;font-weight:500;color:#475569;overflow-wrap:anywhere}.chapter-chip.active .chapter-name em{color:#4338ca}.selected-summary>div{min-width:0}.selected-summary small{line-height:1.6}
</style>
