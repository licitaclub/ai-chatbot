<a href="https://github.com/licitaclub/ai-chatbot">
  <img alt="LicitaCLUB - Chatbot especializado en Mercado Público de Chile." src="app/(chat)/opengraph-image.png">
  <h1 align="center">LicitaCLUB</h1>
</a>

<p align="center">
  Chatbot especializado en Mercado Público de Chile impulsado por IA Gemini.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Google Gemini as default model provider
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [PostgreSQL](https://supabase.com/) via Drizzle ORM for saving chat history and user data
  - [Supabase Storage](https://supabase.com/storage) for efficient object storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Deploy Your Own

You can deploy your own version of LicitaCLUB to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flicitaclub%2Fai-chatbot&env=AUTH_SECRET,GOOGLE_GENERATIVE_AI_API_KEY,MERCADO_PUBLICO_TICKET&envDescription=Learn%20more%20about%20how%20to%20get%20the%20API%20Keys%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Flicitaclub%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=LicitaCLUB&demo-url=https%3A%2F%2Fgemini.vercel.ai)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run LicitaCLUB. Set your real API keys and deploy to Vercel, or use a `.env.local` file for local development.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various Google Cloud and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your LicitaCLUB app should now be running on [localhost:3000](http://localhost:3000/).
