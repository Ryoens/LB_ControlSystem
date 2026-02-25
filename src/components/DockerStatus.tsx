import React, { useEffect, useState, useRef } from 'react';

interface PortMapping {
  privatePort: number;
  publicPort: number;
  type: string;
}

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: number;
  ports: PortMapping[];
  labels: Record<string, string>;
}

interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

interface DockerStatusMessage {
  containers: ContainerInfo[];
  stats: ContainerStats[];
  timestamp: string;
}

const DockerStatus: React.FC = () => {
  const [dockerStatus, setDockerStatus] = useState<DockerStatusMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLBs, setExpandedLBs] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const toggleLB = (lbId: string) => {
    setExpandedLBs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lbId)) {
        newSet.delete(lbId);
      } else {
        newSet.add(lbId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:4000/api/docker/ws');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data: DockerStatusMessage = JSON.parse(event.data);
          setDockerStatus(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket接続エラー');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // 5秒後に再接続
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStateColor = (state: string): string => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'text-green-600 bg-green-50';
      case 'exited':
        return 'text-red-600 bg-red-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4 bg-red-50 rounded">
        <p>エラー: {error}</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500 p-4">
        <p>WebSocketに接続中...</p>
      </div>
    );
  }

  if (!dockerStatus || dockerStatus.containers.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4">
        <p>コンテナが見つかりません</p>
      </div>
    );
  }

  // コンテナをフィルタリング（web, LB, redis-serverのみ）
  const filteredContainers = dockerStatus.containers.filter(c => 
    c.name.toLowerCase().includes('web') || 
    c.name.toLowerCase().includes('lb') || 
    c.name.toLowerCase().includes('redis-server')
  );

  // LBコンテナとWebコンテナを分類
  const lbContainers = filteredContainers.filter(c => 
    c.name.toLowerCase().includes('lb') && !c.name.toLowerCase().includes('web')
  );
  const webContainers = filteredContainers.filter(c => 
    c.name.toLowerCase().includes('web')
  );
  const redisContainers = filteredContainers.filter(c => 
    c.name.toLowerCase().includes('redis-server')
  );

  const renderContainerRow = (container: ContainerInfo, isNested: boolean = false) => {
    const stats = dockerStatus.stats.find(s => s.id === container.id);
    return (
      <tr key={container.id} className={`hover:bg-gray-50 ${isNested ? 'bg-blue-50' : ''}`}>
        <td className={`px-4 py-3 ${isNested ? 'pl-12' : ''}`}>
          <div className="font-medium text-gray-900">{container.name}</div>
          <div className="text-xs text-gray-500">{container.id}</div>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(container.state)}`}>
            {container.state}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={container.image}>
          {container.image}
        </td>
        <td className="px-4 py-3">
          {stats ? (
            <div className="text-gray-900 font-medium">{stats.cpuPercent.toFixed(2)}%</div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {stats ? (
            <div>
              <div className="text-gray-900 font-medium">{stats.memoryPercent.toFixed(2)}%</div>
              <div className="text-xs text-gray-500">
                {formatBytes(stats.memoryUsage)} / {formatBytes(stats.memoryLimit)}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {stats ? (
            <div className="text-xs">
              <div className="text-gray-600">↓ {formatBytes(stats.networkRx)}</div>
              <div className="text-gray-600">↑ {formatBytes(stats.networkTx)}</div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'リアルタイム更新中' : '接続切断'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          最終更新: {dockerStatus.timestamp ? new Date(dockerStatus.timestamp).toLocaleTimeString('ja-JP') : '-'}
        </span>
      </div>

      {/* Prototype Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-100 px-4 py-2 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Prototype</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">イメージ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">メモリ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ネットワーク</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lbContainers.map((lbContainer) => {
                const isExpanded = expandedLBs.has(lbContainer.id);
                // LBに関連するWebコンテナを取得（名前の一部が一致する場合）
                const relatedWebs = webContainers.filter(web => {
                  // LB名からLBプレフィックスを除去して、Webコンテナ名と照合
                  const lbBaseName = lbContainer.name.replace(/lb/i, '');
                  return web.name.toLowerCase().includes(lbBaseName.toLowerCase());
                });

                return (
                  <React.Fragment key={lbContainer.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleLB(lbContainer.id)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div>
                            <div className="font-medium text-gray-900">{lbContainer.name}</div>
                            <div className="text-xs text-gray-500">{lbContainer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(lbContainer.state)}`}>
                          {lbContainer.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={lbContainer.image}>
                        {lbContainer.image}
                      </td>
                      <td className="px-4 py-3">
                        {dockerStatus.stats.find(s => s.id === lbContainer.id) ? (
                          <div className="text-gray-900 font-medium">
                            {dockerStatus.stats.find(s => s.id === lbContainer.id)!.cpuPercent.toFixed(2)}%
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {dockerStatus.stats.find(s => s.id === lbContainer.id) ? (
                          <div>
                            <div className="text-gray-900 font-medium">
                              {dockerStatus.stats.find(s => s.id === lbContainer.id)!.memoryPercent.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatBytes(dockerStatus.stats.find(s => s.id === lbContainer.id)!.memoryUsage)} / {formatBytes(dockerStatus.stats.find(s => s.id === lbContainer.id)!.memoryLimit)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {dockerStatus.stats.find(s => s.id === lbContainer.id) ? (
                          <div className="text-xs">
                            <div className="text-gray-600">↓ {formatBytes(dockerStatus.stats.find(s => s.id === lbContainer.id)!.networkRx)}</div>
                            <div className="text-gray-600">↑ {formatBytes(dockerStatus.stats.find(s => s.id === lbContainer.id)!.networkTx)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && relatedWebs.map(web => renderContainerRow(web, true))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployment Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-green-100 px-4 py-2 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Deployment</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">イメージ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">メモリ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ネットワーク</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {redisContainers.map(container => renderContainerRow(container))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        合計 {filteredContainers.length} コンテナ（実行中: {filteredContainers.filter(c => c.state === 'running').length}）
      </div>
    </div>
  );
};

export default DockerStatus;
