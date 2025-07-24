# tendon-island

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### 使い方

- Mastodonの設定画面からアプリを作ってアクセストークンを取得する
- config.json に以下のような形で保存する

```json
{
  "example.com": {
    "secret": "<your_access_token>"
  }
}
```

あとは起動すれば勝手にTLの受信が始まる。メインウィンドウを閉じるとアプリケーションが終了する。
