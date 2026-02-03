import { 
  FileText, 
  Lightbulb, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  PlusCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Article } from '../types';
import { format } from 'date-fns';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const Sidebar = () => {
  const { 
    articles, 
    currentArticle, 
    sidebarOpen, 
    activePanel,
    addArticle,
    setCurrentArticle,
    setSidebarOpen,
    setActivePanel 
  } = useStore();

  const createNewArticle = () => {
    const newArticle: Article = {
      id: generateId(),
      title: 'Untitled Article',
      content: '',
      excerpt: '',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    addArticle(newArticle);
    setCurrentArticle(newArticle);
    setActivePanel('editor');
  };

  const navItems = [
    { id: 'editor' as const, icon: FileText, label: 'Editor' },
    { id: 'brainstorm' as const, icon: Lightbulb, label: 'Brainstorm' },
    { id: 'chat' as const, icon: MessageSquare, label: 'AI Assistant' },
    { id: 'charts' as const, icon: BarChart3, label: 'Charts' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div 
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {sidebarOpen && (
          <h1 className="text-lg font-bold text-primary-400">Article Journal</h1>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 hover:bg-slate-700 rounded"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
              activePanel === item.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <item.icon size={20} />
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Articles List */}
      {sidebarOpen && (
        <div className="border-t border-slate-700 flex-1 overflow-hidden flex flex-col">
          <div className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Articles</span>
            <button
              onClick={createNewArticle}
              className="p-1 hover:bg-slate-700 rounded text-primary-400"
              title="New Article"
            >
              <PlusCircle size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {articles.length === 0 ? (
              <p className="text-sm text-slate-500 px-2">No articles yet</p>
            ) : (
              articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => {
                    setCurrentArticle(article);
                    setActivePanel('editor');
                  }}
                  className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${
                    currentArticle?.id === article.id
                      ? 'bg-slate-700'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{article.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      article.status === 'published' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {article.status}
                    </span>
                    <span>{format(new Date(article.updatedAt), 'MMM d')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
