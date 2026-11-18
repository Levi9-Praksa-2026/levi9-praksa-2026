export interface Community {
  /** The slug after "l/": "frontend". */
  slug: string
  /** One plain line about what is posted there. */
  blurb: string
}

export interface Post {
  id: string
  /** The slug of the community it was posted in. */
  community: Community['slug']
  title: string
  /** The author's handle without the "u/". */
  author: string
  /** The author's office. */
  office: string
  votes: number
  replies: number
  /** How long ago, as written: "2 h". */
  age: string
}

/** One reply in a post's thread. */
export interface Reply {
  id: string
  /** The author's handle without the "u/". */
  author: string
  office: string
  body: string
  votes: number
  age: string
  /** Replies to a reply sit one step in. */
  depth?: 0 | 1
}
