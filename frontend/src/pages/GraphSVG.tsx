import React, { useEffect, useState } from "react";
import ForceGraphSVG from "../components/ForceGraphSVG";
import { useUploadedData } from "../contexts/UploadedData";
import { create, local, map } from "d3";

interface Node {
	id: string;
	group: number;
	title: string;
}

interface Edge {
	source: string;
	target: string;
	type: string;
	value: number;
}

interface Graph {
	name?: string;
	nodes: Node[];
	links: Edge[];
}

const mapData = (nodes: any[], links: any[], name?: string) => {
	return {
		name: name,
		nodes: nodes.map((node) => ({
			id: node.id,
			group: node.type,
			title: node.data ? node.data.item_name ? node.data.item_name : node.id : node.id,
		})),
		links: links.map((link) => ({
			source: link.source.data,
			target: link.target.data,
			type: link.type ? link.type : "interacts",
			value: link.data.rating ? link.data.rating : null,
		})),
	};
}

const GraphSVG = () => {
	const { uploadedData, fetchUploadedData } = useUploadedData();
	const [loading, setLoading] = useState<boolean>(false);
	const [sampledGraph, setSampledGraph] = useState<Graph>(localStorage.getItem('graphData') ? JSON.parse(localStorage.getItem('graphData') as string) : null);
	const [selectedDataId, setSelectedDataId] = useState<string>("");
	const [selectedDataName, setSelectedDataName] = useState<string>("");

	const handleDataSelection = (data: any) => {
		setSelectedDataId(data.id);
		setSelectedDataName(data.dataset_name);
		console.log('Selected data', data);
	};

	const createGraph = async () => {
		setLoading(true);

		try {
			const response = await fetch(`http://165.246.21.166/api/sample_data?id=${selectedDataId}&number_of_users=5&number_of_user2item_interaction=5`)
			const data = await response.json();
			console.log('Fetched graph data', data);

			const graph =  mapData(data.sampled_node_data, data.sampled_edge_data, selectedDataName);
			setSampledGraph(graph);
			localStorage.setItem('graphData', JSON.stringify(graph));
		} catch (error) {
			console.error('Failed to fetch graph data', error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="w-full h-full flex gap-4 flex-col lg:flex-row">
			<div className="lg:w-[300px] flex flex-col gap-4 justify-start">
				<h1 className="text-2xl font-bold">Knowledge Graph</h1>
				<p className="text-zinc-500">Using D3</p>

				<div className="flex flex-col gap-4 p-4 bg-zinc-800">
					<h3 className="text-lg font-bold">
						Select Dataset
					</h3>
					<div className="w-full flex flex-col gap-2">
						{uploadedData.filter(d => d.has_files === true).map((data, index) => (
							<button
								key={data.id}
								onClick={() => handleDataSelection(data)}
								className={`text-sm flex flex-col p-2 bg-zinc-700 ${(selectedDataId === data.id) ? 'bg-zinc-600' : ''}`}
							>
								<p className="font-semibold">{index + 1}. {data.dataset_name}</p>
								<p className="text-xs text-zinc-500">
									{new Date(data.timestamp).toISOString().slice(0, 16).replace('T', ' ')}
								</p>
							</button>
						))}
					</div>
					<button
						className="btn-primary p-2"
						onClick={createGraph}
					>
						{loading ? 'Loading...' : 'Sample Graph'}
					</button>
				</div>
			</div>
			<div className="grow h-[90vh] bg-gradient-to-t from-zinc-900 to-zinc-800">
				{sampledGraph &&
					<ForceGraphSVG data={sampledGraph} />
				}
			</div>
		</div>
	);
};

export default GraphSVG;
