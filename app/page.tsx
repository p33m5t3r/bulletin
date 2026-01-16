import { db, query_articles, query_rankings, query_daily_summary } from '@/db'
import { today } from '@/db/schema'

export const dynamic = 'force-dynamic'

function formatDownloads(n: number | null): string {
  if (n === null) return '?'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function truncateAuthors(authors: string | null, max: number = 3): string | null {
  if (!authors) return null
  const parts = authors.split(', ')
  if (parts.length <= max) return authors
  return parts.slice(0, max).join(', ') + ' et al.'
}

export default async function Home() {
  const lwArticles = await query_articles(db, 'lesswrong')
  const hfPapers = await query_articles(db, 'hf')
  const hfRankings = await query_rankings(db, 'huggingface')
  const civRankings = await query_rankings(db, 'civitai')
  const dailySummary = await query_daily_summary(db, today())

  const sortedHfRankings = [...hfRankings].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
  const sortedCivRankings = [...civRankings].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-300">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-baseline justify-between mb-8">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
              Bulletin
            </h1>
            <span className="text-neutral-500 text-sm italic">
              llms all the way down · by <a href="https://0xpemulis.net/" className="hover:text-fuchsia-300 transition-colors">0xpemulis</a>
            </span>
          </div>
          <a href="https://github.com/p33m5t3r/bulletin" className="text-neutral-500 text-lg italic hover:text-fuchsia-300 transition-colors">
            source
          </a>
        </div>

        {/* Daily summary */}
        <section className="mb-10 p-6 bg-neutral-800 border-l-2 border-fuchsia-400 font-serif">
          {dailySummary ? (
            <p className="text-neutral-300 leading-relaxed text-lg">{dailySummary.summary}</p>
          ) : (
            <p className="text-neutral-500 italic">No summary yet - run the cron to generate one.</p>
          )}
        </section>

        {/* Model rankings row */}
        <div className="flex gap-8 mb-10">
          <section className="flex-1">
            <h2 className="font-semibold mb-4 text-neutral-500 uppercase tracking-wider text-sm">
              HuggingFace Trending
            </h2>
            <div className="space-y-2">
              {sortedHfRankings.map(r => (
                <div key={r.id} className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-fuchsia-400">↓</span>
                    <span className="text-neutral-500 font-mono text-sm w-16">{formatDownloads(r.downloads)}</span>
                    <a
                      href={`https://huggingface.co/${r.modelName}`}
                      className="text-neutral-200 hover:text-fuchsia-300 transition-colors truncate"
                    >
                      {r.modelName}
                    </a>
                  </div>
                  {r.summary && <p className="text-sm text-neutral-500 ml-24 mt-1 italic">{r.summary}</p>}
                </div>
              ))}
              {sortedHfRankings.length === 0 && <p className="text-neutral-600">No rankings yet</p>}
            </div>
          </section>

          <section className="flex-1">
            <h2 className="font-semibold mb-4 text-neutral-500 uppercase tracking-wider text-sm">
              Civitai Top Models
            </h2>
            <div className="space-y-2">
              {sortedCivRankings.map(r => (
                <div key={r.id} className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-fuchsia-400">↓</span>
                    <span className="text-neutral-500 font-mono text-sm w-16">{formatDownloads(r.downloads)}</span>
                    {r.link ? (
                      <a href={r.link} className="text-neutral-200 hover:text-fuchsia-300 transition-colors truncate">{r.modelName}</a>
                    ) : (
                      <span className="text-neutral-300 truncate">{r.modelName}</span>
                    )}
                  </div>
                  {r.summary && <p className="text-sm text-neutral-500 ml-24 mt-1 italic">{r.summary}</p>}
                </div>
              ))}
              {sortedCivRankings.length === 0 && <p className="text-neutral-600">No rankings yet</p>}
            </div>
          </section>
        </div>

        {/* Articles row */}
        <div className="flex gap-8">
          <section className="flex-1">
            <h2 className="font-semibold mb-4 text-neutral-500 uppercase tracking-wider text-sm">
              LessWrong
            </h2>
            <div className="space-y-4">
              {lwArticles.map(a => (
                <article key={a.id} className="border-b border-neutral-700 pb-4">
                  <a href={a.link} className="text-neutral-200 hover:text-fuchsia-300 transition-colors font-medium">
                    {a.title}
                  </a>
                  {a.author && <p className="text-sm text-neutral-500 mt-1">by {a.author}</p>}
                  {a.summary && <p className="mt-2 text-neutral-400 italic">{a.summary}</p>}
                </article>
              ))}
              {lwArticles.length === 0 && <p className="text-neutral-600">No articles yet</p>}
            </div>
          </section>

          <section className="flex-1">
            <h2 className="font-semibold mb-4 text-neutral-500 uppercase tracking-wider text-sm">
              Trending Daily Papers
            </h2>
            <div className="space-y-4">
              {hfPapers.map(a => (
                <article key={a.id} className="border-b border-neutral-700 pb-4">
                  <a href={a.link} className="text-neutral-200 hover:text-fuchsia-300 transition-colors font-medium">
                    {a.title}
                  </a>
                  {a.author && <p className="text-sm text-neutral-500 mt-1">by {truncateAuthors(a.author)}</p>}
                  {a.summary && <p className="mt-2 text-neutral-400 italic">{a.summary}</p>}
                </article>
              ))}
              {hfPapers.length === 0 && <p className="text-neutral-600">No papers yet</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
