import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/400-italic.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/open-sans/700-italic.css'
import './styles.css'
import './code-contrast.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
