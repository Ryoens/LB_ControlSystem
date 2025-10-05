import React from 'react';

type NetworkTopologyStatus = {
  // 将来的に props を追加
};

const TopologyStatus: React.FC<NetworkTopologyStatus> = () => {
  return (
    <div className="text-sm text-gray-500">
      {/* 実装は未完、ここに ネットワークトポロジの状態表示を実装予定 */}
      <p>表示されているネットワークモデル: [Complete Graph, Random Graph, BA Graph]</p>
    </div>
  );
}

export default TopologyStatus;