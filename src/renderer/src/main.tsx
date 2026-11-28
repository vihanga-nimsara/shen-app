import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/geist'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/ubuntu/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import App from './App'
import './tailwind.css'
import './index.css'
// Numerals last: these @font-face rules must win over the theme fonts above.
import './numeric-font.css'

const storedFont = localStorage.getItem('shen-font')
if (storedFont && storedFont !== 'native') {
  document.documentElement.dataset.font = storedFont
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
