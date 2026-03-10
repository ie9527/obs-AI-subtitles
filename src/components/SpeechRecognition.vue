<template>
  <div class="speech-recognition-container">
    <div class="control-section">
      <el-button 
        :type="isRecording ? 'danger' : 'primary'"
        @click="toggleRecording"
        class="control-button"
      >
        {{ isRecording ? '停止记录' : '开始记录' }}
      </el-button>
    </div>
    <div class="input-section">
      <textarea
        v-model="inputText"
        @input="handleInput"
        @compositionstart="handleCompositionStart"
        @compositionupdate="handleCompositionUpdate"
        @compositionend="handleCompositionEnd"
        class="custom-textarea"
        placeholder="请输入字幕内容..."
        rows="10"
      ></textarea>
    </div>
    <div class="status-section">
      <div>状态: {{ isRecording ? '正在记录' : '已停止' }}</div>
      <div>保存状态: {{ saveStatus }}</div>
      <div>同步状态: {{ syncStatus }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import axios from 'axios'

const inputText = ref('')
const isRecording = ref(true) // 默认正在记录日志，用户打开页面后就能直接输入
const saveStatus = ref('正在记录中')
const saveStatusType = ref('success')
const syncStatus = ref('已连接到字幕系统')
const syncStatusType = ref('success')
const socket = inject('socket') // 从全局注入获取Socket.io实例
const isComposing = ref(false) // 标记是否正在输入法组合输入

// 连接Socket.io
const connectSocket = () => {
  try {
    // 使用全局注入的socket实例
    socket.on('connect', () => {
      console.log('SpeechRecognition: Socket.io连接成功')
      updateSyncStatus('已连接到字幕系统', 'success')
    })
    
    // 接收消息 - 监听编辑框更新
    socket.on('updateInput', (text) => {
      // 只有当文本与当前输入不同时才更新，避免循环更新
      if (inputText.value !== text) {
        inputText.value = text
      }
    })
    
    socket.on('disconnect', () => {
      console.log('SpeechRecognition: Socket.io连接关闭')
      updateSyncStatus('与字幕系统断开连接', 'warning')
    })
    
    socket.on('error', (error) => {
      console.error('SpeechRecognition: Socket.io连接错误:', error)
      updateSyncStatus('连接错误', 'error')
    })
  } catch (error) {
    console.error('SpeechRecognition: Socket.io连接失败:', error)
    updateSyncStatus('连接失败', 'error')
  }
}

// 切换记录状态
const toggleRecording = () => {
  isRecording.value = !isRecording.value
  
  if (isRecording.value) {
    updateSaveStatus('开始记录日志', 'success')
    updateSyncStatus('开始同步字幕', 'success')
  } else {
    updateSaveStatus('停止记录日志', 'info')
    updateSyncStatus('停止同步字幕', 'info')
  }
}

// 处理输入事件
const handleInput = () => {
  // 只有在记录状态下才保存和同步
  if (isRecording.value) {
    saveText()
  }
}

// 处理输入法组合输入开始
const handleCompositionStart = () => {
  isComposing.value = true
}

// 处理输入法组合输入更新
const handleCompositionUpdate = (event) => {
  // 在输入法组合输入过程中也实时同步
  if (isRecording.value && event.target) {
    // 获取当前输入框的完整内容，包括预输入状态的文本
    const currentText = event.target.value
    if (currentText !== inputText.value) {
      inputText.value = currentText
    }
    // 不再在这里调用saveText()，因为handleInput会处理
  }
}

// 处理输入法组合输入结束
const handleCompositionEnd = (event) => {
  isComposing.value = false
  // 输入法组合输入结束后也同步一次
  if (isRecording.value && event.target) {
    // 获取最终确认的文本
    const finalText = event.target.value
    if (finalText !== inputText.value) {
      inputText.value = finalText
    }
    // 不再在这里调用saveText()，因为handleInput会处理
  }
}

// 生成SRT格式的字幕内容
const generateLogEntry = (text) => {
  // SRT字幕格式：序号 + 时间 + 内容 + 空行
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0')
  
  // 开始时间和结束时间（结束时间比开始时间晚2秒）
  const startTime = `${hours}:${minutes}:${seconds},${milliseconds}`
  const endTime = `${hours}:${minutes}:${Math.min(seconds + 2, 59).toString().padStart(2, '0')},${milliseconds}`
  
  // 生成字幕序号（简单使用时间戳作为序号）
  const subtitleId = Date.now()
  
  // 生成SRT格式的字幕条目
  return `${subtitleId}\n${startTime} --> ${endTime}\n${text}\n\n`
}

// 保存文本并实时同步
const saveText = async () => {
  try {
    if (!isRecording.value) return
    
    updateSaveStatus('正在保存...', 'warning')
    updateSyncStatus('正在同步...', 'warning')
    
    // 生成带时间戳的日志格式
    const logEntry = generateLogEntry(inputText.value)
    
    if (socket && socket.connected) {
      // 直接通过WebSocket发送字幕更新消息
      socket.emit('logUpdate', logEntry)
      
      updateSaveStatus('保存成功', 'success')
      updateSyncStatus('同步成功', 'success')
    } else {
      // 如果WebSocket未连接，使用HTTP请求作为备用
      const response = await axios.post('/save-text', {
        text: logEntry
      })
      
      if (response.data.success) {
        updateSaveStatus('保存成功', 'success')
        updateSyncStatus('同步成功', 'success')
      } else {
        updateSaveStatus('保存失败', 'error')
        updateSyncStatus('同步失败', 'error')
      }
    }
  } catch (error) {
    console.error('保存/同步失败:', error)
    updateSaveStatus('保存失败', 'error')
    updateSyncStatus('同步失败', 'error')
  }
}

// 手动保存
const saveTextManually = () => {
  saveText()
}

// 同步到字幕系统（备用方法）
const syncToSubtitle = () => {
  saveText()
}

// 清空文本
const clearText = () => {
  inputText.value = ''
  updateSaveStatus('已清空', 'info')
  updateSyncStatus('已清空', 'info')
}

// 预览字幕效果
const previewSubtitle = () => {
  window.open('http://localhost:8080', '_blank')
}

// 更新保存状态
const updateSaveStatus = (message, type) => {
  saveStatus.value = message
  saveStatusType.value = type
}

// 更新同步状态
const updateSyncStatus = (message, type) => {
  syncStatus.value = message
  syncStatusType.value = type
}

// 组件挂载时
onMounted(() => {
  connectSocket()
})

// 组件卸载时
onUnmounted(() => {
  // 不再手动断开连接，因为socket实例是全局共享的
})
</script>

<style scoped>
.speech-recognition-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  background-color: #1e1e1e;
  min-height: 100vh;
  color: #d4d4d4;
}

