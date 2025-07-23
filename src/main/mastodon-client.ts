import { createRestAPIClient, createStreamingAPIClient } from 'masto'
import { Post } from '../common/types'
import { sanitizeContent, convertedMediaAttachments } from './utils'

export async function startSubscribe(domain: string, secret: string, callback: (post: Post) => void): Promise<void> {
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
}
