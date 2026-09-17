# 現調報告書

リフォームの**現調**（現地調査）で、写真を撮りながらその場で報告書を作り、
会社へメールで送るまでを1本にしたアプリです。

担当者がやることは「撮る」「押す」「完了」の3つだけ。
文書作成ソフトも、ファイルの受け渡しも、Google へのログインも要りません。

> **いまの状態**: 一通り動きます。使い始める前に、下の「運用を始める前に」の
> 3点を差し替えてください。実機（iPhone / Android）での確認がまだ残っています。

## 使う人から見た流れ

1. スマートフォンのブラウザで開き、**スタート**を押す
2. 顧客情報（顧客名・物件住所・調査日・担当者名）を入れる
3. 外観写真の枠を4つ埋める（枠を押すとカメラが起動します）
4. 不具合写真を4枚ずつ入れ、写真ごとに状態のボタンを押す。足りなければページを追加する
5. 完成した報告書を確認し、**完了**を押す。会社の固定アドレスへ PDF が届く

途中で閉じても入力は端末に残り、続きから再開できます。

## 運用を始める前に

次の3点を差し替えると使い始められます。いずれも1箇所を直すだけです。

| 何を | どこで |
| --- | --- |
| 送り先アドレス・差出人・送信サービスの鍵 | Vercel の環境変数（雛形は `.env.example`）。稼働試験中の送り先は `rahiseko@gmail.com` |
| ステータスの文言（いまは仮の A / B / C） | `src/domain/statuses.ts` |
| メール送信サービスの契約 | [Resend](https://resend.com) に登録し、差出人のドメインを確認（無料枠は月3,000通・1日100通） |

**差出人のドメイン**とは、メールの「送り主」として出すアドレスのドメイン部分です。
迷惑メール扱いを避けるため、送信サービスは「そのドメインの持ち主であること」を
DNS の設定で確かめてから送信を許可します。フリーメール（gmail.com など）は使えません。

外観写真の枠の見出し（**正面・右・左・裏**）は初期値です。担当者が現場で書き換えられ、
書き換えた言葉がそのまま報告書に載ります。

## 作り

- スマートフォンのブラウザで開く PWA（ホーム画面に追加できます）。Next.js + TypeScript
- 報告書は A4 縦の PDF。1ページ目に外観4枚と不具合4枚、2ページ目以降は不具合4枚ずつ
- PDF はサーバーで組み立てます。完成プレビューは同じ割り付けから作った HTML です
  （理由は [docs/adr/0002](./docs/adr/0002-build-the-report-on-the-server.md)）
- 送付はサーバー経由の自動メール送信。Google ドライブ保存と Gmail 下書きは見送りました
  （理由は [docs/adr/0001](./docs/adr/0001-report-delivery-by-server-email.md)）
- 作りかけの案件は端末の中（IndexedDB）にだけ残ります。圏外でも起動して入力できます
- 用語の定義は [CONTEXT.md](./CONTEXT.md)

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # 単体テスト
npm run test:e2e   # 通し操作テスト
npm run typecheck  # 型の検査
npm run build      # 本番向けの組み立て
```

仕様は GitHub Issue #2、作業は Issue #3〜#15 に分かれています。すべて実装済みです。

## 進め方の仕組み

この置き場所は、非エンジニアでも開発を進められるよう
[mattpocock/skills](https://github.com/mattpocock/skills) の案内役を組み込んでいます。
会話を開くと、AI が「前回の続き・いまの状態・最初の一手」を自動で報告します。

## 覚えるのはこの3つだけ

| 打つもの | 何が起きるか |
| --- | --- |
| `s` | 前回の続き・いまの状態・最初の一手を報告します（開始時は自動でも出ます） |
| `f` | 環境を破棄しても大丈夫な状態まで片づけ、終了して良いかを報告します |
| `/next-step` | いまどこにいて、次に何を打てばいいかを1つだけ提示します |

コマンドを覚える必要はありません。「〇〇を作りたい」と伝えるだけでも、実装前に自動で案内が入ります。

## 入っているもの

- `.claude/skills/` に [mattpocock/skills](https://github.com/mattpocock/skills) を 12 個インストール
  （`npx skills add mattpocock/skills`、`skills-lock.json` でバージョン固定）
  - ユーザー起動（このうち案内で使うもの）: `grill-with-docs` / `to-spec` / `to-tickets` / `implement` / `improve-codebase-architecture` / `setup-matt-pocock-skills`
  - モデル起動: `grilling` / `domain-modeling` / `codebase-design` / `tdd` / `code-review`
- `.claude/skills/s/`, `.claude/skills/f/`, `.claude/skills/next-step/`: この置き場所独自の案内役と儀式
- `.claude/settings.json`: 会話開始時に `docs/agents/flow-map.md` を読み込む仕組み
- `docs/agents/flow-map.md`: 進め方と、説明の書き方のルール
- `docs/agents/handover.md`: 会話をまたぐ引き継ぎメモ。区切りごとに自動で追記されます
- `AGENTS.md`: 開発フローの全体像
- `docs/agents/issue-tracker.md`: 作業指示書の置き場所は GitHub Issues
- `docs/agents/domain.md`: 用語集は `CONTEXT.md`、判断の記録は `docs/adr/`

## フロー全体

- 新規開発・機能追加: `/grill-with-docs` → 必要に応じて `/to-spec` → `/to-tickets` → `/implement`
- 設計改善: `/improve-codebase-architecture` → 候補を選択 → `/grill-with-docs` または `/codebase-design` → 以下同じ

`/implement` は `/tdd` で RED → GREEN を繰り返し、最後に `/code-review` を実行します。
詳細は [AGENTS.md](./AGENTS.md) の「Development flow」を参照してください。

## スキルの更新

```bash
npx skills update
```

スキル本体は本家のまま使う方針のため、ローカルで書き換えないでください。
