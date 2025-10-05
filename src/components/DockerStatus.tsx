import React from 'react';

type DockerStatusProps = {
  // 将来的に props を追加
};

const DockerStatus: React.FC<DockerStatusProps> = () => {
  return (
    <div className="text-sm text-gray-500">
      {/* 実装は未完、ここに Docker コンテナの状態表示を実装予定 */}
      <p>Docker コンテナ状態（未実装）</p>
    </div>
  );
}

export default DockerStatus;
