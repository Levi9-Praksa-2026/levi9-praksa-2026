import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/index.css'
import '@/shared/styles/marketing.css'
import { WelcomePage } from '@/pages/welcome/WelcomePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WelcomePage />
  </StrictMode>,
)
