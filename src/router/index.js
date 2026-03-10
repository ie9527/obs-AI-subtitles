import { createRouter, createWebHistory } from 'vue-router'
import SubtitleView from '../views/SubtitleView.vue'
import SpeechRecognitionView from '../views/SpeechRecognitionView.vue'

const routes = [
  {
    path: '/',
    name: 'Subtitle',
    component: SubtitleView,
    meta: {
      title: '字幕显示'
    }
  },
  {
    path: '/speech',
    name: 'SpeechRecognition',
    component: SpeechRecognitionView,
    meta: {
      title: '语音识别'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫，设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '小喵云字幕系统'
  next()
})

export default router