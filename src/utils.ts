import * as vscode from 'vscode';

/**
 * Adds progress handling functionality.
 */
export class ProgressHandler {
  static async withProgress<T>(
    title: string,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>
    ) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `[AI Commit] ${title}`,
        cancellable: true
      },
      task
    );
  }
}

/**
 * Sanitizes AI output before placing it into the SCM commit input.
 * Removes common markdown/code fences and surrounding quotes while preserving multi-line commit bodies.
 */
export function sanitizeCommitMessage(raw: string): string {
  if (!raw) {
    return '';
  }

  const cleaned = raw.trim();
  const withoutCodeFences = cleaned.replace(/```[a-zA-Z0-9_-]*\n|```/g, '');
  const withoutWrappedQuotes = withoutCodeFences.replace(/^["'`]|["'`]$/g, '');
  return withoutWrappedQuotes.trim();
}
