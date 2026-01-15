import { drizzle } from 'drizzle-orm/mysql2'
import { sql, eq, and } from 'drizzle-orm'
import mysql from 'mysql2/promise'
import * as schema from './schema'
import { Article, ModelRanking, articles, modelRankings } from './schema'

const connection = await mysql.createConnection(process.env.DATABASE_URL!)

export const db = drizzle(connection, { schema, mode: 'default' })
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
