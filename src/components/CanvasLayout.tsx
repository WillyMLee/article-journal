import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Heading2,
  Heading3,
  Send,
  Loader2,
  MessageSquare,
  Trash2,
  PenLine,
  Sparkles,
  TrendingUp,
  RefreshCw,
  ImagePlus,
  BarChart3,
  Link2,
  Table,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { askAssistant, initializeOpenAI, generateOutline } from '../services/openai';
import { ArticleSidebar } from './ArticleSidebar';
import { ArticleOutline } from './ArticleOutline';
import { ArticleAnnotation, ChatChoice, OutlineItem } from '../types';
import { TypedMessage } from './TypedMessage';
import { fetchMixedTopics, NewsArticle } from '../services/yahoo-finance';

const ANNOTATION_COLORS = {
  'good': { bg: '#bbf7d0', light: 'bg-green-100', text: 'text-green-700', label: '✓ Good' },
  'needs-work': { bg: '#fecaca', light: 'bg-red-100', text: 'text-red-700', label: '⚠ Needs Work' },
  'needs-replanning': { bg: '#fef08a', light: 'bg-yellow-100', text: 'text-yellow-700', label: '↻ Replan' },
  'summary': { bg: '#ddd6fe', light: 'bg-purple-100', text: 'text-purple-700', label: '📖 Summary' },
};

