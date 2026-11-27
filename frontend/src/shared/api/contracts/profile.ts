/*
  There is no profile overview endpoint yet: identity comes from the real GET /api/users/me and the user's
  posts from the real GET /api/posts?authorId=. Keeping them as two requests lets the posts fail on their own.
*/

/** `GET /api/users/me`, narrowed to the fields the profile shows. The id is the post author id (the token's sub). */
export interface ProfileOverviewResponse {
  id: number
  username: string
  firstName: string
  lastName: string
}
