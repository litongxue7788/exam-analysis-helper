import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // 全局基础样式放在最前
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
