import Parser from 'rss-parser';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Article, ModelRanking, today } from '@/db/schema'
import { insert_articles, upsert_rankings, update_article_summary, query_articles, db } from '@/db/index'

const LW_PROMPT = readFileSync(join(process.cwd(), 'llm/lesswrong_prompt.txt'), 'utf-8');
const LW_TOOL_SCHEMA = JSON.parse(readFileSync(join(process.cwd(), 'llm/lesswrong_tool_schema.json'), 'utf-8'));

const anthropic = new Anthropic();

// export async function GET() {
// 
//   // fetch raw data
//   const civ_models = await fetch_top_civitai_models(10);
//   const hf_models = await fetch_trending_huggingface_models(10);
//   const lw_articles = await fetch_lesswrong_feed();
// 
//   const fetched_contents = ({
//       hf_models: hf_models,
//       civ_models: civ_models,
//       lw_articles: lw_articles.map(a => ({
//         title: a.title,
//         fetchedAt: a.fetchedAt,
//         publishedAt: a.publishedAt 
//       })),  // shorter repr ^
//   });
// 
//   // insert/upsert fetched contents into db 
//   await insert_articles(db, lw_articles);
//   await upsert_rankings(db, hf_models);
//   await upsert_rankings(db, civ_models);
// 
//   // do llm postprocessing
//   // TODO
// 
//   // return fetched contents
//   return Response.json({fetched_contents: fetched_contents});
// }

export async function GET() {
  // await postprocess_lw();
  const model = await fetch_trending_huggingface_models(1);

  return Response.json({status: 'ok'});
}

async function postprocess_lw() {
  const allArticles = await query_articles(db, 'lesswrong');
  const unprocessed = allArticles
    .filter(a => a.shouldInclude === null)
    .slice(0, 1); // TODO: remove slice

  for (const article of unprocessed) {
    if (!article.rawContent) continue;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      temperature: 1,
      system: LW_PROMPT,
      messages: [{ role: "user", content: article.rawContent }],
      tools: [{
        name: "process_article",
        description: "Process the article to determine inclusion and generate summary",
        input_schema: LW_TOOL_SCHEMA
      }]
    });

    const toolUse = msg.content.find((block: any) => block.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use') {
      const input = toolUse.input as { should_include: boolean; summary?: string };
      await update_article_summary(
        db,
        article.link,
        input.summary ?? '',
        input.should_include
      );
      console.log(`Processed: ${article.title} -> include=${input.should_include}`);
    }
  }
}


// https://github.com/civitai/civitai/wiki/REST-API-Reference#get-apiv1models
async function fetch_top_civitai_models(limit: number): Promise<ModelRanking[]> {
  const api_key = process.env.CIVITAI_API_KEY;
  const endpoint_url = "https://civitai.com/api/v1/models";
  const params = new URLSearchParams({
    limit: limit.toString(),
    sort: "Most Downloaded",
    period: "Week",
    types: "Checkpoint",
  });

  const res = await fetch(`${endpoint_url}?${params}`, {
    headers: {
      "Authorization": `Bearer ${api_key}`
    }
  });
  const data = await res.json();
  const models = data.items
  .map((item: any) => ({
      source: 'civitai',
      modelName: item.name,
      fetchedDate: today(),
      downloads: item.stats.downloadCount,
    }))
  .sort((a: any, b: any) => b.downloadCount - a.downloadCount);

  return models;
}

// https://huggingface.co/.well-known/openapi.json
async function fetch_trending_huggingface_models(limit: number): Promise<ModelRanking[]> {
  const endpoint_url = "https://huggingface.co/api/trending";
  const params = new URLSearchParams({
    type: "model",
    limit: limit.toString(),
  });

  const res = await fetch(`${endpoint_url}?${params}`);
  const data = await res.json();
  const models = data.recentlyTrending
    .map((item: any) => ({
      source: 'huggingface',
      modelName: item.repoData.id,
      fetchedDate: today(),
      downloads: item.repoData.downloads,
    }))
    .sort((a: any, b: any) => b.downloadCount - a.downloadCount);
  return models;
}

// www.lesswrong.com
async function fetch_lesswrong_feed(): Promise<Article[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(
    'https://www.lesswrong.com/feed.xml?\
    view=frontpage-rss&karmaThreshold=30'
  );

  const articles = feed.items
    .filter(item => item.title && item.link)
    .map(item => ({
      link: item.link!,
      source: 'lesswrong',
      title: item.title!,
      author: item.creator ?? null,
      rawContent: item.content ?? null,
      shouldInclude: null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }));

  return articles;
}









