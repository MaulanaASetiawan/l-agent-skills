#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.join(__dirname, '..', 'src');
const HOME = process.env.L_AGENT_HOME || os.homedir();
const MARK_START = '<!-- l-agent:start -->';
const MARK_END = '<!-- l-agent:end -->';
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------- source loading ----------

function parseFrontmatter(text, label) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${label}: missing frontmatter`);
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function loadDir(dir) {
  const full = path.join(SRC, dir);
  return fs.readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const label = `${dir}/${f}`;
      const text = fs.readFileSync(path.join(full, f), 'utf8');
      const fm = parseFrontmatter(text, label);
      if (!fm.name || !NAME_RE.test(fm.name)) throw new Error(`${label}: invalid or missing name`);
      if (!fm.description) throw new Error(`${label}: missing description`);
      return { name: fm.name, description: fm.description, text, label };
    });
}

function loadSource() {
  const workflows = loadDir('workflows');
  const specialists = loadDir('specialists');
  return {
    rules: fs.readFileSync(path.join(SRC, 'rules.md'), 'utf8'),
    pluginJson: fs.readFileSync(path.join(SRC, 'plugin.json'), 'utf8'),
    workflows,
    specialists,
    skills: [...workflows, ...specialists],
  };
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function removeBlock(text) {
  const s = text.indexOf(MARK_START);
  const e = text.indexOf(MARK_END);
  if (s === -1 || e === -1 || e < s) return text;
  const before = text.slice(0, s).trimEnd();
  const after = text.slice(e + MARK_END.length).trimStart();
  const joined = [before, after].filter(Boolean).join('\n\n');
  return joined ? joined + '\n' : '';
}

function upsertBlock(file, body) {
  const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (original && !original.includes(MARK_START) && !fs.existsSync(file + '.bak')) {
    fs.copyFileSync(file, file + '.bak');
  }
  const base = removeBlock(original).trimEnd();
  const block = `${MARK_START}\n${body.trim()}\n${MARK_END}\n`;
  write(file, base ? `${base}\n\n${block}` : block);
}


const antigravityRoot = () => path.join(HOME, '.gemini', 'config', 'plugins', 'l-agent');

const antigravity = {
  label: 'Antigravity',
  detect: () => fs.existsSync(path.join(HOME, '.gemini')),
  install(src) {
    const root = antigravityRoot();
    fs.rmSync(root, { recursive: true, force: true }); // plugin dir is fully owned by L-Agent
    write(path.join(root, 'plugin.json'), src.pluginJson);
    write(path.join(root, 'rules', 'AGENTS.md'), src.rules);
    for (const s of src.skills) write(path.join(root, 'skills', s.name, 'SKILL.md'), s.text);
    for (const a of src.specialists) write(path.join(root, 'agents', `${a.name}.md`), a.text);
    return root;
  },
  uninstall() {
    const root = antigravityRoot();
    if (!fs.existsSync(root)) return false;
    fs.rmSync(root, { recursive: true, force: true });
    return true;
  },
};

const claudeBase = () => path.join(HOME, '.claude');
const claudeManifest = () => path.join(claudeBase(), '.l-agent-manifest.json');

function readClaudeOwned() {
  if (!fs.existsSync(claudeManifest())) return [];
  const paths = JSON.parse(fs.readFileSync(claudeManifest(), 'utf8')).paths || [];
  return paths.filter((p) => /^(skills\/[a-z0-9-]+|agents\/[a-z0-9-]+\.md)$/.test(p));
}

function removeClaudeOwned(owned) {
  for (const p of owned) fs.rmSync(path.join(claudeBase(), p), { recursive: true, force: true });
}

const claude = {
  label: 'Claude Code',
  detect: () => fs.existsSync(claudeBase()),
  install(src, version) {
    const base = claudeBase();
    const owned = readClaudeOwned();
    const planned = [
      ...src.skills.map((s) => `skills/${s.name}`),
      ...src.specialists.map((a) => `agents/${a.name}.md`),
    ];
    const conflicts = planned.filter((p) => !owned.includes(p) && fs.existsSync(path.join(base, p)));
    if (conflicts.length) {
      throw new Error(
        'Refusing to overwrite files not installed by L-Agent:\n  ' +
          conflicts.map((p) => path.join(base, p)).join('\n  ') +
          '\nRename or remove them, then run install again.'
      );
    }
    removeClaudeOwned(owned);
    for (const s of src.skills) write(path.join(base, 'skills', s.name, 'SKILL.md'), s.text);
    for (const a of src.specialists) write(path.join(base, 'agents', `${a.name}.md`), a.text);
    upsertBlock(path.join(base, 'CLAUDE.md'), src.rules);
    write(claudeManifest(), JSON.stringify({ version, paths: planned }, null, 2) + '\n');
    return base;
  },
  uninstall() {
    const owned = readClaudeOwned();
    const claudeMd = path.join(claudeBase(), 'CLAUDE.md');
    const hadBlock = fs.existsSync(claudeMd) && fs.readFileSync(claudeMd, 'utf8').includes(MARK_START);
    if (!owned.length && !hadBlock) return false;
    removeClaudeOwned(owned);
    if (hadBlock) {
      const rest = removeBlock(fs.readFileSync(claudeMd, 'utf8'));
      if (rest) fs.writeFileSync(claudeMd, rest);
      else fs.rmSync(claudeMd);
    }
    fs.rmSync(claudeManifest(), { force: true });
    return true;
  },
};

const TARGETS = { antigravity, claude };

function resolveTargets(arg) {
  if (arg === 'all') return Object.keys(TARGETS);
  if (arg) {
    if (!TARGETS[arg]) throw new Error(`Unknown target "${arg}". Use: antigravity, claude, all`);
    return [arg];
  }
  const found = Object.keys(TARGETS).filter((k) => TARGETS[k].detect());
  if (!found.length) {
    throw new Error('No supported tool found (~/.gemini or ~/.claude). Use --target antigravity|claude|all.');
  }
  return found;
}

function help() {
  console.log(`l-agent-skill: install L-Agent workflows and specialists

Usage:
  l-agent-skill install   [--target antigravity|claude|all]
  l-agent-skill uninstall [--target antigravity|claude|all]
  l-agent-skill help

Without --target, every detected tool is used.`);
}

function main(argv) {
  const command = argv[0] || 'help';
  const tIdx = argv.indexOf('--target');
  const targetArg = tIdx !== -1 ? argv[tIdx + 1] : undefined;
  if (tIdx !== -1 && !targetArg) throw new Error('--target needs a value');

  if (command === 'install') {
    const src = loadSource();
    const version = require('../package.json').version;
    for (const key of resolveTargets(targetArg)) {
      const where = TARGETS[key].install(src, version);
      console.log(`${TARGETS[key].label}: ${src.skills.length} skills, ${src.specialists.length} agents → ${where}`);
    }
    console.log('Restart your tool to load the changes. Start with /l-plan.');
  } else if (command === 'uninstall') {
    for (const key of resolveTargets(targetArg || 'all')) {
      const removed = TARGETS[key].uninstall();
      console.log(`${TARGETS[key].label}: ${removed ? 'removed' : 'not installed'}`);
    }
  } else {
    help();
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { loadSource, parseFrontmatter, removeBlock, MARK_START, MARK_END };
