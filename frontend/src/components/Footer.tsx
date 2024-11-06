import React from 'react';
import { Link } from 'react-router-dom';


const Footer: React.FC = () => {
	return (
		<footer className="flex flex-col md:flex-row w-full gap-12 p-4 pt-24 pb-12 mt-24 bg-layer1">
			<div className="font-black text-5xl text-link">
				<Link to="/">RecKG Web</Link>
			</div>
			<div className='text-sm'>
				<div className="font-bold text-lg">Resources</div>
				<div className="flex flex-col gap-1 *:text-link">
					<Link to="/graph">Graph</Link>
					<Link to="/upload">Upload</Link>
				</div>
			</div>
			<div className='text-sm'>
				<div className="font-bold text-lg">Links</div>
				<div className="flex flex-col gap-1 *:text-link">
					<a href="https://github.com/tree-jhk/RecKG" target="_blank" rel="noopener noreferrer">
						Github tree-jhk/RecKG
					</a>
					<a href="https://github.com/ttytu/RecKG-web" target="_blank" rel="noopener noreferrer">
						Github ttytu/RecKG-web
					</a>
					<a href="https://kdd.inha.ac.kr" target="_blank" rel="noopener noreferrer">
						KDD Lab, INHA Univ.
					</a>
					<a href="https://d3js.org/d3-force" target="_blank" rel="noopener noreferrer">
						Powered by D3 Force
					</a>
				</div>
			</div>
		</footer>
	);
};

export default Footer;