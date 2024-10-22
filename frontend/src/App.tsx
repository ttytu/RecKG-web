import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import Graph from './pages/Graph'

import './App.css'
import NavBar from './components/NavBar'


function App() {
	return (
		<Router>
			<NavBar />

			<div className={`h-[90vh] mx-auto p-4`}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/graph" element={<Graph />} />
				</Routes>
			</div>
		</Router>
	)
}

export default App
