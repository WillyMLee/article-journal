import { useState } from 'react';
import { Settings as SettingsIcon, Key, Github, Eye, EyeOff, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Settings = () => {
  const { settings, updateSettings, setActiveView, currentArticle } = useStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const [localSettings, setLocalSettings] = useState({
    openaiApiKey: settings.openaiApiKey,
    githubToken: settings.githubToken,
    githubRepo: settings.githubRepo,
    githubBranch: settings.githubBranch,
  });

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(currentArticle ? 'canvas' : 'start')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <SettingsIcon className="text-slate-500" size={24} />
          <h2 className="text-xl font-semibold text-slate-800">Settings</h2>
        </div>
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* OpenAI Settings */}
          <section className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="text-purple-500" size={20} />
              <h3 className="text-lg font-medium text-slate-800">OpenAI API</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={localSettings.openaiApiKey}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  OpenAI Dashboard
                </a>
              </p>
            </div>
          </section>

          {/* GitHub Settings */}
          <section className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Github className="text-slate-800" size={20} />
              <h3 className="text-lg font-medium text-slate-800">GitHub Publishing</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={localSettings.githubToken}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, githubToken: e.target.value })
                    }
                    placeholder="ghp_..."
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showGithubToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Create a token with repo permissions at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    GitHub Settings
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Repository
                </label>
                <input
                  type="text"
                  value={localSettings.githubRepo}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, githubRepo: e.target.value })
                  }
                  placeholder="username/repository-name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-sm text-slate-500">
                  Your personal website repository (e.g., username/username.github.io)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={localSettings.githubBranch}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, githubBranch: e.target.value })
                  }
                  placeholder="main"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              {saved ? (
                <>
                  <CheckCircle size={18} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <section className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-medium text-blue-800 mb-3">Publishing Setup</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li>Create a GitHub Personal Access Token with <code className="bg-blue-100 px-1 rounded">repo</code> permissions</li>
              <li>Enter your website repository (e.g., your Jekyll/Hugo blog)</li>
              <li>Articles will be saved to the <code className="bg-blue-100 px-1 rounded">_posts</code> folder</li>
              <li>Netlify will automatically rebuild your site when you publish</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};
