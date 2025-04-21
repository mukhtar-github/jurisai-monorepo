This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## JurisAI Frontend

JurisAI is an AI-powered legal assistant for professionals in Nigeria and Africa. This frontend application communicates with the JurisAI backend services to provide document management, search, and summarization capabilities.

### Frontend-Backend Integration

The frontend-backend integration is achieved through the following components:

#### API Client

- **Client Setup**: The API client is configured in `lib/api/client.ts` using Axios, with request and response interceptors for handling authentication tokens and error responses.
- **Environment Variables**: The API URL is configured using the `NEXT_PUBLIC_API_URL` environment variable, defaulting to `http://localhost:8000`.

#### API Modules

The following API modules are available:

- **Documents API** (`lib/api/documents.ts`): Functions for document management, including listing, uploading, retrieving, analyzing, and deleting legal documents.
- **Search API** (`lib/api/search.ts`): Functions for semantic, lexical, and hybrid searches on documents, as well as finding similar documents and search suggestions.
- **Summarization API** (`lib/api/summarization.ts`): Functions for generating summaries of documents and text inputs.

#### State Management

- **React Query**: The application uses React Query for state management and caching, configured in `lib/providers/QueryProvider.tsx`.
- **Custom Hooks**: Custom hooks for each API function are available in the `lib/hooks` directory, providing easy access to data fetching and mutations.
- **Context API**: The Document Context (`lib/context/DocumentContext.tsx`) provides state management for document selection and filtering.

### Diagnostic and Debugging Tools

JurisAI includes built-in diagnostic tools to help debug issues in production environments without requiring a redeployment:

#### SummarizationDebugger Component

A hidden debugging panel that can be accessed with the `Alt+Shift+D` keyboard shortcut. It provides:

- **System Status Checking**: Verifies database connection and migration status
- **API Connectivity Testing**: Tests direct API connection 
- **Summarization Testing**: Tests the summarization functionality with a sample document
- **Enhanced Error Logging**: Can be toggled on for 1 hour to capture detailed errors
- **Database Migration Management**: For administrators, provides tools to:
  - Check migration status
  - Verify database schema
  - Apply pending migrations
  - Fix migration sequence issues

This component is particularly useful for diagnosing issues in production without needing to access the server directly.

#### Usage

To use the debugger:

1. Press `Alt+Shift+D` to toggle the debugger panel
2. Click on the relevant buttons to perform diagnostic actions
3. For admin users, additional migration management tools are available
4. The panel can be closed by clicking the × button or pressing `Alt+Shift+D` again

### Dependencies

The frontend requires the following dependencies:

```bash
npm install axios @tanstack/react-query react-hook-form zod @hookform/resolvers --legacy-peer-deps
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
