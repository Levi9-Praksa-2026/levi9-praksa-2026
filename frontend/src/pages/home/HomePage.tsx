/** `/`: the forum's front page. Placeholder until the feed is built. */
export function HomePage() {
  return (
    <section aria-labelledby="home-title" className="grid gap-4">
      <h1 id="home-title" className="text-h3">Home</h1>
      <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
        <p className="text-body text-ink">The feed is on its way.</p>
        <p className="mt-1 text-small text-muted">Latest posts from every community will show here.</p>
      </div>
    </section>
  )
}
