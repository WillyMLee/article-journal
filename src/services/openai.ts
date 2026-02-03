import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export const initializeOpenAI = (apiKey: string) => {
  openaiClient = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

export const getOpenAIClient = () => openaiClient;

export const generateBrainstormIdeas = async (topic: string): Promise<string> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');
  
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a creative writing assistant helping brainstorm article ideas. 
        Generate 5 unique angles or perspectives for the given topic. 
        Format each idea with a brief title and 1-2 sentence description.
        Be creative and suggest diverse approaches.`,
      },
      {
        role: 'user',
        content: `Help me brainstorm article ideas about: ${topic}`,
      },
    ],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || 'No ideas generated';
};

export const askAssistant = async (
  question: string,
  context?: string
): Promise<string> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a helpful research and writing assistant. 
      Help the user with their questions about articles, research, and writing.
      Be concise but thorough. If you're helping with writing, suggest improvements and alternatives.
      When providing data or statistics, cite sources when possible.`,
    },
  ];

  if (context) {
    messages.push({
      role: 'system',
      content: `Current article context:\n${context}`,
    });
  }

  messages.push({
    role: 'user',
    content: question,
  });

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || 'No response generated';
};

export const improveWriting = async (text: string): Promise<string> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert editor. Improve the given text for clarity, flow, and engagement.
        Maintain the author's voice while enhancing readability.
        Return only the improved text without explanations.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || text;
};

export const generateOutline = async (topic: string): Promise<string> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a content strategist. Create a detailed article outline for the given topic.
        Include: introduction hook, main sections with key points, and conclusion.
        Format with clear headings and bullet points.`,
      },
      {
        role: 'user',
        content: `Create an article outline for: ${topic}`,
      },
    ],
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || 'No outline generated';
};

// Refine RSS titles to make them more sensible article topics
export const refineTopicTitles = async (titles: string[]): Promise<{ title: string; summary: string }[]> => {
  // Try local DeepSeek first, fall back to OpenAI
  try {
    return await refineWithLocalModel(titles);
  } catch {
    if (openaiClient) {
      return await refineWithOpenAI(titles);
    }
    // Fallback: return titles as-is with generic summaries
    return titles.map(t => ({ title: t, summary: 'Explore this topic in depth' }));
  }
};

// Use local DeepSeek model via Ollama
const refineWithLocalModel = async (titles: string[]): Promise<{ title: string; summary: string }[]> => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-r1:1.5b',
      prompt: `You are refining news headlines into compelling article topics. For each headline, create a broader, more engaging article topic title and a brief 1-sentence summary of the angle.

Headlines:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Respond in JSON format only:
[{"title": "Refined Topic Title", "summary": "Brief angle description"}, ...]`,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error('Local model unavailable');
  
  const data = await response.json();
  const text = data.response || '';
  
  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse local model response');
};

// Use OpenAI as fallback
const refineWithOpenAI = async (titles: string[]): Promise<{ title: string; summary: string }[]> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You refine news headlines into compelling article topics. For each headline, create a broader, more engaging article topic title and a brief 1-sentence summary describing the angle. Respond in JSON array format only.`,
      },
      {
        role: 'user',
        content: `Refine these headlines into article topics:\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nRespond as JSON: [{"title": "...", "summary": "..."}, ...]`,
      },
    ],
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return parsed.topics || parsed.results || Object.values(parsed)[0] || titles.map(t => ({ title: t, summary: '' }));
};

// Generate dynamic brainstorm topics (not fixed)
export const generateDynamicBrainstormTopics = async (): Promise<{ title: string; summary: string }[]> => {
  // Try local DeepSeek first, fall back to OpenAI
  try {
    return await generateBrainstormWithLocalModel();
  } catch {
    if (openaiClient) {
      return await generateBrainstormWithOpenAI();
    }
    // Return empty if no AI available - will use fallback in yahoo-finance.ts
    return [];
  }
};

const generateBrainstormWithLocalModel = async (): Promise<{ title: string; summary: string }[]> => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-r1:1.5b',
      prompt: `Generate 6 diverse, thought-provoking article topic ideas. Mix business, technology, society, and economics themes. Topics should be broad enough to explore from multiple angles, relevant to current trends but not tied to specific daily news.

Respond in JSON format only:
[{"title": "Article Topic Title", "summary": "Brief 1-sentence angle or hook"}, ...]`,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error('Local model unavailable');
  
  const data = await response.json();
  const text = data.response || '';
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse local model response');
};

const generateBrainstormWithOpenAI = async (): Promise<{ title: string; summary: string }[]> => {
  if (!openaiClient) throw new Error('OpenAI not initialized');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Generate diverse, thought-provoking article topic ideas. Mix business, technology, society, economics, and culture themes. Topics should be broad enough to explore from multiple angles, relevant to current trends but not tied to specific daily news. Respond in JSON format only.`,
      },
      {
        role: 'user',
        content: `Generate 6 unique article topic ideas with brief summaries. Respond as JSON: {"topics": [{"title": "...", "summary": "..."}, ...]}`,
      },
    ],
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return parsed.topics || [];
};
