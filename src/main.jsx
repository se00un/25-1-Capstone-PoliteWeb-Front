import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { migrateUserIdIfBroken } from "./lib/userId";

migrateUserIdIfBroken();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);