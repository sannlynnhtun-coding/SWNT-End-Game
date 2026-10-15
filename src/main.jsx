import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile.css'
import './theme.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    // Check on refresh and when a suspended mobile tab comes back online.
    const checkForUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        registration?.update().catch(() => { /* Offline play remains available. */ })
      }
    }
    checkForUpdate()
    window.addEventListener('online', checkForUpdate)
    document.addEventListener('visibilitychange', checkForUpdate)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
