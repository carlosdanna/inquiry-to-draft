# Inquiry to Draft Proposal

Technical interview project for Proposales, a proposal tool for hotel sales teams.

## What it does
A hotel salesperson pastes a customer inquiry email. The app extracts event details,
suggests matching content from the hotel's Proposales library, highlights anything
uncertain, and lets the salesperson review and edit. On confirm, it creates a draft
proposal in Proposales.

## Stack (fixed)
- Next.js App Router with TypeScript, deployed on Vercel
- shadcn components
- TanStack Query for all client data fetching and mutations
- Zod for every schema (forms, route input, outside responses)
- Jev by TypeSafe as the decision model
- Proposales developer interface, version 3: https://api.proposales.com/v3,
  bearer token. Docs: https://docs.proposales.com/introduction

## Hard rules
- PROPOSALES_API_KEY and the Jev key are read only on the server, from environment
  variables. Never expose them to the browser, never prefix them with NEXT_PUBLIC.
- The browser only calls this app's own route handlers.
- Proposales and Jev client modules import "server-only".
- Nothing is written to Proposales without an explicit user confirm.
- Every outside call has a timeout and typed error handling.

## Extraction split
- Jev: event type, overnight rooms, catering, equipment, dietary notes present,
  urgency, language, content item matching. Every answer keeps its confidence.
- Plain code: guest counts, dates, contact email, and best-effort name, company, budget.
- Confidence below 0.8 or an empty value is highlighted in the review form.
- Conflicting values (for example two guest counts) are all returned, not resolved silently.

## Folder layout
- app/ pages and route handlers (app/api/analyze, app/api/proposals, app/api/content)
- lib/proposales, lib/jev, lib/extract, lib/schemas
- scripts/seed.ts
- samples/ five demo inquiry emails as .txt files

## Style
- Small, readable functions. No clever abstractions.
- Avoid acronyms in user-facing text and in comments.
- Tests with Vitest. No live outside calls in tests.
