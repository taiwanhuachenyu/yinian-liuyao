<p align="center">
  <img src="./src/assets/yikeyimi-mark-blackwhite.png" width="76" alt="YIKEYIMI Logo" />
</p>

<h1 align="center">一念观理</h1>

<p align="center">
  面向微信小程序的六爻排盘与传统文化学习工具
</p>

<p align="center">
  <strong>一念既起，六爻成章。</strong>
</p>

<p align="center">
  <img alt="Taro" src="https://img.shields.io/badge/Taro-4.2-3370ff" />
  <img alt="React" src="https://img.shields.io/badge/React-18.3-149eca" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-2f6f64" />
</p>

---

## 关于项目

「一念观理」是一款由 **一颗薏米 YIKEYIMI** 设计与开发的现代六爻排盘小程序。

项目在保留纳甲、六亲、六神、世应、动变、旬空等传统排盘信息的基础上，以更清晰的移动端信息层级、更自然的铜钱交互和更克制的视觉语言，降低专业排盘在小屏幕上的阅读负担。

所有排盘记录默认保存在微信本地，不上传至项目维护者的服务器。

## 界面预览

<p align="center">
  <img src="./docs/home.png" width="360" alt="一念观理首页" />
  &nbsp;&nbsp;
  <img src="./docs/result.png" width="360" alt="一念观理排盘结果" />
</p>

## 核心能力

- **铜钱摇卦**：三枚古铜钱逐爻投掷，包含高速翻面、空间进动、落地回弹与随机节奏。
- **手动选卦**：按六爻顺序选择阴阳与动静，适合录入已有卦象。
- **天机起卦**：选择日期与时辰，以梅花易数时间规则生成卦象。
- **完整排盘**：展示本卦、变卦、纳甲、六亲、六神、世应、动爻、伏神、旬空与旺衰信息。
- **经典文本**：提供卦辞、爻辞与结构化卦象解析。
- **本地记录**：保存历史卦例，便于回看与比较。
- **多机型适配**：兼顾不同屏幕尺寸、安全区域与微信胶囊按钮位置。

## 技术实现

- Taro 4.2
- React 18.3
- TypeScript 5.9
- Sass
- lunar-typescript
- 微信小程序原生存储

## 项目结构

```text
.
├─ config/                 Taro 构建配置
├─ src/
│  ├─ assets/              品牌与铜钱视觉资源
│  ├─ components/          通用排盘组件
│  ├─ data/                八卦与六十四卦数据
│  ├─ pages/               首页与结果页
│  ├─ state/               本地运行时状态
│  ├─ styles/              全局对齐与响应式样式
│  └─ utils/               排盘算法与历法逻辑
├─ tests/                  算法与端到端测试
├─ package.json
└─ project.config.json
```

## 开始开发

### 环境要求

- Node.js 18 或更高版本
- npm
- 微信开发者工具

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev:weapp
```

在微信开发者工具中导入项目生成的 `dist` 目录。开发模式会持续监听源码变化并重新编译。

### 生产构建

```bash
npm run build:weapp
```

## 测试

运行源码算法测试：

```bash
npm test
```

执行生产构建并在微信开发者工具中跑完三种起卦流程：

```bash
npm run test:e2e
```

默认使用 Windows 标准安装位置的微信开发者工具；其他位置可通过 `WECHAT_CLI_PATH` 指定。

## 品牌

「一念观理」由 **一颗薏米 YIKEYIMI** 设计与开发。仓库中的品牌标识仅用于项目识别，其使用不代表商标权利的转让。

## License

源代码基于 [MIT License](LICENSE) 开放使用。

Copyright © 2026 YIKEYIMI
