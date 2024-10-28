import ForceGraphSVG from "../components/ForceGraphSVG";
import { testNodes, testEdges } from "./data";


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
			type: link.type,
			value: link.rating,
		})),
	};
}

const GraphSVG = () => {
	return (
		<div className="w-full h-full flex gap-4 flex-col lg:flex-row">
			<div className="lg:w-1/5">
				<h1 className="text-2xl font-bold">Knowledge Graph</h1>
				<p className="text-gray-500">Using D3</p>
			</div>
			<ForceGraphSVG data={mapData(testNodes, testEdges)} />
		</div>
	);
};

export default GraphSVG;
