import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { ConfigKeys, ConfigurationManager } from './config';
import { OpenAICompletion } from './openai-utils';
import { buildCommitPrompt } from './prompts';
import { ProgressHandler, sanitizeCommitMessage } from './utils';
import { getCommitContext } from './commit-context';

/**
 * Retrieves the repository associated with the provided argument.
 *
 * @param {any} arg - The input argument containing the root URI of the repository.
 * @returns {Promise<vscode.SourceControlRepository>} - A promise that resolves to the repository object.
 */
export async function getRepo(arg) {
  const gitApi = vscode.extensions.getExtension('vscode.git')?.exports.getAPI(1);
  if (!gitApi) {
    throw new Error('Git extension not found');
  }

  if (typeof arg === 'object' && arg.rootUri) {
    const resourceUri = arg.rootUri;
    const realResourcePath: string = fs.realpathSync(resourceUri!.fsPath);
    for (let i = 0; i < gitApi.repositories.length; i++) {
      const repo = gitApi.repositories[i];
      if (realResourcePath.startsWith(repo.rootUri.fsPath)) {
        return repo;
      }
    }
  }
  return gitApi.repositories[0];
}

/**
 * Generates a commit message based on the changes staged in the repository.
 *
 * @param {any} arg - The input argument containing the root URI of the repository.
 * @returns {Promise<void>} - A promise that resolves when the commit message has been generated and set in the SCM input box.
 */
export async function generateCommitMsg(arg) {
  return ProgressHandler.withProgress('', async (progress) => {
    try {
      const configManager = ConfigurationManager.getInstance();
      const repo = await getRepo(arg);

      progress.report({ message: 'Getting staged changes...' });

      const rootPath = repo?.rootUri?.fsPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!rootPath) {
        throw new Error('No workspace folder found');
      }

      const scmInputBox = repo.inputBox;
      if (!scmInputBox) {
        throw new Error('Unable to find the SCM input box');
      }

      const additionalContext = scmInputBox.value.trim();

      const { context: gitContext, changes } = await getCommitContext(rootPath, {
        preferStaged: true,
        allowUnstagedFallback: true,
        additionalContext
      });

      if (!changes || changes.length === 0) {
        throw new Error('No changes found for commit');
      }

      progress.report({
        message: additionalContext
          ? 'Analyzing changes with additional context...'
          : 'Analyzing changes...'
      });

      // Build the complete prompt with gitContext injected
      const prompt = buildCommitPrompt(gitContext);

      progress.report({
        message: additionalContext
          ? 'Generating commit message with additional context...'
          : 'Generating commit message...'
      });

      try {
        const openaiApiKey = configManager.getConfig<string>(ConfigKeys.OPENAI_API_KEY);
        if (!openaiApiKey) {
          throw new Error('OpenAI API Key not configured');
        }

        const commitMessage = await OpenAICompletion(prompt);

        if (commitMessage) {
          scmInputBox.value = sanitizeCommitMessage(commitMessage);
        } else {
          throw new Error('Failed to generate commit message');
        }
      } catch (err) {
        let errorMessage = 'An unexpected error occurred';

        if (err.response?.status) {
          switch (err.response.status) {
            case 401:
              errorMessage = 'Invalid OpenAI API key or unauthorized access';
              break;
            case 429:
              errorMessage = 'Rate limit exceeded. Please try again later';
              break;
            case 500:
              errorMessage = 'OpenAI server error. Please try again later';
              break;
            case 503:
              errorMessage = 'OpenAI service is temporarily unavailable';
              break;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      throw error;
    }
  });
}
