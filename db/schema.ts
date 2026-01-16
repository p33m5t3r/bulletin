import { mysqlTable, int, text, mediumtext, varchar, boolean, timestamp, date, unique } from 'drizzle-orm/mysql-core'

// LessWrong posts, arxiv papers - upsert on link
export const articles = mysqlTable('articles', {
  id: int('id').primaryKey().autoincrement(),
  source: varchar('source', { length: 50 }).notNull(),   // 'lesswrong' | 'arxiv'
  link: varchar('link', { length: 512 }).notNull().unique(),  // canonical URL, dedupes
  title: text('title').notNull(),
  author: text('author'),
  rawContent: mediumtext('raw_content'),
  summary: text('summary'),                   // LLM generated
  shouldInclude: boolean('should_include'),   // LLM filtered
  publishedAt: timestamp('published_at'),     // original publish date
  fetchedAt: timestamp('fetched_at').defaultNow(),
})

// HuggingFace, Civitai - historical tracking
export const modelRankings = mysqlTable('model_rankings', {
  id: int('id').primaryKey().autoincrement(),
  source: varchar('source', { length: 50 }).notNull(),       // 'huggingface' | 'civitai'
  modelName: varchar('model_name', { length: 255 }).notNull(), // name is the identifier
  link: varchar('link', { length: 512 }),                    // URL to model page
  downloads: int('downloads'),
  description: mediumtext('description'),  // README / raw content
  summary: text('summary'),          // LLM generated
  fetchedDate: date('fetched_date').notNull(), // date, not timestamp
}, (table) => [
  // composite unique: one row per model per day per source
  unique().on(table.source, table.modelName, table.fetchedDate),
])

// Daily AI-generated bulletin summary
export const dailySummaries = mysqlTable('daily_summaries', {
  date: date('date').primaryKey(),
  summary: text('summary').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
})

export type Article = typeof articles.$inferInsert
export type ModelRanking = typeof modelRankings.$inferInsert
export type DailySummary = typeof dailySummaries.$inferInsert
export const today = () => new Date().toISOString().slice(0,10);

