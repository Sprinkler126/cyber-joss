好的，让我帮你详细设计一个完整的"赛博烧纸"网页应用技术方案。

------

# 赛博烧纸 —— 网页版技术方案

## 一、整体架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (Browser)                  │
│                                                   │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ 文件上传区  │  │ 火焰动画层 │  │  祭文输入区   │ │
│  │ 拖拽/选择  │  │ Canvas/   │  │  文本编辑器   │ │
│  │ 文件解析   │  │ WebGL     │  │              │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        │              │               │          │
│        └──────────┬───┘───────────────┘          │
│                   │                               │
│          ┌────────▼────────┐                     │
│          │  信息量计算引擎   │                     │
│          │  → 火焰强度映射  │                     │
│          └────────┬────────┘                     │
│                   │                               │
│          ┌────────▼────────┐                     │
│          │  数据分片 & 发送  │                     │
│          │  WebSocket 连接  │                     │
│          └────────┬────────┘                     │
│                   │                               │
└───────────────────┼───────────────────────────────┘
                    │
            ┌───────▼───────┐
            │  后端 (Node.js) │
            │  接收 → 不存储  │
            │  UDP转发 → 消散 │
            │  无日志/无数据库 │
            └───────┬───────┘
                    │ UDP
                    ▼
            ┌──────────────┐
            │ 198.51.100.1 │
            │  (RFC 5737)  │
            │   数据消散…    │
            └──────────────┘
```

## 二、信息量计算 & 火焰等级系统

### 信息量量化方案

所有文件类型统一换算为一个"纸量"单位（我们叫它 **“冥力值”**），以此驱动火焰大小：

| 类型             | 计算方式                             | 换算规则           |
| ---------------- | ------------------------------------ | ------------------ |
| 纯文本输入       | 字数统计                             | 每 100 字 = 1 冥力 |
| `.md` 文件       | 解析为纯文本后统计字数               | 每 100 字 = 1 冥力 |
| `.doc/.docx`     | 前端用 mammoth.js 提取文本后统计字数 | 每 100 字 = 1 冥力 |
| `.pdf`           | 前端用 pdf.js 提取文本后统计字数     | 每 100 字 = 1 冥力 |
| `.jpg/.png` 图片 | 按张数计算                           | 每 1 张 = 5 冥力   |

### 火焰等级映射

| 冥力值范围 | 火焰等级 | 视觉表现                               |
| ---------- | -------- | -------------------------------------- |
| 0          | 无火     | 仅有微弱余烬闪烁                       |
| 1 ~ 5      | 烛火     | 一小簇火苗，高度约 80px，暖黄色        |
| 6 ~ 20     | 小火     | 火焰约 200px，轻微摇曳，橙色为主       |
| 21 ~ 50    | 中火     | 火焰约 350px，明显跳动，橙红色         |
| 51 ~ 100   | 大火     | 火焰约 500px，猛烈燃烧，红色带黄尖     |
| 100+       | 烈焰     | 全屏火焰，火星飞溅，红白交替，画面震动 |

## 三、前端技术方案

### 技术栈

```
框架：React 18 + TypeScript
构建：Vite
火焰动画：Three.js + 自定义 GLSL Shader
文件解析：mammoth.js (docx) + pdf.js (pdf) + marked (md)
音效：Howler.js
通信：WebSocket (Socket.IO Client)
样式：TailwindCSS + CSS Variables
```

### 页面结构

```
┌──────────────────────────────────────────┐
│              赛博烧纸 · CyberJoss        │
│                                          │
│         ┌────────────────────┐           │
│         │                    │           │
│         │    🔥 火焰动画区    │           │
│         │    (Canvas 全屏底层) │           │
│         │                    │           │
│         └────────────────────┘           │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  📝 写下你想说的话...             │    │
│  │  (文本输入区，支持多行)            │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  📎 拖拽或点击上传文件             │    │
│  │  支持: .doc .md .pdf .jpg        │    │
│  │                                  │    │
│  │  [文件1.pdf ✕] [照片.jpg ✕]      │    │
│  └──────────────────────────────────┘    │
│                                          │
│  冥力值: ████████░░ 42                   │
│                                          │
│       [ 🔥 化 为 灰 烬 🔥 ]              │
│                                          │
│  ─────────────────────────────────────   │
│  💀 已有 12,847 份思念消散于赛博空间      │
│                                          │
└──────────────────────────────────────────┘
```

### 核心代码设计

#### 1. 信息量计算引擎

```typescript
// lib/mingliCalculator.ts

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { marked } from 'marked';

