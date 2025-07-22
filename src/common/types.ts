import { Status } from "masto/dist/esm/mastodon/entities/v1";

export type Post = Omit<Status, "content"> & {
  body: string | null
}
