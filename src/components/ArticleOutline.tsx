import { useState } from 'react';
import { 
  ListChecks, 
  Plus, 
  Trash2, 
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateOutline, initializeOpenAI } from '../services/openai';
import { OutlineItem } from '../types';

export const ArticleOutline = () => {
  const { currentArticle, updateArticle, settings } = useStore();
  const [newItemText, setNewItemText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Parse outline from article or use default
  const [outline, setOutline] = useState<OutlineItem[]>(() => {
    if (currentArticle?.outline) {
      return currentArticle.outline as OutlineItem[];
    }
    return [];
  });

  const saveOutline = (newOutline: OutlineItem[]) => {
    setOutline(newOutline);
    if (currentArticle) {
      updateArticle(currentArticle.id, { outline: newOutline } as any);
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: OutlineItem = {
      id: Math.random().toString(36).substring(2, 15),
      title: newItemText,
      completed: false,
    };
    saveOutline([...outline, newItem]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    const newOutline = outline.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    saveOutline(newOutline);
  };

  const deleteItem = (id: string) => {
    saveOutline(outline.filter(item => item.id !== id));
  };

  const generateAIOutline = async () => {
    if (!currentArticle || !settings.openaiApiKey) return;
    
    setIsGenerating(true);
    try {
      initializeOpenAI(settings.openaiApiKey);
      const result = await generateOutline(currentArticle.title);
      
      // Parse the AI response into outline items
      const lines = result.split('\n').filter(line => line.trim());
      const newOutline: OutlineItem[] = lines
        .filter(line => /^[\d\-\*\•]/.test(line.trim()) || /^[A-Z]/.test(line.trim()))
        .slice(0, 10)
        .map(line => ({
          id: Math.random().toString(36).substring(2, 15),
          title: line.replace(/^[\d\.\-\*\•\s]+/, '').trim(),
          completed: false,
        }));
      
      if (newOutline.length > 0) {
        saveOutline(newOutline);
        
        // Generate placeholder content with headers for each outline section
        const placeholderContent = newOutline.map((item, index) => 
          `<h2>${index + 1}. ${item.title}</h2>
<p class="text-slate-400 italic">// TODO: Write content for this section</p>
<p><br></p>`
        ).join('\n');
        
        // Only add placeholders if article is empty or has minimal content
        const currentText = currentArticle.content?.replace(/<[^>]*>/g, '').trim() || '';
        if (currentText.length < 50) {
          updateArticle(currentArticle.id, { 
            content: `<h1>${currentArticle.title}</h1>\n<p><br></p>\n${placeholderContent}` 
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate outline:', error);
    }
    setIsGenerating(false);
  };

  const completedCount = outline.filter(item => item.completed).length;
  const progress = outline.length > 0 ? (completedCount / outline.length) * 100 : 0;

  if (!currentArticle) {
    return (
      <div className="w-72 bg-slate-50 border-l border-slate-200 p-4 flex items-center justify-center text-slate-400">
        <p className="text-sm">Select an article to see outline</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks size={18} className="text-primary-500" />
            <h3 className="font-semibold text-slate-700">Article Outline</h3>
          </div>
          <button
            onClick={generateAIOutline}
            disabled={isGenerating || !settings.openaiApiKey}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-purple-500 disabled:opacity-50"
            title="Generate outline with AI"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{completedCount}/{outline.length} sections</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Outline Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {outline.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <ListChecks className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">No outline yet</p>
            <p className="text-xs mt-1">Add sections or generate with AI</p>
          </div>
        ) : (
          outline.map((item, index) => (
            <div
              key={item.id}
              className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
                item.completed ? 'bg-green-50' : 'bg-white hover:bg-slate-100'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  item.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-slate-300 hover:border-primary-500'
                }`}
              >
                {item.completed && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {index + 1}. {item.title}
                </p>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add New Item */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add section..."
            className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none min-h-[36px] max-h-20"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem();
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 80) + 'px';
            }}
          />
          <button
            onClick={addItem}
            disabled={!newItemText.trim()}
            className="p-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 h-9"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
