import ForceGraph from "../components/ForceGraph";
import { testNodes, testEdges } from "./data";


const generateRandomGraph = (numNodes: number, numLinks: number) => {
	const nodes = Array.from({ length: numNodes }, (_, i) => ({
		id: `Node ${i + 1}`,
		group: Math.floor(Math.random() * 2),
		title: `Node Title ${i + 1}`,
	}));

	const links = Array.from({ length: numLinks }, () => ({
		source: `Node ${Math.floor(Math.random() * numNodes / 10) + 1}`,
		target: `Node ${Math.floor(Math.random() * numNodes) + 1}`,
		value: Math.floor(Math.random() * 5) + 1,
	}));

	return { nodes, links };
};

const mapData = (nodes: any[], links: any[]) => {
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			group: node.type,
			title: node.label,
		})),
		links: links.map((link) => ({
			source: link.source,
			target: link.target,
			value: link.rating,
		})),
	};
}

const data = generateRandomGraph(200, 200);

const Graph = () => {
	return (
		<div className="w-full h-full flex gap-4 flex-col lg:flex-row">
			<div className="w-1/5">
				<h1 className="text-2xl font-bold">Graph on Canvas</h1>
				<p className="text-gray-500">Using D3</p>
			</div>
			<ForceGraph data={mapData(testNodes, testEdges)} />
		</div>
	);
};

export default Graph;
