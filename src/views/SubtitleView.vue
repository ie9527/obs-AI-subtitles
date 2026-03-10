<template>
  <!-- OBS浏览器源专用字幕显示页面 -->
  <div class="subtitle-container" id="subtitle-container">
    <div 
      class="subtitle-content" 
      ref="subtitleContainer" 
      v-html="processedSubtitle"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject } from 'vue'

const subtitleContent = ref('')
const subtitleContainer = ref(null)
const socket = inject('socket') // 从全局注入获取Socket.io实例
const previousSubtitle = ref('') // 保存上一个字幕内容，用于检测字幕变化

// 连接Socket.io
const connectSocket = () => {
  try {
    // 连接成功
    socket.on('connect', () => {
      console.log('Socket.io连接成功')
    })
    
    // 接收消息 - 监听字幕更新
    socket.on('logUpdate', (data) => {
      // 检测字幕内容是否变化
      if (data !== previousSubtitle.value) {
        previousSubtitle.value = data
      }
      subtitleContent.value = data
      // 保持字幕容器高度稳定
      adjustContainerHeight()
    })
    
    // 连接关闭
    socket.on('disconnect', () => {
      console.log('Socket.io连接关闭')
    })
    
    // 连接错误
    socket.on('error', (error) => {
      console.error('Socket.io连接错误:', error)
    })
  } catch (error) {
    console.error('Socket.io连接失败:', error)
  }
}

// 调整容器高度，确保OBS渲染稳定
const adjustContainerHeight = () => {
  if (subtitleContainer.value) {
    // 确保容器有最小高度，避免OBS中布局跳动
    subtitleContainer.value.style.minHeight = '100px'
  }
}

// 基于长度的自动换行函数
const wrapTextByLength = (text, maxLength = 30) => {
  if (!text) return text
  
  let result = ''
  let currentLine = ''
  
  for (let i = 0; i < text.length; i++) {
    currentLine += text[i]
    
    // 当当前行长度达到最大长度时，添加换行
    if (currentLine.length >= maxLength) {
      // 尝试在最近的空格或标点符号处换行
      const lastSpaceIndex = currentLine.lastIndexOf(' ')
      const lastPunctuationIndex = currentLine.search(/[,，。！？；：]$/)
      
      if (lastSpaceIndex > maxLength * 0.7) {
        // 在空格处换行
        result += currentLine.substring(0, lastSpaceIndex) + '<br>'
        currentLine = currentLine.substring(lastSpaceIndex + 1)
      } else if (lastPunctuationIndex > -1) {
        // 在标点符号处换行
        result += currentLine.substring(0, lastPunctuationIndex + 1) + '<br>'
        currentLine = currentLine.substring(lastPunctuationIndex + 1)
      } else {
        // 直接在最大长度处换行
        result += currentLine + '<br>'
        currentLine = ''
      }
    }
  }
  
  // 添加剩余内容
  if (currentLine) {
    result += currentLine
  }
  
  return result
}

// 处理SRT格式的字幕内容
const processedSubtitle = computed(() => {
  if (!subtitleContent.value) return '<div class="empty-subtitle">-- 等待字幕 --</div>'
  
  // 提取SRT格式中的字幕文本
  const extractSubtitleText = (srtContent) => {
    // SRT格式：序号 + 时间 + 内容 + 空行
    // 匹配并提取字幕文本部分
    const lines = srtContent.split('\n')
    const subtitleTexts = []
    
    let inSubtitleText = false
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // 跳过空行
      if (trimmedLine === '') {
        inSubtitleText = false
        continue
      }
      
      // 跳过序号行（宽松匹配，只要是纯数字即可）
      if (/^\d+$/.test(trimmedLine)) {
        inSubtitleText = false
        continue
      }
      
      // 跳过时间行（宽松匹配，只要包含 --> 即可）
      if (trimmedLine.includes('-->')) {
        inSubtitleText = true
        continue
      }
      
      // 提取字幕文本（只要不是序号行、时间行或空行，就认为是字幕文本）
      subtitleTexts.push(trimmedLine)
    }
    
    return subtitleTexts
  }
  
  // 提取字幕文本
  const subtitleTexts = extractSubtitleText(subtitleContent.value)
  
  // 只取最后一个字幕条目（通常是最新的）
  const lastSubtitle = subtitleTexts.slice(-1)[0] || ''
  
  // 应用自动换行
  const wrappedText = wrapTextByLength(lastSubtitle, 30)
  
  // 将自动换行后的文本按<br>分割成行
  const lines = wrappedText.split('<br>')
  
  // 只取最后2行
  const recentLines = lines.slice(-2)
  
  // 处理每行字幕，确保显示格式正确
  return recentLines.map(line => {
    return `<div class="subtitle-line">${line}</div>`
  }).join('')
})

// 组件挂载时连接Socket.io
onMounted(() => {
  connectSocket()
  adjustContainerHeight()
})

// 组件卸载时关闭Socket.io连接
onUnmounted(() => {
  // 不再手动断开连接，因为socket实例是全局共享的
  // if (socket) {
  //   socket.disconnect()
  // }
})
</script>

<style scoped>
/* 全局样式重置，确保OBS中渲染一致 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: transparent; /* 透明背景，便于OBS叠加 */
}

/* 字幕容器样式 */
.subtitle-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start; /* 字幕显示在顶部 */
  justify-content: flex-start; /* 字幕显示在左侧 */
  padding: 20px;
  background-color: transparent;
  position: relative;
}

/* 字幕内容区域 */
.subtitle-content {
  width: auto; /* 宽度自适应内容 */
  max-width: 800px; /* 最大宽度限制，避免过宽 */
  max-height: 120px; /* 限制显示高度，确保只显示两行 */
  background-color: rgba(0, 0, 0, 0.7); /* 半透明黑色背景，提高文字可读性 */
  border-radius: 4px;
  padding: 15px 20px; /* 合适的内边距 */
  color: white;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px; /* 增大字体大小，确保在OBS中显示清晰 */
  line-height: 1.5; /* 合适的行高 */
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word; /* 确保长单词也能换行 */
  white-space: normal; /* 确保文字正常换行 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease;
  font-weight: 500;
  letter-spacing: 0.5px;
  overflow: hidden; /* 隐藏超出部分 */
  display: block; /* 块级显示，确保高度限制生效 */
}

/* 单行字幕样式 */
:deep(.subtitle-line) {
  margin-bottom: 12px; /* 增大行间距 */
  line-height: 1.4; /* 确保每行完整显示 */
  opacity: 1;
}

:deep(.subtitle-line:last-child) {
  margin-bottom: 0;
}

/* 确保在OBS中渲染稳定 */
.subtitle-content {
  backface-visibility: hidden !important;
  perspective: 1000px !important;
}

/* 容器样式，确保整体稳定 */
.subtitle-container {
  transition: all 0.3s ease !important;
}

/* 空字幕状态 */
:deep(.empty-subtitle) {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* 确保OBS中渲染稳定 */
.subtitle-container {
  min-height: 200px;
  min-width: 400px;
}

.subtitle-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 响应式设计，适配不同屏幕尺寸 */
@media (max-width: 768px) {
  .subtitle-container {
    padding: 10px;
  }
  
  .subtitle-content {
    font-size: 18px;
    padding: 10px 15px;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .subtitle-content {
    font-size: 16px;
    padding: 8px 12px;
  }
}
</style>