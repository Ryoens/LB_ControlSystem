# LB Control System

## 概要
[DiffusionControl_LB](https://github.com/Ryoens/DiffusionControl_LB)における負荷分散状態の可視化および実験の自動化を目的とするWebサイト

Webサイトで表示される項目
- Dockerコンテナ状態
- ネットワークトポロジ接続状態
- 隣接クラスタ情報(行列形式)
- 実験における各種パラメータの設定と実行

## 実行方法
[!Tip] ターミナルのタブを分けて実行してください
1. シェル実行サーバの起動
```bash
npm run start-server
```
2. コンテナ情報取得サーバの起動
```bash
cd server
go run main.go
```
3. WebUIの起動
```bash
npm run start
```