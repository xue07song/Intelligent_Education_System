<template>
  <div class="login-page">
    <div class="login-container">
      <!-- ===== 左侧品牌区 ===== -->
      <div class="login-left">
        <div class="login-left-content">
          <div class="brand-logo">
            <span class="logo-icon">📚</span>
            <span class="logo-text">智能题库</span>
          </div>
          <h1 class="brand-slogan">新一代智慧学习平台</h1>
          <p class="brand-desc">助力学校构建 · 高效出题 · 智能练习 · 精准分析</p>
          <div class="brand-features">
            <button type="button" class="feature-tag" @click="$emit('feature', 'generate')">📝 智能组卷</button>
            <button type="button" class="feature-tag" @click="$emit('feature', 'adaptive')">🎯 自适应练习</button>
            <button type="button" class="feature-tag" @click="$emit('feature', 'analysis')">📊 学情分析</button>
            <button type="button" class="feature-tag" @click="$emit('feature', 'profile')">☁️ 云端同步</button>
          </div>
        </div>
        <div class="login-left-footer">
          <span>© 2025 智能题库系统</span>
        </div>
      </div>

      <!-- ===== 右侧登录区 ===== -->
      <div class="login-right">
        <div class="login-card">
          <div class="login-card-header">
            <h2>账号登录</h2>
            <p>登录你的账号，开始智能练习</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <div class="input-wrapper">
                <span class="input-icon">👤</span>
                <input
                    v-model="form.username"
                    type="text"
                    class="form-input"
                    placeholder="请输入用户名"
                    required
                    :disabled="loading"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-input"
                    placeholder="请输入密码"
                    required
                    :disabled="loading"
                />
                <button
                    type="button"
                    class="password-toggle"
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <!-- ===== 记住我 + 忘记密码 ===== -->
            <div class="form-options">
              <label class="remember-me">
                <input type="checkbox" v-model="rememberMe" />
                <span>记住我</span>
              </label>
              <a href="#" class="forgot-link" @click.prevent="handleForgotPassword">
                忘记密码？
              </a>
            </div>

            <div v-if="errorMsg" class="login-error">
              <span>❌</span>
              {{ errorMsg }}
            </div>

            <button type="submit" class="login-btn" :disabled="loading">
              <span v-if="loading" class="btn-spinner"></span>
              {{ loading ? '登录中...' : '登 录' }}
            </button>

            <div class="register-link">
              还没有账号？<button type="button" class="register-btn" @click="$emit('open-register')">立即注册</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { login } from '@/api/auth';

const emit = defineEmits(['success', 'open-register', 'feature']);

const form = reactive({
  username: '',
  password: '',
});

const loading = ref(false);
const errorMsg = ref('');
const showPassword = ref(false);
const rememberMe = ref(false);

