import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import './style.css'

// 如果需要使用 Node.js，需要在主进程中启用 `nodeIntegration`
// import './demos/node'

const app = createApp(App)

// 配置应用
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 替换console为electron log，并确保参数可序列化
if (window.electronAPI?.log) {
  const makeSerializable = (...args: any[]) => {
    try {
      return JSON.parse(JSON.stringify(args));
    } catch (error) {
      // 如果序列化失败，转换为字符串
      return args.map(arg =>
        typeof arg === 'object' ?
          (arg?.toString?.() || '[Object]') :
          arg
      );
    }
  };

  console.log = function (...args: any[]) {
    window.electronAPI.log.info(...makeSerializable(...args));
  };

  console.info = function (...args: any[]) {
    window.electronAPI.log.info(...makeSerializable(...args));
  };

  console.warn = function (...args: any[]) {
    window.electronAPI.log.warn(...makeSerializable(...args));
  };

  console.error = function (...args: any[]) {
    window.electronAPI.log.error(...makeSerializable(...args));
  };

  console.debug = function (...args: any[]) {
    window.electronAPI.log.debug(...makeSerializable(...args));
  };
}

app.mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
