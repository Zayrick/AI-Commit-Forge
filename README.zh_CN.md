<div align="center">

<img height="120" src="https://github.com/Zayrick/AI-Commit/blob/main/images/logo.png?raw=true">

<h1>AI Commit</h1>

使用 OpenAI（或任何兼容 OpenAI 的接口）根据 Git 修改生成 Conventional Commits 提交信息。

[English](./README.md) · **简体中文** · [商店安装](https://marketplace.visualstudio.com/items?itemName=Zayrick.ai-commit) · [问题反馈](https://github.com/Zayrick/AI-Commit/issues)

![](https://github.com/Zayrick/AI-Commit/blob/main/images/demo.gif?raw=true)

</div>

## ✨ 特性

- 基于暂存区 diff 自动生成提交信息（支持未暂存更改回退）
- 输出符合 Conventional Commits，智能识别提交类型
- 支持自定义提示词模板（`${gitContext}` 占位符）
- 支持配置兼容 OpenAI 的 `baseUrl` 接口
- 智能排除 lockfile，减少噪音和 token 消耗
- 支持仓库上下文（分支名 + 最近提交历史）
- 通过命令快速选择可用模型

## 🚀 快速开始

1. 从 VS Code 扩展商店安装 **AI Commit**。
2. 在 VS Code 设置（`ai-commit`）中配置：
   - `OPENAI_API_KEY`（必填）
   - `OPENAI_MODEL`（默认：`gpt-4o`）
3. 将改动加入暂存区（`git add ...`），或保留未暂存状态。
4. 打开 **源代码管理（Source Control）** 面板，点击 **AI Commit** 按钮。
5. *（可选）* 点击前可在提交信息输入框中输入额外说明，会一并发送给 AI。

> **提示：**
> - 使用 "Show Available OpenAI Models" 命令浏览并选择可用模型
> - 如果 diff 太大，建议分批提交或设置 `AI_COMMIT_MAX_DIFF_CHARS`
> - 需要 Node.js >= 16 和 VS Code >= 1.77.0

## ⚙️ 配置

所有配置项均在 VS Code 设置的 `ai-commit` 命名空间下。

| 配置项 | 必填 | 默认值 | 说明 |
| --- | :---: | --- | --- |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API Key |
| `OPENAI_MODEL` | — | `gpt-4o` | 生成提交信息使用的模型 |
| `OPENAI_BASE_URL` | — | — | 兼容 OpenAI 的自定义接口地址 |
| `OPENAI_TEMPERATURE` | — | `0.7` | 随机性（$0$–$2$） |
| `AI_COMMIT_PROMPT` | — | — | 自定义提示词模板（使用 `${gitContext}` 占位符） |
| `AI_COMMIT_INCLUDE_REPO_CONTEXT` | — | `true` | 附带当前分支 + 最近提交作为上下文 |
| `AI_COMMIT_EXCLUDE_LOCKFILES` | — | `true` | 排除常见 lockfile 的 diff |
| `AI_COMMIT_MAX_DIFF_CHARS` | — | `0` | 限制 diff 最大字符数（0 = 不限制） |

## �� 命令

| 命令 | 说明 |
| --- | --- |
| `AI Commit` | 根据当前更改生成提交信息 |
| `Show Available OpenAI Models` | 浏览并选择 API 可用的模型 |

## 📝 License

[MIT](./LICENSE)
