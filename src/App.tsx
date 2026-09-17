import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { replaceAll } from '@milkdown/utils'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

type Mode = 'focus' | 'split'
type Diagram = { language: string; source: string }
type LocalDocument = { path: string; name: string; content: string }
const starter = `# 欢迎来到 FreeMarkDwon

这是一个以 **Markdown 文件为唯一事实来源** 的个人写作空间。

默认是 Typora 式的所见即所得编辑：直接在文档中写作，标题、列表、引用和代码会即时呈现。

## 快捷操作

- \`Ctrl / Cmd + O\` 打开本地 Markdown
- \`Ctrl / Cmd + S\` 保存到原文件
- \`Ctrl / Cmd + Shift + S\` 另存为
- 右上角可以切换为源码 / 预览分屏

> 你的内容只保存在你选择的本地文件中。

\`inline code\` 和代码块也都支持：

\`\`\`ts
const mode = 'write beautifully'
\`\`\`
`

function documentHtml(content: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FreeMarkDwon export</title><style>body{max-width:780px;margin:60px auto;font:18px/1.75 Georgia,"Noto Serif SC",serif;color:#292825;padding:0 24px}h1,h2,h3{font-family:system-ui,sans-serif;line-height:1.25}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto}code{font-family:ui-monospace,Consolas,monospace}blockquote{border-left:3px solid #d2ccc0;padding-left:18px;color:#6d685e}img{max-width:100%}table{border-collapse:collapse}th,td{padding:6px 10px;border:1px solid #ddd}</style></head><body>${content}</body></html>`
}

function MermaidDiagram({ source, index }: { source: string; index: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    void import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'Inter, Microsoft YaHei, sans-serif' })
      try {
        const { svg } = await mermaid.render(`freemarkdwon-diagram-${index}-${Date.now()}`, source)
        if (!disposed && hostRef.current) hostRef.current.innerHTML = svg
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : '图表语法无效')
      }
    })
    return () => { disposed = true }
  }, [source, index])
  return <article className="diagram-card">
    <div className="diagram-heading"><span>MERMAID 图表</span><code>```mermaid</code></div>
    {error ? <pre className="diagram-error">无法渲染：{error}</pre> : <div className="diagram-svg" ref={hostRef} />}
  </article>
}

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Crepe | null>(null)
  const syncTimer = useRef<number | null>(null)
  const [markdown, setMarkdown] = useState(starter)
  const markdownRef = useRef(starter)
  const [mode, setMode] = useState<Mode>('focus')
  const [fileName, setFileName] = useState('未命名文档.md')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('已就绪')
  const diagrams = useMemo<Diagram[]>(() => [...markdown.matchAll(/```(mermaid|mmd)\s*\r?\n([\s\S]*?)```/gi)].map((match) => ({ language: match[1], source: match[2].trim() })), [markdown])

  const setDocument = useCallback((value: string) => {
    markdownRef.current = value
    setMarkdown(value)
    setDirty(false)
    if (editorRef.current) editorRef.current.editor.action(replaceAll(value))
  }, [])

  useEffect(() => {
    if (!hostRef.current) return
    const editor = new Crepe({ root: hostRef.current, defaultValue: markdownRef.current })
    editor.on((listener) => listener.markdownUpdated((_, value) => {
      markdownRef.current = value
      setMarkdown(value)
      setDirty(true)
      setStatus('未保存')
    }))
    editor.create().then(() => {
      editorRef.current = editor
      editor.editor.action(replaceAll(markdownRef.current))
    })
    return () => { editor.destroy(); editorRef.current = null }
  }, [])

  const open = useCallback(async () => {
    if (!window.freeMarkDwon) return setStatus('请使用桌面版打开本地文件')
    const file = await window.freeMarkDwon.open()
    if (!file) return
    setFileName(file.name); setDocument(file.content); setStatus('已打开')
  }, [setDocument])

  const loadDocument = useCallback((file: LocalDocument) => {
    setFileName(file.name)
    setDocument(file.content)
    setStatus('已打开源文件')
  }, [setDocument])

  useEffect(() => {
    if (!window.freeMarkDwon) return
    let active = true
    void window.freeMarkDwon.initial().then((file) => { if (active && file) loadDocument(file) })
    return window.freeMarkDwon.onOpened((file) => { if (active) loadDocument(file) })
  }, [loadDocument])
  const save = useCallback(async (as = false) => {
    if (!window.freeMarkDwon) return setStatus('浏览器演示模式：无法写入磁盘')
    const saved = await window.freeMarkDwon.save(markdownRef.current, as)
    if (saved) { setFileName(saved.name); setDirty(false); setStatus('已保存') }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); void open() }
      if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(event.shiftKey) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [open, save])

  const updateSource = (value: string) => {
    markdownRef.current = value; setMarkdown(value); setDirty(true); setStatus('未保存')
    if (syncTimer.current) window.clearTimeout(syncTimer.current)
    syncTimer.current = window.setTimeout(() => editorRef.current?.editor.action(replaceAll(value)), 350)
  }
  const toggleMode = () => setMode((current) => current === 'focus' ? 'split' : 'focus')
  const exportHtml = async () => {
    if (!window.freeMarkDwon) return setStatus('请在桌面版中导出 HTML')
    const rendered = hostRef.current?.querySelector('.ProseMirror')?.innerHTML
    const result = await window.freeMarkDwon.exportHtml(documentHtml(rendered || `<pre>${markdownRef.current}</pre>`))
    if (result) setStatus('HTML 已导出')
  }

  return <main className={`app ${mode}`}>
    <header className="topbar">
      <div className="brand"><span className="mark">F</span><span>FreeMarkDwon</span></div>
      <div className="doc-title">{dirty && <span className="dirty" />} {fileName}</div>
      <nav className="actions">
        <button onClick={() => void open()}>打开</button>
        <button onClick={() => void save(false)}>保存</button>
        <button onClick={() => void save(true)}>另存</button>
        <button onClick={() => void exportHtml()}>导出 HTML</button>
        <button className="mode-switch" onClick={toggleMode}>{mode === 'focus' ? '源码分屏' : '沉浸编辑'}</button>
      </nav>
    </header>
    {diagrams.length > 0 && <section className="diagram-dock" aria-label="Mermaid 图表预览">
      <div className="diagram-dock-title">图表预览 <span>{diagrams.length}</span><small>编辑 <code>```mermaid</code> 代码块后会自动更新</small></div>
      <div className="diagram-list">{diagrams.map((diagram, index) => <MermaidDiagram key={`${index}-${diagram.source}`} source={diagram.source} index={index} />)}</div>
    </section>}
    <section className="workspace">
      {mode === 'split' && <section className="source-pane"><div className="pane-label">MARKDOWN 源码</div><textarea value={markdown} onChange={(e) => updateSource(e.target.value)} spellCheck={false} /></section>}
      <section className="editor-pane"><div className="pane-label">{mode === 'split' ? '实时预览' : '所见即所得编辑'}</div><div className="editor-shell" ref={hostRef} /></section>
    </section>
    <footer><span>{status}</span><span>{markdown.length} 字符</span><span>{mode === 'focus' ? 'WYSIWYG' : '分屏模式'}</span></footer>
  </main>
}
