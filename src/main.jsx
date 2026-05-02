import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import GlobalAlertBridge from './components/GlobalAlertBridge.jsx';

// Bootstrap CSS & JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle';

// Global WolfPack Styles
import './assets/css/global.css';
import './assets/css/componentes.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalAlertBridge />
    <App />
  </StrictMode>,
)
