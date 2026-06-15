import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/print.css'
import './utils/environmentCheck'

// Inicializar sistema de internacionalização (i18n)
import './i18n'

// Importar o job scheduler para garantir que seja inicializado
import './services/jobSchedulerService'

createRoot(document.getElementById("root")!).render(<App />);
