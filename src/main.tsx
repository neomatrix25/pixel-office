import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startMockProvider } from './mockProvider.js'

// Start the mock data provider — simulates agent events for standalone testing.
// In production, this would be replaced by a WebSocket or REST backend connection.
startMockProvider()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
