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

// Message types
interface InitMessage {
	type: "init";
	data: {
		nodes: Node[];
		links: Link[];
	};
}

interface TickMessage {
	type: "tick";
	nodes: Node[];
	links: Link[];
}

interface StopMessage {
	type: "stop";
}

type Message = InitMessage | StopMessage;

// Initialize simulation variables
let simulation: d3.Simulation<Node, Link> | null = null;

// Handle incoming messages
self.onmessage = (event: MessageEvent<Message>) => {
	const message = event.data;

	if (message.type === "init") {
		const { nodes, links } = message.data;

		// Initialize the simulation
		simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3
					.forceLink(links)
					.id((d: any) => d.id)
					.distance((d: any) => 30 / d.value)
			)
			.force("charge", d3.forceManyBody().strength(-25))
			.force("collide", d3.forceCollide().radius(10).strength(0.5))
			.force("center", d3.forceCenter(0, 0))
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		simulation.on("tick", () => {
			if (simulation) {
				// Post the updated node positions to the main thread
				const updatedNodes = simulation.nodes();
				const updatedLinks = (simulation.force("link") as d3.ForceLink<Node, Link>).links();

				self.postMessage({
					type: "tick",
					nodes: updatedNodes,
					links: updatedLinks,
				} as TickMessage);
			}
		});
	} else if (message.type === "stop") {
		// Stop the simulation
		if (simulation) {
			simulation.stop();
			simulation = null;
		}
	}
};
