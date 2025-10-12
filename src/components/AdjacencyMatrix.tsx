import React from 'react';
import adjacentData from '../data/adjacentList.json';

type AdjacencyMatrixProps = {};

const AdjacencyMatrix: React.FC<AdjacencyMatrixProps> = () => {
  const [nodes, setNodes] = React.useState<string[]>([]);
  const [adjacency, setAdjacency] = React.useState<Record<string, Set<string>>>({});

  React.useEffect(() => {
    try {
      const data = adjacentData as Record<string, any>;
      const ids = Object.keys(data)
        .map((k) => k.replace(/^cluster/, ''))
        .sort((a, b) => Number(a) - Number(b));

      const adj: Record<string, Set<string>> = {};
      for (const clusterName of Object.keys(data).sort()) {
        const cid = clusterName.replace(/^cluster/, '');
        adj[cid] = new Set<string>();
      }

      for (const clusterName of Object.keys(data).sort()) {
        const cid = clusterName.replace(/^cluster/, '');
        const entry = data[clusterName];
        if (!entry) continue;
        if (entry.adjacentList) {
          for (const adjCluster of Object.keys(entry.adjacentList)) {
            const adjId = adjCluster.replace(/^cluster/, '');
            adj[cid].add(adjId);
          }
        }
      }

      setNodes(ids);
      setAdjacency(adj);
    } catch (e) {
      console.error('AdjacencyMatrix: failed to parse adjacentData', e);
    }
  }, []);

  return (
    <div className="overflow-auto">
      <div className="mb-3 text-sm text-gray-600">adjacentList.json から隣接行列を表示</div>

      <div className="overflow-auto border rounded">
        <table className="table-auto text-sm border-collapse w-full">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-100 text-center">ID</th>
              {nodes.map((n) => (
                <th key={n} className="border px-2 py-1 bg-gray-100">{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((src) => (
              <tr key={src}>
                <td className="border px-2 py-1 font-medium text-center">{src}</td>
                {nodes.map((dst) => {
                  if (src === dst) return <td key={dst} className="border px-2 py-1 text-center">-</td>;
                  const isAdj = adjacency[src] && adjacency[src].has(dst);
                  const cell = isAdj ? <span className="text-green-600">O</span> : <span className="text-gray-400">.</span>;
                  return <td key={dst} className="border px-2 py-1 text-center">{cell}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        <div>- : 自身 | O : 隣接 | . : 非隣接</div>
      </div>
    </div>
  );
};

export default AdjacencyMatrix;
 