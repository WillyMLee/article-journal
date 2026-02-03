import { refineTopicTitles, generateDynamicBrainstormTopics } from './openai';

export interface NewsArticle {
  title: string;
  link: string;
  summary: string;
  source: string;
}

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Multiple RSS feed sources for diverse news
const RSS_FEEDS = [
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', name: 'Yahoo Finance' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', name: 'NY Times Business' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
];

export const fetchYahooFinanceNews = async (): Promise<NewsArticle[]> => {
  try {
    const response = await fetch(
      `${CORS_PROXY}${encodeURIComponent('https://finance.yahoo.com/news/')}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const html = await response.text();
    const articles = parseNewsFromHTML(html);
    return articles.slice(0, 8);
  } catch (error) {
    console.error('Error fetching Yahoo Finance news:', error);
    return getDefaultTopics();
  }
};

// Fetch from multiple RSS feeds, refine with AI, and mix with dynamic brainstorm topics
export const fetchMixedTopics = async (): Promise<NewsArticle[]> => {
  const allArticles: NewsArticle[] = [];
  
  // Fetch from multiple sources in parallel
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feed.url)}`);
      if (!response.ok) return [];
      
      const xml = await response.text();
      return parseRSSFeed(xml, feed.name);
    } catch (error) {
      console.error(`Error fetching ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  });

  // Deduplicate and select news articles
  const uniqueNews = deduplicateArticles(allArticles);
  const newsSelection = shuffleArray(uniqueNews).slice(0, 8);
  
  // Refine RSS titles using AI (DeepSeek or OpenAI)
  let refinedNews: NewsArticle[] = newsSelection;
  if (newsSelection.length > 0) {
    try {
      const titles = newsSelection.map(n => n.title);
      const refined = await refineTopicTitles(titles);
      refinedNews = refined.map((r, i) => ({
        title: r.title,
        link: newsSelection[i]?.link || '#',
        summary: r.summary,
        source: newsSelection[i]?.source || 'News',
      }));
    } catch (error) {
      console.log('AI refinement unavailable, using original titles');
    }
  }
  
  // Generate dynamic brainstorm topics using AI
  let dynamicBrainstorm: NewsArticle[] = [];
  try {
    const brainstormTopics = await generateDynamicBrainstormTopics();
    dynamicBrainstorm = brainstormTopics.map(t => ({
      title: t.title,
      link: '#',
      summary: t.summary,
      source: 'Brainstorm',
    }));
  } catch (error) {
    console.log('AI brainstorm unavailable, using fallback topics');
    // Use static fallback if AI unavailable
    dynamicBrainstorm = shuffleArray(getBroadTopics()).slice(0, 4);
  }
  
  // Mix refined news with dynamic brainstorm topics
  const newsToUse = refinedNews.slice(0, 6);
  const brainstormToUse = dynamicBrainstorm.slice(0, 4);
  const mixed = shuffleArray([...newsToUse, ...brainstormToUse]);
  
  return mixed.length > 0 ? mixed.slice(0, 10) : getDefaultTopics();
};

const parseRSSFeed = (xml: string, sourceName: string): NewsArticle[] => {
  const articles: NewsArticle[] = [];
  
  // Parse RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items = xml.matchAll(itemRegex);
  
  for (const item of items) {
    if (articles.length >= 5) break; // Limit per source
    
    const content = item[1];
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = content.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
    
    if (titleMatch && titleMatch[1]) {
      const title = decodeHTMLEntities(titleMatch[1].trim());
      // Skip if title is too short or looks like an ad
      if (title.length < 15 || title.toLowerCase().includes('sponsored')) continue;
      
      articles.push({
        title,
        link: linkMatch?.[1] || '#',
        summary: descMatch?.[1] ? decodeHTMLEntities(descMatch[1].substring(0, 150)) : '',
        source: sourceName
      });
    }
  }
  
  return articles;
};

const deduplicateArticles = (articles: NewsArticle[]): NewsArticle[] => {
  const seen = new Set<string>();
  return articles.filter(article => {
    // Create a simplified key for comparison
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const parseNewsFromHTML = (html: string): NewsArticle[] => {
  const articles: NewsArticle[] = [];
  
  // Simple regex-based parsing for news headlines
  const titleRegex = /<h3[^>]*class="[^"]*Mb\(5px\)[^"]*"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
  const matches = html.matchAll(titleRegex);
  
  for (const match of matches) {
    if (articles.length >= 8) break;
    const [, link, title] = match;
    if (title && title.trim()) {
      articles.push({
        title: decodeHTMLEntities(title.trim()),
        link: link.startsWith('http') ? link : `https://finance.yahoo.com${link}`,
        summary: '',
        source: 'Yahoo Finance'
      });
    }
  }

  // Fallback: try another pattern
  if (articles.length < 4) {
    const altRegex = /"title":"([^"]+)".*?"link":"([^"]+)"/gi;
    const altMatches = html.matchAll(altRegex);
    for (const match of altMatches) {
      if (articles.length >= 8) break;
      const [, title, link] = match;
      if (title && !articles.some(a => a.title === title)) {
        articles.push({
          title: decodeHTMLEntities(title),
          link: link.startsWith('http') ? link : `https://finance.yahoo.com${link}`,
          summary: '',
          source: 'Yahoo Finance'
        });
      }
    }
  }

  return articles.length > 0 ? articles : getDefaultTopics();
};

const decodeHTMLEntities = (text: string): string => {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
};

// Broad brainstorm topics not tied to daily news - general themes from recent weeks/months
const getBroadTopics = (): NewsArticle[] => [
  {
    title: "The Future of Remote Work and Its Economic Impact",
    link: "#",
    summary: "How flexible work arrangements are reshaping real estate, cities, and productivity",
    source: "Brainstorm"
  },
  {
    title: "Generational Wealth Transfer and Investment Patterns",
    link: "#",
    summary: "How millennials and Gen Z are approaching money differently",
    source: "Brainstorm"
  },
  {
    title: "The Rise of the Creator Economy",
    link: "#",
    summary: "How individual creators are building businesses and challenging traditional media",
    source: "Brainstorm"
  },
  {
    title: "Climate Change and Business Adaptation Strategies",
    link: "#",
    summary: "How companies are preparing for and profiting from climate shifts",
    source: "Brainstorm"
  },
  {
    title: "The Changing Nature of Consumer Loyalty",
    link: "#",
    summary: "Why brand switching is accelerating and what it means for businesses",
    source: "Brainstorm"
  },
  {
    title: "Healthcare Innovation and Accessibility",
    link: "#",
    summary: "The tension between cutting-edge medicine and equitable access",
    source: "Brainstorm"
  },
  {
    title: "The Reshoring Movement in Manufacturing",
    link: "#",
    summary: "Why companies are bringing production back and what it means for jobs",
    source: "Brainstorm"
  },
  {
    title: "Privacy vs Personalization in the Digital Age",
    link: "#",
    summary: "The tradeoffs consumers make between convenience and data protection",
    source: "Brainstorm"
  },
  {
    title: "The Evolution of Higher Education's Value Proposition",
    link: "#",
    summary: "Is college still worth it? Alternative paths to career success",
    source: "Brainstorm"
  },
  {
    title: "Small Business Resilience in Uncertain Times",
    link: "#",
    summary: "Strategies that help local businesses thrive amid economic volatility",
    source: "Brainstorm"
  },
  {
    title: "The Psychology of Financial Decision-Making",
    link: "#",
    summary: "How emotions and biases shape our money choices",
    source: "Brainstorm"
  },
  {
    title: "Automation's Impact on Middle-Skill Jobs",
    link: "#",
    summary: "Which careers are at risk and how workers can adapt",
    source: "Brainstorm"
  }
];

const getDefaultTopics = (): NewsArticle[] => {
  // Mix broad brainstorm topics with some general finance themes
  const broadTopics = getBroadTopics();
  // Shuffle and return a subset
  return shuffleArray(broadTopics).slice(0, 8);
};

export const generateTopicSuggestions = (newsArticles: NewsArticle[]): string[] => {
  return newsArticles.map(article => {
    // Transform news headline into an article topic
    const topic = article.title
      .replace(/^Breaking:|^BREAKING:|^Update:|^UPDATE:/i, '')
      .trim();
    return topic;
  });
};
