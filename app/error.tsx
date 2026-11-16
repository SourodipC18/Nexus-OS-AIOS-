'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-page" role="alert">
      <p className="eyebrow">WORKSPACE UNAVAILABLE</p>
      <h1>NEXUS couldn’t load this page.</h1>
      <p className="muted">Check your connection and configuration, then try again.</p>
      <button className="retry-button" onClick={() => reset()}>Try again</button>
    </main>
  )
}
