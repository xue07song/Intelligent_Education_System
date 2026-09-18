// 显式声明空的 PostCSS 配置，阻止 Vite 向上级目录（如 D:\）搜索配置文件
// 解决上级目录存在空 package.json 导致 CSS 加载失败的问题
export default {
  plugins: [],
};
