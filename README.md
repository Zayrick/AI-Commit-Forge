<div align="center">

<img height="120" src="./images/logo.png">

<h1>AI Commit Forge</h1>

Generate Conventional Commits messages from your Git changes using OpenAI (or any OpenAI-compatible endpoint).

**English** · [简体中文](./README.zh_CN.md) · [Marketplace](https://marketplace.visualstudio.com/items?itemName=Zayrick.ai-commit-forge) · [Issues](https://github.com/Zayrick/AI-Commit/issues)

![](./images/demo.gif)

</div>

## ✨ Features

- Generate commit messages from staged diffs (with unstaged fallback)
- Conventional Commits format with intelligent type detection
- Custom prompt template via `${gitContext}` placeholder
- Works with OpenAI-compatible `baseUrl` endpoints
- Smart lockfile exclusion to reduce noise and token usage
- Repository context support (branch name + recent commits)
- Model selection via "Show Available OpenAI Models" command

## 🚀 Quick Start

1. Install **AI Commit Forge** from the VS Code Marketplace.
2. In VS Code Settings (`ai-commit`), configure:
   - `OPENAI_API_KEY` (required)
   - `OPENAI_MODEL` (default: `gpt-4o`)
3. Stage your changes (`git add ...`) or leave changes unstaged.
4. Open **Source Control** panel and click the **AI Commit Forge** button.
5. *(Optional)* Type additional context in the SCM input box before clicking — it will be included in the prompt.

> **Tips:**
> - Use "Show Available OpenAI Models" command to browse and select available models
> - If your diff is too large, stage/commit in smaller chunks or set `AI_COMMIT_MAX_DIFF_CHARS`
> - Requires Node.js >= 16 and VS Code >= 1.77.0

## ⚙️ Configuration

All settings are under the `ai-commit` namespace in VS Code Settings.

| Setting | Required | Default | Description |
| --- | :---: | --- | --- |
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI API key |
| `OPENAI_MODEL` | — | `gpt-4o` | Model used to generate messages |
| `OPENAI_BASE_URL` | — | — | Custom base URL for OpenAI-compatible providers |
| `OPENAI_TEMPERATURE` | — | `0.7` | Randomness ($0$–$2$) |
| `AI_COMMIT_PROMPT` | — | — | Custom prompt template (use `${gitContext}` placeholder) |
| `AI_COMMIT_INCLUDE_REPO_CONTEXT` | — | `true` | Include branch name + recent commits in context |
| `AI_COMMIT_EXCLUDE_LOCKFILES` | — | `true` | Exclude common lockfiles from diff |
| `AI_COMMIT_MAX_DIFF_CHARS` | — | `0` | Max diff characters (0 = unlimited) |

## 📜 Commands

| Command | Description |
| --- | --- |
| `AI Commit Forge` | Generate commit message from current changes |
| `Show Available OpenAI Models` | Browse and select available models from your API |

## 📝 License

[MIT](./LICENSE)
