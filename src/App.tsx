import React from 'react';
import './App.css';
import DockerStatus from './components/DockerStatus';
import AdjacencyMatrix from './components/AdjacencyMatrix';
import ParamsSettings from './components/ParamsSettings';
import TopologyStatus from './components/TopologyStatus';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold">Load Balancing Visualization System Dashboard</h1>
        <p className="text-sm text-gray-600">負荷分散状態の可視化および実験の自動化</p>
        <p className="text-sm text-gray-600">コンポーネント分割のみ実装, 表示ロジックは未実装</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Dockerコンテナ状態</h2>
          <DockerStatus />
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">ネットワークトポロジ接続</h2>
          <TopologyStatus />
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">隣接クラスタ情報（行列形式）</h2>
          <AdjacencyMatrix />
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">各種パラメータ設定</h2>
          <ParamsSettings />
        </section>
      </main>
    </div>
  );
}

export default App;
