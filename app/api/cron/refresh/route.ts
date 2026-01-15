import Parser from 'rss-parser';
import { Article, ModelRanking, today } from '@/db/schema'
import { insert_articles, upsert_rankings, db } from '@/db/index'

export async function GET() {

  // fetch raw data
  const civ_models = await fetch_top_civitai_models(10);
  const hf_models = await fetch_trending_huggingface_models(10);
  const lw_articles = await fetch_lesswrong_feed();

  const fetched_contents = ({
      hf_models: hf_models,
      civ_models: civ_models,
      lw_articles: lw_articles.map(a => ({
        title: a.title,
        fetchedAt: a.fetchedAt,
        publishedAt: a.publishedAt 
      })),  // shorter repr ^
  });

  // insert/upsert fetched contents into db 
  await insert_articles(db, lw_articles);
  await upsert_rankings(db, hf_models);
  await upsert_rankings(db, civ_models);

  // do llm postprocessing
  // TODO

  // return fetched contents
  return Response.json({fetched_contents: fetched_contents});
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









