import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { io } from 'socket.io-client'
import router from './router'
import axios from 'axios'

// 创建Socket.io客户端实例 - 使用相对地址，确保在任何环境下都能正常连接
const socket = io()

const app = createApp(App)
app.provide('socket', socket) // 提供全局Socket实例
app.provide('axios', axios) // 提供全局axios实例
app.use(ElementPlus)
app.use(router)
app.mount('#app')