const handleLogin = async () => {
  if (!form.username || !form.password) {
    errorMsg.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    const data = await login({ username: form.username, password: form.password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (rememberMe.value) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    emit('success', data.user);
  } catch (err) {
    errorMsg.value = err.message || '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
};

const handleForgotPassword = () => {
  alert('请联系管理员重置密码');
};
</script>

<style scoped>
/* ================================================================
   登录页面 - 整体放大版
   ================================================================ */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0F2F5;
  padding: 32px;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1100px;
  min-height: 620px;
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* ================================================================
   左侧品牌区
   ================================================================ */
.login-left {
  flex: 0 0 44%;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 52px 44px 36px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.login-left::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 340px;
  height: 340px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
}

.login-left::after {
  content: '';
  position: absolute;
  bottom: -80px;
  left: -80px;
  width: 240px;
  height: 240px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 50%;
}

.login-left-content {
  position: relative;
  z-index: 1;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 40px;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.brand-slogan {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: #fff;
  line-height: 1.3;
}

.brand-desc {
  font-size: 16px;
  opacity: 0.8;
  margin: 0 0 36px 0;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.brand-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.feature-tag {
  font-size: 15px;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, transform 0.2s;
}
.feature-tag:hover { background: rgba(255, 255, 255, 0.22); transform: translateY(-1px); }

.login-left-footer {
  position: relative;
  z-index: 1;
  font-size: 13px;
  opacity: 0.4;
  color: rgba(255, 255, 255, 0.8);
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ================================================================
   右侧登录区
   ================================================================ */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 56px;
  background: #FFFFFF;
}

.login-card {
  width: 100%;
  max-width: 380px;
}

.login-card-header {
  margin-bottom: 34px;
}

.login-card-header h2 {
  font-size: 26px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 6px 0;
}

.login-card-header p {
  font-size: 15px;
  color: #94A3B8;
  margin: 0;
}

/* ===== 表单 ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 17px;
  color: #94A3B8;
}

.form-input {
  width: 100%;
  padding: 12px 14px 12px 44px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  color: #1E293B;
  background: #F8FAFC;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  height: 50px;
}

.form-input:focus {
  outline: none;
  border-color: #6366F1;
  background: #FFFFFF;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
}

.form-input::placeholder {
  color: #94A3B8;
}

.form-input:disabled {
  background: #F1F5F9;
  cursor: not-allowed;
}

.password-toggle {
  position: absolute;
  right: 14px;
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  color: #94A3B8;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #64748B;
}

/* ===== 记住我 + 忘记密码 ===== */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748B;
  cursor: pointer;
}

.remember-me input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #6366F1;
  cursor: pointer;
}

.forgot-link {
  color: #6366F1;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 10px;
  font-size: 14px;
  color: #B91C1C;
}

.login-btn {
  width: 100%;
  height: 50px;
  background: #6366F1;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  letter-spacing: 2px;
}

.login-btn:hover:not(:disabled) {
  background: #4F46E5;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #94A3B8;
  margin-top: 4px;
}

.register-btn {
  background: transparent;
  border: none;
  color: #6366F1;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  padding: 0 4px;
}

.register-btn:hover {
  text-decoration: underline;
}

/* ================================================================
   响应式
   ================================================================ */
@media (max-width: 960px) {
  .login-container {
    max-width: 480px;
    flex-direction: column;
    min-height: auto;
    border-radius: 18px;
  }

  .login-left {
    flex: none;
    padding: 32px 28px 24px;
  }

  .brand-slogan {
    font-size: 24px;
  }

  .brand-logo {
    margin-bottom: 28px;
  }

  .logo-icon {
    font-size: 32px;
  }

  .logo-text {
    font-size: 20px;
  }

  .brand-desc {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .feature-tag {
    font-size: 13px;
    padding: 6px 14px;
  }

  .login-left-footer {
    margin-top: 20px;
    padding-top: 14px;
  }

  .login-right {
    padding: 32px 28px 36px;
  }

  .login-card {
    max-width: 100%;
  }

  .login-card-header h2 {
    font-size: 22px;
  }

  .login-card-header p {
    font-size: 14px;
  }

  .form-input {
    height: 44px;
    font-size: 14px;
  }

  .login-btn {
    height: 44px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 12px;
  }

  .login-container {
    border-radius: 14px;
  }

  .login-left {
    padding: 24px 18px 18px;
  }

  .brand-logo {
    margin-bottom: 20px;
  }

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-size: 17px;
  }

  .brand-slogan {
    font-size: 19px;
  }

  .brand-desc {
    font-size: 12px;
    margin-bottom: 16px;
  }

  .feature-tag {
    font-size: 11px;
    padding: 4px 10px;
  }

  .login-right {
    padding: 24px 18px 28px;
  }

  .login-card-header {
    margin-bottom: 24px;
  }

  .login-card-header h2 {
    font-size: 19px;
  }

  .login-card-header p {
    font-size: 13px;
  }

  .login-form {
    gap: 14px;
  }

  .form-options {
    font-size: 13px;
  }

  .remember-me {
    gap: 6px;
  }

  .remember-me input[type="checkbox"] {
    width: 14px;
    height: 14px;
  }

  .forgot-link {
    font-size: 13px;
  }

  .form-label {
    font-size: 13px;
  }

  .input-icon {
    font-size: 14px;
    left: 12px;
  }

  .form-input {
    padding: 10px 12px 10px 38px;
    height: 40px;
    font-size: 13px;
    border-radius: 10px;
  }

  .password-toggle {
    font-size: 15px;
    right: 12px;
  }

  .login-btn {
    height: 40px;
    font-size: 14px;
    border-radius: 10px;
  }

  .register-link {
    font-size: 13px;
  }

  .register-btn {
    font-size: 13px;
  }
}
</style>