.control-section {
  margin-bottom: 20px;
  text-align: center;
}

.control-button {
  font-size: 16px;
  padding: 10px 30px;
}

.input-section {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
}

/* 自定义textarea样式 */
.custom-textarea {
  width: 100%;
  min-height: 600px;
  padding: 15px;
  border: none;
  border-radius: 4px;
  background-color: #2d2d2d;
  color: #d4d4d4;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.5;
  resize: vertical;
  overflow: auto;
  transition: all 0.3s ease;
}

.custom-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px #007acc;
  background-color: #333333;
}

.custom-textarea::placeholder {
  color: rgba(212, 212, 212, 0.5);
}

/* 按钮样式调整，适配VS Code风格 */
.el-button {
  border-radius: 4px !important;
  font-size: 14px !important;
}

.el-button--primary {
  background-color: #0e639c !important;
  border-color: #0e639c !important;
}

.el-button--primary:hover {
  background-color: #1177bb !important;
  border-color: #1177bb !important;
}

.el-button--danger {
  background-color: #d13438 !important;
  border-color: #d13438 !important;
}

.el-button--danger:hover {
  background-color: #e53e42 !important;
  border-color: #e53e42 !important;
}

/* 状态信息样式 */
.status-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6a6a6a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .speech-recognition-container {
    padding: 10px;
  }
  
  .control-button {
    font-size: 14px;
    padding: 8px 20px;
  }
  
  .speech-input {
    min-height: 400px;
  }
  
  .speech-input textarea {
    padding: 15px !important;
  }
}
</style>