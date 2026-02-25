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
  const wsRef = useRef<WebSocket | null>(null);

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

  return (
    <div className="space-y-4">
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
            {dockerStatus.containers.map((container) => {
              const stats = dockerStatus.stats.find(s => s.id === container.id);
              return (
                <tr key={container.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
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
                      <div className="flex items-center gap-2">
                        <div className="text-gray-900 font-medium">{stats.cpuPercent.toFixed(2)}%</div>
                      </div>
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
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        合計 {dockerStatus.containers.length} コンテナ（実行中: {dockerStatus.containers.filter(c => c.state === 'running').length}）
      </div>
    </div>
  );
};

export default DockerStatus;
