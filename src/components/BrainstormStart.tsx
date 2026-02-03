import { useState, useEffect } from 'react';
import { Send, Sparkles, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { fetchYahooFinanceNews } from '../services/yahoo-finance';
import { useStore } from '../store/useStore';
import { generateOutline, initializeOpenAI } from '../services/openai';

interface NewsArticle {
  title: string;
  link: string;
  summary: string;
  source: string;
}

export const BrainstormStart = () => {
  const { settings, addArticle, setCurrentArticle, setActiveView } = useStore();
  const [input, setInput] = useState('');
  const [topics, setTopics] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setIsLoading(true);
    const news = await fetchYahooFinanceNews();
    setTopics(news);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTopics();
    setRefreshing(false);
  };

  const handleStartArticle = async (topic: string) => {
    if (!topic.trim()) return;

    setIsGenerating(true);

    // Create new article
    const newArticle = {
      id: Math.random().toString(36).substring(2, 15),
      title: topic,
      content: '',
      excerpt: '',
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      annotations: [],
    };

    // Try to generate an outline if API key is set
    if (settings.openaiApiKey) {
      try {
        initializeOpenAI(settings.openaiApiKey);
        const outline = await generateOutline(topic);
        newArticle.content = `<h2>Outline</h2><p>${outline.replace(/\n/g, '</p><p>')}</p>`;
      } catch (error) {
        console.error('Failed to generate outline:', error);
      }
    }

    addArticle(newArticle);
    setCurrentArticle(newArticle);
    setActiveView('canvas');
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleStartArticle(input);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg">
            <Sparkles size={32} />
          </div>
          <h1 className="text-4xl font-bold text-slate-800">
            What would you like to write about?
          </h1>
          <p className="text-lg text-slate-500">
            Start with a topic or pick from trending finance news below
          </p>
        </div>

        {/* Main Input */}
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a topic, headline, or idea..."
            className="w-full px-6 py-4 pr-14 text-lg border-2 border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Send size={24} />
            )}
          </button>
        </form>

        {/* Trending Topics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp size={20} />
              <span className="font-medium">Trending Topics from Yahoo Finance</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleStartArticle(topic.title)}
                  disabled={isGenerating}
                  className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all group disabled:opacity-50"
                >
                  <p className="font-medium text-slate-700 group-hover:text-primary-600 line-clamp-2">
                    {topic.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{topic.source}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* API Key Notice */}
        {!settings.openaiApiKey && (
          <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700">
              💡 Add your OpenAI API key in settings to enable AI-powered outline generation
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
