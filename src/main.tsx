import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Only start the mock data provider when ?mock=true is in the URL.
// In normal mode, the OpenClawAdapter (started from App.tsx) handles events.
const isMockMode = new URLSearchParams(window.location.search).get('mock') === 'true'

if (isMockMode) {
  import('./mockProvider.js').then(({ startMockProvider }) => {
    startMockProvider()
    console.log('[Main] Mock provider started (URL param: ?mock=true)')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