export const CanvasLayout = () => {
  const { 
    currentArticle, 
    updateArticle, 
    settings, 
    chatMessages, 
    addChatMessage,
    addArticle,
    setCurrentArticle
  } = useStore();
  
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<ArticleAnnotation[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Brainstorm start page state
  const [topicInput, setTopicInput] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<NewsArticle[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [currentAnimatingId, setCurrentAnimatingId] = useState<string | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);

  // Determine if we're in planning phase (no content yet, or just started)
  const isInPlanningPhase = currentArticle && (
    !currentArticle.content || 
    currentArticle.content.trim() === '' ||
    currentArticle.title === 'New Topic Idea'
  );

  // Load trending topics on mount
  useEffect(() => {
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    setIsLoadingTopics(true);
    const news = await fetchMixedTopics();
    setTrendingTopics(news);
    setIsLoadingTopics(false);
  };

  const handleStartArticle = async (topic: string) => {
    if (!topic.trim()) return;
    setIsGeneratingArticle(true);

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
    setIsGeneratingArticle(false);
    setTopicInput('');
  };

  // Load annotations from article when it changes
  useEffect(() => {
    if (currentArticle?.annotations) {
      setAnnotations(currentArticle.annotations);
    } else {
      setAnnotations([]);
    }
  }, [currentArticle?.id]);

  // Save annotations to article when they change
  useEffect(() => {
    if (currentArticle && annotations.length >= 0) {
      updateArticle(currentArticle.id, { annotations });
    }
  }, [annotations]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your article...',
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Highlight.configure({ multicolor: true }),
    ],
    content: currentArticle?.content || '',
    onUpdate: ({ editor }) => {
      if (currentArticle) {
        const content = editor.getHTML();
        const text = editor.getText();
        updateArticle(currentArticle.id, {
          content,
          excerpt: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
        });
      }
    },
  });

  useEffect(() => {
    if (currentArticle && editor) {
      editor.commands.setContent(currentArticle.content);
    }
  }, [currentArticle?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleChoiceSelect = (choice: ChatChoice) => {
    handleChatSend(choice.value);
  };

  // Track planning phase for the 3-round limit
  const getPlanningPhase = (): 'angle' | 'thesis' | 'outline' | 'writing' => {
    const messageCount = chatMessages.filter(m => m.role === 'assistant').length;
    if (messageCount === 0) return 'angle';
    if (messageCount === 1) return 'thesis';
    if (messageCount >= 2) return 'outline';
    return 'writing';
  };

  const generateInteractiveResponse = async (userInput: string, context: string): Promise<{
    content: string;
    thinkingSteps: string[];
    choices?: ChatChoice[];
    outlineItems?: OutlineItem[];
    suggestedTitle?: string;
  }> => {
    const isNewArticle = currentArticle?.title === 'New Topic Idea' || !currentArticle?.content;
    const planningPhase = getPlanningPhase();
    const isPlanning = planningPhase !== 'writing' && (
      userInput.toLowerCase().includes('plan') || 
      userInput.toLowerCase().includes('outline') ||
      userInput.toLowerCase().includes('structure') ||
      userInput.toLowerCase().includes('write about') ||
      userInput.toLowerCase().includes('article about') ||
      isNewArticle
    );

    // Background orchestration for writing best practices (PEEL structure)
    const writingFramework = `
=== INTERNAL WRITING FRAMEWORK ===
Structure: Point → Evidence → Explain → Link (PEEL)
- Thesis must be arguable, specific, and provable
- Each section needs: claim + evidence + analysis
- Max 3 planning rounds, then produce outline
===`;

    const systemPrompt = isPlanning 
      ? `${writingFramework}

You recommend article directions like a thoughtful editor. Be concise and specific.

PHASE: ${planningPhase.toUpperCase()} (${3 - chatMessages.filter(m => m.role === 'assistant').length} rounds left)

[THINKING]
- Brief analysis of the topic
- What angles are most compelling
[/THINKING]

${isNewArticle ? `[TITLE]
Short punchy title (3-6 words)
[/TITLE]

` : ''}One sentence of context, then present your recommendations.

[CHOICES]
For each option use this EXACT format (topic on first line, description on second):
**Topic or Direction Title**
One sentence explaining what this explores and why it's worth pursuing.

Example format:
**The Fed's Credibility Problem**
Argues that recent policy reversals have eroded market trust, using bond yield data as evidence.

**Rate Cuts Won't Save Housing**
Makes the case that structural supply issues matter more than mortgage rates for affordability.

Provide 3-4 options like this, each with a bold title and one-line description.
[/CHOICES]

${planningPhase === 'outline' ? `[OUTLINE]
**Thesis:** [One arguable sentence]

1. **[Argument 1 title]** - [What you'll prove and key evidence]
2. **[Argument 2 title]** - [What you'll prove and key evidence]
3. **[Argument 3 title]** - [What you'll prove and key evidence]
4. **Conclusion** - [The "so what" takeaway for readers]
[/OUTLINE]` : ''}

RULES:
- Options must be SPECIFIC angles, not generic categories
- Each option = bold title + one descriptive sentence
- Be opinionated about which direction is strongest
- ${planningPhase === 'outline' ? 'MUST include [OUTLINE] now' : 'Keep momentum, guide toward thesis'}`
      : `You are a focused writing assistant helping execute an article plan.

[THINKING]
- What the user needs
- Best way to help
[/THINKING]

Your helpful, direct response.

[CHOICES] (if there are clear next actions)
✏️ Next logical step | Action prompt
📝 Alternative approach | Action prompt
[/CHOICES]`;

    const response = await askAssistant(
      `${systemPrompt}\n\nUser request: ${userInput}`,
      context
    );

    // Parse the response
    const thinkingMatch = response.match(/\[THINKING\]([\s\S]*?)\[\/THINKING\]/);
    const titleMatch = response.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
    const choicesMatch = response.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/);
    const outlineMatch = response.match(/\[OUTLINE\]([\s\S]*?)\[\/OUTLINE\]/);

    const thinkingSteps = thinkingMatch 
      ? thinkingMatch[1].trim().split('\n').map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
      : ['Analyzing your request...', 'Formulating response...'];

    // Extract content - everything that's not in brackets
    let content = response
      .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '')
      .replace(/\[TITLE\][\s\S]*?\[\/TITLE\]/g, '')
      .replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/g, '')
      .replace(/\[OUTLINE\][\s\S]*?\[\/OUTLINE\]/g, '')
      .trim();

    const suggestedTitle = titleMatch ? titleMatch[1].trim() : undefined;

    let choices: ChatChoice[] | undefined;
    if (choicesMatch) {
      const choiceText = choicesMatch[1].trim();
      // Parse **Title** + description format
      const choiceBlocks = choiceText.split(/\n(?=\*\*)/).filter(Boolean);
      choices = choiceBlocks.map((block, i) => {
        const lines = block.trim().split('\n');
        const titleMatch = lines[0]?.match(/\*\*(.+?)\*\*/);
        const title = titleMatch ? titleMatch[1].trim() : lines[0]?.trim() || '';
        const description = lines.slice(1).join(' ').trim();
        return {
          id: `choice-${i}`,
          label: title,
          value: `I want to explore: ${title}. ${description}`,
          description: description,
        };
      }).filter(c => c.label);
    }

    let outlineItems: OutlineItem[] | undefined;
    if (outlineMatch) {
      const outlineLines = outlineMatch[1].trim().split('\n').filter(Boolean);
      outlineItems = outlineLines.map((line, i) => ({
        id: `outline-${Date.now()}-${i}`,
        title: line.replace(/^[\d\.\-\*\•\s]+/, '').trim(),
        completed: false,
      }));
    }

    return { content, thinkingSteps, choices, outlineItems, suggestedTitle };
  };

  const handleChatSend = async (directInput?: string) => {
    const inputToSend = directInput || chatInput;
    if (!inputToSend.trim()) return;
    
    const userMessage = {
      id: Math.random().toString(36).substring(2, 15),
      role: 'user' as const,
      content: inputToSend,
      createdAt: new Date(),
    };
    addChatMessage(userMessage);
    const userInput = inputToSend;
    setChatInput('');
    setIsLoading(true);
    setThinkingSteps(['Understanding your request...']);

    if (!settings.openaiApiKey) {
      const msgId = Math.random().toString(36).substring(2, 15);
      setCurrentAnimatingId(msgId);
      addChatMessage({
        id: msgId,
        role: 'assistant',
        content: '⚠️ Please add your OpenAI API key in settings to use AI assistance.',
        createdAt: new Date(),
        isAnimating: true,
      });
      setIsLoading(false);
      return;
    }

    try {
      initializeOpenAI(settings.openaiApiKey);
      
      // Build context
      const articleContext = currentArticle 
        ? `Article Title: ${currentArticle.title}\n\nCurrent Content:\n${editor?.getText() || '(empty)'}`
        : 'No article selected yet.';
      
      const annotationContext = annotations.length > 0
        ? `\n\nAnnotations:\n${annotations.map(a => 
            `- [${a.type.toUpperCase()}] "${a.text}"${a.summary ? ` (Summary: ${a.summary})` : ''}`
          ).join('\n')}`
        : '';

      const fullContext = articleContext + annotationContext;
      
      // Show thinking steps progressively
      setThinkingSteps(['Analyzing your request...']);
      await new Promise(r => setTimeout(r, 300));
      setThinkingSteps(prev => [...prev, 'Considering article context...']);
      await new Promise(r => setTimeout(r, 300));
      setThinkingSteps(prev => [...prev, 'Generating response...']);

      const result = await generateInteractiveResponse(userInput, fullContext);
      
      setThinkingSteps(result.thinkingSteps);
      await new Promise(r => setTimeout(r, 500));

      const msgId = Math.random().toString(36).substring(2, 15);
      setCurrentAnimatingId(msgId);
      
      addChatMessage({
        id: msgId,
        role: 'assistant',
        content: result.content,
        createdAt: new Date(),
        isAnimating: true,
        choices: result.choices,
        thinkingSteps: result.thinkingSteps,
      });

      // Auto-title the article if a title is suggested and this is the first response
      // (current title is default or this is the first assistant message)
      const isFirstResponse = chatMessages.filter(m => m.role === 'assistant').length === 0;
      if (result.suggestedTitle && currentArticle && (
        currentArticle.title === 'New Topic Idea' || 
        isFirstResponse ||
        currentArticle.title.startsWith('Help me write an article about:')
      )) {
        updateArticle(currentArticle.id, { title: result.suggestedTitle });
      }

      // Auto-populate outline if provided
      if (result.outlineItems && result.outlineItems.length > 0 && currentArticle) {
        const existingOutline = (currentArticle.outline as OutlineItem[]) || [];
        updateArticle(currentArticle.id, { 
          outline: [...existingOutline, ...result.outlineItems] 
        } as any);
      }

    } catch (error) {
      const msgId = Math.random().toString(36).substring(2, 15);
      setCurrentAnimatingId(msgId);
      addChatMessage({
        id: msgId,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        createdAt: new Date(),
        isAnimating: true,
      });
    }

    setIsLoading(false);
    setThinkingSteps([]);
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim() || !editor) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    setShowImageModal(false);
  };

  const handleInsertChart = (chartType: string) => {
    if (!editor) return;
    const chartPlaceholder = `
<div class="chart-placeholder" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0ea5e9; border-radius: 8px; padding: 32px; text-align: center; margin: 16px 0;">
  <p style="color: #0369a1; font-weight: 600; margin-bottom: 8px;">📊 ${chartType} Chart</p>
  <p style="color: #64748b; font-size: 14px;">Click to edit chart data in the Charts panel</p>
</div>`;
    editor.chain().focus().insertContent(chartPlaceholder).run();
    setShowChartModal(false);
  };

  const handleInsertTable = () => {
    if (!editor) return;
    const tableHtml = `
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <thead>
    <tr style="background: #f1f5f9;">
      <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Header 1</th>
      <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Header 2</th>
      <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 1</td>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 2</td>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 3</td>
    </tr>
    <tr>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 4</td>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 5</td>
      <td style="border: 1px solid #e2e8f0; padding: 8px 12px;">Data 6</td>
    </tr>
  </tbody>
</table>`;
    editor.chain().focus().insertContent(tableHtml).run();
  };

  const handleInsertLink = () => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Determine current step for getting started
  const getCurrentStep = () => {
    if (!currentArticle) return 0;
    if (currentArticle.title === 'New Topic Idea') return 1;
    const outline = (currentArticle.outline as OutlineItem[]) || [];
    if (outline.length === 0) return 2;
    const content = currentArticle.content?.replace(/<[^>]*>/g, '').trim() || '';
    if (content.length < 100) return 3;
    return 4;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <ArticleSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Article Outline - only shown when article selected and NOT in planning phase */}
        {currentArticle && !isInPlanningPhase && <ArticleOutline />}

        {/* Planning Phase: GPT-like full-width chat interface */}
        {currentArticle && isInPlanningPhase ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Dynamic Outline Panel - updates during planning */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-purple-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary-500" size={16} />
                  <h2 className="font-semibold text-slate-700 text-sm">Planning</h2>
                </div>
                <input
                  type="text"
                  value={currentArticle.title}
                  onChange={(e) => updateArticle(currentArticle.id, { title: e.target.value })}
                  className="w-full mt-2 text-sm font-medium text-slate-800 bg-white/50 px-2 py-1 rounded border border-slate-200 outline-none focus:border-primary-400"
                  placeholder="Article Title..."
                />
              </div>
              
              {/* Dynamic Outline Preview */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Outline Preview</p>
                  {currentArticle.outline && (currentArticle.outline as OutlineItem[]).length > 0 ? (
                    <div className="space-y-1">
                      {(currentArticle.outline as OutlineItem[]).map((item, idx) => (
                        <div key={item.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-md text-xs">
                          <span className="text-primary-500 font-medium">{idx + 1}.</span>
                          <span className="text-slate-600">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded-md">
                      Outline will appear here as you plan...
                    </div>
                  )}
                </div>
                
                {/* Planning Progress */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Progress</p>
                  <div className="space-y-1">
                    {[
                      { step: 1, label: 'Topic & Angle', done: chatMessages.length >= 1 },
                      { step: 2, label: 'Thesis Statement', done: chatMessages.filter(m => m.role === 'assistant').length >= 2 },
                      { step: 3, label: 'Outline Structure', done: (currentArticle.outline as OutlineItem[])?.length > 0 },
                    ].map((item) => (
                      <div key={item.step} className={`flex items-center gap-2 p-1.5 rounded text-xs ${item.done ? 'text-green-600' : 'text-slate-400'}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${item.done ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                          {item.done ? <CheckCircle2 size={10} /> : item.step}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Writing Button */}
                {(currentArticle.outline as OutlineItem[])?.length > 0 && (
                  <button
                    onClick={() => {
                      // Transition to writing phase by adding initial content
                      const outlineContent = (currentArticle.outline as OutlineItem[])
                        .map((item, idx) => `<h2>${idx + 1}. ${item.title}</h2><p></p>`)
                        .join('\n');
                      updateArticle(currentArticle.id, { content: outlineContent });
                    }}
                    className="mt-4 w-full py-2 px-3 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <PenLine size={14} />
                    Start Writing
                  </button>
                )}
              </div>
            </div>

            {/* GPT-like Chat Interface - Full Width */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg mb-4">
                        <Sparkles size={28} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Let's plan your article</h2>
                      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                        I'll help you develop a compelling angle, thesis, and structure. What would you like to write about?
                      </p>
                      
                      {/* Trending Topics in Planning */}
                      <div className="max-w-lg mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <TrendingUp size={14} className="text-green-500" />
                          <span className="text-xs font-medium text-slate-600">Topic Ideas</span>
                          <button
                            onClick={() => loadTrendingTopics()}
                            disabled={isLoadingTopics}
                            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                          >
                            <RefreshCw size={10} className={isLoadingTopics ? 'animate-spin' : ''} />
                            Refresh
                          </button>
                        </div>
                        {isLoadingTopics ? (
                          <div className="grid grid-cols-2 gap-2">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {trendingTopics.slice(0, 6).map((topic, index) => (
                              <button
                                key={index}
                                onClick={() => handleChatSend(`Help me write an article about: ${topic.title}`)}
                                className="text-left p-2 bg-white border border-slate-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all group text-xs"
                              >
                                <p className="text-slate-700 group-hover:text-primary-600 line-clamp-2">{topic.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{topic.source}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex animate-fadeIn ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <TypedMessage
                              content={message.content}
                              isAnimating={message.isAnimating && message.id === currentAnimatingId}
                              thinkingSteps={message.thinkingSteps}
                              choices={message.choices}
                              onChoiceSelect={handleChoiceSelect}
                              onAnimationComplete={() => setCurrentAnimatingId(null)}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && thinkingSteps.length > 0 && (
                    <div className="flex justify-start animate-fadeIn">
                      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm max-w-[80%]">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                          <Loader2 className="animate-spin" size={14} />
                          <span className="font-medium text-xs">Thinking...</span>
                        </div>
                        <div className="space-y-1 pl-5 border-l-2 border-purple-200">
                          {thinkingSteps.map((step, i) => (
                            <div key={i} className="text-xs text-slate-500 animate-slideIn" style={{ animationDelay: `${i * 100}ms` }}>
                              • {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input - Centered GPT Style */}
              <div className="border-t border-slate-200 bg-white p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe your article idea or select a topic above..."
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none min-h-[48px] max-h-32"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSend();
                        }
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                      }}
                    />
                    <button
                      onClick={() => handleChatSend()}
                      disabled={isLoading || !chatInput.trim()}
                      className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentArticle ? (
          /* Draft/Writing Phase: Editor with sidebar */
          <div className="flex-1 flex flex-col overflow-hidden bg-white border-x border-slate-200">
            {/* Article Title Bar */}
            <div className="border-b border-slate-200 px-4 py-2">
              <input
                type="text"
                value={currentArticle.title}
                onChange={(e) => updateArticle(currentArticle.id, { title: e.target.value })}
                className="w-full text-lg font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                placeholder="Article Title"
              />
            </div>

            {/* Editor Toolbar */}
            <div className="border-b border-slate-200 px-3 py-1.5 flex items-center gap-0.5 flex-wrap">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                <Bold size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                <Italic size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
                <Heading2 size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>
                <Heading3 size={14} />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                <List size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                <ListOrdered size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
                <Quote size={14} />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              
              {/* Media Insert Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  <ImagePlus size={14} />
                  <span>Insert</span>
                  <ChevronDown size={12} />
                </button>
                {showMediaMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    <button
                      onClick={() => { setShowImageModal(true); setShowMediaMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <ImagePlus size={12} />
                      Insert Image
                    </button>
                    <button
                      onClick={() => { setShowChartModal(true); setShowMediaMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <BarChart3 size={12} />
                      Insert Chart
                    </button>
                    <button
                      onClick={() => { handleInsertTable(); setShowMediaMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Table size={12} />
                      Insert Table
                    </button>
                    <button
                      onClick={() => { handleInsertLink(); setShowMediaMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Link2 size={12} />
                      Insert Link
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TipTap Editor */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <EditorContent 
                editor={editor} 
                className="prose prose-sm prose-slate max-w-none min-h-full focus:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-2"
              />
            </div>

            {/* Annotations Bar */}
            {annotations.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-2 bg-slate-50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">Annotations:</span>
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`group relative flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${ANNOTATION_COLORS[annotation.type].light} ${ANNOTATION_COLORS[annotation.type].text}`}
                      title={annotation.summary || undefined}
                    >
                      <span className="font-medium text-xs">{ANNOTATION_COLORS[annotation.type].label}</span>
                      <span className="max-w-20 truncate opacity-75 text-xs">"{annotation.text}"</span>
                      {annotation.summary && (
                        <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg max-w-64 z-10">
                          <p className="font-medium mb-1">Summary:</p>
                          <p>{annotation.summary}</p>
                        </div>
                      )}
                      <button
                        onClick={() => removeAnnotation(annotation.id)}
                        className="opacity-50 hover:opacity-100 hover:text-red-500"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Brainstorm Start Page - shown when no article is selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6 overflow-y-auto">
            <div className="max-w-xl w-full space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg">
                  <Sparkles size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">
                  What would you like to write about?
                </h1>
                <p className="text-sm text-slate-500">
                  Start with a topic or pick from trending finance news
                </p>
              </div>

              {/* Main Input */}
              <form onSubmit={(e) => { e.preventDefault(); handleStartArticle(topicInput); }} className="relative">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Enter a topic, headline, or idea..."
                  className="w-full px-4 py-3 pr-12 text-sm border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                  disabled={isGeneratingArticle}
                />
                <button
                  type="submit"
                  disabled={!topicInput.trim() || isGeneratingArticle}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingArticle ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>

              {/* Trending Topics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp size={16} />
                    <span className="text-sm font-medium">Topic Ideas</span>
                  </div>
                  <button
                    onClick={() => loadTrendingTopics()}
                    disabled={isLoadingTopics}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isLoadingTopics ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {isLoadingTopics ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {trendingTopics.slice(0, 6).map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => handleStartArticle(topic.title)}
                        disabled={isGeneratingArticle}
                        className="text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all group disabled:opacity-50"
                      >
                        <p className="font-medium text-slate-700 group-hover:text-primary-600 line-clamp-2 text-xs leading-relaxed">
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
                <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    💡 Add your OpenAI API key in settings to enable AI-powered features
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel: AI Assistant - only shown when article is selected AND NOT in planning phase */}
        {currentArticle && !isInPlanningPhase && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
          {/* Panel Header */}
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <PenLine className="text-primary-500" size={16} />
              <h2 className="font-semibold text-slate-700 text-sm">AI Writing Assistant</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Collaborate with AI to plan and write
            </p>
          </div>

          {/* Quick Actions for Article */}
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setChatInput('Write an engaging introduction for this article')}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Write Intro
                </button>
                <button
                  onClick={() => setChatInput('Expand on the current content with more details')}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Expand Content
                </button>
                <button
                  onClick={() => setChatInput('Write a compelling conclusion')}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Write Conclusion
                </button>
                <button
                  onClick={() => setChatInput('Review the article and suggest improvements')}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                Review & Improve
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="space-y-4">
                {/* Getting Started Steps */}
                <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-3 border border-primary-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="text-primary-500" size={14} />
                    <h3 className="font-semibold text-slate-700 text-xs">Getting Started</h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      { step: 1, label: 'Name your topic', done: currentStep > 1 },
                      { step: 2, label: 'Plan the outline', done: currentStep > 2 },
                      { step: 3, label: 'Write content', done: currentStep > 3 },
                      { step: 4, label: 'Review & publish', done: currentStep > 4 },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className={`flex items-center gap-2 p-1.5 rounded-md transition-all ${
                          currentStep === item.step 
                            ? 'bg-white shadow-sm border border-primary-200' 
                            : item.done 
                              ? 'opacity-60' 
                              : 'opacity-40'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          item.done 
                            ? 'bg-green-500 text-white' 
                            : currentStep === item.step 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-slate-200 text-slate-500'
                        }`}>
                          {item.done ? <CheckCircle2 size={10} /> : item.step}
                        </div>
                        <span className={`text-xs ${currentStep === item.step ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                        {currentStep === item.step && (
                          <ArrowRight size={12} className="text-primary-500 ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topic Suggestions for Step 1 */}
                {currentStep === 1 && trendingTopics.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="text-green-500" size={12} />
                      <h4 className="font-medium text-slate-700 text-xs">Trending Topics</h4>
                      <span className="text-[10px] text-slate-400">Click to start</span>
                    </div>
                    <div className="space-y-1.5">
                      {trendingTopics.slice(0, 4).map((topic, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            handleChatSend(`Help me write an article about: ${topic.title}`);
                          }}
                          className="group w-full text-left p-2 bg-slate-50 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border border-slate-100 hover:border-green-200 rounded-md transition-all duration-200"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="text-green-500 text-xs">📈</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 group-hover:text-green-700 line-clamp-2 leading-snug">
                                {topic.title}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{topic.source}</p>
                            </div>
                            <ArrowRight size={12} className="text-slate-300 group-hover:text-green-500 mt-0.5 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contextual Help */}
                <div className="text-center text-slate-400 py-3">
                  <MessageSquare className="mx-auto mb-1.5 opacity-50" size={18} />
                  <p className="text-xs font-medium">
                    {currentStep === 1 && 'Or type your own topic idea below'}
                    {currentStep === 2 && 'Ask AI to help plan your article structure'}
                    {currentStep === 3 && 'Use quick actions above or ask AI to write sections'}
                    {currentStep >= 4 && 'Review your work and make final edits'}
                  </p>
                  <p className="text-[10px] mt-0.5">
                    {currentStep === 1 && 'Try: "Write about the latest Fed interest rate decision"'}
                    {currentStep === 2 && 'Try: "Help me plan an article about..."'}
                    {currentStep === 3 && 'Try: "Write an engaging introduction"'}
                    {currentStep >= 4 && 'Try: "Review and suggest improvements"'}
                  </p>
                </div>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex animate-fadeIn ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <TypedMessage
                        content={message.content}
                        isAnimating={message.isAnimating && message.id === currentAnimatingId}
                        thinkingSteps={message.thinkingSteps}
                        choices={message.choices}
                        onChoiceSelect={handleChoiceSelect}
                        onAnimationComplete={() => setCurrentAnimatingId(null)}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && thinkingSteps.length > 0 && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm max-w-[85%]">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Loader2 className="animate-spin" size={14} />
                    <span className="font-medium">Thinking...</span>
                  </div>
                  <div className="space-y-1 pl-5 border-l-2 border-purple-200">
                    {thinkingSteps.map((step, i) => (
                      <div key={i} className="text-xs text-slate-500 animate-slideIn" style={{ animationDelay: `${i * 100}ms` }}>
                        • {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input - Textarea for text wrapping */}
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Plan your article... (Shift+Enter for new line)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none min-h-[40px] max-h-32"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
              <button
                onClick={() => handleChatSend()}
                disabled={isLoading || !chatInput.trim()}
                className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 h-10"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Image Insert Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Insert Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="text-xs text-slate-500">
                Tip: You can also paste image URLs from Unsplash, Pexels, or any public image host.
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertImage}
                  disabled={!imageUrl.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Insert Modal */}
      {showChartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowChartModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Insert Chart</h3>
            <p className="text-sm text-slate-500 mb-4">Select a chart type to insert a placeholder. You can edit the data later.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'Line', icon: '📈', desc: 'Trends over time' },
                { type: 'Bar', icon: '📊', desc: 'Compare values' },
                { type: 'Pie', icon: '🥧', desc: 'Show proportions' },
                { type: 'Doughnut', icon: '🍩', desc: 'Percentages' },
              ].map((chart) => (
                <button
                  key={chart.type}
                  onClick={() => handleInsertChart(chart.type)}
                  className="p-4 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
                >
                  <span className="text-2xl">{chart.icon}</span>
                  <p className="font-medium text-slate-700 mt-2">{chart.type}</p>
                  <p className="text-xs text-slate-500">{chart.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowChartModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ToolbarButton = ({ 
  children, 
  onClick, 
  active = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`p-2 rounded hover:bg-slate-100 transition-colors ${
      active ? 'bg-slate-200 text-primary-600' : 'text-slate-600'
    }`}
  >
    {children}
  </button>
);
