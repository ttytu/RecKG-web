import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";


// Define the types for nodes and links
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
	source: string | Node;
	target: string | Node;
	value: number;
}

interface ForceGraphProps {
	data: {
		nodes: Node[];
		links: Link[];
	};
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data }) => {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const gRef = useRef<SVGGElement | null>(null);

	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [linkedSources, setLinkedSources] = useState<Node[]>([]);
	const [linkedTargets, setLinkedTargets] = useState<Node[]>([]);

	useEffect(() => {
		if (selectedNode) {
			const sources = data.links.filter((link) => link.source === selectedNode.id).map((link) => link.target as Node);
			const targets = data.links.filter((link) => link.target === selectedNode.id).map((link) => link.source as Node);

			setLinkedSources(sources);
			setLinkedTargets(targets);

			console.log(sources, targets);
		}
	}, [selectedNode]);

	useEffect(() => {
		const width = 800;
		const height = 800;

		const color = d3.scaleOrdinal(d3.schemeCategory10);

		// Copy data to avoid mutations
		const links = data.links.map((d) => ({ ...d }));
		const nodes = data.nodes.map((d) => ({ ...d }));

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3.forceLink(links)
					.id((d: any) => d.id)
					.distance((d: any) => 30)
			)
			.force("charge", d3.forceManyBody().strength(-25))
			// .force("collide", d3.forceCollide().radius(10).strength(0.5))
			// .force("center", d3.forceCenter().strength(1))
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		const svg = d3
			.select(svgRef.current)
			.attr("width", "100%")
			.attr("height", "100%")
			.attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
			.attr("style", "max-width: 100%; height: auto;");

		// Clear previous elements if re-rendered
		svg.selectAll("*").remove();

		const g = svg.append("g").attr("ref", gRef as any);

		const link = g
			.append("g")
			.attr("stroke", "#999")
			.attr("stroke-size", 1)
			.selectAll("line")
			.data(links)
			.join("line")

		const node = g
			.append("g")
			.selectAll("circle")
			.data(nodes)
			.join("circle")
			.attr("r", 5)
			.attr("fill", (d) => color(d.group.toString()))
			.on("mouseover", function (event, d) {
				d3.select(this).attr("r", 10).attr("stroke", "white").attr("stroke-width", 2);
				const text = g.append("text")
					.attr("x", d.x! + 10)
					.attr("y", d.y!)
					.attr("dy", ".35em")
					.attr("font-size", "12px")
					.attr("fill", "black")
					.attr("class", "hover-text")
					.text(d.title ?? d.id);

				const bbox = text.node()!.getBBox();

				g.insert("rect", "text")
					.attr("x", bbox.x - 2)
					.attr("y", bbox.y - 2)
					.attr("width", bbox.width + 4)
					.attr("height", bbox.height + 4)
					.attr("fill", "white")
					.attr("class", "hover-text-bg");

				setSelectedNode(d);
			})
			.on("mouseout", function (event, d) {
				d3.select(this).attr("r", 5).attr("stroke", "none");
				g.selectAll(".hover-text").remove();
				g.selectAll(".hover-text-bg").remove();
			});

		node.append("title").text((d) => d.id);

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

		// Update the position of links and nodes each time the simulation ticks.
		simulation.on("tick", () => {
			link
				.attr("x1", (d) => (d.source as Node).x ?? 0)
				.attr("y1", (d) => (d.source as Node).y ?? 0)
				.attr("x2", (d) => (d.target as Node).x ?? 0)
				.attr("y2", (d) => (d.target as Node).y ?? 0);
			node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
		});

		// Cleanup function to stop the simulation when the component unmounts
		return () => {
			simulation.stop();
		};
	}, [data]);

	return (
		<div className="w-full h-full flex gap-2">
			<div className="flex max-w-4xl bg-gradient-to-t from-zinc-900 to-zinc-800">
				<svg className="w-full h-full" ref={svgRef}>
					<g ref={gRef}></g>
				</svg>
			</div>
			<div className="grow">
				{selectedNode && (
					<div className="bg-zinc-800 p-4">
						<h2 className="text-xl font-semibold">{selectedNode.title ?? selectedNode.id}</h2>
						<p className="text-gray-300">{selectedNode.group}</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default ForceGraph;