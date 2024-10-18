import React, { useEffect, useRef } from "react";
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

	useEffect(() => {
		const width = 928;
		const height = 680;

		const color = d3.scaleOrdinal(d3.schemeCategory10);

		// Copy data to avoid mutations
		const links = data.links.map((d) => ({ ...d }));
		const nodes = data.nodes.map((d) => ({ ...d }));

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3.forceLink(links).id((d: any) => d.id)
			)
			.force("charge", d3.forceManyBody())
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		const svg = d3
			.select(svgRef.current)
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [-width / 2, -height / 2, width, height])
			.attr("style", "max-width: 100%; height: auto;");

		// Clear previous elements if re-rendered
		svg.selectAll("*").remove();

		const g = svg.append("g").attr("ref", gRef as any);

		const link = g
			.append("g")
			.attr("stroke", "#999")
			.attr("stroke-opacity", 0.6)
			.selectAll("line")
			.data(links)
			.join("line")
			.attr("stroke-width", (d) => Math.sqrt(d.value));

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
		.scaleExtent([0.1, 10])
		.on("zoom", (event) => {
			g.attr("transform", event.transform);
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
	<svg className="w-full h-full" ref={svgRef}>
		<g ref={gRef}></g>
	</svg>
);
};

export default ForceGraph;