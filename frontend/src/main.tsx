import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { UploadedDataProvider } from './contexts/UploadedData.tsx'
import App from './App.tsx'
import './index.css'


createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<UploadedDataProvider>
			<App />
		</UploadedDataProvider>
	</StrictMode>,
)
