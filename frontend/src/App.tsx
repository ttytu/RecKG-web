import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

import './App.css'\

import Home from './pages/Home'
import NavBar from './components/NavBar'
import GraphSVG from './pages/GraphSVG'
import Footer from './components/Footer'
import Upload from './pages/Upload'


function App() {
	return (
		<Router>
			<NavBar />

			<div className={`h-[90vh] mx-auto p-4`}>
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
