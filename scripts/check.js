'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSource, syncRepo, MARK_START } = require('../bin/cli.js');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const SECTIONS = ['## Role', '## Input', '## Process', '## Output', '## Rules', '## Stop and ask when'];
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };


const src = loadSource();
const names = src.skills.map((s) => s.name);

check(new Set(names).size === names.length, `duplicate names: ${names.join(', ')}`);
check(src.workflows.length === 4, `expected 4 workflows, found ${src.workflows.length}`);
check(src.specialists.length === 15, `expected 15 specialists, found ${src.specialists.length}`);

for (const s of src.skills) {
  check(s.description.length <= 1024, `${s.label}: description over 1024 chars`);
  check(path.basename(s.label, '.md') === s.name, `${s.label}: file name must equal name "${s.name}"`);
}
for (const s of src.specialists) {
  let last = -1;
  for (const sec of SECTIONS) {
    const i = s.text.indexOf(`\n${sec}\n`);
    check(i !== -1, `${s.label}: missing section "${sec}"`);
    check(i === -1 || i > last, `${s.label}: section "${sec}" out of order`);
    if (i !== -1) last = i;
  }
}
const workflowText = src.workflows.map((w) => w.text).join('\n');
for (const s of src.specialists) {
  check(workflowText.includes(`\`${s.name}\``), `${s.name}: not referenced by any workflow`);
}
check(JSON.parse(src.pluginJson).name === 'l-agent', 'plugin.json: name must be "l-agent"');

// ---------- repo root sync (for `npx skills add <owner>/<repo>`) ----------

syncRepo(src);
check(fs.readdirSync(path.join(ROOT, 'skills')).length === 19, 'repo root: expected 19 skills/');
check(fs.readdirSync(path.join(ROOT, 'agents')).length === 15, 'repo root: expected 15 agents/');
check(fs.existsSync(path.join(ROOT, 'AGENTS.md')), 'repo root: missing AGENTS.md');
check(fs.existsSync(path.join(ROOT, 'rules', 'AGENTS.md')), 'repo root: missing rules/AGENTS.md');
check(fs.existsSync(path.join(ROOT, 'plugin.json')), 'repo root: missing plugin.json');
check(fs.existsSync(path.join(ROOT, '.claude-plugin', 'plugin.json')), 'repo root: missing .claude-plugin/plugin.json');

const run = (home, args) =>
  execFileSync(process.execPath, [CLI, ...args], { env: { ...process.env, L_AGENT_HOME: home }, stdio: 'pipe' });
const countDirs = (d) => (fs.existsSync(d) ? fs.readdirSync(d).length : 0);

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'l-agent-'));
try {
  const claudeMd = path.join(home, '.claude', 'CLAUDE.md');
  const userText = '# My rules\n\nKeep this.\n';
  fs.mkdirSync(path.join(home, '.claude', 'skills', 'user-skill'), { recursive: true });
  fs.writeFileSync(claudeMd, userText);

  run(home, ['install', '--target', 'all']);
  run(home, ['install', '--target', 'all']);

  const ag = path.join(home, '.gemini', 'config', 'plugins', 'l-agent');
  check(countDirs(path.join(ag, 'skills')) === 19, 'antigravity: expected 19 skills');
  check(countDirs(path.join(ag, 'agents')) === 15, 'antigravity: expected 15 agents');
  check(fs.existsSync(path.join(ag, 'rules', 'AGENTS.md')), 'antigravity: missing rules/AGENTS.md');
  check(fs.existsSync(path.join(ag, 'plugin.json')), 'antigravity: missing plugin.json');

  const cc = path.join(home, '.claude');
  check(countDirs(path.join(cc, 'skills')) === 20, 'claude: expected 19 skills + 1 user skill');
  check(countDirs(path.join(cc, 'agents')) === 15, 'claude: expected 15 agents');
  const md = fs.readFileSync(claudeMd, 'utf8');
  check(md.startsWith(userText.trimEnd()), 'claude: user CLAUDE.md content not preserved');
  check(md.split(MARK_START).length === 2, 'claude: rules block must appear exactly once');
  check(fs.existsSync(claudeMd + '.bak'), 'claude: CLAUDE.md backup not created');

  run(home, ['uninstall', '--target', 'all']);
  check(!fs.existsSync(ag), 'antigravity: plugin dir not removed');
  check(countDirs(path.join(cc, 'agents')) === 0, 'claude: agents not removed');
  check(fs.existsSync(path.join(cc, 'skills', 'user-skill')), 'claude: user skill was deleted');
  check(countDirs(path.join(cc, 'skills')) === 1, 'claude: L-Agent skills not removed');
  check(fs.readFileSync(claudeMd, 'utf8') === userText, 'claude: CLAUDE.md not restored exactly');

  fs.mkdirSync(path.join(cc, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(cc, 'agents', 'debugger.md'), 'user agent');
  let refused = false;
  try { run(home, ['install', '--target', 'claude']); } catch { refused = true; }
  check(refused, 'claude: install must refuse to overwrite user files');
  check(fs.readFileSync(path.join(cc, 'agents', 'debugger.md'), 'utf8') === 'user agent', 'claude: user file modified');
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} problem(s)\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`PASS: ${src.workflows.length} workflows, ${src.specialists.length} specialists, install round-trip OK`);
