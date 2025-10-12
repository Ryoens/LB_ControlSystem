import React from 'react';

type ParamsSettingsProps = {
  // 将来的に設定値やコールバックを受け取る
};

type ParamRow = {
  key: string;
  name: string;
  type: string;
  description: string;
  example: string;
};

const rows: ParamRow[] = [
  {
    key: 'feedback',
    name: 'フィードバック情報取得間隔',
    type: 'int',
    description: 'feedback',
    example: '100',
  },
  {
    key: 'threshold',
    name: '閾値（N-co）',
    type: 'float',
    description: 'threshold',
    example: '0.5', 
  },
  {
    key: 'kappa',
    name: '拡散係数（DC）',
    type: 'float',
    description: 'kappa',
    example: '0.1',
  },
  {
    key: 'vus',
    name: '同時接続数',
    type: 'int',
    description: 'concurrent users',
    example: '100',
    // フラッシュクラウド対象LBに設定する同時接続数, それ以外は1/10とする.
  },
  {
    key: 'attempt',
    name: '試行回数',
    type: 'int',
    description: 'number of attempts',
    example: '5',
  },
  {
    key: 'nw_model',
    name: 'ネットワークモデル',
    type: 'string',
    description: 'NW model',
    example: 'f, r, ba',
    // [f: fullmesh, r: random, ba: balabasi and albert]
  },
  {
    key: 'num_cluster',
    name: 'Webサーバ数',
    type: 'int',
    description: 'Number of Web Servers',
    example: '3',
    // クラスタ内構造の非対称化: 対象クラスタIDとwebサーバ数を指定
  },
  {
    key: 'delay',
    name: '伝搬遅延',
    type: 'int',
    description: 'Delay between links',
    example: '10',
    // 設定方法: 全クラスタで共通(固定, ランダム), 一部クラスタのみ(単一, 複数)
  },
];

const ParamsSettings: React.FC<ParamsSettingsProps> = () => {
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    console.log('保存クリック');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDryRun = () => {
    console.log('仮の実行クリック');
  };

  return (
    <div className="space-y-3 text-sm text-gray-600">
      <p>設定パラメータは以下</p>
      {/* 最初に方式の選択を行う. これはラジオボタン形式で選択(N-co, LC, DC) */}

      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">説明</th>
              <th className="px-3 py-2 text-left">型</th>
              <th className="px-3 py-2 text-left">設定例</th>
              <th className="px-3 py-2 text-left">入力</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const inputType = r.type === 'int' || r.type === 'float' ? 'number' : 'text';
              const step = r.type === 'float' ? '0.01' : r.type === 'int' ? '1' : undefined;
              return (
                <tr key={r.key}>
                  <td className="px-3 py-2 align-top text-gray-800">{r.name}</td>
                  <td className="px-3 py-2 align-top text-gray-700">{r.description}</td>
                  <td className="px-3 py-2 align-top text-gray-600"><code className="bg-gray-100 px-1 rounded">{r.type}</code></td>
                  <td className="px-3 py-2 align-top text-gray-600"><code className="bg-gray-100 px-1 rounded">{r.example}</code></td>
                  <td className="px-3 py-2 align-top">
                    <input
                      aria-label={`input-${r.key}`}
                      defaultValue={r.example}
                      type={inputType}
                      step={step}
                      className="border rounded px-2 py-1 w-full"
                    />
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
    </div>
  );
}

export default ParamsSettings;
