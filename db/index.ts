import { drizzle } from 'drizzle-orm/planetscale-serverless'
import { Client } from '@planetscale/database'
import { sql, eq, and } from 'drizzle-orm'
import * as schema from './schema'
import { Article, ModelRanking, articles, modelRankings, dailySummaries } from './schema'

const client = new Client({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
})

export const db = drizzle(client, { schema })
export type DB = typeof db

// insert articles, skip if already exists (don't clobber LLM results)
export async function insert_articles(db: DB, as: Article[]) {
  await db.insert(articles)
    .values(as)
    .onDuplicateKeyUpdate({ set: { id: sql`id` } })
}

// update LLM results for an article
export async function update_article_summary(db: DB, link: string, summary: string, shouldInclude: boolean) {
  await db.update(articles)
    .set({ summary, shouldInclude })
    .where(eq(articles.link, link))
}

// insert rankings, replace on duplicate (numbers change daily)
export async function upsert_rankings(db: DB, rs: ModelRanking[]) {
  await db.insert(modelRankings)
    .values(rs)
    .onDuplicateKeyUpdate({
      set: {
        downloads: sql`values(downloads)`,
      }
    })
}

// fetch all articles matching source
export async function query_articles(db: DB, source: string) {
  return await db.select()
    .from(articles)
    .where(
      eq(articles.source, source),
    )
}

// fetch all model rankings matching source
export async function query_rankings(db: DB, source: string) {
  return await db.select()
    .from(modelRankings)
    .where(eq(modelRankings.source, source))
}

// update LLM summary for a ranking
export async function update_ranking_summary(db: DB, id: number, summary: string) {
  await db.update(modelRankings)
    .set({ summary })
    .where(eq(modelRankings.id, id))
}

// fetch daily summary for a date (returns first match or undefined)
export async function query_daily_summary(db: DB, date: string) {
  const results = await db.select()
    .from(dailySummaries)
    .where(eq(dailySummaries.date, new Date(date)))
  return results[0] ?? null
}

// insert daily summary
export async function insert_daily_summary(db: DB, date: string, summary: string) {
  await db.insert(dailySummaries)
    .values({ date: new Date(date), summary })
}
