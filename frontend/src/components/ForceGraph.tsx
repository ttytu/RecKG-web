import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Define the types for the data
interface Node {
	id: string;
	title?: string;
	group: number;
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
}

interface Link {
	source: string;
	target: string;
}

interface GraphData {
	nodes: Node[];
	links: Link[];
}

interface ForceGraphProps {
	data: GraphData;
}

const ForceDirectedGraph: React.FC<ForceGraphProps> = ({ data }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const [selectedNode, setSelectedNode] = useState<Node | null>(null);

	const [linkDistance, setLinkDistance] = useState<number>(50);
	const [linkStrength, setLinkStrength] = useState<number>(0.5);
	const [chargeStrength, setChargeStrength] = useState<number>(-50);
	const [paramsHidden, setParamsHidden] = useState<boolean>(true);

	// Create a ref to store the simulation instance
	const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

	const color = d3.scaleOrdinal(d3.schemePiYG[9]);
	const links = data.links.map(d => ({ ...d }));
	const nodes = data.nodes.map(d => ({ ...d }));

	useEffect(() => {
		if (!canvasRef.current) return;

		const { width, height } = canvasRef.current.getBoundingClientRect();
		const dpi = window.devicePixelRatio * 1.25 || 1.25;
		const context = canvasRef.current.getContext("2d");

		if (!context) return;

		canvasRef.current.width = dpi * width;
		canvasRef.current.height = dpi * height;
		canvasRef.current.style.width = `${width}px`;
		canvasRef.current.style.height = `${height}px`;

		context.scale(dpi, dpi);

		// Create the simulation only once, and store it in the ref
		const simulation = d3.forceSimulation(nodes)
			.force("link", d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(linkStrength))
			.force("charge", d3.forceManyBody().strength(chargeStrength))
			.force("x", d3.forceX(width / 2))
			.force("y", d3.forceY(height / 2))
			.on("tick", () => {
				context.clearRect(0, 0, width, height);

				context.save();
				(links as (Link & { source: Node; target: Node })[]).forEach(drawLink);
				context.restore();

				context.save();
				nodes.forEach(node => {
					context.beginPath();
					drawNode(node);
				});
				context.restore();
			});

		simulationRef.current = simulation; // Store the simulation in the ref

		function drawLink(d: Link & { source: Node; target: Node }) {
			if (!context) return;

			context.globalAlpha = 0.6;
			context.strokeStyle = "#999";
			context.beginPath();
			context.moveTo(d.source.x!, d.source.y!);
			context.lineTo(d.target.x!, d.target.y!);
			context.stroke();

			// Draw the arrowhead
			drawArrowhead(d.source, d.target);
		}

		function drawArrowhead(source: Node, target: Node) {
			if (!context) return;

			const arrowLength = 10; // Length of the arrowhead
			const arrowWidth = 5; // Width of the arrowhead

			const dx = target.x! - source.x!;
			const dy = target.y! - source.y!;
			const angle = Math.atan2(dy, dx);

			context.save();
			context.translate(target.x!, target.y!);
			context.rotate(angle);

			context.beginPath();
			context.moveTo(0, 0);
			context.lineTo(-arrowLength, arrowWidth / 2);
			context.lineTo(-arrowLength, -arrowWidth / 2);
			context.closePath();

			context.fillStyle = context.strokeStyle;
			context.fill();
			context.restore();
		}

		function drawNode(d: Node) {
			if (!context) return;
			context.moveTo(d.x! + 5, d.y!);
			context.arc(d.x!, d.y!, 5, 0, 2 * Math.PI);
			context.fillStyle = color(d.group.toString());
			context.fill();
		}

		// Drag handlers
		d3.select(canvasRef.current)
			.call(d3.drag<HTMLCanvasElement, unknown>()
				.subject(event => {
					const [px, py] = d3.pointer(event, canvasRef.current!);
					return d3.least(nodes, ({ x, y }) => {
						const dist2 = (x! - px) ** 2 + (y! - py) ** 2;
						return dist2 < 400 ? dist2 : undefined;
					});
				})
				.on("start", dragstarted)
				.on("drag", dragged)
				.on("end", dragended));

		function dragstarted(event: any) {
			if (!event.active) simulation.alphaTarget(0.2).restart();
			event.subject.fx = event.subject.x;
			event.subject.fy = event.subject.y;

			setSelectedNode(event.subject);
		}

		function dragged(event: any) {
			event.subject.fx = event.x;
			event.subject.fy = event.y;
		}

		function dragended(event: any) {
			if (!event.active) simulation.alphaTarget(0);
			event.subject.fx = null;
			event.subject.fy = null;
		}

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
		<div className="w-full h-full flex flex-col lg:flex-row gap-2">
			<div className="relative aspect-square bg-gradient-to-t from-zinc-900 to-zinc-800">
				<canvas className="w-full h-full" ref={canvasRef} />
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
							<h2 className="text-xl font-semibold">Node Details</h2>
							<p className="text-gray-300">Click a node to see details</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ForceDirectedGraph;
