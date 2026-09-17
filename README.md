# FreeMarkDwon

一个本地优先的 Typora 风格 Markdown 桌面编辑器。默认采用**单栏所见即所得**编辑；可一键切至 VS Code 风格的 Markdown 源码 / 实时预览分屏。

<br />

test

hai

## 已实现

* 打开、保存、另存 `.md` / `.markdown` / `.mdx` / `.txt`
* 单栏 WYSIWYG Markdown 编辑（标题、列表、引用、表格、任务列表、代码、LaTex、图片等由 Milkdown/Crepe 提供）
* 源码与实时渲染分屏，输入后 350ms 同步
* 快捷键：`Ctrl/Cmd+O`、`Ctrl/Cmd+S`、`Ctrl/Cmd+Shift+S`
* 本地 HTML 导出、未保存状态提示
* 所有文件操作都经 Electron 的受限 preload API；渲染层没有 Node 权限

## 启动

```powershell
npm.cmd install
npm.cmd run dev
```

打包 Windows 安装程序：

```powershell
npm.cmd run package
```

## 架构

`Electron main` 仅处理文件选择、读取、写入和导出；`preload` 只暴露最小的 IPC 接口；React 界面使用 Milkdown Crepe 将 Markdown 同步到 ProseMirror 的所见即所得视图。Markdown 始终作为保存格式。
