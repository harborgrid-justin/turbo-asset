#!/usr/bin/env node
/**
 * PreToolUse guard for Turbo Asset.
 *
 * CLAUDE.md instructions are advisory context; hooks are the enforcement layer
 * (https://code.claude.com/docs/en/hooks). This guard enforces the repo's
 * non-negotiables: it denies irreversible-by-policy actions outright and
 * escalates merely-risky ones to an explicit permission prompt ("ask").
 *
 * Wired in .claude/settings.json for Bash and Edit/Write/NotebookEdit.
 * Always exits 0; decisions are returned as PreToolUse JSON on stdout.
 */

'use strict';

function deny(reason) {
  return { action: 'deny', reason };
}

function ask(reason) {
  return { action: 'ask', reason };
}

function checkBash(cmd) {
  if (/\bgit\b/.test(cmd) && /--no-verify\b/.test(cmd)) {
    return deny(
      'Skipping git hooks (--no-verify) is forbidden (CLAUDE.md §5). Fix the underlying lint/type error instead.'
    );
  }
  if (/\bgit\s+push\b/.test(cmd) && /--force-with-lease\b/.test(cmd)) {
    return ask('Force-with-lease push — requires explicit user confirmation (CLAUDE.md §5).');
  }
  if (/\bgit\s+push\b/.test(cmd) && /(\s-f\b|--force\b)/.test(cmd)) {
    return deny('Force-push is blocked. If history must move, get explicit user approval and use --force-with-lease.');
  }
  if (/\bgit\s+push\b[^|;&]*\s(master|main)(\s|$)/.test(cmd) || /\bgit\s+push\b[^|;&]*:(master|main)(\s|$)/.test(cmd)) {
    return ask('Pushing to master/main requires explicit user permission (CLAUDE.md §5).');
  }
  if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)[a-zA-Z]*\b/.test(cmd)) {
    return ask('rm -rf is irreversible — requires explicit user confirmation (CLAUDE.md §5).');
  }
  if (/\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|branch\s+(-D|--delete\s+--force)|push\s+[^|;&]*--delete)\b/.test(cmd)) {
    return ask('Destructive git operation — requires explicit user confirmation (CLAUDE.md §5).');
  }
  if (/\bprisma\s+(migrate|db\s+push)\b/.test(cmd)) {
    return deny(
      'Prisma migrations are not wired up — the data layer is migrating to Sequelize. See SEQUELIZE_MIGRATION_GUIDE.md and .claude/rules/data-layer.md.'
    );
  }
  return null;
}

function checkWritePath(rawPath) {
  const p = String(rawPath).replace(/\\/g, '/');
  const base = p.split('/').pop() || '';
  if (base.startsWith('.env') && base !== '.env.example') {
    return deny('Never write secrets/.env files (CLAUDE.md §5). Document the shape in .env.example instead.');
  }
  if (/(^|\/)[^/]*\.backup(\/|$)/.test(p)) {
    return deny('*.backup directories are excluded from the build — never edit them (CLAUDE.md §4).');
  }
  if (/(^|\/)(node_modules|dist|\.next)\//.test(p)) {
    return deny('Generated or vendored path — edit the source, not build output.');
  }
  return null;
}

function evaluate(input) {
  const tool = input.tool_name;
  const ti = input.tool_input || {};
  if (tool === 'Bash') return checkBash(String(ti.command || ''));
  if (tool === 'Edit' || tool === 'Write') return checkWritePath(ti.file_path || '');
  if (tool === 'NotebookEdit') return checkWritePath(ti.notebook_path || '');
  return null;
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const decision = evaluate(input);
  if (decision) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: decision.action,
          permissionDecisionReason: decision.reason,
        },
      })
    );
  }
  process.exit(0);
});
