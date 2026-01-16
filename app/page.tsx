import { db, query_articles, query_rankings } from '@/db'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const lwArticles = await query_articles(db, 'lesswrong')
  const hfPapers = await query_articles(db, 'hf')
  const hfRankings = await query_rankings(db, 'huggingface')
  const civRankings = await query_rankings(db, 'civitai')

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Bulletin</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">LessWrong</h2>
        <div className="space-y-4">
          {lwArticles.map(a => (
            <article key={a.id} className="border-b pb-4">
              <a href={a.link} className="text-blue-600 hover:underline font-medium">
                {a.title}
              </a>
              {a.author && <p className="text-sm text-gray-500">by {a.author}</p>}
              {a.summary && <p className="mt-2 text-gray-700">{a.summary}</p>}
            </article>
          ))}
          {lwArticles.length === 0 && <p className="text-gray-500">No articles yet</p>}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">HuggingFace Daily Papers</h2>
        <div className="space-y-4">
          {hfPapers.map(a => (
            <article key={a.id} className="border-b pb-4">
              <a href={a.link} className="text-blue-600 hover:underline font-medium">
                {a.title}
              </a>
              {a.author && <p className="text-sm text-gray-500">by {a.author}</p>}
              {a.summary && <p className="mt-2 text-gray-700">{a.summary}</p>}
            </article>
          ))}
          {hfPapers.length === 0 && <p className="text-gray-500">No papers yet</p>}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">HuggingFace Trending</h2>
        <div className="space-y-3">
          {hfRankings.map((r, i) => (
            <div key={r.id} className="border-b pb-2">
              <div className="flex justify-between">
                <span className="font-medium">{i + 1}. {r.modelName}</span>
                <span className="text-gray-500">{r.downloads?.toLocaleString()} downloads</span>
              </div>
              {r.summary && <p className="text-sm text-gray-600 mt-1">{r.summary}</p>}
            </div>
          ))}
          {hfRankings.length === 0 && <p className="text-gray-500">No rankings yet</p>}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Civitai Top Models</h2>
        <div className="space-y-3">
          {civRankings.map((r, i) => (
            <div key={r.id} className="border-b pb-2">
              <div className="flex justify-between">
                <span className="font-medium">{i + 1}. {r.modelName}</span>
                <span className="text-gray-500">{r.downloads?.toLocaleString()} downloads</span>
              </div>
              {r.summary && <p className="text-sm text-gray-600 mt-1">{r.summary}</p>}
            </div>
          ))}
          {civRankings.length === 0 && <p className="text-gray-500">No rankings yet</p>}
        </div>
      </section>
    </main>
  )
}
