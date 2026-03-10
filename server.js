const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

// 创建Express应用
const app = express();
// 添加中间件
app.use(express.json()); // 支持JSON格式的请求体
app.use(express.urlencoded({ extended: true })); // 支持URL编码的请求体
// 创建HTTP服务器
const server = http.createServer(app);
// 创建Socket.io服务器
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 字幕文件路径
const logFilePath = path.join(__dirname, 'subtitle.srt');

// 确保日志文件存在
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
  console.log('Created log file:', logFilePath);
}

// 读取日志文件内容
const readLogFile = () => {
  try {
    return fs.readFileSync(logFilePath, 'utf8');
  } catch (error) {
    console.error('Error reading log file:', error);
    return '';
  }
};

// 生成SRT格式的字幕内容
const generateLogEntry = (text) => {
  // SRT字幕格式：序号 + 时间 + 内容 + 空行
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  
  // 开始时间和结束时间（结束时间比开始时间晚2秒）
  const startTime = `${hours}:${minutes}:${seconds},${milliseconds}`;
  const endTime = `${hours}:${minutes}:${Math.min(seconds + 2, 59).toString().padStart(2, '0')},${milliseconds}`;
  
  // 生成字幕序号（简单使用时间戳作为序号）
  const subtitleId = Date.now();
  
  // 生成SRT格式的字幕条目
  return `${subtitleId}\n${startTime} --> ${endTime}\n${text}\n\n`;
};

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // 首次连接时，发送当前日志内容
  const initialLogContent = readLogFile();
  socket.emit('logUpdate', initialLogContent);
  
  // 处理客户端发送的字幕更新消息
  socket.on('logUpdate', (text) => {
    console.log('Received subtitle update:', text);
    
    // 从SRT格式中提取纯文本
    let pureText = text
      .split('\n')
      .filter(line => {
        // 过滤掉序号行、时间行和空行
        return !/^\d+$/.test(line.trim()) && 
               !/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(line.trim()) && 
               line.trim() !== '';
      })
      .join('\n');
    
    // 不再进行字数限制，使用完整的纯文本
    const displayText = pureText;
    
    // 重新生成SRT格式用于显示
    const logEntry = generateLogEntry(displayText);
    // 以追加模式保存完整的SRT格式日志到文件
    fs.appendFileSync(logFilePath, logEntry);
    
    // 广播给所有客户端（包括发送者）用于显示字幕
    io.emit('logUpdate', logEntry);
    // 不再广播更新编辑框的消息，让前端保持完整的输入内容
    
    console.log('Subtitle updated and broadcasted to all clients');
  });
  
  // 连接断开处理
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// 处理根路径
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 语音识别相关API
app.post('/save-text', (req, res) => {
  try {
    const text = req.body.text || '';
    // 使用追加模式保存，避免覆盖历史记录
    fs.appendFileSync(logFilePath, text);
    console.log('Text appended to file:', logFilePath);
    // 通知所有客户端更新
    io.emit('logUpdate', text);
    res.json({ success: true, message: 'Text saved successfully' });
  } catch (error) {
    console.error('Error saving text:', error);
    res.json({ success: false, message: 'Failed to save text' });
  }
});

app.get('/get-text', (req, res) => {
  try {
    const text = fs.readFileSync(logFilePath, 'utf8');
    res.json({ success: true, text });
  } catch (error) {
    console.error('Error reading text:', error);
    res.json({ success: false, text: '' });
  }
});

// 语音识别页面
app.get('/speech', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
  console.log(`Subtitle system initialized`);
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
