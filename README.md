# LittleApple Start Community Edition

> 新标签页，现在由你掌控。

[DEMO](https://start.nekro.top/) | [ENG](README_EN.md)

LittleApple Start Community Edition 是基于 [小苹果起始页](https://www.littleapple.top/startweb.html) 改进的浏览器起始页。你可以调整背景、主题和首页布局，配置与上传资源保存在当前浏览器中。

## 界面预览

![Lighthouse](image.png)

## 核心特性

### 外观配置

 * 个性化壁纸：支持图片与视频背景，提供填充、适应、拉伸、平铺及居中等多种布局方式。
 * 细节微调：可自定义壁纸焦点、遮罩透明度、模糊强度以及樱花飘落等特效。
 * 色彩提取与强调色：内置预设配色，能自动提取自定义图片的调性，也支持手动指定强调色。
 * 界面材质与主题：内置浅色/深色模式（支持跟随系统切换），提供 Simple（内容优先）、Material（色彩优先）及 Liquid Glass（环境优先，默认）三种主题。
 * 灵活布局：支持调整整体/模块比例、间距以及界面元素的位置构图。

Material 使用 M3-inspired 色彩角色和色调容器。Liquid Glass 在搜索等少量焦点组件上使用折射渲染，快捷链接和设置主体使用 CSS 材质。图标可选自动、Feather 或 Material Symbols；自动模式下，固定界面图标在 Material 中使用 Material Symbols，在 Simple 和 Liquid Glass 中使用 Feather。自定义 Top Action 使用其保存的图标提供者。

### 功能模块

 * 时钟与日期：支持多时区、12/24小时制、秒数显示及多种日期格式。
 * 搜索与翻译：管理搜索引擎，选择或自定义搜索建议接口及代理，按引擎开关联想词。外部翻译入口支持百度、Google、Bing 和自定义链接。
 * 快捷链接与操作：Quick Links 支持拖动排序、本地图标上传和自动获取网页声明的图标。没有可用图标时显示站名首字母，成功获取后缓存到本地。Top Actions 可设置链接及图标提供者。
 * 专注模式：一键隐藏首页模块，查看背景。
 * 一言与天气：默认使用 Hitokoto，失败时显示缓存或预设文字；天气使用 Open-Meteo，支持城市输入、浏览器定位、温度单位、显示项和刷新间隔。
 * 音乐播放：支持独立背景音频（本地存储）以及 APlayer 播放器（支持网络音频、封面及 LRC 歌词）。APlayer 可选使用实验性的 Meting 集成，按歌曲、播放列表、专辑、搜索或艺术家解析曲目。
 * 页脚设置：支持自定义版权文本及 ICP/公安备案信息显示。
 * 设置搜索：在设置顶栏搜索各分区的设置项。
 * 应用安装：支持 PWA 安装入口和断网提示页，安装方式取决于浏览器。

### 实验功能

 * 自定义鼠标指针：桌面端可上传图片，调整大小和热点位置；移动设备不可开启。
 * 背景声音：上传本地音频并控制播放，设置入口位于“实验”。
 * Model API：管理多个 OpenAI-compatible Chat Completions 连接，手动指定接口和模型，主动测试连接。
 * AI 翻译：选择模型后，在搜索候选框中主动翻译当前输入并复制译文。支持简体中文、繁体中文和英文目标语言，外部翻译入口仍可使用。

Model API 与 AI 翻译默认关闭，连接测试和翻译可能产生费用。API Key 仅保留在当前会话内存，刷新后需重新输入，导出文件不含密钥。浏览器将请求直接发送到所选接口，受该接口的 CORS 限制。远程接口需要 HTTPS，localhost/loopback 开发接口允许 HTTP。

## 技术栈

 * 框架与语言：Next.js 16 (App Router) / React 19 / TypeScript
 * 样式与 UI：Tailwind CSS 4 + CSS Variables / Feather Icons / 本地 Material Symbols SVG / liquid-glass
 * 交互与存储：dnd-kit / IndexedDB + LocalStorage / APlayer
 * 测试与规范：Vitest / ESLint

## 部署

项目无需服务端数据库。部署运行时环境变量可设置站点默认值与 favicon，用户配置和上传资源保存在浏览器中。

### 使用 Vercel 部署 (推荐)

1. 将仓库导入 [Vercel](https://vercel.com/)。
2. Framework Preset 选择 Next.js，或使用自动识别结果。
3. 保持默认构建配置；Vercel 会根据 `pnpm-lock.yaml` 自动使用 pnpm 安装依赖并运行 `pnpm build`。如需严格使用 `packageManager` 固定的 pnpm 10.32.0，请在项目环境变量中启用 `ENABLE_EXPERIMENTAL_COREPACK=1`。
4. 部署后打开分配的域名即可。

### 使用 Docker 手动部署

> 项目基于 Next.js standalone 生产镜像构建 (Node 24 Alpine)，在端口 3000 运行。

```bash
docker build -t littleapple-start .
docker run --rm -p 3000:3000 littleapple-start
```

> 运行后访问 `http://localhost:3000` 即可。

### 安装为应用（PWA）

在“设置 → 内容 → 应用安装”中点击“安装为应用”，然后在浏览器窗口中确认。按钮仅在浏览器提供安装事件后可用；其它情况可使用浏览器安装菜单，iPhone/iPad 可使用“分享 → 添加到主屏幕”。部署地址需要 HTTPS，localhost 可用于本地测试。

应用名称和安装图标使用 LittleApple Start 产品标识。站点 Logo 与浏览器 favicon 按站点配置显示。

生产环境的 Service Worker 缓存离线提示页和安装图标。断网导航时显示提示页，完整主页仍需要网络。页面 HTML、`/api/*`、构建资源和用户媒体不在这份缓存中。更新会清理旧 PWA 缓存，用户配置和网站图标缓存单独保存。开发模式不注册 Service Worker。

### 部署默认值（可选）

可在 Docker 环境变量或 Vercel Project Environment Variables 中设置以下公开默认值。同一份构建在重启服务后读取新的运行时环境变量。未设置或为空时使用内置值；站点名称、背景和页脚默认值用于首次初始化与重置，已有配置及导入的 `.littleapple` 配置优先。

```yaml
environment:
  LITTLEAPPLE_DEFAULT_SITE_NAME: "My Start"
  LITTLEAPPLE_DEFAULT_BACKGROUND_URL: "https://example.com/background.webp"
  LITTLEAPPLE_DEFAULT_FAVICON_URL: "https://example.com/favicon.png"
  LITTLEAPPLE_DEFAULT_ICP_ENABLED: "false"
  LITTLEAPPLE_DEFAULT_POLICE_ENABLED: "false"
  LITTLEAPPLE_DEFAULT_COPYRIGHT_ENABLED: "true"
  LITTLEAPPLE_DEFAULT_COPYRIGHT_TEXT: "© 2026 My Site"
```

支持的参数还包括：`LITTLEAPPLE_DEFAULT_ICP_TEXT`、`LITTLEAPPLE_DEFAULT_ICP_URL`、`LITTLEAPPLE_DEFAULT_POLICE_TEXT`、`LITTLEAPPLE_DEFAULT_POLICE_URL`。布尔值接受 `true`/`false` 和 `1`/`0`，非法值按未设置处理。这些参数会公开给浏览器，请勿填入密钥。

favicon 按“用户自定义 Logo、部署 favicon、内置 favicon”的顺序选择。部署 favicon 是运行时回退值，没有自定义 Logo 的用户重新加载后也会看到更新；About Logo 使用用户 Logo 或内置图标。

### 本地开发与调试

安装 [Node.js 24](https://nodejs.org/)，并确认终端可以运行 `node --version` 和 `npm --version`。项目使用 `package.json` 中固定的 pnpm 10.32.0。如果 `pnpm --version` 已输出 `10.32.0`，可跳过 pnpm 安装与 PATH 配置。

#### Windows（PowerShell）

将 pnpm 安装到当前用户目录，无需管理员权限：

```powershell
npm install --global pnpm@10.32.0 --prefix "$env:APPDATA\npm"
$env:Path = "$env:APPDATA\npm;$env:Path"
pnpm --version
```

第二行对当前终端生效。要让后续终端也能找到 pnpm，打开“编辑账户的环境变量”，在用户变量 `Path` 中新增 `%APPDATA%\npm`。已有此项时跳过，保留其它 PATH 条目。保存后重新打开终端；使用 VS Code 集成终端时需重启 VS Code。

若 PowerShell 提示禁止运行 `.ps1`，可以使用 `npm.cmd` 和 `pnpm.cmd`，例如 `pnpm.cmd install --frozen-lockfile`。无需为此放宽系统执行策略。

#### macOS / Linux（zsh、bash）

将 pnpm 安装到当前用户的 `~/.local`：

```bash
npm install --global pnpm@10.32.0 --prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"
pnpm --version
```

`export` 对当前终端生效。要持久保存，将下面一行添加到所用 shell 的配置文件：zsh 使用 `~/.zshrc`，bash 使用 `~/.bashrc`；macOS 的 bash 登录 shell 使用 `~/.bash_profile`。

```bash
export PATH="$HOME/.local/bin:$PATH"
```

保存后重新打开终端。上述安装命令使用用户目录，无需 `sudo`。命令目录规则可参阅 [npm 文档](https://docs.npmjs.com/cli/v11/configuring-npm/folders/)。

#### 安装项目依赖并启动

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://localhost:3000`。项目依赖由 `pnpm-lock.yaml` 锁定，使用 pnpm 安装。

### 构建与质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

## 设置项说明

设置顶栏提供跨分区搜索，侧栏含六个分类：

 * 外观：壁纸/背景视频、特效、主题、图标样式、色彩提取与自定义调色、布局和间距。
 * 链接：搜索引擎、联想词接口与代理、外部翻译入口、快捷链接和顶部操作。
 * 内容：站点名称与 Logo、时钟、日期、一言、天气、模块显示、页脚、语言、专注模式、PWA 安装及 APlayer。
 * 实验：Model API、AI 翻译、自定义鼠标指针和背景声音。
 * 数据：备份导入与导出（.littleapple）、重置设置、本地数据管理与旧版配置迁移。
 * 关于：版本信息（v5.1）、项目相关链接、开源协议与致谢。

## 数据与隐私

### 数据存储

 * 配置保存在 localStorage 的 `littleapple.config.v4` 中，产品版本 5.1 沿用该存储键。
 * 上传的壁纸、背景音频、Logo、鼠标指针和快捷链接图标保存在 IndexedDB 的 `LittleAppleStart` 数据库、`assets` 表中。自动获取的网站图标使用独立 Cache Storage 缓存。
 * `.littleapple` 备份包含当前配置和可导出的本地资源。超过 25 MiB 的壁纸、音频、Logo 或指针资源会被略过，并提示用户。模型连接元数据会导出，API Key 除外。
 * 配置与上传资源保存在当前浏览器；迁移设备或浏览器前请导出备份。清除站点数据会删除本地配置与资源，普通刷新和清理 HTTP 缓存与之不同。

### 外发网络请求

> 第三方服务的可用性和 CORS 由其自身决定。浏览器自动播放策略可能要求用户先与页面交互。

除本站页面、资源和部署默认值请求外，内置默认配置使用以下外部服务：

 * 校准网络时间（获取自 time.akamai.com，可在设置中切换为本机时间）。
 * 获取一言语句（请求自 v1.hitokoto.cn，失败时使用本地预设）。
 * 搜索联想词可自动跟随内置百度、Google、Bing；自添加引擎请手动选择来源。手动模式也支持 DuckDuckGo 和自定义 API。默认连接方式经 `api.allorigins.win` 转发，代理和建议服务都会收到搜索词；可关闭联想词、改为直连或配置其它代理。

其它功能按配置和操作发起请求：

 * 天气查询访问 Open-Meteo 的城市查询和预报服务。浏览器定位需要授权，坐标会用于 Open-Meteo 查询与 BigDataCloud 地名查询。
 * 自定义一言接口、搜索建议接口/代理、外部搜索及翻译链接。
 * APlayer 播放器获取音频、封面与歌词。
 * 用户配置的 Meting API 获取解析后的歌曲、封面与歌词。
 * 自动网站图标通过本站 `/api/site-icon` 获取，依次尝试网页声明、站点 `/favicon.ico`、Google S2（仅发送域名）。有效图片在浏览器缓存 30 天，失败后可重试或在编辑设置中刷新；最终无法获取时显示首字母。手动图标优先。手动获取网站标题通过 `/api/site-title` 访问目标页面。
 * 用户配置或部署默认值指定的远程壁纸、favicon 和图标 URL。
 * Model API 连接测试与 AI 翻译直接访问用户配置的接口。翻译发送当前输入及翻译指令，API Key 通过请求头发送；普通输入和打开设置不会自动发起模型请求。

## 版本说明

> LittleApple Start Community Edition 是基于小苹果起始页 4.8 二次开发的开源版本，已获得原作者（LittleApple Studio / 小苹果工作室）授权发布。

 * 本项目由社区独立维护，支持自行部署。预设资源和服务集成与原版有所差异。
 * 本项目的问题请向社区版本反馈，请勿提交给小苹果工作室。感谢小苹果工作室的授权与支持。

## 许可协议

LittleApple Start Community Edition 采用 MIT License，详见 [LICENSE](LICENSE)。

第三方组件致谢：

 * `@samasante/liquid-glass`：MIT
 * `@DIYgod/APlayer`：MIT
 * `@hitokoto-osc/hitokoto-api`：Apache-2.0
 * Material Symbols：Apache-2.0，使用本地 SVG 图形。
