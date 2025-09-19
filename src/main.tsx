import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/environmentCheck'

// Importar o job scheduler para garantir que seja inicializado
import './services/jobSchedulerService'

createRoot(document.getElementById("root")!).render(<App />);
