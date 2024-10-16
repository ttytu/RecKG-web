import { useCallback } from 'react';
import {
	ReactFlow,
	MiniMap,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';


const initialNodes = [
	{ id: '1', position: { x: 0, y: 0 }, data: { label: '1' } },
	{ id: '2', position: { x: 0, y: 100 }, data: { label: '2' } },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function Flow() {
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

	return (
		<div className='w-full h-full'>
			<ReactFlow
				colorMode={prefersDark ? 'dark' : 'light'}
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
			>
				<MiniMap />
				<Controls />
				<Background style={{ backgroundColor: prefersDark ? '#09090b' : ''}} />
			</ReactFlow>
		</div>
	);
}

export default Flow;