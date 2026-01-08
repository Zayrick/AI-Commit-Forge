import * as path from 'path';
import simpleGit from 'simple-git';

import { ConfigKeys, ConfigurationManager } from './config';

export type GitStatus = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | 'Unknown';

export interface GitChange {
  filePath: string;
  status: GitStatus;
  staged: boolean;
}

export interface CommitContextOptions {
  /** Prefer staged changes; when empty, optionally fall back to unstaged changes. */
  preferStaged?: boolean;
  /** Whether to fall back to unstaged changes when there are no staged changes. */
  allowUnstagedFallback?: boolean;
  /** Include branch + recent commits in context. */
  includeRepoContext?: boolean;
  /** Exclude common lockfiles and dependency artifacts from diffs. */
  excludeLockfiles?: boolean;
  /** Truncate diff section when it exceeds this many characters (0/undefined disables). */
  maxDiffChars?: number;
  /** Optional user-provided additional context to include before the diff. */
  additionalContext?: string;
}

export interface CommitContextResult {
  context: string;
  usedStaged: boolean;
  changes: GitChange[];
}

/**
 * Comprehensive lockfile patterns aligned with kilocode project.
 * Covers all major package managers and build tools.
 */
const LOCKFILE_PATH_ENDINGS: string[] = [
  // --- JavaScript / Node.js ---
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'bun.lockb',
  '.yarnrc.yml',
  '.pnp.js',
  '.pnp.cjs',
  'jspm.lock',

  // --- Python ---
  'Pipfile.lock',
  'poetry.lock',
  'pdm.lock',
  '.pdm-lock.toml',
  'conda-lock.yml',
  'pylock.toml',

  // --- Ruby ---
  'Gemfile.lock',
  '.bundle/config',

  // --- PHP ---
  'composer.lock',

  // --- Java / JVM ---
  'gradle.lockfile',
  'lockfile.json',
  'dependency-lock.json',
  'dependency-reduced-pom.xml',
  'coursier.lock',

  // --- Scala ---
  'build.sbt.lock',

  // --- .NET ---
  'packages.lock.json',
  'paket.lock',
  'project.assets.json',

  // --- Rust ---
  'Cargo.lock',

  // --- Go ---
  'go.sum',
  'Gopkg.lock',
  'glide.lock',
  'vendor/vendor.json',

  // --- Zig ---
  'build.zig.zon.lock',

  // --- OCaml ---
  'dune.lock',
  'opam.lock',

  // --- Kotlin ---
  'kotlin-js-store',

  // --- Swift / iOS ---
  'Package.resolved',
  'Podfile.lock',
  'Cartfile.resolved',

  // --- Dart / Flutter ---
  'pubspec.lock',

  // --- Elixir / Erlang ---
  'mix.lock',
  'rebar.lock',

  // --- Haskell ---
  'stack.yaml.lock',
  'cabal.project.freeze',

  // --- Elm ---
  'elm-stuff/exact-dependencies.json',

  // --- Crystal ---
  'shard.lock',

  // --- Julia ---
  'Manifest.toml',
  'JuliaManifest.toml',

  // --- R ---
  'renv.lock',
  'packrat.lock',

  // --- Nim ---
  'nimble.lock',

  // --- D ---
  'dub.selections.json',

  // --- Lua ---
  'rocks.lock',

  // --- Perl ---
  'carton.lock',
  'cpanfile.snapshot',

  // --- C/C++ ---
  'conan.lock',
  'vcpkg-lock.json',

  // --- Infrastructure as Code ---
  '.terraform.lock.hcl',
  'Berksfile.lock',
  'Puppetfile.lock',

  // --- Nix ---
  'flake.lock',

  // --- Deno ---
  'deno.lock',

  // --- DevContainers ---
  'devcontainer.lock.json'
];

