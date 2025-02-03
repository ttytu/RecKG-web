import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'

import './App.css'

import Home from './pages/Home'
import NavBar from './components/NavBar'
import GraphSVG from './pages/GraphSVG'
import Footer from './components/Footer'
import Upload from './pages/Upload'

import { useUploadedData } from './contexts/UploadedData'

function App() {
	const { fetchUploadedData } = useUploadedData()

	useEffect(() => {
		fetchUploadedData()
	}, [])

	return (
			<Router>
				<NavBar />

				<div className={`mx-auto p-4 text-sm`}>
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/upload" element={<Upload />} />
						<Route path="/graph" element={<GraphSVG />} />
						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</div>

				<Footer />
			</Router>
	)
}

export default App
