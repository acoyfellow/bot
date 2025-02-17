import { Server, type Connection, routePartykitRequest } from "partyserver"
import { OpenAI } from "openai"

const model = "gpt-4o-mini";

interface Env {
  OPENAI_API_KEY: string;
  GITHUB_TOKEN: string;
  MyServer: DurableObjectNamespace<MyServer>;
  BUN_VERSION: string;
}

type BotCommand =
  | { type: 'analyze' }
  | { type: 'createPR' };

type BotResponse =
  | { type: 'analyzeResult'; suggestion: string }
  | { type: 'prResult'; pr: { html_url: string } }
  | { type: 'error'; message: string };

interface FileChange {
  file: string;
  description: string;
  content: string;
}

interface ChangeSet {
  changes: FileChange[];
}

export class MyServer extends Server<Env> {
  private codebase: string = "";
  private suggestion: string = "";
  private openAiApiKey: string = "";
  private githubToken: string = "";

  onConnect(connection: Connection) {
    this.openAiApiKey = this.env.OPENAI_API_KEY;
    this.githubToken = this.env.GITHUB_TOKEN;
    console.log('onConnect', { openAiApiKey: this.openAiApiKey, githubToken: this.githubToken });
  }

  async onMessage(conn: Connection, message: string) {
    try {
      const command = JSON.parse(message) as BotCommand;

      switch (command.type) {
        case 'analyze':
          await this.handleAnalyze(conn);
          break;
        case 'createPR':
          await this.handleCreatePR(conn);
          break;
        default:
          this.sendError(conn, 'Invalid command');
      }
    } catch (error) {
      this.sendError(conn, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  private async handleAnalyze(conn: Connection) {
    try {
      const code = await this.fetchCodebase();
      this.codebase = code;
      const suggestion = await this.generateSuggestion(code);
      this.suggestion = suggestion;
      console.log({ suggestion });

      this.sendMessage(conn, { type: 'analyzeResult', suggestion });
    } catch (error) {
      console.error(error);
      this.sendError(conn, 'Failed to analyze code');
    }
  }

  private async handleCreatePR(conn: Connection) {
    if (!this.suggestion) {
      this.sendError(conn, 'No suggestion available');
      return;
    }

    try {
      // First, convert the suggestion into structured changes
      const changes = await this.generateChanges(this.suggestion);
      this.sendMessage(conn, { type: 'suggestedChanges', changes });
      console.log({ changes });
      // Then create the PR with those changes
      const prResult = await this.createPullRequest(changes);
      console.log({ prResult });
      this.suggestion = "";
      this.sendMessage(conn, { type: 'prResult', pr: prResult });
    } catch (error) {
      this.sendError(conn, 'Failed to create PR');
    }
  }

  private async fetchCodebase(): Promise<string> {
    const baseUrl = "https://api.github.com/repos/acoyfellow/bot/contents";
    let allCode = "";

    async function fetchDirectory(path: string = ""): Promise<void> {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "bot"
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const items = await response.json();

        for (const item of items) {
          if (item.type === "file") {
            // Skip node_modules, dist, and other common ignored directories
            if (item.path.includes("node_modules") ||
              item.path.includes("bun.lock") ||
              item.path.includes("dist") ||
              item.path.endsWith(".env")) {
              continue;
            }
            const contentResponse = await fetch(item.download_url);
            const content = await contentResponse.text();
            allCode += `\n\nFile: ${item.path}\n${content}`;
          } else if (item.type === "dir") {
            await fetchDirectory(`/${item.path}`);
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    }

    await fetchDirectory();
    return allCode;
  }

  private async generateSuggestion(code: string): Promise<string> {
    const openai = new OpenAI({
      apiKey: this.openAiApiKey
    });

    try {
      const chatCompletion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are a cracked out code review assistant. Analyze code and suggest improvements concisely. Only make a suggestion if it's truly an improvement, bugfix, or refactor. If it's not, just ignore the file. when editing a file, think about how to make it simpler. easier to maintain. less code, same functionality. Keep working code working, clean, up to date, readable, and maintainable."
          },
          {
            role: "user",
            content: `Analyze this code and suggest improvements:\n\n${code}`
          }
        ]
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private async generateChanges(suggestion: string): Promise<ChangeSet> {
    const openai = new OpenAI({
      apiKey: this.openAiApiKey
    });

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [{
          role: "system",
          content: `You are a code improvement assistant. Convert the following suggestion into specific file changes. The content should be the new file content in its entirety, it must be complete.
            Return a JSON object with this structure:
            {
              "changes": [{
                "file": "path/to/file",
                "description": "What changed and why",
                "content": "Complete new file content"
              }]
            }`
        }, {
          role: "user",
          content: `Convert this suggestion into specific file changes:\n\n${suggestion}`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log({ result });
      if (!result.changes || !Array.isArray(result.changes)) {
        throw new Error('Invalid change set format');
      }
      return result.changes;
    } catch (error) {
      console.error('Failed to generate changes:', error);
      throw error;
    }
  }

  private async createPullRequest(changes: ChangeSet): Promise<{ html_url: string }> {
    try {
      const branchName = `bot-update-${Date.now()}`;
      console.log({ branchName, githubToken: this.githubToken });

      // 1. Get the current main branch SHA
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
      const { object: { sha } } = await mainRef.json();
      console.log({ sha });
      // 2. Create new branch from main
      const newBranch = await fetch(
        "https://api.github.com/repos/acoyfellow/bot/git/refs",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.githubToken}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "bot"
          },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha
          })
        }
      );
      console.log({ newBranch });

      // 3. Create a commit for each change
      console.log('Commiting changes:', changes.length);
      for (const change of changes) {
        // First get the current file's SHA
        const fileResponse = await fetch(
          `https://api.github.com/repos/acoyfellow/bot/contents/${change.file}`,
          {
            headers: {
              "Authorization": `Bearer ${this.githubToken}`,
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "bot"
            }
          }
        );

        const fileData = await fileResponse.json();

        // Create the commit with the new content
        const response = await fetch(
          `https://api.github.com/repos/acoyfellow/bot/contents/${change.file}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${this.githubToken}`,
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "bot"
            },
            body: JSON.stringify({
              message: `Update ${change.file}\n\n${change.description}`,
              content: btoa(unescape(encodeURIComponent(change.content))), // Fix for Unicode
              branch: branchName,
              sha: fileData.sha  // Use file's current SHA
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to create commit: ${JSON.stringify(error)}`);
        }
      }

      // 4. Create a pull request
      const prResponse = await fetch(
        `https://api.github.com/repos/acoyfellow/bot/pulls`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.githubToken}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "bot"
          },
          body: JSON.stringify({
            title: "Update files",
            body: changes.map(c => `- ${c.file}: ${c.description}`).join('\n'),
            head: branchName,
            base: "main"  // or "master" depending on your default branch
          })
        }
      );

      if (!prResponse.ok) {
        const prData = await prResponse.json();
        throw new Error(`Failed to create PR: ${JSON.stringify(prData)}`);
      }

      const prData = await prResponse.json();
      console.log({ prData: JSON.stringify(prData, null, 2) });
      return { html_url: prData.html_url };
    } catch (error) {
      console.error('GitHub API error:', error);
      throw error;
    }
  }

  private sendMessage(conn: Connection, message: BotResponse) {
    conn.send(JSON.stringify(message));
  }

  private sendError(conn: Connection, message: string) {
    this.sendMessage(conn, { type: 'error', message });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not found", {
        status: 404,
      })
    )
  },
} satisfies ExportedHandler<Env>