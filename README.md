# Poem Lens

Poem Lens translates poetry across 20 languages while preserving tone and imagery, then explains its meaning, cultural context, and the poet behind it.

## Stack

- **Frontend:** React, Vite, Tailwind CSS
- **API:** Express 5, Google Gemini
- **Monorepo:** pnpm workspaces

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (22+ recommended)
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows:

   ```cmd
   copy .env.example .env
   ```

3. Add your [Google Gemini API key](https://aistudio.google.com/apikey) to `.env`:

   ```
   GEMINI_API_KEY=your_key_here
   ```

4. Start the app.

   **Windows (easiest):** double-click `start-poem-lens.bat`

   **Manual:** run in two terminals from the project root:

   ```bash
   pnpm --filter @workspace/api-server run dev
   pnpm --filter @workspace/poem-app run dev
   ```

5. Open [http://127.0.0.1:25973](http://127.0.0.1:25973)

## Environment variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (required) |
| `PORT` | API server port (default: `8080`) |
| `POEM_APP_PORT` | Frontend dev server port (default: `25973`) |
| `BASE_PATH` | Frontend base path (default: `/`) |

See `.env.example` for the full list.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run typecheck` | Typecheck all packages |
| `pnpm run build` | Typecheck and build all packages |
| `pnpm --filter @workspace/api-server run dev` | Run API server |
| `pnpm --filter @workspace/poem-app run dev` | Run frontend |

## Deploying on Vercel

This repo is configured for [Vercel](https://vercel.com): the React app is served as static files and `/api/*` runs as serverless functions.

1. Push the repo to GitHub.
2. In Vercel, **Add New Project** → import your GitHub repo.
3. Leave the detected settings as-is (`vercel.json` handles build/output).
4. Add an environment variable:
   - `GEMINI_API_KEY` = your [Google Gemini API key](https://aistudio.google.com/apikey)
5. Deploy.

Optional env vars: `BASE_PATH=/` (default).

**Note:** Poem translation calls Gemini and can take 15–30 seconds. Vercel Hobby allows up to 10s per function; **Pro** allows up to 60s (configured in `vercel.json`). If translations time out on Hobby, upgrade to Pro or host the API elsewhere.

## Deploying on Replit

Set `GEMINI_API_KEY` in **Replit Secrets** (Tools → Secrets). Do not commit API keys to the repository.

## License

MIT
