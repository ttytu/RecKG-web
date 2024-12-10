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
	const [base, setBase] = useState<string>("item");
	const [numUsers, setNumUsers] = useState<number>(5);
	const [numInteractions, setNumInteractions] = useState<number>(5);

	const handleDataSelection = (data: any) => {
		setSelectedDataId(data.id);
		setSelectedDataName(data.dataset_name);
		console.log('Selected data', data.id);
	};

	const createGraph = async () => {
		setLoading(true);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URI}/sample-data?id=${selectedDataId}&base=${base}&number_of_bases=${numUsers}&number_of_interactions=${numInteractions}`
			)
			const data = await response.json();
			console.log('Fetched graph data', data);

			const graph = mapData(data.sampled_node_data, data.sampled_edge_data, selectedDataName);
			setSampledGraph(graph);
			localStorage.setItem('graphData', JSON.stringify(graph));
		} catch (error) {
			console.error('Failed to fetch graph data', error);
		} finally {
			setLoading(false);
		}
	}

	const handleDelete = async (dataID: string) => {
		setLoading(true);

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URI}/delete-data/${dataID}`, {
				method: "DELETE",
				headers: {
					"accept": "application/json",
				},
			});

			if (response.ok) {
				alert("Files deleted successfully!");
			} else {
				alert("Failed to delete files.");
			}
		} catch (error) {
			console.error("Error deleting files:", error);
			alert("An error occurred while deleting files.");
		} finally {
			setLoading(false);
			fetchUploadedData();
		}
	}

	const handleDownload = async () => {
		setLoading(true);
		let dLink = "";

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URI}/download-json/${selectedDataId}`, {
				method: "GET",
				headers: {
					"accept": "application/json",
				},
			});

			console.log('Download response', response);
			dLink = response.url;
		} catch (error) {
			console.error("Error downloading files:", error);
			alert("An error occurred while downloading files.");
		} finally {
			setLoading(false);
			window.open(dLink, '_blank');
		}
	}

	return (
		<div className="w-full h-full flex gap-4 flex-col lg:flex-row">
			<div className="lg:w-[300px]">
				<div className="flex flex-col gap-4 justify-start sticky top-[72px]">
					<h1 className="">Knowledge Graph</h1>
					<p className="">Sample a subgraph of uploaded datasets.</p>

					<div className="flex flex-col gap-4 p-4 bg-layer2">
						<h3 className="">
							Select Dataset
						</h3>

						<div className="w-full flex flex-col gap-2">
							{uploadedData.filter(d => d.has_files === true).map((data, index) => (
								<div key={data.id} className="relative w-full">
									<button
										disabled={loading}
										onClick={() => handleDataSelection(data)}
										className={`w-full flex gap-2 p-2 ${selectedDataId === data.id ? 'btn-selected' : 'btn-primary '}`}
									>
										<p className="font-semibold">{index + 1}. </p>
										<div className="flex flex-col items-start">
											<p className="font-semibold">{data.dataset_name}</p>
											<p className="text-xs">
												{new Date(data.timestamp).toISOString().slice(0, 16).replace('T', ' ')}
											</p>
										</div>
									</button>
									<button
										disabled={loading}
										onClick={() => handleDelete(data.id)}
										className="btn-red absolute top-0 right-0 p-1"
									>
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
											<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							))}
						</div>

						<div className="w-full flex flex-col gap-2">
							<div className="w-full grid grid-cols-2 gap-2">
								<div className="w-full">
									<label className="" htmlFor="dataset-name">
										Number of Base Nodes
									</label>
									<input
										type="number"
										required
										value={numUsers}
										disabled={loading}
										onChange={(e) => setNumUsers(parseInt(e.target.value))}
										placeholder="User Count"
										className="bg-layer3 px-2 py-1 w-full"
									/>
								</div>
								<div className="w-full">
									<label className="" htmlFor="">
										UI Interactions
									</label>
									<input
										type="number"
										required
										value={numInteractions}
										disabled={loading}
										onChange={(e) => setNumInteractions(parseInt(e.target.value))}
										placeholder="Interaction Count"
										className="bg-layer3 px-2 py-1 w-full"
									/>
								</div>
							</div>

							<div className="w-full">
								<label className="" htmlFor="dataset-name">
									Base Node Type
								</label>
								<select
									value={base}
									onChange={(e) => setBase(e.target.value)}
									className="bg-layer3 px-2 py-1 w-full"
								>
									<option value="item">Item</option>
									<option value="user">User</option>
								</select>
							</div>

							<button
								className="btn-primary p-2"
								onClick={createGraph}
								disabled={selectedDataId === "" || loading}
							>
								{loading ? 'Sampling Graph...' : 'Sample Graph'}
							</button>

							<button
								className="btn-primary p-2"
								onClick={handleDownload}
								disabled={selectedDataId === "" || loading}
							>
								Download Full KG
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className={`grow h-[90vh] relative bg-layer2`}>
				{(!sampledGraph || loading) && (
					<div className="flex items-center justify-center bg-zinc-500 h-full w-full absolute top-0">
						{loading ? (
							<p className="text-2xl font-semibold text-zinc-500 animate-pulse">Loading...</p>
						) : (
							<p className="text-2xl font-semibold text-zinc-500">No Graph Data</p>
						)}
					</div>
				)}
				{sampledGraph &&
					<ForceGraphSVG data={sampledGraph} />
				}
			</div>
		</div>
	);
};

export default GraphSVG;
