import Parser from 'rss-parser';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Article, ModelRanking, today } from '@/db/schema'
import {
  insert_articles,
  upsert_rankings,
  update_article_summary,
  update_ranking_summary,
  query_articles,
  query_rankings,
  db
} from '@/db/index'

const MODEL = "claude-sonnet-4-5-20250929";

const LW_PROMPT = readFileSync(join(process.cwd(), 'llm/lesswrong_prompt.txt'), 'utf-8');
const LW_TOOL_SCHEMA = JSON.parse(readFileSync(join(process.cwd(), 'llm/lesswrong_tool_schema.json'), 'utf-8'));
const CAI_PROMPT = readFileSync(join(process.cwd(), 'llm/civitai_prompt.txt'), 'utf-8');
const HF_PROMPT = readFileSync(join(process.cwd(), 'llm/huggingface_prompt.txt'), 'utf-8');
const HFPAPERS_PROMPT = readFileSync(join(process.cwd(), 'llm/hfpapers_prompt.txt'), 'utf-8');
const HFPAPERS_TOOL_SCHEMA = JSON.parse(readFileSync(join(process.cwd(), 'llm/hfpapers_tool_schema.json'), 'utf-8'));

const anthropic = new Anthropic();

export async function GET() {

  // fetch raw data
  const civ_models = await fetch_top_civitai_models(10);
  const hf_models = await fetch_trending_huggingface_models(10);
  const lw_articles = await fetch_lesswrong_feed();
  const hf_articles = await fetch_hf_papers(20);

  const fetched_contents = ({
      hf_models: hf_models,
      civ_models: civ_models,
      lw_articles: lw_articles.map(a => ({
        title: a.title,
        fetchedAt: a.fetchedAt,
        publishedAt: a.publishedAt 
      })),  // shorter repr ^
      hf_articles: hf_articles.map(a => ({
        title: a.title,
        fetchedAt: a.fetchedAt,
        publishedAt: a.publishedAt 
      })),  // shorter repr ^
  });

  // insert/upsert fetched contents into db 
  await insert_articles(db, lw_articles);
  await insert_articles(db, hf_articles);
  await upsert_rankings(db, hf_models);
  await upsert_rankings(db, civ_models);

  // do llm postprocessing
  // await postprocess_lw();
  // await postprocess_hf();
  // await postprocess_cai();
  await postprocess_hfpapers();

  // return fetched contents
  return Response.json({fetched_contents: fetched_contents});
}

// export async function GET() {
//   const articles = await fetch_arxiv_feed();
// 
//   return Response.json({status: 'ok'});
// }


async function postprocess_cai() {
  const rankings = await query_rankings(db, 'civitai');
  const unprocessed = rankings
    .filter(r => r.summary === null)
    .slice(0, 1); // TODO remove slice

  for (const ranking of unprocessed) {
    if (!ranking.description) continue;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 1,
      system: CAI_PROMPT,
      messages: [{ role: "user", content: ranking.description }],
    });

    const textBlock = msg.content.find((block: any) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      await update_ranking_summary(db, ranking.id, textBlock.text);
      console.log(`Processed civitai: ${ranking.modelName} -> ${textBlock.text}`);
    }
  }
}

async function postprocess_hf() {
  const rankings = await query_rankings(db, 'huggingface');
  const unprocessed = rankings
    .filter(r => r.summary === null)
    .slice(0, 1); // TODO remove slice

  for (const ranking of unprocessed) {
    if (!ranking.description) continue;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 1,
      system: HF_PROMPT,
      messages: [{ role: "user", content: ranking.description }],
    });

    const textBlock = msg.content.find((block: any) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      await update_ranking_summary(db, ranking.id, textBlock.text);
      console.log(`Processed huggingface: ${ranking.modelName} -> ${textBlock.text}`);
    }
  }
}

async function postprocess_lw() {
  const allArticles = await query_articles(db, 'lesswrong');
  const unprocessed = allArticles
    .filter(a => a.shouldInclude === null)
    .slice(0, 1); // TODO: remove slice

  for (const article of unprocessed) {
    if (!article.rawContent) continue;

    const msg = await anthropic.messages.create({
      model: MODEL,
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

async function postprocess_hfpapers() {
  const allPapers = await query_articles(db, 'hf');
  const unprocessed = allPapers
    .filter(a => a.shouldInclude === null)
    .slice(0, 1); // TODO: remove slice

  for (const paper of unprocessed) {
    if (!paper.rawContent) continue;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 1,
      system: HFPAPERS_PROMPT,
      messages: [{ role: "user", content: paper.rawContent }],
      tools: [{
        name: "process_paper",
        description: "Process the paper to determine inclusion and generate summary",
        input_schema: HFPAPERS_TOOL_SCHEMA
      }]
    });

    const toolUse = msg.content.find((block: any) => block.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use') {
      const input = toolUse.input as { should_include: boolean; summary: string };
      await update_article_summary(
        db,
        paper.link,
        input.summary,
        input.should_include
      );
      console.log(`Processed HF paper: ${paper.title} -> ${input.summary} (include=${input.should_include})`);
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
      description: item.description + `\n\nTAGS: ${item.tags}`
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

  const models = await Promise.all(
    data.recentlyTrending.map(async (item: any) => {
      const modelId = item.repoData.id;
      const readmeRes = await fetch(`https://huggingface.co/${modelId}/resolve/main/README.md`);
      const description = readmeRes.ok ? await readmeRes.text() : null;

      return {
        source: 'huggingface' as const,
        modelName: modelId,
        fetchedDate: today(),
        downloads: item.repoData.downloads,
        description,
      };
    })
  );

  return models.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
}

// huggingface daily papers (trending)
async function fetch_hf_papers(limit: number = 20): Promise<Article[]> {
  const res = await fetch(`https://huggingface.co/api/daily_papers?sort=trending&limit=${limit}`);
  const data = await res.json();

  const articles = data
    .filter((item: any) => item.paper?.id && item.paper?.title)
    .map((item: any) => ({
      link: `https://arxiv.org/abs/${item.paper.id}`,
      source: 'hf',
      title: item.paper.title,
      author: item.paper.authors?.map((a: any) => a.name).join(', ') ?? null,
      rawContent: item.paper.summary ?? null,
      summary: null,  // HF already has AI summary, we dont want that one
      shouldInclude: null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    }));

  return articles;
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









