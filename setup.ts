import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const WORKER_NAME = 'clockify-slack-bot';
const KV_BINDING  = 'USER_DATA';

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  dim:    '\x1b[2m',
};

const ok   = (msg: string) => console.log(`  ${c.green}✔${c.reset}  ${msg}`);
const info = (msg: string) => console.log(`  ${c.dim}→${c.reset}  ${msg}`);
const warn = (msg: string) => console.log(`  ${c.yellow}!${c.reset}  ${msg}`);

function step(n: number, total: number, msg: string): void {
  console.log(`\n${c.bold}${c.cyan}[${n}/${total}]${c.reset}${c.bold} ${msg}${c.reset}`);
}

function run(cmd: string, silent = false): string {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (!silent && result.stdout) process.stdout.write(result.stdout);
  if (!silent && result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Command failed: ${cmd}`);
  return (result.stdout ?? '').trim();
}

function tryRun(cmd: string): string | null {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  return result.status === 0 ? (result.stdout ?? '').trim() : null;
}

function setSecret(name: string, value: string): void {
  const result = spawnSync(`echo "${value}" | npx wrangler secret put ${name}`, {
    shell: true, encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`Failed to set secret ${name}: ${result.stderr}`);
}

function readDevVar(key: string): string {
  if (!existsSync('.dev.vars')) return '';
  const lines = readFileSync('.dev.vars', 'utf8').split('\n');
  for (const line of lines) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1).replace(/#.*/, '').trim().replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

const rl = readline.createInterface({ input: stdin, output: stdout });

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(`  ${c.cyan}?${c.reset}  ${question}: `);
  return answer.trim();
}

console.log(`\n${c.bold}=== clockify-slack-bot setup ===${c.reset}`);

// 1. Install deps
step(1, 5, 'Installing dependencies');
run('npm install', true);
ok('Dependencies installed');

// 2. Cloudflare login
step(2, 5, 'Cloudflare login');
const whoami = tryRun('npx wrangler whoami 2>/dev/null');
if (!whoami) {
  warn('Not logged in — opening browser...');
  run('npx wrangler login');
}
ok('Logged in to Cloudflare');

// 3. KV namespace
step(3, 5, `KV namespace: ${KV_BINDING}`);

const nsListRaw = tryRun('npx wrangler kv namespace list 2>/dev/null') ?? '';
let kvId: string | undefined;

try {
  // wrangler may print status lines before the JSON array — extract just the array
  const jsonStart = nsListRaw.indexOf('[');
  const jsonStr = jsonStart !== -1 ? nsListRaw.slice(jsonStart) : nsListRaw;
  const namespaces = JSON.parse(jsonStr) as Array<{ id: string; title: string }>;
  // wrangler may prefix title with worker name or not
  kvId = namespaces.find(
    ns => ns.title === `${WORKER_NAME}-${KV_BINDING}` || ns.title === KV_BINDING
  )?.id;
} catch {
  // non-JSON output — fall through to create
}

if (kvId) {
  info(`Found existing namespace: ${kvId}`);
} else {
  const result = spawnSync(`npx wrangler kv namespace create "${KV_BINDING}"`, {
    shell: true, encoding: 'utf8',
  });
  const createOut = (result.stdout ?? '') + (result.stderr ?? '');

  if (result.status !== 0 && createOut.includes('already exists')) {
    // namespace exists but we couldn't find it in the list — re-list and search by any match
    const retryRaw = tryRun('npx wrangler kv namespace list 2>/dev/null') ?? '';
    const jsonStart = retryRaw.indexOf('[');
    const namespaces = JSON.parse(jsonStart !== -1 ? retryRaw.slice(jsonStart) : retryRaw) as Array<{ id: string; title: string }>;
    kvId = namespaces.find(
      ns => ns.title === `${WORKER_NAME}-${KV_BINDING}` || ns.title === KV_BINDING
    )?.id;
    if (!kvId) throw new Error('Namespace exists but could not find its id. Run: npx wrangler kv namespace list');
    info(`Found existing namespace: ${kvId}`);
  } else {
    const idMatch = createOut.match(/"id":\s*"([^"]+)"/);
    if (!idMatch) throw new Error(`Could not parse KV namespace id. Wrangler output:\n${createOut}`);
    kvId = idMatch[1]!;
    ok(`Created namespace: ${kvId}`);
  }
}

const jsonc = readFileSync('wrangler.jsonc', 'utf8');
const patched = jsonc.replace(
  /("binding":\s*"USER_DATA"[^}]*"id":\s*")[^"]*(")/,
  `$1${kvId!}$2`
);
writeFileSync('wrangler.jsonc', patched, 'utf8');
ok('wrangler.jsonc updated');

// 4. Secrets
step(4, 5, 'Worker secrets');

let signingSecret = readDevVar('SLACK_SIGNING_SECRET');
let botToken      = readDevVar('SLACK_BOT_TOKEN');
let encKey        = readDevVar('ENCRYPTION_KEY');

if (signingSecret && botToken) {
  info('Reading credentials from .dev.vars');
} else {
  warn('.dev.vars missing or incomplete — enter values manually');
  if (!signingSecret) signingSecret = await prompt('SLACK_SIGNING_SECRET');
  if (!botToken)      botToken      = await prompt('SLACK_BOT_TOKEN (xoxb-...)');
}

if (!encKey) {
  encKey = execSync('openssl rand -base64 32', { encoding: 'utf8' }).trim();
  info('Generated ENCRYPTION_KEY');
}

setSecret('SLACK_SIGNING_SECRET', signingSecret);
ok('SLACK_SIGNING_SECRET set');

setSecret('SLACK_BOT_TOKEN', botToken);
ok('SLACK_BOT_TOKEN set');

setSecret('ENCRYPTION_KEY', encKey);
ok('ENCRYPTION_KEY set');

// 5. Deploy
step(5, 5, 'Deploy');
run('npm run deploy');

rl.close();

console.log(`\n${c.green}${c.bold}=== Setup complete! ===${c.reset}\n`);
console.log('Next steps:');
console.log('  1. Copy the worker URL printed above');
console.log('  2. Update request_url in slack-manifest.yml with that URL');
console.log('  3. api.slack.com/apps -> Create New App -> From a manifest -> paste slack-manifest.yml');
console.log('  4. Install app to your workspace, then run: /invite @clockify-bot');
console.log('');
