import React from 'react';
import { Link } from 'react-router-dom';


const NavBar: React.FC = () => {
	return (
		<nav className="z-50 sticky top-0 flex gap-4 p-4 items-center bg-layer1">
			<div className="font-black text-link">
				<Link to="/">RecKG</Link>
			</div>
			<div className="navbar-links flex gap-2 *:text-link text-sm">
				<Link to="/upload">Upload</Link>
				<Link to="/graph">Graph</Link>
			</div>
		</nav>
	);
};

export default NavBar;