interface MingliResult {
  totalMingli: number;
  details: {
    source: string;
    type: 'text' | 'image';
    value: number;
    mingli: number;
  }[];
}

// 统计中英文混合字数：中文按字，英文按单词
function countWords(text: string): number {
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const english = text.replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length;
  return chinese + english;
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ');
  }
  return fullText;
}

function extractMdText(raw: string): string {
  // 去掉 Markdown 标记，提取纯文本
  return raw.replace(/[#*`>\[\]\-_~|]/g, '').replace(/\n+/g, ' ');
}

export async function calculateMingli(
  textInput: string,
  files: File[]
): Promise<MingliResult> {
  const details: MingliResult['details'] = [];

  // 计算手动输入的文字
  if (textInput.trim()) {
    const words = countWords(textInput);
    details.push({
      source: '手写祭文',
      type: 'text',
      value: words,
      mingli: Math.ceil(words / 100),
    });
  }

  // 计算各文件
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      details.push({
        source: file.name,
        type: 'image',
        value: 1,
        mingli: 5,
      });
    } else if (ext === 'docx' || ext === 'doc') {
      const text = await extractDocxText(file);
      const words = countWords(text);
      details.push({
        source: file.name,
        type: 'text',
        value: words,
        mingli: Math.ceil(words / 100),
      });
    } else if (ext === 'pdf') {
      const text = await extractPdfText(file);
      const words = countWords(text);
      details.push({
        source: file.name,
        type: 'text',
        value: words,
        mingli: Math.ceil(words / 100),
      });
    } else if (ext === 'md') {
      const raw = await file.text();
      const text = extractMdText(raw);
      const words = countWords(text);
      details.push({
        source: file.name,
        type: 'text',
        value: words,
        mingli: Math.ceil(words / 100),
      });
    }
  }

  return {
    totalMingli: details.reduce((sum, d) => sum + d.mingli, 0),
    details,
  };
}
```

#### 2. 火焰着色器 (GLSL Shader)

```glsl
// shaders/flame.frag
precision mediump float;

uniform float uTime;
uniform float uIntensity; // 0.0 ~ 1.0，由冥力值映射
uniform vec2 uResolution;

