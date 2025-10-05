import React from 'react';

type AdjacencyMatrixProps = {
  // 将来的に行列データなどを受け取る
};

const AdjacencyMatrix: React.FC<AdjacencyMatrixProps> = () => {
  return (
    <div className="overflow-auto">
      {/* 行列表示のスケルトン */}
      <div className="text-sm text-gray-500">
        <p><code>json/adjacentList.json</code>から隣接ノードを行列形式で表示.</p>
      </div>
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead>
          <tr>
            <th className="px-2 py-1">#</th>
            <th className="px-2 py-1">A</th>
            <th className="px-2 py-1">B</th>
            <th className="px-2 py-1">C</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1">A</td>
            <td className="px-2 py-1">0</td>
            <td className="px-2 py-1">1</td>
            <td className="px-2 py-1">0</td>
          </tr>
          <tr>
            <td className="px-2 py-1">B</td>
            <td className="px-2 py-1">1</td>
            <td className="px-2 py-1">0</td>
            <td className="px-2 py-1">1</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default AdjacencyMatrix;
