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
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Bulletin</h1>

      {/* Daily summary */}
      <section className="mb-10 p-6 bg-gray-50 rounded-lg border">
        {dailySummary ? (
          <p className="text-gray-700">{dailySummary.summary}</p>
        ) : (
          <p className="text-gray-500 italic">No summary yet - run the cron to generate one.</p>
        )}
      </section>

      {/* Model rankings row */}
      <div className="flex gap-8 mb-10">
        <section className="flex-1">
          <h2 className="text-xl font-semibold mb-4">HuggingFace Trending</h2>
          <div className="space-y-2">
            {sortedHfRankings.map(r => (
              <div key={r.id} className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">↓</span>
                  <span className="text-gray-500 font-mono text-sm w-16">{formatDownloads(r.downloads)}</span>
                  <a
                    href={`https://huggingface.co/${r.modelName}`}
                    className="text-blue-600 hover:underline truncate"
                  >
                    {r.modelName}
                  </a>
                </div>
                {r.summary && <p className="text-sm text-gray-600 ml-24 mt-1 italic">{r.summary}</p>}
              </div>
            ))}
            {sortedHfRankings.length === 0 && <p className="text-gray-500">No rankings yet</p>}
          </div>
        </section>

        <section className="flex-1">
          <h2 className="text-xl font-semibold mb-4">Civitai Top Models</h2>
          <div className="space-y-2">
            {sortedCivRankings.map(r => (
              <div key={r.id} className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">↓</span>
                  <span className="text-gray-500 font-mono text-sm w-16">{formatDownloads(r.downloads)}</span>
                  {r.link ? (
                    <a href={r.link} className="text-blue-600 hover:underline truncate">{r.modelName}</a>
                  ) : (
                    <span className="truncate">{r.modelName}</span>
                  )}
                </div>
                {r.summary && <p className="text-sm text-gray-600 ml-24 mt-1 italic">{r.summary}</p>}
              </div>
            ))}
            {sortedCivRankings.length === 0 && <p className="text-gray-500">No rankings yet</p>}
          </div>
        </section>
      </div>

      {/* Articles row */}
      <div className="flex gap-8">
        <section className="flex-1">
          <h2 className="text-xl font-semibold mb-4">LessWrong</h2>
          <div className="space-y-4">
            {lwArticles.map(a => (
              <article key={a.id} className="border-b pb-4">
                <a href={a.link} className="text-blue-600 hover:underline font-medium">
                  {a.title}
                </a>
                {a.author && <p className="text-sm text-gray-500">by {a.author}</p>}
                {a.summary && <p className="mt-2 text-gray-600 italic">{a.summary}</p>}
              </article>
            ))}
            {lwArticles.length === 0 && <p className="text-gray-500">No articles yet</p>}
          </div>
        </section>

        <section className="flex-1">
          <h2 className="text-xl font-semibold mb-4">Trending Daily Papers</h2>
          <div className="space-y-4">
            {hfPapers.map(a => (
              <article key={a.id} className="border-b pb-4">
                <a href={a.link} className="text-blue-600 hover:underline font-medium">
                  {a.title}
                </a>
                {a.author && <p className="text-sm text-gray-500">by {truncateAuthors(a.author)}</p>}
                {a.summary && <p className="mt-2 text-gray-600 italic">{a.summary}</p>}
              </article>
            ))}
            {hfPapers.length === 0 && <p className="text-gray-500">No papers yet</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