// Simplex noise 函数（省略具体实现，使用标准 snoise）
float snoise(vec3 v);

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    
    // 火焰基础形状：底宽顶窄
    float flameShape = 1.0 - smoothstep(0.0, 0.5 + uIntensity * 0.4, uv.y);
    float width = 0.3 + uIntensity * 0.3;
    flameShape *= 1.0 - smoothstep(0.0, width, abs(uv.x - 0.5));
    
    // 噪声扰动，模拟火焰摇曳
    float noise1 = snoise(vec3(uv * 3.0, uTime * 1.5)) * 0.5 + 0.5;
    float noise2 = snoise(vec3(uv * 6.0, uTime * 2.5)) * 0.5 + 0.5;
    float turbulence = noise1 * 0.7 + noise2 * 0.3;
    
    // 火焰强度
    float flame = flameShape * turbulence;
    flame = pow(flame, 1.5 - uIntensity * 0.5);
    
    // 火焰配色：根据强度从暖黄到烈红
    vec3 colorLow = vec3(1.0, 0.85, 0.2);   // 烛火黄
    vec3 colorMid = vec3(1.0, 0.4, 0.05);    // 橙红
    vec3 colorHigh = vec3(0.9, 0.1, 0.05);   // 烈焰红
    
    vec3 color = mix(colorLow, colorMid, smoothstep(0.0, 0.5, uIntensity));
    color = mix(color, colorHigh, smoothstep(0.5, 1.0, uIntensity));
    
    // 火尖发白
    vec3 tip = vec3(1.0, 1.0, 0.9);
    color = mix(color, tip, flame * flame * uIntensity);
    
    // 火星粒子效果（高冥力值时出现）
    float sparks = 0.0;
    if (uIntensity > 0.5) {
        float sparkNoise = snoise(vec3(uv * 20.0, uTime * 5.0));
        sparks = step(0.97, sparkNoise) * flameShape * uIntensity;
    }
    
    float alpha = flame * (0.6 + uIntensity * 0.4) + sparks;
    gl_FragColor = vec4(color + sparks, alpha);
}
```

#### 3. 火焰 React 组件

```typescript
// components/FlameCanvas.tsx

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import flameVertShader from '../shaders/flame.vert?raw';
import flameFragShader from '../shaders/flame.frag?raw';

interface FlameCanvasProps {
  intensity: number;  // 0 ~ 1
  burning: boolean;   // 是否正在焚烧
}

