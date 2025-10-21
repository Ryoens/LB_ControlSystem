import React from 'react';
import adjacentList from '../data/adjacentList.json';

type ParamsSettingsProps = {
  // 将来的に設定値やコールバックを受け取る
};

type ParamRow = {
  key: string;
  name: string;
  type: string;
  example: string;
  methods?: ('N-co' | 'LC' | 'DC')[]; // このパラメータが表示される方式
  tooltip?: string; // インフォメーションアイコンに表示する詳細説明
  // インフォメーションアイコンの表示位置はもう少し考える
};

const rows: ParamRow[] = [
  {
    key: 'feedback',
    name: 'フィードバック情報取得間隔',
    type: 'int',
    example: '100',
    methods: ['DC', 'LC'],
    tooltip: '隣接ノードからms間隔でセッション数を受信する間隔',
  },
  {
    key: 'threshold',
    name: '閾値（N-co）',
    type: 'float',
    example: '0.5',
    methods: ['N-co'],
    tooltip: '自LBの負荷率がこの閾値を超えた場合に隣接LBへ転送を開始',
  },
  {
    key: 'kappa',
    name: '拡散係数（DC）',
    type: 'float',
    example: '0.1',
    methods: ['DC'],
    tooltip: '拡散係数: 大きいほど多くのセッションを隣接LBへ転送',
  },
  {
    key: 'vus',
    name: '同時接続数',
    type: 'int',
    example: '100',
    tooltip: 'フラッシュクラウド対象LBに設定する同時接続数, それ以外は1/10とする',
  },
  {
    key: 'attempt',
    name: '試行回数',
    type: 'int',
    example: '5',
    tooltip: '実験回数',
  },

  {
    key: 'delay',
    name: '伝搬遅延',
    type: 'int',
    example: '10',
    tooltip: '設定方法: 全クラスタで共通(固定, ランダム), 一部クラスタのみ(単一, 複数)',
    // 全クラスタ/一部クラスタのみを選択したのち, 分岐
  },
];

