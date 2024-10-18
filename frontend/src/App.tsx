import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import Flow from './pages/ReactFlow'

import './App.css'


function App() {
	return (
		<Router>
			<div className={`max-w-7xl h-screen mx-auto p-4`}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/flow" element={<Flow />} />
				</Routes>
			</div>
		</Router>
	)
}

export default App
