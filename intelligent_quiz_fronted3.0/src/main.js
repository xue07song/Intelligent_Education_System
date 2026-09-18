import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles/global.css'

createApp(App).use(ElementPlus).use(router).mount('#app')
// 1. 创建 Vue 应用实例
// 2. 将 App.vue 作为根组件
// 3. 装上 vue-router（R1 起）：只有试点路由 + 受控的 legacy 出口，App.vue 本身不是路由页面
// 4. 挂载到 index.html 中 id="app" 的 DOM 节点上