export function FlameCanvas({ intensity, burning }: FlameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uBurning: { value: 0 },
  });

  useEffect(() => {
    const container = containerRef.current!;
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: flameVertShader,
      fragmentShader: flameFragShader,
      uniforms: uniformsRef.current,
      transparent: true,
    });
    
    scene.add(new THREE.Mesh(geometry, material));

    uniformsRef.current.uResolution.value.set(
      container.clientWidth,
      container.clientHeight
    );

    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      uniformsRef.current.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // 平滑过渡火焰强度
  useEffect(() => {
    const target = burning ? Math.min(intensity * 1.5, 1.0) : intensity;
    const animate = () => {
      const current = uniformsRef.current.uIntensity.value;
      const diff = target - current;
      if (Math.abs(diff) > 0.001) {
        uniformsRef.current.uIntensity.value += diff * 0.05;
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [intensity, burning]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px] pointer-events-none"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 0 }}
    />
  );
}
```

#### 4. 焚烧动画流程

```typescript
// hooks/useBurnCeremony.ts

import { useState, useCallback } from 'react';
import { io } from 'socket.io-client';

interface BurnState {
  phase: 'idle' | 'igniting' | 'burning' | 'fading' | 'done';
  progress: number;       // 0 ~ 1
  packetsSent: number;
  totalPackets: number;
}

export function useBurnCeremony() {
  const [state, setState] = useState<BurnState>({
    phase: 'idle',
    progress: 0,
    packetsSent: 0,
    totalPackets: 0,
  });

  const burn = useCallback(async (
    textInput: string,
    files: File[],
    totalMingli: number,
  ) => {
    const socket = io('wss://your-server.com', { transports: ['websocket'] });

    // 1. 点火阶段（1.5秒动画过渡）
    setState(s => ({ ...s, phase: 'igniting' }));
    await sleep(1500);

    // 2. 准备数据分片
    const chunks: ArrayBuffer[] = [];

    // 文本分片：每 200 字符一个数据包
    if (textInput) {
      for (let i = 0; i < textInput.length; i += 200) {
        const slice = textInput.slice(i, i + 200);
        chunks.push(new TextEncoder().encode(slice).buffer);
      }
    }

    // 文件分片：每 4KB 一个数据包
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      for (let i = 0; i < buffer.byteLength; i += 4096) {
        chunks.push(buffer.slice(i, i + 4096));
      }
    }

    const totalPackets = chunks.length;
    setState(s => ({ ...s, phase: 'burning', totalPackets }));

    // 3. 逐包发送，模拟燃烧过程
    for (let i = 0; i < chunks.length; i++) {
      socket.emit('burn_packet', chunks[i]);
      
      setState(s => ({
        ...s,
        packetsSent: i + 1,
        progress: (i + 1) / totalPackets,
      }));

      // 根据冥力值控制发送速度：冥力越高，每包间隔越短（烧得越旺）
      const interval = Math.max(30, 150 - totalMingli * 2);
      await sleep(interval);
    }

    // 4. 余烬消散阶段
    setState(s => ({ ...s, phase: 'fading' }));
    await sleep(3000);

    // 5. 完成
    setState(s => ({ ...s, phase: 'done' }));
    socket.disconnect();
  }, []);

  return { state, burn };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 四、后端技术方案

### 技术栈

```
运行时：Node.js 20+
框架：Fastify（轻量）
WebSocket：Socket.IO
UDP 发送：Node.js dgram 模块
部署：Docker + 任意 VPS
```

### 核心代码

```typescript
// server.ts

import Fastify from 'fastify';
import { Server } from 'socket.io';
import dgram from 'dgram';

const app = Fastify({
  logger: false,  // 不记录任何日志，数据不留痕
});

const io = new Server(app.server, {
  cors: { origin: '*' },
  transports: ['websocket'],
});

// RFC 5737 文档专用地址 —— 数据包的归宿
const VOID_TARGETS = [
  { host: '192.0.2.1', port: 9999 },
  { host: '198.51.100.1', port: 9999 },
  { host: '203.0.113.1', port: 9999 },
];

// 全局计数器（仅统计数量，不存储内容）
let totalBurnCount = 0;

// 创建 UDP socket
const udpSocket = dgram.createSocket('udp4');

// 设置 TTL，让数据包在网络中经历几跳后消亡
udpSocket.on('listening', () => {
  udpSocket.setTTL(10);
});
udpSocket.bind();

io.on('connection', (socket) => {
  let packetCount = 0;

  socket.on('burn_packet', (data: Buffer) => {
    packetCount++;

    // 随机选择一个虚空地址
    const target = VOID_TARGETS[Math.floor(Math.random() * VOID_TARGETS.length)];

    // 将数据通过 UDP 发送到虚空，不等待回复
    udpSocket.send(
      Buffer.from(data),
      target.port,
      target.host,
      (err) => {
        // 无论成功失败，数据都已消散
        // 不做任何记录
      }
    );
  });

  socket.on('disconnect', () => {
    if (packetCount > 0) {
      totalBurnCount++;
    }
  });
});

// 仅提供一个接口：查询总焚烧次数（不含任何内容）
app.get('/api/stats', async () => {
  return { totalBurns: totalBurnCount };
});

app.listen({ port: 3000, host: '0.0.0.0' });
```

## 五、焚烧仪式完整流程

```
用户打开页面
    │
    ▼
页面呈现微弱余烬动画，背景深色，氛围肃穆
    │
    ├──→ 用户输入祭文（可选）
    ├──→ 用户上传文件（可选）
    │     上传后实时解析，计算冥力值
    │     火焰随冥力值实时变化（预览效果）
    │
    ▼
用户点击「化为灰烬」按钮
    │
    ▼
Phase 1 - 点火（1.5s）
    │  按钮消失，上传区域开始卷曲变形
    │  播放点火音效
    │  火焰从底部升起
    │
    ▼
Phase 2 - 燃烧（根据数据量动态时长）
    │  文字/文件内容从下往上逐渐被火焰吞噬
    │  如果有文本，文字会依次浮现在火焰中再消散
    │  数据包逐个通过 WebSocket 发送到后端
    │  后端通过 UDP 发送到 RFC 5737 地址
    │  火焰大小与冥力值匹配
    │  进度条显示：「已消散 47/128 个数据包」
    │  高冥力值时：火星四溅，屏幕微震
    │
    ▼
Phase 3 - 余烬（3s）
    │  火焰逐渐缩小
    │  灰烬粒子向上飘散
    │  播放余烬音效
    │
    ▼
Phase 4 - 完成
    │  屏幕归于平静
    │  显示：「你的思念已化为数据之灰」
    │  「消散于赛博空间的光缆之中」
    │  显示本次数据包数量、经过的路由跳数
    │  「全球已有 12,847 份思念融入数字长河」
    │
    ▼
用户可选择「再寄一份」重新开始
```

## 六、音效设计

| 阶段   | 音效                             | 来源建议                               |
| ------ | -------------------------------- | -------------------------------------- |
| 点火   | 火柴/打火机点燃声                | [freesound.org](http://freesound.org/) |
| 燃烧中 | 持续的篝火噼啪声，强度跟随冥力值 | 自行录制或素材库                       |
| 余烬   | 微弱的余火声 + 风声              | 环境音素材                             |
| 完成   | 一声清脆的磬声/钟声              | 佛教法器音效                           |

## 七、项目目录结构

```
cyber-joss/
├── client/                     # 前端
│   ├── public/
│   │   ├── sounds/
│   │   │   ├── ignite.mp3
│   │   │   ├── burning-loop.mp3
│   │   │   ├── ember.mp3
│   │   │   └── bell.mp3
│   │   └── favicon.ico         # 🕯️ 图标
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlameCanvas.tsx        # 火焰 WebGL 渲染
│   │   │   ├── FileUploader.tsx       # 文件上传区
│   │   │   ├── TextInput.tsx          # 祭文输入
│   │   │   ├── MingliMeter.tsx        # 冥力值进度条
│   │   │   ├── BurnButton.tsx         # 焚烧按钮
│   │   │   ├── BurnProgress.tsx       # 焚烧进度展示
│   │   │   └── CompletionScreen.tsx   # 完成界面
│   │   ├── hooks/
│   │   │   ├── useBurnCeremony.ts     # 焚烧流程控制
│   │   │   ├── useMingli.ts           # 冥力值计算
│   │   │   └── useSound.ts            # 音效控制
│   │   ├── lib/
│   │   │   ├── mingliCalculator.ts    # 信息量计算引擎
│   │   │   └── fileParser.ts          # 文件解析工具
│   │   ├── shaders/
│   │   │   ├── flame.vert             # 顶点着色器
│   │   │   ├── flame.frag             # 片段着色器
│   │   │   └── ember.frag             # 余烬粒子着色器
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # 后端
│   ├── src/
│   │   ├── server.ts                  # 主服务
│   │   ├── udpVoid.ts                 # UDP 发送到虚空
│   │   └── stats.ts                   # 统计（仅计数）
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 八、部署方案

```yaml
# docker-compose.yml
version: '3.8'

services:
  client:
    build: ./client
    ports:
      - "80:80"
    # Nginx 托管前端静态文件

  server:
    build: ./server
    ports:
      - "3000:3000"
    # 需要允许出站 UDP 流量
    # 不挂载任何持久化存储 —— 数据不落盘
    tmpfs:
      - /tmp    # 所有临时数据只存在于内存
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## 九、安全 & 隐私设计要点

这个应用的灵魂在于"数据不留"，所以需要在以下方面保证：

服务器端不使用任何数据库，不写入任何日志文件，Fastify 的 logger 设为 false。Docker 容器不挂载持久化卷，使用 tmpfs 确保即使有临时文件也只存在于内存中。前端在焚烧完成后立即清除所有变量和 ArrayBuffer，主动调用 `gc`（如果可用）。WebSocket 连接在焚烧完成后立即断开。可以在页面底部放一段隐私声明，说明整个技术原理，让用户安心。

------

这个方案覆盖了从前端交互、火焰动画、文件解析、信息量计算、数据传输到后端消散的完整链路。核心理念是让每一个技术环节都服务于"焚烧"这个隐喻——数据真正地在网络中消散，没有任何副本留存。你觉得这个方案怎么样？有什么想调整的地方吗？