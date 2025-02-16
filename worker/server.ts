import { Server, type Connection, routePartykitRequest } from "partyserver"

type Env = {
  MyServer: DurableObjectNamespace<MyServer>;
  OPENAI_API_KEY: string;
  GITHUB_TOKEN: string;
}

type BotCommand =
  | { type: 'analyze' }
  | { type: 'createPR' };

type BotResponse =
  | { type: 'analyzeResult'; suggestion: string }
  | { type: 'prResult'; pr: { html_url: string } }
  | { type: 'error'; message: string };

export class MyServer extends Server<Env> {
  private codebase: string = "";
  private suggestion: string = "";

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

      this.sendMessage(conn, { type: 'analyzeResult', suggestion });
    } catch (error) {
      this.sendError(conn, 'Failed to analyze code');
    }
  }

  private async handleCreatePR(conn: Connection) {
    if (!this.suggestion) {
      this.sendError(conn, 'No suggestion available');
      return;
    }

    try {
      const prResult = await this.createPullRequest(this.suggestion);
      this.suggestion = "";
      this.sendMessage(conn, { type: 'prResult', pr: prResult });
    } catch (error) {
      this.sendError(conn, 'Failed to create PR');
    }
  }

  private async fetchCodebase(): Promise<string> {
    // TODO: Implement GitHub API call to fetch README.md
    return "mock codebase content";
  }

  private async generateSuggestion(code: string): Promise<string> {
    // TODO: Implement OpenAI API call
    return "mock suggestion";
  }

  private async createPullRequest(suggestion: string): Promise<{ html_url: string }> {
    // TODO: Implement GitHub API call to create PR
    return { html_url: "https://github.com/mock/pr" };
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