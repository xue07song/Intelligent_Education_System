<template>
  <div class="class-mgmt">
    <!-- ===== 顶部横幅（与自适应学情大小一致） ===== -->
    <header class="iq-page-hero">
      <div class="hero-content">
        <span class="hero-badge">🏫 教学管理</span>
        <h1 class="hero-title">班级管理</h1>
        <p class="hero-desc">管理班级、添加学生、调班或移出，轻松组织教学</p>
      </div>
      <div class="hero-actions">
        <button v-if="role === 'teacher'" class="iq-btn iq-btn-secondary-light" @click="openManagedClasses">设置管理班级</button>
        <button class="iq-btn iq-btn-secondary-light" @click="openUnassignedDialog">
          👥 可添加学生 ({{ unassignedCount }})
        </button>
        <button class="iq-btn iq-btn-primary" @click="openCreateClass">+ 新建班级</button>
      </div>
    </header>

    <Teleport to="body">
      <div v-if="managedVisible" class="iq-modal-overlay" @click.self="managedVisible=false">
        <div class="iq-modal iq-modal-md">
          <div class="iq-modal-header"><div><h3 class="iq-modal-title">设置管理班级</h3><p class="iq-modal-subtitle">从管理员已经创建的班级中搜索并多选</p></div><button class="iq-modal-close" @click="managedVisible=false">×</button></div>
          <div class="iq-modal-body">
            <el-select v-model="managedClassIds" multiple filterable clearable placeholder="输入关键词搜索班级" style="width:100%">
              <el-option v-for="item in allClassOptions" :key="item.id" :value="item.id" :label="`${item.name}${item.subject ? `（${item.subject}）` : ''}`" />
            </el-select>
          </div>
          <div class="iq-modal-footer"><button class="iq-btn iq-btn-secondary" @click="managedVisible=false">取消</button><button class="iq-btn iq-btn-primary" @click="saveManagedClasses">保存</button></div>
        </div>
      </div>
    </Teleport>

    <div class="class-mgmt-layout">
      <!-- 班级列表 -->
      <aside class="iq-card class-side">
        <div class="class-side-head">
          <b>班级列表</b>
          <span class="iq-text-sm iq-text-muted">共 {{ classList.length }} 个班</span>
        </div>
        <input v-model="classKeyword" class="iq-input class-search" placeholder="搜索班级名称、年级或备注" @input="scheduleClassSearch" />
        <div v-if="classLoading" class="iq-table-loading" style="padding:40px 0;">
          <span class="iq-loading-spinner"></span>
          <span class="iq-text-sm iq-text-muted">加载中...</span>
        </div>
        <div v-else class="class-list">
          <button
              v-for="cls in classList"
              :key="cls.id"
              type="button"
              class="class-item"
              :class="{ active: selectedClassId === cls.id }"
              @click="selectClass(cls.id)"
          >
            <div class="class-item-main">
              <div class="class-item-name">{{ cls.name }}</div>
              <div class="class-item-meta">
                <span v-if="cls.subject" class="class-item-subject">📚 {{ cls.subject }}</span>
                <span>👥 {{ cls.student_count ?? cls.students?.length ?? 0 }} 人</span>
                <span v-if="cls.grade">年级 {{ cls.grade }}</span>
              </div>
            </div>
            <div class="class-item-actions" @click.stop>
              <button class="iq-btn iq-btn-ghost iq-btn-sm act-edit" @click="openEditClass(cls)">编辑</button>
              <button
                  class="iq-btn iq-btn-ghost iq-btn-sm act-del"
                  @click="handleDeleteClass(cls)"
              >删除</button>
            </div>
          </button>
          <div v-if="classList.length === 0" class="iq-empty-box" style="padding:30px 0;">
            <div class="iq-empty-icon">🏫</div>
            <div class="iq-empty-text iq-text-sm iq-text-muted">还没有班级，点击右上角新建</div>
          </div>
        </div>
      </aside>

      <!-- 班内学生 -->
      <section class="iq-card class-main">
        <template v-if="!selectedClassId">
          <div class="iq-empty-box" style="padding:80px 0;">
            <div class="iq-empty-icon">👈</div>
            <div class="iq-empty-text iq-text-base" style="color:var(--iq-neutral-600);">请从左侧选择一个班级</div>
            <div class="iq-text-sm iq-text-muted">查看班内学生、添加学生、调班或移出</div>
          </div>
        </template>
        <template v-else>
          <div class="class-main-head">
            <div>
              <h2 class="iq-text-lg iq-font-semibold" style="margin:0;">{{ currentClass?.name }}</h2>
              <p class="iq-text-sm iq-text-muted" style="margin:4px 0 0;">
                <span v-if="currentClass?.subject">📚 课程：{{ currentClass.subject }} · </span>
                <span v-if="currentClass?.grade">年级：{{ currentClass.grade }} · </span>
                班内学生：{{ studentList.length }} 人
                <span v-if="currentClass?.description"> · 备注：{{ currentClass.description }}</span>
              </p>
            </div>
            <div class="iq-page-actions">
              <button class="iq-btn iq-btn-secondary" @click="openAddStudents">+ 添加学生</button>
            </div>
          </div>

          <div v-if="studentLoading" class="iq-table-loading" style="padding:60px 0;">
            <span class="iq-loading-spinner"></span>
            <span class="iq-text-sm iq-text-muted">加载学生列表...</span>
          </div>
          <div v-else class="iq-table-wrap">
            <table class="iq-table">
              <thead>
              <tr>
                <th style="width:56px;"><input type="checkbox" class="iq-checkbox" :checked="isAllSelected" :indeterminate.prop="isIndeterminate" @change="toggleAllStudents" /></th>
                <th>ID</th>
                <th>用户名</th>
                <th>专业</th>
                <th>学号</th>
                <th>入班时间</th>
                <th style="width:260px;">操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="stu in studentList" :key="stu.id">
                <td><input type="checkbox" class="iq-checkbox" :checked="selectedStudentIds.includes(stu.id)" @change="toggleStudent(stu.id)" /></td>
                <td><span class="iq-id-chip">{{ stu.id }}</span></td>
                <td>
                  <button class="stu-name-btn" @click="openStudentRecords(stu)" :title="`查看 ${stu.username} 的答题记录`">
                    {{ stu.username }}
                  </button>
                </td>
                <td class="ellipsis-cell" :title="stu.college || stu.school || ''">{{ stu.college || stu.school || '--' }}</td>
                <td>{{ stu.student_no || '--' }}</td>
                <td class="iq-text-sm iq-text-muted">{{ stu.joined_at || '--' }}</td>
                <td>
                  <div class="iq-table-action">
                    <button class="iq-btn iq-btn-ghost iq-btn-sm act-view" @click="openStudentRecords(stu)">查看记录</button>
                    <button class="iq-btn iq-btn-ghost iq-btn-sm act-edit" @click="openTransfer(stu)">调班</button>
                    <button class="iq-btn iq-btn-ghost iq-btn-sm act-del" @click="handleRemove(stu)">移出班级</button>
                  </div>
                </td>
              </tr>
              <tr v-if="studentList.length === 0">
                <td colspan="7" class="iq-empty-row">
                  <div class="iq-empty-box" style="padding:40px 0;">
                    <div class="iq-empty-icon">👥</div>
                    <div class="iq-empty-text iq-text-sm iq-text-muted">班级还没有学生</div>
                    <div class="iq-text-sm iq-text-muted">点击右上角「添加学生」</div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="selectedStudentIds.length > 0" class="batch-bar">
            <span>已选 {{ selectedStudentIds.length }} 名学生</span>
            <button class="iq-btn iq-btn-secondary iq-btn-sm" @click="openBatchTransfer">批量调班</button>
            <button class="iq-btn iq-btn-danger iq-btn-sm" @click="handleBatchRemove">批量移出</button>
            <button class="iq-btn iq-btn-ghost iq-btn-sm" @click="selectedStudentIds = []">取消选择</button>
          </div>
        </template>
      </section>
    </div>

    <!-- 班级表单弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="classDialogVisible" class="iq-modal-overlay" @click.self="classDialogVisible = false">
          <div class="iq-modal iq-modal-md class-editor-dialog">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" :style="{ background: isEditClass ? 'var(--iq-state-warning-bg)' : 'var(--iq-primary-50)', color: isEditClass ? 'var(--iq-state-warning)' : 'var(--iq-primary-600)' }">
                  <svg v-if="!isEditClass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">{{ isEditClass ? '编辑班级' : '新建班级' }}</h3>
                  <p class="iq-modal-subtitle">{{ isEditClass ? '修改班级信息' : '填写班级基本信息' }}</p>
                </div>
              </div>
              <button class="iq-modal-close" @click="classDialogVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form class="iq-modal-body class-editor-body" @submit.prevent="handleSubmitClass">
              <div class="iq-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="iq-form-field"><label class="iq-form-label">学院 <span class="iq-req">*</span></label><select v-model="classForm.college" class="iq-select" @change="onCollegeChange"><option value="">请选择学院</option><option v-for="c in collegeOptions" :key="c">{{ c }}</option></select></div>
                <div class="iq-form-field"><label class="iq-form-label">专业 <span class="iq-req">*</span></label><select v-model="classForm.major" class="iq-select" :disabled="!classForm.college" @change="onMajorChange"><option value="">请选择专业</option><option v-for="m in availableMajors" :key="m">{{ m }}</option></select></div>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">课程 <span class="iq-req">*</span></label>
                <div class="iq-subject-checkboxes">
                  <label v-for="s in availableSubjects" :key="s" class="iq-checkbox-item">
                    <input type="radio" class="iq-checkbox" :value="s" v-model="classForm.subject" />
                    <span>{{ s }}</span>
                  </label>
                  <span v-if="availableSubjects.length === 0" class="iq-text-sm iq-text-muted">
                    {{ role === 'teacher' ? '您还未分配所教课程，请联系管理员或在「用户管理」中补充' : '请先选择学院' }}
                  </span>
                </div>
                <span class="iq-text-xs iq-text-muted">
                  <template v-if="role === 'teacher'">仅可在本人所教课程中选择（{{ (subjects || []).length }} 门）</template>
                  <template v-else>班级按课程分类，任课教师仅能看到所教课程的班级</template>
                </span>
              </div>
              <div class="iq-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="iq-form-field">
                  <label class="iq-form-label">入学年份</label>
                  <input v-model="classForm.grade" class="iq-input" placeholder="如：2024" />
                </div>
                <div class="iq-form-field">
                  <label class="iq-form-label">生成班级数</label>
                  <input v-model.number="classForm.classCount" type="number" min="1" max="20" class="iq-input" :disabled="isEditClass" />
                </div>
              </div>
              <div class="iq-form-grid" style="grid-template-columns: 1fr 1fr;"><div class="iq-form-field"><label class="iq-form-label">每班人数</label><input v-model.number="classForm.capacity" type="number" min="1" class="iq-input" /></div><div class="iq-form-field"><label class="iq-form-label">将生成的班级</label><select class="iq-select"><option v-for="c in generatedClasses" :key="c.index">{{ c.name }}</option></select></div></div>
              <div class="iq-form-field"><label class="iq-form-label">专业辅导员</label><input v-model="counselorKeyword" class="iq-input" placeholder="搜索辅导员姓名、用户名或工号" @input="locateCounselor" /><select v-model="classForm.counselorId" class="iq-select"><option value="">请选择</option><option v-for="t in filteredCounselors" :key="t.id" :value="t.id">{{ t.nickname || t.username }}（工号：{{ t.employee_no || '未填写' }}）</option></select></div>
              <div class="iq-form-field"><label class="iq-form-label">逐班设置班主任</label><div v-for="c in generatedClasses" :key="c.index" class="teacher-row"><span>{{ c.name }}</span><input v-model="headTeacherKeywords[c.index]" class="iq-input" placeholder="搜索教师姓名、用户名或工号" @input="locateHeadTeacher(c.index)" /><select v-model="headTeachers[c.index]" class="iq-select"><option value="">请选择班主任</option><option v-for="t in filterTeachers(headTeacherKeywords[c.index])" :key="t.id" :value="t.id">{{ t.nickname || t.username }}（工号：{{ t.employee_no || '未填写' }}）</option></select></div></div>
              <div class="iq-form-field">
                <label class="iq-form-label">备注</label>
                <textarea v-model="classForm.description" rows="3" class="iq-textarea" placeholder="选填，班级描述信息"></textarea>
              </div>
              <div class="iq-modal-footer">
                <button type="button" class="iq-btn iq-btn-secondary" @click="classDialogVisible = false">取消</button>
                <button type="submit" class="iq-btn iq-btn-primary" :disabled="classSubmitting.value">
                  <span v-if="classSubmitting.value" class="iq-btn-spinner"></span>
                  {{ classSubmitting.value ? '提交中...' : (isEditClass ? '确认修改' : '确认创建') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 添加学生弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="addDialogVisible" class="iq-modal-overlay" @click.self="addDialogVisible = false">
          <div class="iq-modal iq-modal-lg">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" style="background:var(--iq-primary-50);color:var(--iq-primary-600);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">添加学生到班级</h3>
                  <p class="iq-modal-subtitle">
                    {{ selectedClassId ? '将选中的学生加入「' + (currentClass?.name || '') + '」' : '查看当前可添加的学生' }}
                    · 学生可同时属于多个班级，加入本班不影响其已加入的其他班级
                  </p>
                </div>
              </div>
              <button class="iq-modal-close" @click="addDialogVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="iq-modal-body">
              <div class="iq-form-field"><label class="iq-form-label">选择加入的班级</label><select v-model="selectedClassId" class="iq-select" @change="selectedClassId && loadStudents(selectedClassId)"><option value="">请选择班级</option><option v-for="c in classList" :key="c.id" :value="c.id">{{ c.name }}（{{ c.student_count || 0 }}/{{ c.capacity || 50 }}人）</option></select></div>
              <div class="iq-filter-card" style="margin-bottom:14px;">
                <div class="iq-filter-field" style="max-width:360px;">
                  <label class="iq-filter-label">搜索</label>
                  <input v-model="unassignedKeyword" class="iq-input" placeholder="搜索用户名 / 昵称 / 学号" @keyup.enter="loadUnassigned" />
                </div>
              </div>
              <div v-if="unassignedLoading" class="iq-table-loading">
                <span class="iq-loading-spinner"></span>
                <span class="iq-text-sm iq-text-muted">加载中...</span>
              </div>
              <div v-else class="iq-table-wrap" style="max-height:420px;overflow:auto;">
                <table class="iq-table">
                  <thead>
                  <tr>
                    <th style="width:50px;"><input type="checkbox" class="iq-checkbox" :checked="isAllUnassignedSelected" :indeterminate.prop="isUnassignedIndeterminate" @change="toggleAllUnassigned" /></th>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>专业</th>
                    <th>学号</th>
                    <th>注册时间</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="stu in unassignedList" :key="stu.id">
                    <td><input type="checkbox" class="iq-checkbox" :value="stu.id" v-model="unassignedSelectedIds" /></td>
                    <td><span class="iq-id-chip">{{ stu.id }}</span></td>
                    <td class="iq-font-medium" style="color:var(--iq-neutral-800);">{{ stu.username }}</td>
                    <td class="ellipsis-cell" :title="stu.college || stu.school || ''">{{ stu.college || stu.school || '--' }}</td>
                    <td>{{ stu.student_no || '--' }}</td>
                    <td class="iq-text-sm iq-text-muted">{{ stu.created_at || '--' }}</td>
                  </tr>
                  <tr v-if="unassignedList.length === 0">
                    <td colspan="6" class="iq-empty-row">
                      <div class="iq-empty-box" style="padding:40px 0;">
                        <div class="iq-empty-icon">✅</div>
                        <div class="iq-empty-text iq-text-sm iq-text-muted">没有可添加的学生</div>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div class="iq-modal-footer">
                <button
                    class="iq-btn iq-btn-primary"
                    :disabled="!selectedClassId || unassignedSelectedIds.length === 0 || addSubmitting"
                    @click="handleBatchAddToClass"
                >
                  <span v-if="addSubmitting" class="iq-btn-spinner"></span>
                  {{ addSubmitting ? '添加中...' : `确定 (${unassignedSelectedIds.length})` }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 调班弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="transferDialogVisible" class="iq-modal-overlay" @click.self="transferDialogVisible = false">
          <div class="iq-modal iq-modal-sm">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" style="background:var(--iq-state-info-bg);color:var(--iq-state-info);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">学生调班</h3>
                  <p class="iq-modal-subtitle">将 {{ transferStudents.length }} 名学生调到目标班级</p>
                </div>
              </div>
              <button class="iq-modal-close" @click="transferDialogVisible = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="iq-modal-body">
              <div class="iq-form-field">
                <label class="iq-form-label">学生</label>
                <div class="transfer-students">
                  <span v-for="s in transferStudents" :key="s.id" class="iq-user-subject-tag" style="margin-right:4px;margin-bottom:4px;">
                    {{ s.nickname || s.username }}
                  </span>
                </div>
              </div>
              <div class="iq-form-field">
                <label class="iq-form-label">目标班级 <span class="iq-req">*</span></label>
                <select v-model="transferToClassId" class="iq-select">
                  <option value="">请选择目标班级</option>
                  <option
                      v-for="cls in classList.filter(c => c.id !== selectedClassId)"
                      :key="cls.id"
                      :value="cls.id"
                  >{{ cls.name }}</option>
                </select>
              </div>
              <div class="iq-modal-footer">
                <button class="iq-btn iq-btn-secondary" @click="transferDialogVisible = false">取消</button>
                <button class="iq-btn iq-btn-primary" :disabled="!transferToClassId || transferSubmitting" @click="handleConfirmTransfer">
                  <span v-if="transferSubmitting" class="iq-btn-spinner"></span>
                  {{ transferSubmitting ? '调班中...' : '确认调班' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 学生答题记录弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="recordsDialogVisible" class="iq-modal-overlay" @click.self="closeRecordsDialog">
          <div class="iq-modal iq-modal-lg student-records-modal">
            <div class="iq-modal-header">
              <div class="iq-modal-title-wrap">
                <div class="iq-modal-icon" style="background:var(--iq-primary-50);color:var(--iq-primary-600);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h3 class="iq-modal-title">📊 答题记录</h3>
                  <p class="iq-modal-subtitle">
                    {{ recordsStudent?.username }}
                    <span v-if="recordsStudent?.student_no"> · 学号 {{ recordsStudent.student_no }}</span>
                    <span v-if="recordsStudent?.college || recordsStudent?.school"> · {{ recordsStudent.college || recordsStudent.school }}</span>
                  </p>
                </div>
              </div>
              <button class="iq-modal-close" @click="closeRecordsDialog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="iq-modal-body">
              <!-- 汇总统计 -->
              <div v-if="!recordsLoading && studentRecords.length > 0" class="stu-stats-grid">
                <div class="stu-stat-card">
                  <div class="stu-stat-label">练习次数</div>
                  <div class="stu-stat-value">{{ studentSummary.total }}</div>
                </div>
                <div class="stu-stat-card">
                  <div class="stu-stat-label">平均得分</div>
                  <div class="stu-stat-value" :class="studentSummary.avgScore >= 80 ? 'text-good' : studentSummary.avgScore >= 60 ? 'text-mid' : 'text-bad'">{{ studentSummary.avgScore }}</div>
                </div>
                <div class="stu-stat-card">
                  <div class="stu-stat-label">平均正确率</div>
                  <div class="stu-stat-value" :class="studentSummary.avgAccuracy >= 80 ? 'text-good' : studentSummary.avgAccuracy >= 60 ? 'text-mid' : 'text-bad'">{{ studentSummary.avgAccuracy }}%</div>
                </div>
                <div class="stu-stat-card">
                  <div class="stu-stat-label">累计对/错</div>
                  <div class="stu-stat-value stu-stat-duo">
                    <span class="text-good">{{ studentSummary.totalCorrect }}</span>
                    <span class="stu-stat-sep">/</span>
                    <span class="text-bad">{{ studentSummary.totalWrong }}</span>
                  </div>
                </div>
              </div>

              <div v-if="recordsLoading" class="iq-table-loading">
                <span class="iq-loading-spinner"></span>
                <span class="iq-text-sm iq-text-muted">加载答题记录...</span>
              </div>

              <div v-else-if="studentRecords.length === 0" class="iq-empty-box" style="padding:50px 0;">
                <div class="iq-empty-icon">📭</div>
                <div class="iq-empty-text iq-text-sm iq-text-muted">该学生暂无答题记录</div>
              </div>

              <div v-else class="stu-records-wrap">
                <table class="iq-table stu-records-table">
                  <thead>
                  <tr>
                    <th>试卷</th>
                    <th style="width:70px;">得分</th>
                    <th style="width:80px;">正确率</th>
                    <th style="width:120px;">对/错/未答</th>
                    <th style="width:80px;">用时</th>
                    <th style="width:130px;">提交时间</th>
                    <th style="width:80px;">操作</th>
                  </tr>
                  </thead>
                  <tbody>
                  <template v-for="r in studentRecords" :key="r.id">
                    <tr :class="{ 'stu-row-active': activeRecord && activeRecord.id === r.id }" @click="viewRecordDetail(r)" class="stu-record-row">
                      <td class="stu-exam-cell" :title="r.exam_title || r.examTitle || ('试卷#' + r.exam_id)">
                        <span class="stu-exam-name">{{ r.exam_title || r.examTitle || ('试卷#' + r.exam_id) }}</span>
                        <span v-if="r.subject" class="iq-subject-tag">{{ r.subject }}</span>
                      </td>
                      <td><span class="stu-score" :class="scoreTagClass(r.score)">{{ r.score }}</span></td>
                      <td>
                        <span class="iq-font-semibold" :class="r.accuracy >= 80 ? 'text-good' : r.accuracy >= 60 ? 'text-mid' : 'text-bad'">{{ r.accuracy }}%</span>
                      </td>
                      <td class="iq-text-sm">
                        <span class="text-good">{{ r.correct_count }}</span> /
                        <span class="text-bad">{{ r.wrong_count }}</span> /
                        <span class="iq-text-muted">{{ r.skipped_count }}</span>
                      </td>
                      <td class="iq-text-sm">{{ formatDuration(r.duration_seconds) }}</td>
                      <td class="iq-text-sm iq-text-muted">{{ formatTime(r.submitted_at) }}</td>
                      <td @click.stop>
                        <button
                            class="iq-btn iq-btn-ghost iq-btn-sm"
                            @click="viewRecordDetail(r)"
                        >{{ activeRecord && activeRecord.id === r.id ? '收起' : '详情' }}</button>
                      </td>
                    </tr>
                    <!-- 题目维度下钻 -->
                    <tr v-if="activeRecord && activeRecord.id === r.id" class="stu-detail-row">
                      <td colspan="7">
                        <div v-if="recordDetailLoading" class="iq-table-loading" style="padding:24px 0;">
                          <span class="iq-loading-spinner"></span>
                          <span class="iq-text-sm iq-text-muted">加载题目详情...</span>
                        </div>
                        <div v-else-if="recordDetail && (recordDetail.answers || recordDetail.questions || recordDetail.details) && detailList.length" class="stu-detail-wrap">
                          <div class="stu-detail-title">
                            <b>📝 逐题作答详情</b>
                            <span class="iq-text-sm iq-text-muted">共 {{ detailList.length }} 题</span>
                          </div>
                          <table class="iq-table stu-detail-table">
                            <thead>
                            <tr>
                              <th style="width:36px;">#</th>
                              <th>题目</th>
                              <th style="width:70px;">题型</th>
                              <th style="width:80px;">结果</th>
                              <th>学生作答</th>
                              <th>正确答案</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(q, idx) in detailList" :key="idx">
                              <td><span class="iq-id-chip">{{ idx + 1 }}</span></td>
                              <td class="stu-q-cell" :title="getQField(q, ['题目','title','question','question_title'])">{{ getQField(q, ['题目','title','question','question_title']) || '--' }}</td>
                              <td><span class="stu-type-tag">{{ getTypeName(Number(getQField(q, ['题型','type','question_type','questionType']) || 0)) }}</span></td>
                              <td>
                                <span v-if="questionResult(q) === 'correct'" class="stu-result stu-result-correct">✓ 正确</span>
                                <span v-else-if="questionResult(q) === 'wrong'" class="stu-result stu-result-wrong">✗ 错误</span>
                                <span v-else-if="questionResult(q) === 'subjective'" class="stu-result stu-result-skip">📝 待阅</span>
                                <span v-else class="stu-result stu-result-skip">— 未答</span>
                              </td>
                              <td class="stu-ans-cell" :title="formatAnswer(getQField(q, ['学生作答','userAnswer','user_answer','user_ans','stu_answer']))">{{ formatAnswer(getQField(q, ['学生作答','userAnswer','user_answer','user_ans','stu_answer'])) }}</td>
                              <td class="stu-ans-cell stu-correct-ans" :title="formatAnswer(getQField(q, ['答案','answer','correctAnswer','correct_answer','right_answer']))">{{ formatAnswer(getQField(q, ['答案','answer','correctAnswer','correct_answer','right_answer'])) }}</td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                        <div v-else class="iq-empty-box" style="padding:24px 0;">
                          <div class="iq-empty-text iq-text-sm iq-text-muted">暂无题目明细数据</div>
                        </div>
                      </td>
                    </tr>
                  </template>
                  </tbody>
                </table>
              </div>

              <div class="iq-modal-footer">
                <button class="iq-btn iq-btn-secondary" @click="closeRecordsDialog">关闭</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentsToClass,
  transferStudent,
  removeStudentFromClass,
  getUnassignedStudents,
  getTeacherOptions,
  getAllClassOptions,
  getMyClassIds,
  updateMyClassIds,
} from '@/api/class';
import { adminListUserRecords, adminGetRecord } from '@/api/practice';
import { formatTime, formatDuration } from '@/utils/format';
import { getTypeName } from '@/utils/constants';
import {
  COLLEGE_NAMES,
  getMajorsByCollege,
  getSubjectsByCollege,
  ALL_SUBJECTS,
} from '@/utils/colleges';

// 角色与所教课程（用于按课程过滤班级创建选项）
const props = defineProps({
  role: { type: String, default: 'admin' },
  subjects: { type: Array, default: () => [] },
});

const emit = defineEmits(['toast']);
const showToast = (message, type = 'success') => emit('toast', { message, type });

// ===== 班级列表 =====
const classList = ref([]);
const classKeyword = ref('');
const classLoading = ref(false);
const selectedClassId = ref(null);
const currentClass = ref(null);
const managedVisible = ref(false);
const managedClassIds = ref([]);
const allClassOptions = ref([]);

const openManagedClasses = async () => {
  try {
    const [options, ids] = await Promise.all([getAllClassOptions(), getMyClassIds()]);
    allClassOptions.value = Array.isArray(options) ? options : (options.list || []);
    managedClassIds.value = Array.isArray(ids) ? ids.map(Number) : [];
    managedVisible.value = true;
  } catch (err) { showToast(err.message || '读取班级选项失败', 'error'); }
};
const saveManagedClasses = async () => {
  try {
    await updateMyClassIds(managedClassIds.value);
    managedVisible.value = false;
    await loadClasses();
    showToast('管理班级已更新');
  } catch (err) { showToast(err.message || '保存管理班级失败', 'error'); }
};

const loadClasses = async () => {
  classLoading.value = true;
  try {
    const data = await getClasses({ keyword: classKeyword.value.trim() || undefined });
    classList.value = Array.isArray(data) ? data : (data.list || []);
  } catch (err) {
    showToast(err.message || '加载班级列表失败', 'error');
  } finally {
    classLoading.value = false;
  }
};
let classSearchTimer;
const scheduleClassSearch = () => {
  clearTimeout(classSearchTimer);
  classSearchTimer = setTimeout(loadClasses, 250);
};

const selectClass = async (id) => {
  selectedClassId.value = id;
  selectedStudentIds.value = [];
  await loadStudents(id);
};

// ===== 班内学生 =====
const studentList = ref([]);
const studentLoading = ref(false);
const selectedStudentIds = ref([]);

const loadStudents = async (id) => {
  studentLoading.value = true;
  try {
    const data = await getClassById(id);
    currentClass.value = data;
    studentList.value = Array.isArray(data.students) ? data.students : [];
  } catch (err) {
    showToast(err.message || '加载班内学生失败', 'error');
  } finally {
    studentLoading.value = false;
  }
};

const isAllSelected = computed(() =>
    studentList.value.length > 0 && studentList.value.every(s => selectedStudentIds.value.includes(s.id))
);
const isIndeterminate = computed(() => {
  const c = studentList.value.filter(s => selectedStudentIds.value.includes(s.id)).length;
  return c > 0 && c < studentList.value.length;
});
const toggleStudent = (id) => {
  const idx = selectedStudentIds.value.indexOf(id);
  if (idx >= 0) selectedStudentIds.value.splice(idx, 1);
  else selectedStudentIds.value.push(id);
};
const toggleAllStudents = (e) => {
  selectedStudentIds.value = e.target.checked
      ? studentList.value.map(s => s.id)
      : [];
};

// ===== 未分班学生 =====
const unassignedList = ref([]);
const unassignedLoading = ref(false);
const unassignedCount = ref(0);
const unassignedKeyword = ref('');
const unassignedSelectedIds = ref([]);
const addDialogVisible = ref(false);
const addSubmitting = ref(false);

const loadUnassigned = async () => {
  unassignedLoading.value = true;
  try {
    const params = {};
    if (unassignedKeyword.value) params.keyword = unassignedKeyword.value;
    const data = await getUnassignedStudents(params);
    unassignedList.value = Array.isArray(data) ? data : (data.list || []);
    unassignedCount.value = Array.isArray(data) ? data.length : (data.total ?? unassignedList.value.length);
  } catch (err) {
    showToast(err.message || '加载未分班学生失败', 'error');
  } finally {
    unassignedLoading.value = false;
  }
};

const loadUnassignedCount = async () => {
  try {
    const data = await getUnassignedStudents({ pageSize: 1 });
    unassignedCount.value = data.total ?? (Array.isArray(data) ? data.length : 0);
  } catch { /* ignore */ }
};

const isAllUnassignedSelected = computed(() =>
    unassignedList.value.length > 0 && unassignedList.value.every(s => unassignedSelectedIds.value.includes(s.id))
);
const isUnassignedIndeterminate = computed(() => {
  const c = unassignedList.value.filter(s => unassignedSelectedIds.value.includes(s.id)).length;
  return c > 0 && c < unassignedList.value.length;
});
const toggleAllUnassigned = (e) => {
  unassignedSelectedIds.value = e.target.checked
      ? unassignedList.value.map(s => s.id)
      : [];
};

const openUnassignedDialog = () => {
  unassignedKeyword.value = '';
  unassignedSelectedIds.value = [];
  addDialogVisible.value = true;
  loadUnassigned();
};

const openAddStudents = () => {
  if (!selectedClassId.value) return;
  unassignedKeyword.value = '';
  unassignedSelectedIds.value = [];
  addDialogVisible.value = true;
  loadUnassigned();
};

const handleBatchAddToClass = async () => {
  if (!selectedClassId.value || unassignedSelectedIds.value.length === 0) return;
  addSubmitting.value = true;
  try {
    await addStudentsToClass(selectedClassId.value, unassignedSelectedIds.value);
    const addedCount = unassignedSelectedIds.value.length;
    const className = currentClass.value?.name || classList.value.find(c => Number(c.id) === Number(selectedClassId.value))?.name || '所选班级';
    showToast(`成功添加 ${addedCount} 名学生到「${className}」`, 'success');
    addDialogVisible.value = false;
    await Promise.all([loadStudents(selectedClassId.value), loadUnassignedCount(), loadClasses()]);
    window.alert(`添加成功：已将 ${addedCount} 名学生加入「${className}」`);
  } catch (err) {
    showToast(err.message || '添加失败', 'error');
  } finally {
    addSubmitting.value = false;
  }
};

// ===== 调班 =====
const transferDialogVisible = ref(false);
const transferStudents = ref([]);
const transferToClassId = ref('');
const transferSubmitting = ref(false);

const openTransfer = (stu) => {
  transferStudents.value = [stu];
  transferToClassId.value = '';
  transferDialogVisible.value = true;
};
const openBatchTransfer = () => {
  if (selectedStudentIds.value.length === 0) return;
  transferStudents.value = studentList.value.filter(s => selectedStudentIds.value.includes(s.id));
  transferToClassId.value = '';
  transferDialogVisible.value = true;
};
const handleConfirmTransfer = async () => {
  if (!transferToClassId.value || transferStudents.value.length === 0) return;
  transferSubmitting.value = true;
  try {
    for (const stu of transferStudents.value) {
      await transferStudent(selectedClassId.value, transferToClassId.value, stu.id);
    }
    showToast(`调班成功，共 ${transferStudents.value.length} 名学生`, 'success');
    transferDialogVisible.value = false;
    selectedStudentIds.value = [];
    await Promise.all([loadStudents(selectedClassId.value), loadClasses()]);
  } catch (err) {
    showToast(err.message || '调班失败', 'error');
  } finally {
    transferSubmitting.value = false;
  }
};

// ===== 移出班级 =====
const handleRemove = async (stu) => {
  if (!window.confirm(`确定将「${stu.nickname || stu.username}」移出班级吗？移出后变为未分班状态。`)) return;
  try {
    await removeStudentFromClass(selectedClassId.value, stu.id);
    showToast('已移出班级', 'success');
    await Promise.all([loadStudents(selectedClassId.value), loadUnassignedCount(), loadClasses()]);
  } catch (err) {
    showToast(err.message || '移出失败', 'error');
  }
};
const handleBatchRemove = async () => {
  if (selectedStudentIds.value.length === 0) return;
  if (!window.confirm(`确定将选中的 ${selectedStudentIds.value.length} 名学生移出班级吗？`)) return;
  try {
    for (const id of selectedStudentIds.value) {
      await removeStudentFromClass(selectedClassId.value, id);
    }
    showToast(`已批量移出 ${selectedStudentIds.value.length} 名学生`, 'success');
    selectedStudentIds.value = [];
    await Promise.all([loadStudents(selectedClassId.value), loadUnassignedCount(), loadClasses()]);
  } catch (err) {
    showToast(err.message || '批量移出失败', 'error');
  }
};

// ===== 学生答题记录 =====
const recordsDialogVisible = ref(false);
const recordsStudent = ref(null);
const studentRecords = ref([]);
const recordsLoading = ref(false);
const activeRecord = ref(null);
const recordDetailLoading = ref(false);
const recordDetail = ref(null);

const studentSummary = computed(() => {
  const list = studentRecords.value;
  if (list.length === 0) return { total: 0, avgScore: 0, avgAccuracy: 0, totalCorrect: 0, totalWrong: 0 };
  const scores = list.map(r => Number(r.score) || 0);
  const accs = list.map(r => Number(r.accuracy) || 0);
  const correct = list.reduce((a, r) => a + (Number(r.correct_count) || 0), 0);
  const wrong = list.reduce((a, r) => a + (Number(r.wrong_count) || 0), 0);
  return {
    total: list.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    avgAccuracy: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length),
    totalCorrect: correct,
    totalWrong: wrong,
  };
});

const openStudentRecords = async (stu) => {
  recordsStudent.value = stu;
  recordsDialogVisible.value = true;
  activeRecord.value = null;
  recordDetail.value = null;
  studentRecords.value = [];
  recordsLoading.value = true;
  try {
    const data = await adminListUserRecords(stu.id, { pageSize: 100 });
    if (Array.isArray(data)) {
      studentRecords.value = data;
    } else {
      studentRecords.value = data?.list || [];
    }
  } catch (err) {
    showToast(err.message || '加载答题记录失败', 'error');
  } finally {
    recordsLoading.value = false;
  }
};

const viewRecordDetail = async (record) => {
  if (activeRecord.value && activeRecord.value.id === record.id) {
    activeRecord.value = null;
    recordDetail.value = null;
    return;
  }
  activeRecord.value = record;
  recordDetail.value = null;
  recordDetailLoading.value = true;
  try {
    const data = await adminGetRecord(record.id);
    recordDetail.value = data?.data || data?.record || data;
  } catch (err) {
    showToast(err.message || '加载记录详情失败', 'error');
  } finally {
    recordDetailLoading.value = false;
  }
};

const closeRecordsDialog = () => {
  recordsDialogVisible.value = false;
  recordsStudent.value = null;
  studentRecords.value = [];
  activeRecord.value = null;
  recordDetail.value = null;
};

const scoreTagClass = (score) => {
  if (score >= 80) return 'stu-score-excellent';
  if (score >= 60) return 'stu-score-pass';
  return 'stu-score-fail';
};

const formatAnswer = (ans) => {
  if (ans === null || ans === undefined || ans === '') return '—';
  if (typeof ans === 'object') {
    try { return JSON.stringify(ans); } catch { return String(ans); }
  }
  return String(ans);
};

const getQField = (q, fields) => {
  if (!q) return '';
  for (const f of fields) {
    if (q[f] !== null && q[f] !== undefined && q[f] !== '') return q[f];
  }
  return '';
};

const questionResult = (q) => {
  if (!q) return 'skip';
  const v = getQField(q, ['is_correct', 'isCorrect', 'correct', 'status']);
  if (typeof v === 'number') {
    if (v === 1) return 'correct';
    if (v === 0) return 'wrong';
    if (v === 3) return 'subjective';
  }
  if (typeof v === 'boolean') return v ? 'correct' : 'wrong';
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    if (['true','1','correct','right','yes','ok','对','正确'].includes(s)) return 'correct';
    if (['false','0','wrong','no','error','错','错误'].includes(s)) return 'wrong';
  }
  const skipped = getQField(q, ['is_skipped', 'isSkipped', 'skipped']);
  if (skipped === true || skipped === 1 || skipped === 'true') return 'skip';
  return 'skip';
};

const detailList = computed(() => {
  if (!recordDetail.value) return [];
  const list = recordDetail.value.answers || recordDetail.value.questions || recordDetail.value.details || [];
  return Array.isArray(list) ? list : [];
});

// ===== 班级 CRUD =====
const classDialogVisible = ref(false);
const isEditClass = ref(false);
const classSubmitting = reactive({ value: false });
const teacherOptions = ref([]);
const counselorKeyword = ref('');
const headTeacherKeywords = reactive({});
const headTeachers = reactive({});
// 学院/专业/课程均来自预定义（colleges.js），不再依赖 DB 表，也不再用文本输入新建
const collegeOptions = COLLEGE_NAMES;
const classForm = reactive({
  id: null,
  college: '',
  major: '',
  subject: '',
  grade: '2024',
  classCount: 1,
  capacity: 50,
  counselorId: '',
  description: '',
});
// 当前学院下的专业（勾选式下拉）
const availableMajors = computed(() => getMajorsByCollege(classForm.college));
// 当前可选课程：
//   - 教师：仅限本人所教课程（props.subjects），与学院无强绑定
//   - 管理员：当前学院下全部课程；未选学院时返回全部课程
const availableSubjects = computed(() => {
  if (props.role === 'teacher') return props.subjects || [];
  if (!classForm.college) return ALL_SUBJECTS;
  return getSubjectsByCollege(classForm.college);
});
const generatedClasses = computed(() => {
  if (isEditClass.value) {
    return [{ index: 1, name: currentClass.value?.name || (classForm.subject ? `${classForm.subject}1班` : '') }];
  }
  return Array.from({ length: Math.max(1, Number(classForm.classCount || 1)) }, (_, index) => ({
    index: index + 1,
    name: `${classForm.subject}${index + 1}班`,
  }));
});
// 从班级名推断科目（班级名规范为「科目+数字+班」）
const inferSubjectFromName = (name) => {
  if (!name) return '';
  return (ALL_SUBJECTS || []).find((s) => String(name).startsWith(s)) || '';
};
const filterTeachers = keyword => {
  const word = String(keyword || '').trim().toLowerCase();
  if (!word) return teacherOptions.value;
  return teacherOptions.value.filter(item => [item.nickname, item.username, item.employee_no].some(value => String(value || '').toLowerCase().includes(word)));
};
const filteredCounselors = computed(() => filterTeachers(counselorKeyword.value));
const locateCounselor = () => {
  const match = filteredCounselors.value[0];
  classForm.counselorId = match?.id || '';
};
const locateHeadTeacher = index => {
  const match = filterTeachers(headTeacherKeywords[index])[0];
  headTeachers[index] = match?.id || '';
};
const loadTeachers = async () => {
  try {
    const data = await getTeacherOptions();
    teacherOptions.value = Array.isArray(data) ? data : (data?.list || []);
  } catch { teacherOptions.value = []; }
};
// 学院切换：清空专业与课程（课程对教师保持所教课程不变）
const onCollegeChange = () => {
  classForm.major = '';
  if (props.role !== 'teacher') {
    // 管理员：课程随学院联动，若当前课程不在新学院范围内则清空
    const valid = getSubjectsByCollege(classForm.college);
    if (classForm.subject && !valid.includes(classForm.subject)) classForm.subject = '';
  } else {
    // 教师：课程仅限本人所教课程，若不在新学院范围内则清空
    if (classForm.subject && !(props.subjects || []).includes(classForm.subject)) classForm.subject = '';
  }
};
const onMajorChange = () => { /* 仅存储，无副作用 */ };

const openCreateClass = () => {
  isEditClass.value = false;
  Object.assign(classForm, {
    id: null,
    college: '',
    major: '',
    subject: '',
    grade: String(new Date().getFullYear()),
    classCount: 1,
    capacity: 50,
    counselorId: '',
    description: '',
  });
  counselorKeyword.value = '';
  Object.keys(headTeachers).forEach(key => delete headTeachers[key]);
  Object.keys(headTeacherKeywords).forEach(key => delete headTeacherKeywords[key]);
  loadTeachers();
  classDialogVisible.value = true;
};
const openEditClass = (cls) => {
  isEditClass.value = true;
  Object.assign(classForm, {
    id: cls.id,
    college: cls.college || '',
    major: cls.major || '',
    subject: cls.subject || inferSubjectFromName(cls.name) || '',
    classCount: 1,
    capacity: cls.capacity || 50,
    grade: cls.grade || '',
    counselorId: cls.counselor_id || '',
    description: cls.description || '',
  });
  headTeachers[1] = cls.head_teacher_id || '';
  loadTeachers();
  classDialogVisible.value = true;
};
const handleDeleteClass = async (cls) => {
  if (!window.confirm(`确定删除班级「${cls.name}」吗？班内学生将变为未分班状态。`)) return;
  try {
    await deleteClass(cls.id);
    showToast('班级已删除', 'success');
    if (selectedClassId.value === cls.id) {
      selectedClassId.value = null;
      currentClass.value = null;
      studentList.value = [];
    }
    await Promise.all([loadClasses(), loadUnassignedCount()]);
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
};
const handleSubmitClass = async () => {
  if (!classForm.college.trim() || !classForm.major.trim() || !String(classForm.grade).trim()) { alert('请完整填写学院、专业和入学年份'); return; }
  if (!classForm.subject) { alert('请选择课程（班级按课程分类）'); return; }
  classSubmitting.value = true;
  try {
    if (isEditClass.value) {
      await updateClass(classForm.id, {
        name: generatedClasses.value[0].name,
        grade: classForm.grade,
        college: classForm.college, major: classForm.major, subject: classForm.subject,
        capacity: classForm.capacity, counselorId: classForm.counselorId, headTeacherId: headTeachers[1] || null,
        description: classForm.description,
      });
      showToast('班级修改成功', 'success');
    } else {
      for (const generated of generatedClasses.value) {
        await createClass({
          name: generated.name, grade: classForm.grade,
          college: classForm.college, major: classForm.major, subject: classForm.subject,
          capacity: classForm.capacity,
          counselorId: classForm.counselorId, headTeacherId: headTeachers[generated.index] || null,
          description: classForm.description,
        });
      }
      showToast(`成功生成 ${classForm.classCount} 个班级`, 'success');
    }
    classDialogVisible.value = false;
    await loadClasses();
  } catch (err) {
    showToast(err.message || '操作失败', 'error');
  } finally {
    classSubmitting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadClasses(), loadUnassignedCount(), loadTeachers()]);
});
</script>

<style scoped>
.class-mgmt {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
}

/* ===== 顶部横幅（与自适应学情大小一致） ===== */
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

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.iq-btn-secondary-light {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.iq-btn-secondary-light:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

.iq-btn-primary {
  background: #6366F1;
  color: #fff;
  border-color: #6366F1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.iq-btn-primary:hover {
  background: #4F46E5;
  border-color: #4F46E5;
}

/* ===== 布局 ===== */
.class-mgmt-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
.class-side { padding: 18px 16px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; }
.class-side-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 12px; border-bottom: 1px dashed #E2E8F0; margin-bottom: 10px; }
.class-side-head b { font-size: 14px; color: #1E293B; }
.class-list { display: flex; flex-direction: column; gap: 6px; max-height: 72vh; overflow: auto; }

.class-item {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 12px; border: 1px solid #E2E8F0; border-radius: 10px;
  background: #fff; cursor: pointer; transition: all 0.15s; text-align: left;
}
.class-item:hover { border-color: #A5B4FC; background: #EEF2FF; }
.class-item.active { border-color: #6366F1; background: #EEF2FF; box-shadow: 0 0 0 2px rgba(99,102,241,0.08); }
.class-item-main { flex: 1; min-width: 0; }
.class-item-name { font-weight: 600; color: #1E293B; font-size: 14px; }
.class-item-meta { display: flex; gap: 10px; margin-top: 3px; font-size: 12px; color: #64748B; flex-wrap: wrap; }
.class-item-subject { color: #4F46E5; font-weight: 600; }
.class-item-actions { display: none; gap: 4px; }
.class-item:hover .class-item-actions { display: flex; }

.class-main { padding: 20px 22px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; }
.class-main-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px dashed #E2E8F0; }

.batch-bar {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
  padding: 10px 14px; background: #EEF2FF; border-radius: 8px;
  border: 1px solid #C7D2FE; color: #4338CA; font-size: 13px; font-weight: 500;
}
.batch-bar .iq-btn { margin-left: 6px; }

.transfer-students { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 0; }

/* ===== 表格 ===== */
.iq-table-wrap { overflow-x: auto; }
.iq-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.iq-table th, .iq-table td {
  padding: 10px 14px; text-align: left; border-bottom: 1px solid #E2E8F0;
  color: #475569; vertical-align: middle;
}
.iq-table th { background: #F8FAFC; color: #1E293B; font-weight: 600; font-size: 12px; }
.iq-table tbody tr:hover { background: #F8FAFC; }

.iq-id-chip {
  display: inline-block; font-family: monospace; font-size: 12px;
  padding: 2px 8px; background: #F1F5F9; color: #475569;
  border-radius: 4px; font-weight: 500;
}

.iq-checkbox {
  width: 16px; height: 16px; accent-color: #6366F1; cursor: pointer;
}

/* 课程勾选区（与注册弹窗风格一致） */
.iq-subject-checkboxes {
  display: flex; flex-wrap: wrap; gap: 10px 14px;
  padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
  background: #fff; max-height: 168px; overflow-y: auto;
}
.iq-checkbox-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #334155; cursor: pointer; user-select: none;
}
.iq-checkbox-item:hover { color: #4F46E5; }
.iq-text-xs { font-size: 12px; }
.iq-text-muted { color: #64748B; }

.iq-table-action { display: flex; gap: 4px; flex-wrap: wrap; }
.act-edit { color: #B45309 !important; }
.act-edit:hover:not(:disabled) { background: #FEF3C7 !important; }
.act-del { color: #B91C1C !important; }
.act-del:hover:not(:disabled) { background: #FEE2E2 !important; }
.act-view { color: #6366F1 !important; }
.act-view:hover:not(:disabled) { background: #EEF2FF !important; }

.iq-btn-ghost {
  background: transparent;
  border: 1px solid transparent;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.iq-btn-ghost:hover { background: #F1F5F9; }
.iq-btn-sm { padding: 4px 8px; font-size: 12px; }

.iq-btn-secondary {
  background: #F1F5F9;
  color: #475569;
  border: 1px solid #E2E8F0;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.iq-btn-secondary:hover { background: #E2E8F0; }

.iq-btn-danger {
  background: #EF4444;
  color: #fff;
  border-color: #EF4444;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.iq-btn-danger:hover { background: #DC2626; }

.iq-empty-box {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0;
}
.iq-empty-icon { font-size: 40px; opacity: 0.5; }
.iq-empty-text { color: #64748B; }

.iq-table-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 0;
}
.iq-loading-spinner {
  width: 28px; height: 28px; border: 3px solid #E2E8F0;
  border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.iq-text-sm { font-size: 13px; }
.iq-text-muted { color: #94A3B8; }
.iq-text-lg { font-size: 18px; }
.iq-font-semibold { font-weight: 600; }

/* ===== 弹窗 ===== */
.iq-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15, 23, 42, 0.55);
  display: grid; place-items: center; padding: 30px;
}
.iq-modal {
  background: #fff; border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  width: 100%; max-width: 100%; overflow: hidden;
}
.iq-modal-md { max-width: 520px; }
.iq-modal-lg { max-width: 820px; }
.iq-modal-sm { max-width: 440px; }

.iq-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #E2E8F0;
}
.iq-modal-title-wrap { display: flex; align-items: center; gap: 12px; }
.iq-modal-icon {
  width: 40px; height: 40px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.iq-modal-icon svg { width: 20px; height: 20px; }
.iq-modal-title { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0; }
.iq-modal-subtitle { font-size: 12px; color: #94A3B8; margin: 2px 0 0; }
.iq-modal-close {
  width: 32px; height: 32px; border: none; background: transparent;
  color: #94A3B8; cursor: pointer; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.iq-modal-close:hover { background: #F1F5F9; color: #475569; }
.iq-modal-close svg { width: 18px; height: 18px; }

.iq-modal-body { padding: 24px; }
.iq-form-grid { display: grid; gap: 16px; margin-bottom: 16px; }
.iq-form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.iq-form-label { font-size: 13px; font-weight: 500; color: #475569; }
.iq-req { color: #EF4444; margin-left: 2px; }
.iq-input {
  padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
  font-size: 14px; font-family: inherit; transition: border-color 0.2s;
  background: #fff;
}
.iq-input:focus { outline: none; border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.iq-textarea {
  padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
  font-size: 14px; font-family: inherit; resize: vertical; min-height: 80px;
  width: 100%;
}
.iq-textarea:focus { outline: none; border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.iq-select {
  padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
  font-size: 14px; font-family: inherit; background: #fff;
  width: 100%;
}
.iq-select:focus { outline: none; border-color: #6366F1; }

.iq-modal-footer {
  display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px;
}
.iq-btn-spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 6px; flex-shrink: 0; display: inline-block; vertical-align: middle;
}

.iq-filter-card { padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; }
.iq-filter-field { display: flex; flex-direction: column; gap: 6px; }
.iq-filter-label { font-size: 12px; font-weight: 500; color: #64748B; }

.iq-user-subject-tag {
  display: inline-block; font-size: 11px; padding: 2px 8px;
  background: #EEF2FF; color: #4338CA; border-radius: 4px; font-weight: 500;
}

.iq-subject-tag {
  display: inline-block; font-size: 10px; padding: 1px 6px;
  background: #EEF2FF; color: #4338CA; border-radius: 4px; font-weight: 500;
}

/* ===== 学生记录弹窗 ===== */
.student-records-modal { max-height: 90vh; display: flex; flex-direction: column; }
.student-records-modal .iq-modal-header { flex-shrink: 0; }
.student-records-modal .iq-modal-body { padding: 20px 24px; flex: 1; overflow-y: auto; min-height: 0; }

.stu-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px;
}
.stu-stat-card {
  padding: 14px; text-align: center;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;
}
.stu-stat-label { font-size: 12px; color: #94A3B8; margin-bottom: 6px; }
.stu-stat-value { font-size: 24px; font-weight: 700; color: #1E293B; }
.stu-stat-duo { font-size: 20px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.stu-stat-sep { color: #E2E8F0; font-weight: 400; }

.stu-records-wrap { border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
.stu-records-table { font-size: 12px; }
.stu-records-table th, .stu-records-table td { padding: 8px 10px; }
.stu-record-row { cursor: pointer; transition: background 0.15s; }
.stu-record-row:hover { background: #F8FAFC; }
.stu-row-active { background: #EEF2FF !important; }

.stu-exam-cell { display: flex; align-items: center; gap: 6px; }
.stu-exam-name {
  font-weight: 500; color: #1E293B;
  max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.stu-score {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-weight: 700; font-size: 12px; min-width: 36px; text-align: center;
}
.stu-score-excellent { background: #DCFCE7; color: #059669; border: 1px solid #A7F3D0; }
.stu-score-pass { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
.stu-score-fail { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }

.stu-detail-row { background: #F8FAFC; }
.stu-detail-row > td { padding: 14px 16px; }
.stu-detail-wrap {
  background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;
}
.stu-detail-title {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid #E2E8F0;
  background: #F8FAFC;
}
.stu-detail-title b { font-size: 13px; color: #1E293B; }
.stu-detail-table { font-size: 12px; }
.stu-detail-table th, .stu-detail-table td { padding: 7px 10px; }

.stu-q-cell {
  max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #475569;
}
.stu-type-tag {
  display: inline-block; padding: 1px 8px; border-radius: 12px;
  font-size: 11px; font-weight: 500; background: #EDE9FE; color: #6D28D9;
}
.stu-result { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.stu-result-correct { color: #059669; background: #DCFCE7; }
.stu-result-wrong { color: #B91C1C; background: #FEE2E2; }
.stu-result-skip { color: #94A3B8; background: #F1F5F9; }
.stu-ans-cell {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #64748B; font-size: 12px;
}
.stu-correct-ans { color: #059669; font-weight: 500; }

.text-good { color: #059669; }
.text-mid { color: #B45309; }
.text-bad { color: #B91C1C; }

.ellipsis-cell {
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.stu-name-btn {
  background: none; border: none; padding: 0; cursor: pointer;
  font-weight: 500; color: #1E293B; font-size: 13px;
  transition: color 0.15s;
}
.stu-name-btn:hover { color: #6366F1; text-decoration: underline; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-active .iq-modal, .modal-fade-leave-active .iq-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .iq-modal, .modal-fade-leave-to .iq-modal {
  opacity: 0; transform: translateY(8px) scale(0.98);
}

@media (max-width: 900px) {
  .class-mgmt-layout { grid-template-columns: 1fr; }
  .stu-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .iq-page-hero { flex-direction: column; text-align: center; padding: 22px 20px; gap: 16px; }
  .hero-actions { justify-content: center; }
}

@media (max-width: 480px) {
  .stu-stats-grid { grid-template-columns: 1fr; }
}
.class-editor-dialog { width:min(760px, calc(100vw - 32px)); max-width:760px; max-height:92vh; display:flex; flex-direction:column; }
.class-editor-dialog .iq-modal-header { flex:0 0 auto; }
.class-editor-body { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding-bottom:0; }
.class-editor-body .iq-modal-footer { position:sticky; bottom:0; z-index:4; margin:16px -24px 0; padding:16px 24px; border-top:1px solid #E2E8F0; background:#fff; box-shadow:0 -8px 18px rgba(15,23,42,.04); }
.teacher-row { display:grid; grid-template-columns:minmax(170px,1fr) minmax(150px,.8fr) minmax(210px,1fr); gap:8px; align-items:center; margin-bottom:8px; }
.teacher-row > span { font-weight:600; color:#334155; }
.teacher-row > * { min-width:0; }
@media (max-width: 760px) { .teacher-row { grid-template-columns:1fr; } }
</style>
