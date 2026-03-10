# 小喵云字幕系统 (xiaoan-logger)

一个基于 Vue 3 和 Socket.io 的实时字幕同步系统，专为 OBS 直播场景设计。它允许用户在控制端输入文本，并实时（包括输入法组字过程）将字幕显示在 OBS 的浏览器源中，同时自动保存为 SRT 字幕文件。

## ✨ 功能特性

- **实时同步**：毫秒级延迟，打字即上屏，支持输入法（如拼音）组字过程的实时显示。
- **OBS 友好**：专门设计的字幕展示页面，背景透明，字体清晰，完美适配 OBS 浏览器源。
- **自动归档**：所有输入的字幕内容会自动按时间戳保存为标准 SRT 格式文件 (`subtitle.srt`)。
- **双端分离**：控制端与展示端分离，支持局域网内多设备协同（如手机输入，电脑显示）。
- **断线重连**：内置 Socket.io 断线重连机制，确保直播过程中的稳定性。

## 🛠️ 技术栈

- **前端**：Vue 3, Vite, Element Plus
- **后端**：Node.js, Express, Socket.io
- **通信**：WebSocket (Socket.io)

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式运行

同时启动前端构建服务和后端服务器：

```bash
# 启动后端服务 (默认端口 8081)
npm start

# 在另一个终端启动前端开发服务
npm run dev
```

### 生产环境部署

1. 构建前端资源：

```bash
npm run build
```

2. 启动生产服务器：

```bash
npm start
```

## 📖 使用指南

### 1. 启动服务
确保后端服务已启动（默认运行在 `http://localhost:8081`）。

### 2. 打开控制端
在浏览器中访问：`http://localhost:8081/speech` (或开发环境下的 `http://localhost:5173/speech`)
- 在文本框中输入内容，您的输入将实时广播。
- 点击“开始记录/停止记录”按钮控制是否发送字幕。

### 3. 配置 OBS
1. 打开 OBS Studio。
2. 添加来源 -> **浏览器**。
3. URL 设置为：`http://localhost:8081/` (或开发环境下的 `http://localhost:5173/`)。
4. 宽度和高度建议设置为您的画布大小（如 1920x1080）。
5. 自定义 CSS（可选）：可以通过 OBS 的自定义 CSS 功能调整字体大小、颜色等。

## 📂 项目结构

```
xiaoan-logger/
├── dist/                   # 构建后的静态文件
├── src/
│   ├── components/         # Vue 组件
│   │   └── SpeechRecognition.vue  # 字幕输入控制组件
│   ├── views/              # 页面视图
│   │   ├── SubtitleView.vue       # 字幕展示页面 (OBS源)
│   │   └── SpeechRecognitionView.vue # 控制端页面
│   ├── router/             # 路由配置
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── server.js               # Node.js 后端服务器 (Socket.io)
├── subtitle.srt            # 自动生成的字幕文件
├── package.json            # 项目配置与依赖
└── vite.config.js          # Vite 配置
```

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。
