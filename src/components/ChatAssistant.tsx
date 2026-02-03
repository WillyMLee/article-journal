import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Loader2, Globe, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { askAssistant, initializeOpenAI } from '../services/openai';
import { ChatMessage } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const ChatAssistant = () => {
  const { chatMessages, addChatMessage, clearChat, settings, currentArticle } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (!settings.openaiApiKey) {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: '⚠️ Please set your OpenAI API key in settings first.',
        createdAt: new Date(),
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      createdAt: new Date(),
    };
    addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      initializeOpenAI(settings.openaiApiKey);
      const context = currentArticle 
        ? `Title: ${currentArticle.title}\nContent: ${currentArticle.content.substring(0, 2000)}`
        : undefined;
      
      const response = await askAssistant(input, context);
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        createdAt: new Date(),
      };
      addChatMessage(assistantMessage);
    } catch (error) {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        createdAt: new Date(),
      });
    }

    setIsLoading(false);
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setInput((prev) => prev + (prev ? '\n' : '') + `Reference: ${urlInput}`);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary-500" size={24} />
          <h2 className="text-xl font-semibold text-slate-800">AI Assistant</h2>
        </div>
        <button
          onClick={clearChat}
          className="text-slate-500 hover:text-red-500 p-2 rounded-lg hover:bg-slate-100"
          title="Clear chat"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare className="mx-auto mb-4 opacity-50" size={48} />
            <p>Ask me anything about your article or research.</p>
            <p className="text-sm mt-2">I can help with:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Research questions</li>
              <li>• Writing suggestions</li>
              <li>• Fact checking</li>
              <li>• Finding statistics</li>
            </ul>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="bg-white border-t border-slate-200 p-2 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter URL to reference..."
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleAddUrl}
            className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600"
          >
            Add
          </button>
          <button
            onClick={() => setShowUrlInput(false)}
            className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            title="Add URL reference"
          >
            <LinkIcon size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
        {currentArticle && (
          <p className="text-xs text-slate-500 mt-2">
            <Globe size={12} className="inline mr-1" />
            Context: {currentArticle.title}
          </p>
        )}
      </div>
    </div>
  );
};
