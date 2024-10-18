import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import Graph from './pages/Graph'

import './App.css'


function App() {
	return (
		<Router>
			<div className={`max-w-7xl h-screen mx-auto p-4`}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/graph" element={<Graph />} />
				</Routes>
			</div>
		</Router>
	)
}

export default App
