# Article Journal

A powerful article writing and publishing tool with AI assistance.

## Features

- **Rich Text Editor**: Write articles with a full-featured WYSIWYG editor
- **AI Brainstorming**: Generate article ideas and outlines using OpenAI
- **AI Assistant**: Ask questions and get research help powered by GPT-4
- **Data Visualization**: Create charts from economic/financial data
- **GitHub Publishing**: Publish directly to your Jekyll/Hugo blog
- **Local Storage**: All articles saved locally in your browser

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

## Configuration

### OpenAI API Key
1. Get your API key from [OpenAI Dashboard](https://platform.openai.com/api-keys)
2. Go to Settings in the app
3. Enter your API key

### GitHub Publishing
1. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` permissions
2. Go to Settings in the app
3. Enter your token, repository name (e.g., `username/username.github.io`), and branch

## Tech Stack

- React 18 + TypeScript
- Vite
- TailwindCSS
- Tiptap (Rich Text Editor)
- Chart.js
- Zustand (State Management)
- OpenAI API

## Publishing

Articles are published to your GitHub repository's `_posts` folder with Jekyll-compatible frontmatter. Netlify will automatically rebuild your site when changes are pushed.
