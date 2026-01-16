

auto-generated ml news summary dashboard project

built with next/vercel/planetscale/anthropic sdk


running locally:

sample .env.local:
```
CIVITAI_API_KEY=...
HF_API_KEY=...
ANTHROPIC_API_KEY=...

# planetscale
DATABASE_NAME=...
DATABASE_HOST=...
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
CRON_SECRET=...

# local
DATABASE_URL=mysql://root:dev@localhost:3306/bulletin
```

db setup:
1. either set up planetscale or edit index.ts to use mysql2 drivers
2. `./start_mysql.sh` to run the mysql docker container
3. `./setup_mysql.sh` to set up the tables


TODO:
[ ] add nontrivial api validation
[ ] scrape openrouter
[ ] x api?
