import Parser from 'rss-parser';

export async function GET() {
  /*
  const civ_models = await fetch_top_civitai_models(10);
  const hf_models = await fetch_trending_huggingface_models(10);
  return Response.json({
      hf_models: hf_models,
      civ_models: civ_models,
  });
  */
  await fetch_lesswrong_feed();
  return Response.json({status: 'ok'});
}

type ModelStat = {
  name: string,
  downloadCount: number,
}

// https://github.com/civitai/civitai/wiki/REST-API-Reference#get-apiv1models
async function fetch_top_civitai_models(limit: number): Promise<ModelStat[]> {
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
      name: item.name,
      downloadCount: item.stats.downloadCount
    }))
  .sort((a: any, b: any) => b.downloadCount - a.downloadCount);

  return models;
}

// https://huggingface.co/.well-known/openapi.json
async function fetch_trending_huggingface_models(limit: number): Promise<ModelStat[]> {
  const endpoint_url = "https://huggingface.co/api/trending";
  const params = new URLSearchParams({
    type: "model",
    limit: limit.toString(),
  });

  const res = await fetch(`${endpoint_url}?${params}`);
  const data = await res.json();
  const models = data.recentlyTrending
    .map((item: any) => ({
      name: item.repoData.id,
      downloadCount: item.repoData.downloads
    }))
    .sort((a: any, b: any) => b.downloadCount - a.downloadCount);
  return models;
}

// www.lesswrong.com
async function fetch_lesswrong_feed() {
  const parser = new Parser();
  const feed = await parser.parseURL(
    'https://www.lesswrong.com/feed.xml?\
    view=frontpage-rss&karmaThreshold=30'
  );

  const posts = feed.items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    author: item.creator,
    content: item.content,
  }));

  console.log(posts);
}












