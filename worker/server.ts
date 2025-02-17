const mainRef = await fetch(
  "https://api.github.com/repos/acoyfellow/bot/git/refs/heads/main",
  {
    headers: {
      "Authorization": `Bearer ${this.githubToken}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "bot"
    }
  }
);

if (!mainRef.ok) throw new Error('GitHub API error: Failed to fetch branch reference');

const { object: { sha } } = await mainRef.json();

private async handleAnalyze(conn: Connection) {
    try {
      const code = await this.fetchCodebase();
      // ...
    } catch (error) {
      console.error(error);
      this.sendError(conn, 'Failed to analyze code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}