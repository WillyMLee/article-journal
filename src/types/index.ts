export interface OutlineItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  subItems?: { id: string; title: string; completed: boolean }[];
}

export interface ArticleAnnotation {
  id: string;
  type: 'good' | 'needs-work' | 'needs-replanning' | 'summary';
  text: string;
  summary?: string;
  from: number;
  to: number;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  publishedUrl?: string;
  outline?: OutlineItem[];
  annotations?: ArticleAnnotation[];
}

export interface BrainstormIdea {
  id: string;
  content: string;
  createdAt: Date;
  articleId?: string;
}

export interface ChatChoice {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  content: string;
  createdAt: Date;
  isAnimating?: boolean;
  choices?: ChatChoice[];
  thinkingSteps?: string[];
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }[];
  };
  articleId?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface Settings {
  openaiApiKey: string;
  githubToken: string;
  githubRepo: string;
  githubBranch: string;
}
