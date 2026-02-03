import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Article, BrainstormIdea, ChatMessage, ChartData, Settings } from '../types';

interface AppState {
  articles: Article[];
  currentArticle: Article | null;
  ideas: BrainstormIdea[];
  chatMessages: ChatMessage[];
  charts: ChartData[];
  settings: Settings;
  sidebarOpen: boolean;
  activePanel: 'editor' | 'brainstorm' | 'chat' | 'charts' | 'settings';
  activeView: 'start' | 'canvas' | 'settings';
  
  // Article actions
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  setCurrentArticle: (article: Article | null) => void;
  
  // Idea actions
  addIdea: (idea: BrainstormIdea) => void;
  deleteIdea: (id: string) => void;
  
  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  
  // Chart actions
  addChart: (chart: ChartData) => void;
  updateChart: (id: string, updates: Partial<ChartData>) => void;
  deleteChart: (id: string) => void;
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;
  
  // UI actions
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  setActiveView: (view: AppState['activeView']) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      articles: [],
      currentArticle: null,
      ideas: [],
      chatMessages: [],
      charts: [],
      settings: {
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
        githubToken: '',
        githubRepo: '',
        githubBranch: 'main',
      },
      sidebarOpen: false,
      activePanel: 'editor',
      activeView: 'start',

      addArticle: (article) =>
        set((state) => ({ articles: [...state.articles, article] })),
      
      updateArticle: (id, updates) =>
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
          ),
          currentArticle:
            state.currentArticle?.id === id
              ? { ...state.currentArticle, ...updates, updatedAt: new Date() }
              : state.currentArticle,
        })),
      
      deleteArticle: (id) =>
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
          currentArticle: state.currentArticle?.id === id ? null : state.currentArticle,
        })),
      
      setCurrentArticle: (article) => set({ currentArticle: article }),

      addIdea: (idea) =>
        set((state) => ({ ideas: [...state.ideas, idea] })),
      
      deleteIdea: (id) =>
        set((state) => ({ ideas: state.ideas.filter((i) => i.id !== id) })),

      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      
      clearChat: () => set({ chatMessages: [] }),

      addChart: (chart) =>
        set((state) => ({ charts: [...state.charts, chart] })),
      
      updateChart: (id, updates) =>
        set((state) => ({
          charts: state.charts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      
      deleteChart: (id) =>
        set((state) => ({ charts: state.charts.filter((c) => c.id !== id) })),

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setActivePanel: (panel) => set({ activePanel: panel }),
      
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'article-journal-storage',
    }
  )
);
