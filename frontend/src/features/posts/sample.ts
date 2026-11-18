import type { Community, Post, Reply } from '@/features/posts/types'

/** Sample data for the welcome page and for lab screens. Not real people and not real threads. */
export const SAMPLE_COMMUNITIES: readonly Community[] = [
  { slug: 'frontend', blurb: 'Components, tooling and the browser.' },
  { slug: 'backend', blurb: 'Services, databases and APIs.' },
  { slug: 'devops', blurb: 'Pipelines, cloud and on-call.' },
  { slug: 'qa', blurb: 'Test plans, automation and bugs.' },
  { slug: 'random', blurb: 'Anything that fits nowhere else.' },
  { slug: 'food', blurb: 'Lunch spots, recipes and coffee.' },
  { slug: 'sports', blurb: 'Matches, runs and office leagues.' },
]

export const SAMPLE_POSTS: readonly Post[] = [
  { id: 'p-frontend', community: 'frontend', title: 'Which test runner for a new React project?', author: 'colleague_one', office: 'Serbia', votes: 42, replies: 18, age: '2 h' },
  { id: 'p-frontend-2', community: 'frontend', title: 'CSS modules, Tailwind or something else?', author: 'colleague_eight', office: 'Ukraine', votes: 36, replies: 25, age: '9 h' },
  { id: 'p-frontend-3', community: 'frontend', title: 'How do you test accessibility?', author: 'colleague_nine', office: 'Netherlands', votes: 21, replies: 11, age: '1 d' },
  { id: 'p-frontend-4', community: 'frontend', title: 'Share your favourite VS Code extensions', author: 'colleague_sixteen', office: 'Romania', votes: 29, replies: 31, age: '6 h' },
  { id: 'p-backend', community: 'backend', title: 'How do you version an internal API?', author: 'colleague_two', office: 'Netherlands', votes: 27, replies: 9, age: '5 h' },
  { id: 'p-devops', community: 'devops', title: 'Pipeline caching tips that saved time', author: 'colleague_three', office: 'Romania', votes: 31, replies: 12, age: '1 d' },
  { id: 'p-qa', community: 'qa', title: 'Flaky e2e tests: delete or fix?', author: 'colleague_four', office: 'Ukraine', votes: 19, replies: 14, age: '1 d' },
  { id: 'p-random', community: 'random', title: 'The first computer you ever used?', author: 'colleague_five', office: 'Serbia', votes: 55, replies: 40, age: '3 d' },
  { id: 'p-food', community: 'food', title: 'Best lunch near the office?', author: 'colleague_six', office: 'Romania', votes: 23, replies: 21, age: '4 h' },
  { id: 'p-sports', community: 'sports', title: 'Five-a-side match on Friday?', author: 'colleague_seven', office: 'Netherlands', votes: 16, replies: 7, age: '6 h' },
  { id: 'p-backend-2', community: 'backend', title: 'Postgres or Mongo for the new service?', author: 'colleague_ten', office: 'Serbia', votes: 18, replies: 22, age: '1 d' },
  { id: 'p-devops-2', community: 'devops', title: 'Who else is on call this weekend?', author: 'colleague_eleven', office: 'Ukraine', votes: 12, replies: 6, age: '3 h' },
  { id: 'p-qa-2', community: 'qa', title: 'Playwright or Cypress in 2026?', author: 'colleague_twelve', office: 'Netherlands', votes: 24, replies: 17, age: '2 d' },
  { id: 'p-random-2', community: 'random', title: 'Show us your desk setup', author: 'colleague_thirteen', office: 'Romania', votes: 47, replies: 33, age: '5 h' },
  { id: 'p-food-2', community: 'food', title: 'Coffee beans worth bringing to the office', author: 'colleague_fourteen', office: 'Serbia', votes: 14, replies: 9, age: '2 d' },
  { id: 'p-sports-2', community: 'sports', title: 'Running club: Thursday after work', author: 'colleague_fifteen', office: 'Romania', votes: 11, replies: 5, age: '1 d' },
]

export function samplePost(community: Community['slug']): Post {
  const post = SAMPLE_POSTS.find(p => p.community === community)
  if (!post) throw new Error(`No sample post for l/${community}`)
  return post
}

/** A sample thread under the first l/frontend post, with replies from three other offices. */
export const SAMPLE_THREAD: readonly Reply[] = [
  { id: 'r-1', author: 'colleague_eight', office: 'Ukraine', body: 'Vitest. Same config as Vite, and the watch mode is fast.', votes: 24, age: '1 h' },
  { id: 'r-2', author: 'colleague_one', office: 'Serbia', body: 'Does it play well with Testing Library?', votes: 6, age: '50 min', depth: 1 },
  { id: 'r-3', author: 'colleague_nine', office: 'Netherlands', body: 'It does, we switched last sprint. Happy to share our setup.', votes: 11, age: '40 min', depth: 1 },
  { id: 'r-4', author: 'colleague_three', office: 'Romania', body: 'Jest still works fine for us, but we would not pick it again.', votes: 9, age: '30 min' },
]
