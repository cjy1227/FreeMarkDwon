/// <reference types="vite/client" />
interface Window {
  freeMarkDwon?: {
    open: () => Promise<{ path: string; name: string; content: string } | null>
    initial: () => Promise<{ path: string; name: string; content: string } | null>
    save: (content: string, forceDialog?: boolean) => Promise<{ path: string; name: string } | null>
    exportHtml: (html: string) => Promise<string | null>
    onOpened: (callback: (file: { path: string; name: string; content: string }) => void) => () => void
  }
}
