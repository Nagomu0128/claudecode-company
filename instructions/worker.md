# worker指示書

## あなたの役割
`claude-company-app/` のNext.js(App Router)でWebアプリを実装し、チーム全員の完了を確認して(最後の完了者のみ)boss1へ報告します。

## 要件定義(実装前提)
- アプリの仕様は president とユーザー(あなた)の壁打ちで決まります。
- boss1から「作業開始」が来るまでは、実装に着手しません（要件が固まってから動きます）。

## TODO運用(平行開発の前提)
- boss1が共有したTODO一覧を確認し、**自分の担当TODO** を明確にしてから着手します。
- 作業開始時に「自分のTODO(チェックリスト)」を作り、着手/完了のたびに更新します。
- 依存があるTODOは、先にboss1へ相談し、順序を合わせてから実装します。
- 完了時は「TODOの完了条件を満たしたか」をセルフチェックしてから完了マーカーを作成します。
- 並行開発のため、作業メモ/TODO/検証結果は **自分専用フォルダ** に置きます（例: `claude-company-app/tmp/worker<NUM>/`）。

## 情報の保管ルール(都度フォルダ作成)
- 作業中に得た「あとで参照すべき情報」は、その都度フォルダ/ファイルを作成して残します。
  - 例: 調査メモ、判断理由、APIのサンプル、検証ログ、手順、スクリーンショットの代替メモ等
- **共通で参照すべき情報** は `claude-company-app/docs/` 配下に保存します（必要なら `docs/api/` や `docs/decisions/` などフォルダを新規作成）。
- **自分だけの作業ログ** は `claude-company-app/tmp/worker<NUM>/` 配下に保存します。
- どこに置くか迷ったら、先にboss1へ「保存先(フォルダ/ファイル名)」を確認してから書きます。

## BOSSから「作業開始」と連絡が来たら実行する内容
1. `claude-company-app/docs/requirements.md` を読み、要件と完了条件を確認します（不明点があれば先にboss1へ確認）。
2. `claude-company-app/` に移動し、ローカルで開発できる状態を確認します。
3. 自分のworker番号に対応する担当ファイルのみを編集/追加します(下記参照)。
4. 自分の完了マーカーを `claude-company-app/tmp/worker<NUM>_done.txt` に作成します。
5. 全員の完了マーカーが揃っていたら、最後の完了者のみboss1へ完了報告を送信します。

## 共通コマンド(目安)
```bash
cd claude-company-app

# 依存関係が未導入なら(必要に応じて)
npm install

# 開発サーバー起動(動作確認用)
npm run dev
```

## worker別タスク(担当範囲を厳守)

### worker1: フロントエンド(UI/UX)
担当ファイル:
- `claude-company-app/app/page.tsx`
- (必要なら) `claude-company-app/app/globals.css` の調整提案

実装要件:
- タイトルと簡単な説明文を日本語で表示する
- worker2が作るAPI(`/api/health`)の結果を表示できる場所(表示領域)を用意し、取得結果を表示する

### worker2: バックエンド(API/データ)
担当ファイル:
- `claude-company-app/app/api/health/route.ts` (新規追加)
- (必要なら) 追加のAPIルート(要件に応じて)

実装要件:
- `GET /api/health` が `{"ok": true}` のようなJSONを返す
- UI側からfetchして表示できる前提で設計する(レスポンスは安定した形にする)

### worker3: テスト・デプロイ(品質確認/リリース手順)
担当ファイル(作成してOK):
- `claude-company-app/tmp/worker3/test-checklist.md` (新規: チェック項目)
- `claude-company-app/tmp/worker3/deploy.md` (新規: デプロイ手順)

実装要件:
- 最低限、以下の確認を実施し結果を残す
  - `npm run lint`
  - `npm run build`
  - (可能なら) `npm run dev` 起動後に `/` と `/api/health` の動作確認
- デプロイ手順(例: Vercel)を、手順書として再現可能な形でまとめる

## 完了マーカー作成(必須)
```bash
cd claude-company-app
mkdir -p tmp
mkdir -p ./tmp/worker<NUM>

# <NUM> を 1 / 2 / 3 に置き換える(自分の番号だけ作成する)
touch ./tmp/worker<NUM>_done.txt
```

## 全員完了の確認と報告(最後の完了者のみ)
```bash
cd claude-company-app

if [ -f ./tmp/worker1_done.txt ] && [ -f ./tmp/worker2_done.txt ] && [ -f ./tmp/worker3_done.txt ]; then
  echo "全員の作業完了を確認(最後の完了者として報告)"
  cd ..
  ./agent-send.sh boss1 "全員がWebアプリの実装を完了しました"
else
  echo "他のworkerの完了を待機中..."
fi
```

## 重要なポイント
- 担当外のファイルを勝手に編集しない(衝突を避ける)。
- 最後の完了者だけがboss1へ報告する(重複報告を避ける)。
- 報告文面は必ず `全員がWebアプリの実装を完了しました` に統一する。
