import { useState } from 'react';
import { Lightbulb, Send, Trash2, FileText, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateBrainstormIdeas, generateOutline, initializeOpenAI } from '../services/openai';
import { BrainstormIdea } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const Brainstorm = () => {
  const { ideas, addIdea, deleteIdea, settings, currentArticle, updateArticle } = useStore();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (type: 'ideas' | 'outline') => {
    if (!topic.trim()) return;
    
    if (!settings.openaiApiKey) {
      setError('Please set your OpenAI API key in settings');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      initializeOpenAI(settings.openaiApiKey);
      const result = type === 'ideas' 
        ? await generateBrainstormIdeas(topic)
        : await generateOutline(topic);
      
      setGeneratedContent(result);
      
      // Save as an idea
      const newIdea: BrainstormIdea = {
        id: generateId(),
        content: `**${type === 'ideas' ? 'Ideas' : 'Outline'} for "${topic}"**\n\n${result}`,
        createdAt: new Date(),
        articleId: currentArticle?.id,
      };
      addIdea(newIdea);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    }
    
    setIsGenerating(false);
  };

  const handleUseInArticle = (idea: BrainstormIdea) => {
    if (currentArticle) {
      const newContent = currentArticle.content + '\n\n' + idea.content;
      updateArticle(currentArticle.id, { content: newContent });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="text-yellow-500" size={24} />
          <h2 className="text-xl font-semibold text-slate-800">Brainstorm Ideas</h2>
        </div>
        
        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic to brainstorm..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate('ideas')}
          />
          <button
            onClick={() => handleGenerate('ideas')}
            disabled={isGenerating || !topic.trim()}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Ideas
          </button>
          <button
            onClick={() => handleGenerate('outline')}
            disabled={isGenerating || !topic.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
            Outline
          </button>
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Latest Generation</h3>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
            {generatedContent}
          </div>
        </div>
      )}

      {/* Saved Ideas */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="font-medium text-slate-700 mb-3">Saved Ideas ({ideas.length})</h3>
        
        {ideas.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No saved ideas yet. Start brainstorming above!
          </p>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm"
              >
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap mb-3">
                  {idea.content}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    {currentArticle && (
                      <button
                        onClick={() => handleUseInArticle(idea)}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FileText size={14} />
                        Add to Article
                      </button>
                    )}
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
