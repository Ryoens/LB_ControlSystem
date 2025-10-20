import React, { useEffect, useRef } from 'react';
// @ts-ignore
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import adjacentListData from '../data/adjacentList.json';

type NetworkTopologyStatus = {
  // 将来的に props を追加
};

const TopologyStatus: React.FC<NetworkTopologyStatus> = () => {
  const cyRef = useRef<cytoscape.Core | null>(null);

  // adjacentList.jsonからCytoscapeのノードとエッジを生成
  const generateElements = () => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();
    const compoundSet = new Set<string>();

    // 各クラスタについて処理
    Object.entries(adjacentListData).forEach(([clusterId, clusterData]) => {
      // clusterIdから数字を抽出 (例: cluster0 -> 0)
      const clusterNum = clusterId.replace('cluster', '');
      
      // コンパウンドノード（クラスタの囲み）を追加
      const compoundId = `compound_${clusterId}`;
      if (!compoundSet.has(compoundId)) {
        nodes.push({
          data: {
            id: compoundId,
            label: `Cluster ${clusterNum}`,
            type: 'compound'
          }
        });
        compoundSet.add(compoundId);
      }

      // クラスタのLBノードを追加
      const lbId = `${clusterId}_lb`;
      if (!nodeSet.has(lbId)) {
        nodes.push({
          data: { 
            id: lbId, 
            label: `LB ${clusterNum}`,
            type: 'lb',
            clusterId: clusterId,
            parent: compoundId
          }
        });
        nodeSet.add(lbId);
      }

      // 内部のWebサーバノードを追加
      Object.entries(clusterData.internalList).forEach(([serverId, ip]) => {
        if (serverId !== 'cluster_lb') {
          const webId = `${clusterId}_${serverId}`;
          if (!nodeSet.has(webId)) {
            nodes.push({
              data: { 
                id: webId, 
                label: serverId,
                type: 'web',
                clusterId: clusterId,
                parent: compoundId
              }
            });
            nodeSet.add(webId);
            
            // LBとWebサーバ間のエッジを追加
            edges.push({
              data: { 
                id: `${lbId}-${webId}`, 
                source: lbId, 
                target: webId,
                edgeType: 'internal'
              }
            });
          }
        }
      });

      // 隣接クラスタへのエッジを追加
      Object.entries(clusterData.adjacentList).forEach(([adjClusterId, ip]) => {
        const adjLbId = `${adjClusterId}_lb`;
        const adjClusterNum = adjClusterId.replace('cluster', '');
        const adjCompoundId = `compound_${adjClusterId}`;
        
        // 隣接クラスタのコンパウンドノードとLBノードを追加（まだなければ）
        if (!compoundSet.has(adjCompoundId)) {
          nodes.push({
            data: {
              id: adjCompoundId,
              label: `Cluster ${adjClusterNum}`,
              type: 'compound'
            }
          });
          compoundSet.add(adjCompoundId);
        }
        
        if (!nodeSet.has(adjLbId)) {
          nodes.push({
            data: { 
              id: adjLbId, 
              label: `LB ${adjClusterNum}`,
              type: 'lb',
              clusterId: adjClusterId,
              parent: adjCompoundId
            }
          });
          nodeSet.add(adjLbId);
        }

        // クラスタ間のエッジを追加（重複を避けるため、IDの辞書順でチェック）
        const edgeId = clusterId < adjClusterId 
          ? `${lbId}-${adjLbId}` 
          : `${adjLbId}-${lbId}`;
        
        if (!edges.find(e => e.data.id === edgeId)) {
          edges.push({
            data: { 
              id: edgeId, 
              source: lbId, 
              target: adjLbId,
              label: ip,
              edgeType: 'cluster'
            }
          });
        }
      });
    });

    return [...nodes, ...edges];
  };

  const elements = generateElements();

  // 統計情報を計算する関数
  const getNetworkStats = () => {
    const clusterCount = Object.keys(adjacentListData).length;
    const lbCount = elements.filter(e => e.data.type === 'lb').length;
    const webServerCount = elements.filter(e => e.data.type === 'web').length;
    const lbLinkCount = elements.filter(e => e.data.edgeType === 'cluster').length;
    const avgWebServersPerLB = clusterCount > 0 ? (webServerCount / clusterCount).toFixed(1) : 0;

    return {
      clusterCount,
      lbCount,
      webServerCount,
      lbLinkCount,
      avgWebServersPerLB,
    };
  };

  const stats = getNetworkStats();

  // Cytoscapeのスタイル設定
  const stylesheet: any[] = [
    {
      selector: 'node[type="compound"]',
      style: {
        'background-color': '#f9fafb',
        'background-opacity': 0.3,
        'border-width': 2,
        'border-color': '#9ca3af',
        'border-style': 'dashed',
        'label': 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center',
        'font-size': 14,
        'font-weight': 'bold',
        'color': '#4b5563',
        'padding': 30,
        'text-margin-y': -10
      }
    },
    {
      selector: 'node[type="lb"]',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(label)',
        'color': '#1f2937',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 80,
        'height': 80,
        'font-size': 12,
        'text-outline-width': 3,
        'text-outline-color': '#ffffff',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node[type="web"]',
      style: {
        'background-color': '#10b981',
        'label': 'data(label)',
        'color': '#1f2937',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 50,
        'height': 50,
        'font-size': 10,
        'text-outline-width': 2,
        'text-outline-color': '#ffffff'
      }
    },
    {
      selector: 'edge[edgeType="cluster"]',
      style: {
        'width': 4,
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'curve-style': 'bezier',
        'opacity': 0.9,
        'z-index': 10
      }
    },
    {
      selector: 'edge[edgeType="internal"]',
      style: {
        'width': 2,
        'line-color': '#1f2937',
        'target-arrow-color': '#1f2937',
        'curve-style': 'straight',
        'opacity': 0.5,
        'z-index': 1
      }
    }
  ];

  // 手動でレイアウトを設定
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      
      // LBノードを円形に配置
      const lbNodes = cy.nodes('[type="lb"]');
      const lbCount = lbNodes.length;
      const lbRadius = 220; // LBを配置する円の半径
      const centerX = 400;
      const centerY = 350;
      
      lbNodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / lbCount;
        const lbX = centerX + lbRadius * Math.cos(angle);
        const lbY = centerY + lbRadius * Math.sin(angle);
        node.position({ x: lbX, y: lbY });
        
        // このLBに属するWebサーバをLBから外側（中心と反対方向）に配置
        const clusterId = node.data('clusterId');
        const webNodes = cy.nodes(`[clusterId="${clusterId}"][type="web"]`);
        const webDistanceFromLB = 100; // LBからWebサーバまでの距離
        
        webNodes.forEach((webNode, webIndex) => {
          // Webサーバの角度を計算
          // 中心と反対方向（外側）を基準として、左右に配置
          const baseAngle = angle; // 中心から外側への角度
          const spread = Math.PI / 3; // Webサーバの配置範囲（60度）
          const webAngleOffset = (spread * (webIndex - (webNodes.length - 1) / 2)) / (webNodes.length > 1 ? webNodes.length - 1 : 1);
          const webAngle = baseAngle + webAngleOffset;
          
          const webX = lbX + webDistanceFromLB * Math.cos(webAngle);
          const webY = lbY + webDistanceFromLB * Math.sin(webAngle);
          webNode.position({ x: webX, y: webY });
        });
      });
      
      cy.fit(undefined, 50);
    }
  }, [elements]);

  // レイアウト設定（初期配置用）
  const layout = {
    name: 'preset'
  };

  return (
    <div className="text-sm text-gray-500">
      <div className="mb-3">
        <p className="font-semibold text-gray-700">ネットワークトポロジ</p>
        <p className="text-xs text-gray-500 mt-1">adjacentList.jsonから生成されたネットワーク構成図</p>
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>LB</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Webサーバ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-red-500"></div>
            <span>LB間リンク</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gray-800"></div>
            <span>LB-Webリンク</span>
          </div>
        </div>
      </div>
      <div className="border rounded-lg bg-white" style={{ height: '700px' }}>
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
          stylesheet={stylesheet}
          layout={layout}
          cy={(cy) => {
            cyRef.current = cy;
          }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600 space-y-1">
        <p className="font-semibold">ネットワーク統計:</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p>クラスタ数: {stats.clusterCount}</p>
            <p>総Webサーバ数: {stats.webServerCount} （平均: {stats.avgWebServersPerLB}台）</p>
            <p>LB間リンク数: {stats.lbLinkCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopologyStatus;