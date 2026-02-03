import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Upload,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { improveWriting } from '../services/openai';
import { publishToGitHub, convertToMarkdown } from '../services/github';

export const Editor = () => {
  const { currentArticle, updateArticle, deleteArticle, settings, setCurrentArticle } = useStore();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your article...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
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
    if (currentArticle) {
      setTitle(currentArticle.title);
      setTags(currentArticle.tags.join(', '));
      editor?.commands.setContent(currentArticle.content);
    }
  }, [currentArticle?.id]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (currentArticle) {
      updateArticle(currentArticle.id, { title: newTitle });
    }
  };

  const handleTagsChange = (newTags: string) => {
    setTags(newTags);
    if (currentArticle) {
      updateArticle(currentArticle.id, { 
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean) 
      });
    }
  };

  const handleImproveWriting = async () => {
    if (!editor || !settings.openaiApiKey) {
      setMessage({ type: 'error', text: 'Please set your OpenAI API key in settings' });
      return;
    }

    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );

    if (!selectedText) {
      setMessage({ type: 'error', text: 'Please select text to improve' });
      return;
    }

    setIsImproving(true);
    try {
      const improved = await improveWriting(selectedText);
      editor.chain().focus().deleteSelection().insertContent(improved).run();
      setMessage({ type: 'success', text: 'Text improved!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to improve text' });
    }
    setIsImproving(false);
  };

  const handlePublish = async () => {
    if (!currentArticle) return;
    
    if (!settings.githubToken || !settings.githubRepo) {
      setMessage({ type: 'error', text: 'Please configure GitHub settings first' });
      return;
    }

    setIsPublishing(true);
    try {
      const markdown = convertToMarkdown(
        currentArticle.title,
        editor?.getText() || '',
        currentArticle.tags
      );
      
      const filename = `_posts/${new Date().toISOString().split('T')[0]}-${
        currentArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      }.md`;

      const result = await publishToGitHub(
        {
          token: settings.githubToken,
          repo: settings.githubRepo,
          branch: settings.githubBranch,
        },
        filename,
        markdown,
        `Add article: ${currentArticle.title}`
      );

      if (result.success) {
        updateArticle(currentArticle.id, { 
          status: 'published',
          publishedUrl: result.url 
        });
        setMessage({ type: 'success', text: 'Published successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to publish' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to publish article' });
    }
    setIsPublishing(false);
  };

  const handleDelete = () => {
    if (currentArticle && window.confirm('Are you sure you want to delete this article?')) {
      deleteArticle(currentArticle.id);
      setCurrentArticle(null);
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!currentArticle) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500">
          <FileTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select an article or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
          <Italic size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>
          <Heading3 size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
          <Quote size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>
          <Code size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={addLink}>
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage}>
          <ImageIcon size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()}>
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()}>
          <Redo size={18} />
        </ToolbarButton>
        
        <div className="flex-1" />
        
        <button
          onClick={handleImproveWriting}
          disabled={isImproving}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 text-sm"
        >
          <Sparkles size={16} />
          {isImproving ? 'Improving...' : 'Improve'}
        </button>
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 text-sm"
        >
          <Upload size={16} />
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-2 text-sm ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Title & Tags */}
      <div className="border-b border-slate-200 p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Article Title"
          className="w-full text-3xl font-bold text-slate-800 outline-none placeholder:text-slate-300"
        />
        <input
          type="text"
          value={tags}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="Tags (comma separated)"
          className="w-full mt-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto prose-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
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

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
