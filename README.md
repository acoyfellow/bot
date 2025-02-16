# Bot 🤖

A self-improving application that analyzes its own codebase and suggests improvements through pull requests.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/acoyfellow/bot)


## How it works

1. Analyzes its own codebase using OpenAI's GPT-4
2. Generates improvement suggestions
3. Creates pull requests automatically

## Tech Stack

- **Frontend**: Svelte + TypeScript
- **Backend**: PartyKit (WebSocket server)
- **Storage**: Cloudflare Durable Objects
- **AI**: OpenAI GPT-4 API
- **Version Control**: GitHub API

## Architecture

- WebSocket connections handle real-time communication
- Durable Objects maintain state between connections
- GPT-4 analyzes code and generates improvements
- GitHub API handles repository management

## Getting Started

1. Clone repository
2. Copy `.dev.vars.example` to `.dev.vars` for local development
3. Add your API keys to `.dev.vars`:
   ```
   OPENAI_API_KEY=your_key_here
   GITHUB_TOKEN=your_token_here
   ```
4. Run `npm install`
5. Start with `npm run dev`

