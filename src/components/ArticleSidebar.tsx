import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  FileEdit, 
  CheckCircle2,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

export const ArticleSidebar = () => {
  const { 
    articles, 
    currentArticle, 
    sidebarOpen, 
    setSidebarOpen,
    setCurrentArticle,
    setActiveView,
    addArticle,
    deleteArticle,
    clearChat
  } = useStore();

  const [expandedSections, setExpandedSections] = useState({
    planned: true,
    drafts: true,
    published: false
  });

  const plannedArticles = articles.filter(a => a.status === 'draft' && !a.content);
  const draftArticles = articles.filter(a => a.status === 'draft' && a.content);
  const publishedArticles = articles.filter(a => a.status === 'published');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const createNewTopic = () => {
    // Clear previous chat messages for fresh start
    clearChat();
    
    const newArticle = {
      id: Math.random().toString(36).substring(2, 15),
      title: 'New Topic Idea',
      content: '',
      excerpt: '',
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      outline: [],
      annotations: [],
    };
    addArticle(newArticle);
    setCurrentArticle(newArticle);
    setActiveView('canvas');
  };

  const handleSelectArticle = (article: typeof articles[0]) => {
    setCurrentArticle(article);
    setActiveView('canvas');
  };

  const handleDeleteArticle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this article?')) {
      deleteArticle(id);
    }
  };

  return (
    <div 
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-12'
      }`}
    >
      {/* Toggle Button */}
      <div className="p-2 border-b border-slate-700 flex items-center justify-between">
        {sidebarOpen && (
          <span className="text-sm font-semibold text-slate-400 px-2">Articles</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {sidebarOpen ? (
        <div className="flex-1 overflow-y-auto">
          {/* New Topic Button */}
          <div className="p-2">
            <button
              onClick={createNewTopic}
              className="w-full flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Topic
            </button>
          </div>

          {/* Planned Topics */}
          <SidebarSection
            title="Planned Topics"
            icon={<Lightbulb size={16} className="text-yellow-400" />}
            count={plannedArticles.length}
            expanded={expandedSections.planned}
            onToggle={() => toggleSection('planned')}
          >
            {plannedArticles.map(article => (
              <ArticleItem
                key={article.id}
                article={article}
                isActive={currentArticle?.id === article.id}
                onSelect={() => handleSelectArticle(article)}
                onDelete={(e) => handleDeleteArticle(e, article.id)}
              />
            ))}
            {plannedArticles.length === 0 && (
              <p className="text-xs text-slate-500 px-3 py-2">No planned topics</p>
            )}
          </SidebarSection>

          {/* Drafts */}
          <SidebarSection
            title="Drafts"
            icon={<FileEdit size={16} className="text-blue-400" />}
            count={draftArticles.length}
            expanded={expandedSections.drafts}
            onToggle={() => toggleSection('drafts')}
          >
            {draftArticles.map(article => (
              <ArticleItem
                key={article.id}
                article={article}
                isActive={currentArticle?.id === article.id}
                onSelect={() => handleSelectArticle(article)}
                onDelete={(e) => handleDeleteArticle(e, article.id)}
              />
            ))}
            {draftArticles.length === 0 && (
              <p className="text-xs text-slate-500 px-3 py-2">No drafts yet</p>
            )}
          </SidebarSection>

          {/* Published */}
          <SidebarSection
            title="Published"
            icon={<CheckCircle2 size={16} className="text-green-400" />}
            count={publishedArticles.length}
            expanded={expandedSections.published}
            onToggle={() => toggleSection('published')}
          >
            {publishedArticles.map(article => (
              <ArticleItem
                key={article.id}
                article={article}
                isActive={currentArticle?.id === article.id}
                onSelect={() => handleSelectArticle(article)}
                onDelete={(e) => handleDeleteArticle(e, article.id)}
              />
            ))}
            {publishedArticles.length === 0 && (
              <p className="text-xs text-slate-500 px-3 py-2">No published articles</p>
            )}
          </SidebarSection>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 gap-3">
          <button
            onClick={createNewTopic}
            className="p-2 hover:bg-slate-700 rounded-lg text-primary-400"
            title="New Topic"
          >
            <Plus size={18} />
          </button>
          <button
            className="p-2 hover:bg-slate-700 rounded-lg text-yellow-400"
            title={`Planned (${plannedArticles.length})`}
          >
            <Lightbulb size={18} />
          </button>
          <button
            className="p-2 hover:bg-slate-700 rounded-lg text-blue-400"
            title={`Drafts (${draftArticles.length})`}
          >
            <FileEdit size={18} />
          </button>
          <button
            className="p-2 hover:bg-slate-700 rounded-lg text-green-400"
            title={`Published (${publishedArticles.length})`}
          >
            <CheckCircle2 size={18} />
          </button>
        </div>
      )}

      {/* Settings at bottom */}
      <div className="border-t border-slate-700 p-2">
        <button
          onClick={() => setActiveView('settings')}
          className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors ${
            sidebarOpen ? 'w-full' : 'w-auto mx-auto'
          }`}
        >
          <Settings size={18} />
          {sidebarOpen && <span className="text-sm">Settings</span>}
        </button>
      </div>
    </div>
  );
};

const SidebarSection = ({
  title,
  icon,
  count,
  expanded,
  onToggle,
  children
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="border-b border-slate-800">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <span className="text-xs text-slate-500">({count})</span>
      </div>
      {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
    </button>
    {expanded && <div className="pb-2">{children}</div>}
  </div>
);

const ArticleItem = ({
  article,
  isActive,
  onSelect,
  onDelete
}: {
  article: { id: string; title: string; updatedAt: Date };
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onSelect}
    className={`group flex items-center justify-between px-3 py-1.5 mx-2 rounded-lg cursor-pointer transition-colors ${
      isActive ? 'bg-slate-700' : 'hover:bg-slate-800'
    }`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm text-slate-200 truncate">{article.title}</p>
      <p className="text-xs text-slate-500">{format(new Date(article.updatedAt), 'MMM d')}</p>
    </div>
    <button
      onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-all"
    >
      <Trash2 size={12} />
    </button>
  </div>
);