const ParamsSettings: React.FC<ParamsSettingsProps> = () => {
  const [saved, setSaved] = React.useState(false);
  const [method, setMethod] = React.useState<'N-co' | 'LC' | 'DC'>('DC');
  const [nwModel, setNwModel] = React.useState<'f' | 'r' | 'ba'>('f');
  const [savedData, setSavedData] = React.useState<Record<string, string> | null>(null);
  
  // adjacentList.jsonからクラスタIDを動的に取得
  const clusterIds = React.useMemo(() => Object.keys(adjacentList), []);
  
  // Webサーバ数の対称/非対称選択
  const [webServerSymmetry, setWebServerSymmetry] = React.useState<'symmetric' | 'asymmetric'>('symmetric');
  const [symmetricWebCount, setSymmetricWebCount] = React.useState('3');
  const [asymmetricWebCounts, setAsymmetricWebCounts] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    clusterIds.forEach(clusterId => {
      initial[clusterId] = '3';
    });
    return initial;
  });
  
  // 各パラメータの入力値を管理
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    rows.forEach(r => {
      initial[r.key] = r.example;
    });
    return initial;
  });

  const handleInputChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAsymmetricWebCountChange = (clusterId: string, value: string) => {
    setAsymmetricWebCounts(prev => ({ ...prev, [clusterId]: value }));
  };

  const handleSave = () => {
    const webServerConfig = webServerSymmetry === 'symmetric' 
      ? { symmetry: 'symmetric', count: symmetricWebCount }
      : { symmetry: 'asymmetric', counts: asymmetricWebCounts };
    
    console.log('保存クリック', { method, nw_model: nwModel, webServerConfig, ...values });
    setSavedData({ method, nw_model: nwModel, webServerConfig: JSON.stringify(webServerConfig), ...values });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDryRun = () => {
    console.log('仮の実行クリック');
  };

  return (
    <div className="space-y-3 text-sm text-gray-600">
      <p>設定パラメータは以下</p>
      
      {/* 方式の選択 */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="block font-medium text-gray-700 mb-2">負荷分散方式</label>
        <div className="flex space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="method"
              value="N-co"
              checked={method === 'N-co'}
              onChange={(e) => setMethod(e.target.value as 'N-co')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">N-co</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="method"
              value="LC"
              checked={method === 'LC'}
              onChange={(e) => setMethod(e.target.value as 'LC')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">LC</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="method"
              value="DC"
              checked={method === 'DC'}
              onChange={(e) => setMethod(e.target.value as 'DC')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">DC</span>
          </label>
          {/* インフォメーションアイコン */}
        <div className="relative group ml-auto">
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-help text-xs font-bold">
            i
          </div>
          {/* ホバー時の注釈 */}
          <div className="absolute right-0 top-8 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <p className="font-semibold mb-1">負荷分散方式について</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>N-co: ラウンドロビン方式</li>
              <li>LC: 最小接続方式</li>
              <li>DC: 拡散係数ベース方式</li>
            </ul>
            <div className="absolute top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
          </div>
        </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">選択中: {method}</p>
      </div>

      {/* ネットワークモデルの選択 */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="block font-medium text-gray-700 mb-2">ネットワークモデル</label>
        <div className="flex space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="nw_model"
              value="f"
              checked={nwModel === 'f'}
              onChange={(e) => setNwModel(e.target.value as 'f')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Full Mesh</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="nw_model"
              value="r"
              checked={nwModel === 'r'}
              onChange={(e) => setNwModel(e.target.value as 'r')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Random</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="nw_model"
              value="ba"
              checked={nwModel === 'ba'}
              onChange={(e) => setNwModel(e.target.value as 'ba')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Barabási-Albert</span>
          </label>
          {/* インフォメーションアイコン */}
          <div className="relative group ml-auto">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-help text-xs font-bold">
              i
            </div>
            {/* ホバー時の注釈 */}
            <div className="absolute right-0 top-8 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <p className="font-semibold mb-1">ネットワークモデルについて</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Full Mesh: 全ノードが相互接続</li>
                <li>Random: ランダムに接続</li>
                <li>Barabási-Albert: スケールフリー</li>
              </ul>
              <div className="absolute -top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">選択中: {nwModel}</p>
      </div>

      {/* Webサーバ数の設定 */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="block font-medium text-gray-700 mb-2">Webサーバ数</label>
        <div className="flex space-x-6 mb-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="webServerSymmetry"
              value="symmetric"
              checked={webServerSymmetry === 'symmetric'}
              onChange={(e) => setWebServerSymmetry(e.target.value as 'symmetric')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">対称</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="webServerSymmetry"
              value="asymmetric"
              checked={webServerSymmetry === 'asymmetric'}
              onChange={(e) => setWebServerSymmetry(e.target.value as 'asymmetric')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">非対称</span>
          </label>
          {/* インフォメーションアイコン */}
          <div className="relative group ml-auto">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-help text-xs font-bold">
              i
            </div>
            {/* ホバー時の注釈 */}
            <div className="absolute right-0 top-8 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <p className="font-semibold mb-1">Webサーバ数設定について</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>対称: 全クラスタで同じWebサーバ数</li>
                <li>非対称: クラスタごとに異なるWebサーバ数を設定</li>
              </ul>
              <div className="absolute -top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
            </div>
          </div>
        </div>

        {/* 対称の場合: 1つの入力フィールド */}
        {webServerSymmetry === 'symmetric' && (
          <div className="mt-3">
            <label className="block text-sm text-gray-700 mb-1">全クラスタのWebサーバ数</label>
            <input
              type="number"
              value={symmetricWebCount}
              onChange={(e) => setSymmetricWebCount(e.target.value)}
              min="1"
              step="1"
              className="border rounded px-3 py-2 w-32"
            />
          </div>
        )}

        {/* 非対称の場合: クラスタごとの入力フィールド */}
        {webServerSymmetry === 'asymmetric' && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-700 mb-2">各クラスタのWebサーバ数</p>
            {clusterIds.map((clusterId) => (
              <div key={clusterId} className="flex items-center space-x-3">
                <label className="text-sm text-gray-700 w-24">{clusterId}:</label>
                <input
                  type="number"
                  value={asymmetricWebCounts[clusterId] || '3'}
                  onChange={(e) => handleAsymmetricWebCountChange(clusterId, e.target.value)}
                  min="1"
                  step="1"
                  className="border rounded px-3 py-2 w-24"
                />
                <span className="text-xs text-gray-500">台</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">型</th>
              <th className="px-3 py-2 text-left">設定例</th>
              <th className="px-3 py-2 text-left">入力</th>
              <th className="px-2 py-2 text-center w-16">説明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows
              .filter((r) => !r.methods || r.methods.includes(method))
              .map((r) => {
                const inputType = r.type === 'int' || r.type === 'float' ? 'number' : 'text';
                const step = r.type === 'float' ? '0.01' : r.type === 'int' ? '1' : undefined;
                return (
                  <tr key={r.key}>
                    <td className="px-3 py-2 align-top text-gray-800">{r.name}</td>
                    <td className="px-3 py-2 align-top text-gray-600"><code className="bg-gray-100 px-1 rounded">{r.type}</code></td>
                    <td className="px-3 py-2 align-top text-gray-600"><code className="bg-gray-100 px-1 rounded">{r.example}</code></td>
                    <td className="px-3 py-2 align-top">
                      <input
                        aria-label={`input-${r.key}`}
                        value={values[r.key]}
                        onChange={(e) => handleInputChange(r.key, e.target.value)}
                        type={inputType}
                        step={step}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      {r.tooltip && (
                        <div className="relative group inline-block">
                          <div className="w-5 h-5 rounded-full bg-gray-400 hover:bg-blue-500 text-white flex items-center justify-center cursor-help text-xs font-bold transition-colors">
                            i
                          </div>
                          <div className="absolute right-0 top-7 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <p>{r.tooltip}</p>
                            <div className="absolute -top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* 保存と仮実行ボタン */}
      <div className="flex items-start space-x-3">
        <div className="flex flex-col items-start">
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
          >
            保存
          </button>
          {saved && (
            <div className="text-green-600 text-sm mt-1">保存されました</div>
          )}
        </div>

        <div className="flex flex-col">
          <button
            type="button"
            onClick={handleDryRun}
            className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded"
          >
            実行
          </button>
        </div>
      </div>

      {/* 保存された内容の表示 */}
      {savedData && (
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-3">保存された設定内容</h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="font-medium text-gray-700 w-48">負荷分散方式:</span>
              <span className="text-gray-900">{savedData.method}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-700 w-48">ネットワークモデル:</span>
              <span className="text-gray-900">
                {savedData.nw_model === 'f' && 'Full Mesh'}
                {savedData.nw_model === 'r' && 'Random'}
                {savedData.nw_model === 'ba' && 'Barabási-Albert'}
              </span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-700 w-48">Webサーバ数:</span>
              <div className="text-gray-900">
                {savedData.webServerConfig && (() => {
                  const config = JSON.parse(savedData.webServerConfig);
                  if (config.symmetry === 'symmetric') {
                    return <span>対称: {config.count}台</span>;
                  } else {
                    return (
                      <div className="space-y-1">
                        <span>非対称:</span>
                        {Object.entries(config.counts).map(([clusterId, count]) => (
                          <div key={clusterId} className="ml-4">
                            {clusterId}: {count as string}台
                          </div>
                        ))}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            {rows.map((r) => (
              <div key={r.key} className="flex">
                <span className="font-medium text-gray-700 w-48">{r.name}:</span>
                <span className="text-gray-900">{savedData[r.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ParamsSettings;
