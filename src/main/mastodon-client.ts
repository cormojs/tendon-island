import { createRestAPIClient, createStreamingAPIClient, createOAuthAPIClient } from 'masto'
import { Post } from '../common/types'
import { sanitizeContent, convertedMediaAttachments } from './utils'
import { shell, app, dialog } from 'electron'
import { saveConfig } from './config-manager'


export async function startSubscribe(domain: string, secret: string, callback: (post: Post) => void): Promise<void> {
  try {
    const rest = createRestAPIClient({
      url: `https://${domain}`,
      accessToken: secret
    })
    const instance = await rest.v2.instance.fetch()
    using streaming = createStreamingAPIClient({
      streamingApiUrl: instance.configuration.urls.streaming,
      accessToken: secret
    })
    for await (const event of streaming.user.subscribe()) {
      switch (event.event) {
        case 'update': {
          try {
            const {
              content,
              account,
              reblog,
              mediaAttachments,
              ...restPayload
            } = event.payload

            const avatarResult = await fetch(account.avatar)
            const avatarArray = await avatarResult.bytes()
            const avatarType = avatarResult.headers['Content-Type'] ?? 'image/png'

            const reblogMediaAttachments = reblog ? await convertedMediaAttachments(reblog.mediaAttachments) : null
            const {
              account: reblogAccount,
              content: reblogContent,
              mediaAttachments: _,
              ...reblogRestPayload
            } = reblog ?? { content: null, account: null, mediaAttachments: [] }
            const reblogAvatarResult= reblog ? await fetch(reblog.account.avatar) : null
            const reblogAvatarArray = await reblogAvatarResult?.bytes()
            const reblogAvatarType = reblogAvatarResult ? reblogAvatarResult.headers['Content-Type'] ?? 'image/png' : null

            console.dir(event.payload)

            callback({
              body: sanitizeContent(content),
              account: {
                ...account,
                avatarArray,
                avatarType
              },
              reblog: reblogAccount && reblogContent && reblogAvatarArray && reblogAvatarType && reblogMediaAttachments ? {
                body: sanitizeContent(reblogContent),
                account: {
                  ...reblogAccount,
                  avatarArray: reblogAvatarArray,
                  avatarType: reblogAvatarType
                },
                mediaAttachments: reblogMediaAttachments,
                ...reblogRestPayload
              } : undefined,
              mediaAttachments: await convertedMediaAttachments(mediaAttachments),
              ...restPayload
            })
          } catch (error) {
            console.error('投稿処理中にエラーが発生しました:', error)
            dialog.showErrorBox('投稿処理エラー', `投稿の処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
          }
          break
        }
        case 'delete':
        case 'notification':
        case 'filters_changed':
        case 'conversation':
        case 'announcement':
        case 'announcement.reaction':
        case 'announcement.delete':
        case 'status.update':
        case 'notifications_merged':
          break
      }
    }
  } catch (error) {
    console.error('Mastodon接続エラー:', error)
    dialog.showErrorBox('接続エラー', `Mastodonサーバーへの接続中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}


export async function startOAuthFlow(domain: string): Promise<string> {
  try {
    const apiClient = createRestAPIClient({
      url: `https://${domain}`
    })

    // カスタムURIスキーマを使用するためのredirectUri
    const redirectUri = 'tendon-island://oauth/callback'

    const appData = await apiClient.v1.apps.create({
      clientName: 'Tendon Island',
      redirectUris: redirectUri,
      scopes: 'read write follow push'
    })

    const oauthAppCredentials = {
      clientId: appData.clientId,
      clientSecret: appData.clientSecret,
      redirectUri
    }

    // 認証URLを構築
    const authUrl = `https://${domain}/oauth/authorize?client_id=${appData.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read+write+follow+push`

    // カスタムプロトコルハンドラーを設定
    setupCustomProtocolHandler(domain, oauthAppCredentials)

    // 外部ブラウザで認証URLを開く
    shell.openExternal(authUrl)

    return authUrl
  } catch (error) {
    console.error('OAuth app creation failed:', error)
    dialog.showErrorBox('OAuth認証エラー', `OAuth認証の準備に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
    throw new Error('OAuth認証の準備に失敗しました')
  }
}

function setupCustomProtocolHandler(domain: string, oauthAppCredentials: {
    clientId: string | null | undefined;
    clientSecret: string | null | undefined;
    redirectUri: string;
}): void {
  const oauthClient = createOAuthAPIClient({
    url: `https://${domain}`
  })

  // 既存のハンドラーを削除
  app.removeAllListeners('open-url')

  const urlHandler = async (_, url: string) => {
    try {
      console.log(url)
      const urlObj = new URL(url)
      if (urlObj.protocol === 'tendon-island:' && urlObj.pathname === '/callback') {
        const code = urlObj.searchParams.get('code')

        if (code && oauthClient && oauthAppCredentials) {
          try {
            const tokenResult = await oauthClient.token.create({
              grantType: 'authorization_code',
              code,
              clientId: oauthAppCredentials.clientId ?? "",
              clientSecret: oauthAppCredentials.clientSecret ?? "",
              redirectUri: oauthAppCredentials.redirectUri
            })
            const rest = createRestAPIClient({
              url: `https://${domain}`,
              accessToken: tokenResult.accessToken
            })
            const acctResult = await rest.v1.accounts.verifyCredentials()
            saveConfig({
              domain,
              acct: acctResult.acct,
              clientId: oauthAppCredentials.clientId ?? "",
              clientSecret: oauthAppCredentials.clientSecret ?? "",
              secret: tokenResult.accessToken
            })
            console.log("認証OK")
            dialog.showErrorBox("認証OK", "Authorization Completed")
          } catch (error) {
            console.error('Token exchange failed:', error)
            dialog.showErrorBox('認証エラー', `認証トークンの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
          }
        } else {
          console.error('無効な認証コードです')
          dialog.showErrorBox('認証エラー', '無効な認証コードです。再度認証を行ってください。')
        }
      }
    } catch (error) {
      console.error('URL parsing failed:', error)
      dialog.showErrorBox('認証エラー', `認証URLの処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // カスタムURIスキーマからのコールバックを処理
  app.once('open-url', urlHandler)
  ;(app as any).once('open-url-win', (o: { url: string }) => {
    console.log(o)
    urlHandler(undefined, o.url)
  })
}
