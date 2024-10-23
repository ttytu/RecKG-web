import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import Graph from './pages/Graph'
import NavBar from './components/NavBar'
import GraphSVG from './pages/GraphSVG'

import './App.css'


function App() {
	return (
		<Router>
			<NavBar />

			<div className={`h-[90vh] mx-auto p-4`}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/graph" element={<Graph />} />
					<Route path="/graphSVG" element={<GraphSVG />} />
				</Routes>
			</div>
		</Router>
	)
}

export default App
