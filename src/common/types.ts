import { Account, MediaAttachment, Status } from "masto/dist/esm/mastodon/entities/v1";

export type Post = Omit<Status, "reblog" | "content" | "account" | "mediaAttachments"> & {
  body: string | null
  reblog?: Omit<Status['reblog'], "content" | "account" | "mediaAttachments"> & {
    body: string | null
    account: Account & {
      avatarArray: Uint8Array
      avatarType: string
    }
    mediaAttachments: (MediaAttachment & {
      array: Uint8Array
      mediaType: string
    })[]
  };
  account: Account & {
    avatarArray: Uint8Array
    avatarType: string
  }
  mediaAttachments: (MediaAttachment & {
    array: Uint8Array
    mediaType: string
  })[]
}

export interface AuthInfo {
  domain: string
  acct: string
}
