import sanitizeHtml from 'sanitize-html'

export function sanitizeContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [ 'p', 'code', 'b', 'i', 'em', 'strong', 'a', 'blockquote', 'br' ],
    allowedAttributes: {
      'a': ['href']
    }
  })
}

export async function convertedMediaAttachments(attachments: any[]): Promise<(any & {
  array: Uint8Array,
  mediaType: string
})[]> {
  const converted = Promise.all(
    attachments.map(async (media) => {
      const result = await fetch(media.previewUrl)
      const array = await result.bytes()

      return {
        ...media,
        array,
        mediaType: result.headers['Content-Type'] ?? 'image/png'
      }
    })
  )
  return converted
}
