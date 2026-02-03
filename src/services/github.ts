interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
}

export const publishToGitHub = async (
  config: GitHubConfig,
  filename: string,
  content: string,
  commitMessage: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const { token, repo, branch } = config;
  
  if (!token || !repo) {
    return { success: false, error: 'GitHub token and repo are required' };
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return { success: false, error: 'Invalid repo format. Use: owner/repo-name' };
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filename}`;

  try {
    // Check if file exists
    let sha: string | undefined;
    try {
      const existingFile = await fetch(apiUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (existingFile.ok) {
        const data = await existingFile.json();
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, that's fine
    }

    // Create or update file
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(content))),
        branch,
        ...(sha && { sha }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to publish' };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.content.html_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const convertToMarkdown = (title: string, content: string, tags: string[]): string => {
  const date = new Date().toISOString().split('T')[0];
  const frontmatter = `---
title: "${title}"
date: ${date}
tags: [${tags.map(t => `"${t}"`).join(', ')}]
---

`;
  return frontmatter + content;
};
