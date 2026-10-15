import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssBaseline />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