function normalizeForEndsWith(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function shouldExcludeLockFile(filePath: string): boolean {
  const normalized = normalizeForEndsWith(filePath);
  return LOCKFILE_PATH_ENDINGS.some((ending) =>
    normalized === ending || normalized.endsWith('/' + ending)
  );
}

function parseNameStatusLine(line: string): { statusCode: string; filePath: string } | null {
  const tabIndex = line.indexOf('\t');
  if (tabIndex <= 0) {
    return null;
  }
  const statusCode = line.substring(0, tabIndex).trim();
  const filePath = line.substring(tabIndex + 1).trim();
  if (!statusCode || !filePath) {
    return null;
  }
  return { statusCode, filePath };
}

function parsePorcelainLine(line: string): { statusCode: string; filePath: string } | null {
  // Examples: " M file.txt" | "M  file.txt" | "?? file.txt" | "A  file.txt"
  if (!line || line.length < 3) {
    return null;
  }
  const indexStatus = line.charAt(0);
  const workingStatus = line.charAt(1);
  const filePath = line.substring(2).trim();
  if (!filePath) {
    return null;
  }

  if (indexStatus === '?' && workingStatus === '?') {
    return { statusCode: '?', filePath };
  }

  const statusCode = workingStatus !== ' ' ? workingStatus : indexStatus;
  if (!statusCode || statusCode === ' ') {
    return null;
  }
  return { statusCode, filePath };
}

function toGitStatus(code: string): GitStatus {
  switch (code) {
    case 'M':
    case 'A':
    case 'D':
    case 'R':
    case 'C':
    case 'U':
    case '?':
      return code;
    default:
      return 'Unknown';
  }
}

function readableStatus(status: GitStatus): string {
  switch (status) {
    case 'M':
      return 'Modified';
    case 'A':
      return 'Added';
    case 'D':
      return 'Deleted';
    case 'R':
      return 'Renamed';
    case 'C':
      return 'Copied';
    case 'U':
      return 'Updated';
    case '?':
      return 'Untracked';
    case 'Unknown':
    default:
      return 'Unknown';
  }
}

async function gatherChanges(rootPath: string, staged: boolean, excludeLockfiles: boolean): Promise<GitChange[]> {
  const git = simpleGit({ baseDir: rootPath, trimmed: true });

  const output = staged
    ? await git.raw(['diff', '--name-status', '--cached'])
    : await git.raw(['status', '--porcelain']);

  const lines = output
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const changes: GitChange[] = [];
  for (const line of lines) {
    const parsed = staged ? parseNameStatusLine(line) : parsePorcelainLine(line);
    if (!parsed) {
      continue;
    }
    if (excludeLockfiles && shouldExcludeLockFile(parsed.filePath)) {
      continue;
    }
    changes.push({
      filePath: parsed.filePath,
      status: toGitStatus(parsed.statusCode),
      staged
    });
  }
  return changes;
}

async function getCurrentBranch(rootPath: string): Promise<string | undefined> {
  try {
    const git = simpleGit({ baseDir: rootPath, trimmed: true });
    const info = await git.branchLocal();
    return info.current || undefined;
  } catch {
    return undefined;
  }
}

async function getRecentCommits(rootPath: string, count: number = 5): Promise<string | undefined> {
  try {
    const git = simpleGit({ baseDir: rootPath, trimmed: true });
    const log = await git.log({ maxCount: count });
    if (!log?.all?.length) {
      return undefined;
    }
    return log.all.map((c) => `${c.hash.substring(0, 7)} ${c.message}`).join('\n');
  } catch {
    return undefined;
  }
}

async function buildDiffForChanges(rootPath: string, changes: GitChange[], staged: boolean): Promise<string> {
  if (!changes.length) {
    return '';
  }
  const git = simpleGit({ baseDir: rootPath, trimmed: false });
  const diffs: string[] = [];

  for (const change of changes) {
    if (change.status === '?') {
      diffs.push(`New untracked file: ${change.filePath}`);
      continue;
    }

    try {
      const diffArgs = staged
        ? ['diff', '--cached', '--', change.filePath]
        : ['diff', '--', change.filePath];
      const diff = await git.raw(diffArgs);
      if (diff && diff.trim()) {
        diffs.push(diff.trimEnd());
      }
    } catch {
      diffs.push(`File ${change.filePath} - diff unavailable`);
    }
  }

  return diffs.join('\n');
}

function truncateDiff(diff: string, maxDiffChars?: number): { diff: string; truncated: boolean } {
  if (!maxDiffChars || maxDiffChars <= 0) {
    return { diff, truncated: false };
  }
  if (diff.length <= maxDiffChars) {
    return { diff, truncated: false };
  }
  return {
    diff: diff.slice(0, maxDiffChars) + `\n\n... (diff truncated to ${maxDiffChars} chars)`,
    truncated: true
  };
}

export async function getCommitContext(rootPath: string, options: CommitContextOptions = {}): Promise<CommitContextResult> {
  const configManager = ConfigurationManager.getInstance();

  const preferStaged = options.preferStaged ?? true;
  const allowUnstagedFallback = options.allowUnstagedFallback ?? true;

  const includeRepoContext =
    options.includeRepoContext ??
    configManager.getConfig<boolean>(ConfigKeys.INCLUDE_REPO_CONTEXT, true);

  const excludeLockfiles =
    options.excludeLockfiles ??
    configManager.getConfig<boolean>(ConfigKeys.EXCLUDE_LOCKFILES, true);

  const maxDiffChars =
    options.maxDiffChars ??
    configManager.getConfig<number>(ConfigKeys.MAX_DIFF_CHARS, 0);

  let usedStaged = preferStaged;
  let changes = await gatherChanges(rootPath, usedStaged, excludeLockfiles);

  if (usedStaged && changes.length === 0 && allowUnstagedFallback) {
    usedStaged = false;
    changes = await gatherChanges(rootPath, usedStaged, excludeLockfiles);
  }

  const changeDescriptor = usedStaged ? 'Staged' : 'Unstaged';

  let context = '## Git Context for Commit Message Generation\n\n';

  const additionalContext = (options.additionalContext ?? '').trim();
  if (additionalContext) {
    context += '### Additional Context\n';
    context += '```\n' + additionalContext + '\n```\n\n';
  }

  const rawDiff = await buildDiffForChanges(rootPath, changes, usedStaged);
  const { diff } = truncateDiff(rawDiff || '(No diff available)', maxDiffChars);

  context += `### Full Diff of ${changeDescriptor} Changes\n`;
  context += '```diff\n' + diff + '\n```\n\n';

  if (changes.length > 0) {
    const summaryLines = changes.map((c) => `${readableStatus(c.status)} (${c.staged ? 'staged' : 'unstaged'}): ${c.filePath}`);
    context += '### Change Summary\n';
    context += '```\n' + summaryLines.join('\n') + '\n```\n\n';
  } else {
    context += '### Change Summary\n```\n(No changes found)\n```\n\n';
  }

  if (includeRepoContext) {
    context += '### Repository Context\n\n';
    const branch = await getCurrentBranch(rootPath);
    if (branch) {
      context += `**Current branch:** \`${branch}\`\n\n`;
    }

    const recent = await getRecentCommits(rootPath, 5);
    if (recent) {
      context += '**Recent commits:**\n';
      context += '```\n' + recent + '\n```\n';
    }
  }

  return { context, usedStaged, changes };
}
