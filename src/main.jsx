import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import App from './App.jsx'
import './index.css'
import { installAudioUnlock } from './lib/chime.js'

// Arm the new-order bell on the user's first interaction anywhere (e.g. typing
// the PIN) so the sound then fires automatically — no separate "enable" tap.
installAudioUnlock()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
