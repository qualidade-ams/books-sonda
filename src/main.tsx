import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/environmentCheck'

createRoot(document.getElementById("root")!).render(<App />);
