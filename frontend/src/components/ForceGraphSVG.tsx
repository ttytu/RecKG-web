import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";


interface Node {
	id: string;
	group: number;
	title?: string;
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
}

interface Link {
	source: string | Node;
	target: string | Node;
	type?: string;
	value?: number;
}

interface ForceGraphProps {
	data: {
		name?: string;
		nodes: Node[];
		links: Link[];
	};
}

const ForceGraphSVG: React.FC<ForceGraphProps> = ({ data }) => {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const gRef = useRef<SVGGElement | null>(null);

	const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

	const [selectedNode, setSelectedNode] = useState<Node | null>(null);

	const [linkDistance, setLinkDistance] = useState<number>(60);
	const [linkStrength, setLinkStrength] = useState<number>(0.5);
	const [chargeStrength, setChargeStrength] = useState<number>(-50);
	const [paramsHidden, setParamsHidden] = useState<boolean>(true);

	const color = d3.scaleOrdinal(d3.schemePiYG[9]);
	const links = data.links.map(d => ({ ...d }));
	const nodes = data.nodes.map(d => ({ ...d }));

	useEffect(() => {
		const width = 800;
		const height = 800;

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3.forceLink(links)
					.id((d: any) => d.id)
					.distance(linkDistance)
					.strength(linkStrength)
			)
			.force("charge", d3.forceManyBody().strength(chargeStrength))
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		simulationRef.current = simulation; // Store the simulation in the ref

		const svg = d3
			.select(svgRef.current)
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
			.attr("style", "max-width: 100%; height: auto;")
			.on("click", function () {
				// Reset node styles
				node.transition().duration(500)
					.attr("opacity", "100%")
					.attr("r", 5)
					.attr("stroke", null)
					.attr("stroke-width", null);

				// Reset link styles
				link.transition().duration(500)
					.attr("opacity", "100%");

				// Reset zoom
				svg.transition().duration(750).call(
					zoom.transform as any,
					d3.zoomIdentity
				);

				// Clear selected node
				setSelectedNode(null);

				// Remove labels
				svg.selectAll(".node-labels").remove();
				svg.selectAll(".link-labels").remove();
			});

		// Clear previous elements if re-rendered
		svg.selectAll("*").remove();

		const g = svg.append("g").attr("ref", gRef as any);

		const link = g
			.append("g")
			.attr("stroke", "#999")
			.attr("stroke-width", 1)
			.selectAll("line")
			.data(links)
			.join("line");

		const node = g
			.selectAll("circle")
			.data(nodes)
			.join("circle")
			.attr("r", 5)
			.attr("fill", (d) => color(d.group.toString()))
			.attr("cursor", "pointer")
			.on("mouseover", function (event, d) {
				d3.select(this).attr("r", 10).attr("stroke", "white").attr("stroke-width", 2);
			})
			.on("mouseout", function (event, d) {
				d3.select(this).attr("r", 5).attr("stroke", "none");
			})
			.on("click", function (event, d) {
				event.stopPropagation();
				svg.selectAll(".node-labels").remove();
				svg.selectAll(".link-labels").remove();
				simulation.stop();

				setSelectedNode(d);

				d3.select(this).attr("r", 10).attr("stroke", "white").attr("stroke-width", 2);

				const neighbors = links
					.filter(link => link.source === d || link.target === d)
					.map(link => (link.source === d ? (link.target as Node).id : (link.source as Node).id));
				neighbors.push(d.id);

				node
					.transition().duration(500)
					.attr("opacity", nodeData =>
						neighbors.includes(nodeData.id) ? "100%" : "20%"
					);

				const neighborsLinks = links
					.filter(link => link.source === d || link.target === d);

				link
					.transition().duration(500)
					.attr("opacity", linkData =>
						neighborsLinks.includes(linkData) ? "100%" : "20%"
					)

				// Center & zoom to selected node
				const [x, y] = [d.x, d.y];
				const k = 2;
				const transform = d3.zoomIdentity
					.scale(k)
					.translate(-(x ?? 0), -(y ?? 0));

				svg.transition().duration(750).call(
					zoom.transform as any,
					transform
				);

				const nodeLabels = g
					.append("g")
					.attr("class", "node-labels")
					.selectAll("text")
					.data(nodes.filter(node => neighbors.includes(node.id)))
					.join("text")
					.text((d) => d.title ?? d.id)
					.attr("dy", 12)
					.attr("fill", color(d.group.toString()))
					.attr("pointer-events", "none")
					.attr("text-anchor", "middle");

				const linkLabels = g
					.append("g")
					.attr("class", "link-labels")
					.selectAll("text")
					.data(links.filter(link => neighborsLinks.includes(link)))
					.join("text")
					.text((d) => `${d.type ?? ''}${d.value ? `: ${d.value}` : ''}`)
					.attr("dy", 3)
					.attr("pointer-events", "none")
					.attr("text-anchor", "middle");
			});

		node.append("title").text((d) => d.title ?? d.id);

		// Add drag behavior
		(node as d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>).call(
			d3
				.drag<SVGCircleElement, Node>()
				.on("start", (event, d) => {
					if (!event.active) simulation.alphaTarget(0.3).restart();
					d.fx = d.x;
					d.fy = d.y;
				})
				.on("drag", (event, d) => {
					d.fx = event.x;
					d.fy = event.y;
				})
				.on("end", (event, d) => {
					if (!event.active) simulation.alphaTarget(0);
					d.fx = null;
					d.fy = null;
				})
		);

		// Add zoom behavior
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 5])
			.on("zoom", (event) => {
				g.attr("transform", event.transform);
				g.transition().duration(100);
			});

		if (svgRef.current) {
			svg.call(zoom as any);
		}

		// Define arrow markers
		svg.append("defs").append("marker")
			.attr("id", "arrowhead")
			.attr("viewBox", "-0 -5 10 10")
			.attr("refX", 13)
			.attr("refY", 0)
			.attr("orient", "auto")
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("xoverflow", "visible")
			.append("svg:path")
			.attr("d", "M 0,-5 L 10 ,0 L 0,5")
			.attr("fill", "#999")
			.style("stroke", "none");

		// Update the position of links and nodes each time the simulation ticks.
		simulation.on("tick", () => {
			link
				.attr("x1", (d) => (d.source as Node).x ?? 0)
				.attr("y1", (d) => (d.source as Node).y ?? 0)
				.attr("x2", (d) => (d.target as Node).x ?? 0)
				.attr("y2", (d) => (d.target as Node).y ?? 0)
				.attr("marker-end", "url(#arrowhead)");

			node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

			svg.selectAll(".link-labels text")
				.attr("x", (d) => ((d.source as Node).x! + (d.target as Node).x!) / 2)
				.attr("y", (d) => ((d.source as Node).y! + (d.target as Node).y!) / 2);

			svg.selectAll(".node-labels text")
				.attr("x", (d) => d.x!)
				.attr("y", (d) => d.y!);
		});

		// Cleanup function to stop the simulation when the component unmounts
		return () => {
			simulation.stop();
		};
	}, [data]);

	useEffect(() => {
		if (simulationRef.current) {
			const simulation = simulationRef.current;
			simulation.force("link", d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(linkStrength));
			simulation.force("charge", d3.forceManyBody().strength(chargeStrength));
			simulation.alpha(1).restart();
		}
	}, [links, nodes, linkDistance, linkStrength, chargeStrength]);

	return (
		<div className="relative flex w-full h-full">
			<svg className="w-full h-full" ref={svgRef}>
				<g ref={gRef}></g>
			</svg>
			<div className={`absolute top-0 right-0 flex flex-col items-end`}>
				<button
					className="p-2 btn-transparent"
					onClick={() => setParamsHidden(!paramsHidden)}
				>
					<div className={`${paramsHidden ? "rotate-180" : ""} transition-transform`}>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
							<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
						</svg>
					</div>
				</button>
				{!paramsHidden && (
					<div className="flex flex-col gap-2 bg-black bg-opacity-30 backdrop-blur-md p-2">
						<div>
							<label className="text-gray-300">Link Distance</label>
							<input
								type="range"
								min="0"
								max="100"
								value={linkDistance}
								onChange={(e) => setLinkDistance(parseInt(e.target.value))}
							/>
						</div>

						<div>
							<label className="text-gray-300">Link Strength</label>
							<input
								type="range"
								min="0"
								max="1"
								step="0.1"
								value={linkStrength}
								onChange={(e) => setLinkStrength(parseFloat(e.target.value))}
							/>
						</div>

						<div>
							<label className="text-gray-300">Charge Strength</label>
							<input
								type="range"
								min="-100"
								max="0"
								value={chargeStrength}
								onChange={(e) => setChargeStrength(parseInt(e.target.value))}
							/>
						</div>
					</div>
				)}
			</div>
			<div className="absolute top-0 left-0 grow flex flex-col gap-2">
				{selectedNode && (
					<div className="p-4">
						<h2 className="text-xl font-semibold">{selectedNode.title ?? selectedNode.id}</h2>
						<p className="text-gray-300">{selectedNode.group}</p>
					</div>
				)}
				{!selectedNode && (
					<div className="p-4">
						<h2 className="text-xl font-semibold">{data.name}</h2>
						<p className="text-gray-300">Click a node to see details</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default ForceGraphSVG;