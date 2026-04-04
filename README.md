# Reference Catalog

Reference Catalog is a lightweight web app for creating, browsing, and exporting reusable reference artifacts such as ontologies, taxonomies, models, schemas, and configuration assets.

## Features

- Create and manage structured references with tags, versioning, and nested nodes.
- Support both structured references and free-text references (Markdown/Other).
- AI-assisted generation and additive augmentation for faster authoring.
- JSON and Markdown export endpoints.
- Simple local persistence with NeDB.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and update values as needed.

```bash
cp .env.example .env.local
```

### 3. Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Enables LLM generation/augmentation when set. |
| `AI_MODEL` | No | Default model for LLM calls. Defaults to `gpt-5.2`. |
| `NODE_ENV` | No | Standard Node runtime mode. |

If no API key is configured, AI generation falls back to a local heuristic mode.

## Public API Overview

- `GET /api/references`: search/list references (`q`, `type`, `tags` query params).
- `POST /api/references`: create a reference.
- `GET /api/references/:id`: fetch one reference.
- `PUT /api/references/:id`: update a reference.
- `DELETE /api/references/:id`: delete a reference.
- `GET /api/references/:id/export?format=json|markdown`: download export.
- `POST /api/ai/generate`: generate a draft reference from prompt text.
- `POST /api/references/:id/augment`: additive updates for an existing reference.

## Security Notes

- LLM API keys are write-only in the settings API and are never returned in responses.
- Reference write endpoints validate and sanitize input payloads.
- Overly large node trees and invalid payloads are rejected.

## Deployment

Use the provided deployment scripts and docs:

- `dp_remote.bat`
- `deploy.ps1`
- `deploy-remote.sh`
- `DEPLOY.md`
- `DEPLOYMENT.md`

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- NeDB (`nedb-promises`)
