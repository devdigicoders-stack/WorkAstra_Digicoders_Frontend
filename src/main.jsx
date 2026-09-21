import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { SecurityProvider } from './context/SecurityContext.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <NotificationProvider>
        <SecurityProvider>
          <App />
        </SecurityProvider>
      </NotificationProvider>
    </StoreProvider>
  </StrictMode>,
)
