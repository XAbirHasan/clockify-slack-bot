# Deployment Setup

## Prerequisites

- Node.js ≥ 20
- A [Cloudflare account](https://dash.cloudflare.com) (free tier is fine)
- A [Slack app](https://api.slack.com/apps) with a bot token
- A Clockify account with an API key

---

## Automated setup (recommended)

### Step 1 — Create the Slack app first

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**
2. Paste the contents of [`slack-manifest.yml`](slack-manifest.yml) (leave the `request_url` placeholder for now)
3. Create → **Install to Workspace**
4. Note down:
   - **Signing Secret**: Basic Information → App Credentials → Signing Secret
   - **Bot Token**: OAuth & Permissions → Bot User OAuth Token (`xoxb-...`)

### Step 2 — Fill in `.dev.vars`

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:
```ini
SLACK_SIGNING_SECRET=   # from step 1
SLACK_BOT_TOKEN=        # from step 1
ENCRYPTION_KEY=         # leave blank — the script generates this automatically
```

### Step 3 — Run the setup script

```bash
npm run setup
```

This will: create the KV namespace, push all secrets to Cloudflare, and deploy. At the end it prints your worker URL.

### Step 4 — Update the Slack app's event subscription URL

1. Go back to your Slack app → **Event Subscriptions**
2. Replace the placeholder `request_url` with your deployed worker URL
3. Save Changes — Slack will verify it (your worker must be deployed first)

---

## Manual setup

```bash
npm install
npx wrangler login
```

---

## 2. Create the KV namespace (one-time)

```bash
npx wrangler kv namespace create USER_DATA
```

Copy the `id` from the output and paste it into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "USER_DATA", "id": "PASTE_ID_HERE" }
]
```

---

## 3. Generate an encryption key

```bash
openssl rand -base64 32
```

Save the output — you'll need it in the next step.

---

## 4. Set production secrets

Each command will prompt you to **paste the value** and press Enter (input is hidden):

```bash
npx wrangler secret put SLACK_SIGNING_SECRET
# paste: Slack app → Basic Information → App Credentials → Signing Secret

npx wrangler secret put SLACK_BOT_TOKEN
# paste: Slack app → OAuth & Permissions → Bot User OAuth Token (xoxb-...)

npx wrangler secret put ENCRYPTION_KEY
# paste: the base64 string generated in step 3
```

---

## 5. Deploy

```bash
npm run deploy
```

Wrangler will print the worker URL, e.g.:
```
https://clockify-slack-bot.<your-subdomain>.workers.dev
```

---

## 6. Configure the Slack app

After deploying (step 5), update the `request_url` in [`slack-manifest.yml`](slack-manifest.yml) with your worker URL, then:

**Option A — From manifest (fastest):**
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**
2. Select your workspace
3. Paste the contents of `slack-manifest.yml`
4. Create → Install to Workspace

**Option B — Manual:**

Go to [api.slack.com/apps](https://api.slack.com/apps) → your app.

**OAuth & Permissions → Bot Token Scopes** — add:
- `chat:write`
- `reactions:write`
- `channels:history`
- `groups:history`

**Event Subscriptions:**
1. Enable Events
2. Set Request URL to your worker URL from step 5
3. Subscribe to bot events: `message.channels`, `message.groups`
4. Save Changes

**Reinstall app** to your workspace after any scope changes.

Invite the bot to your channel:
```
/invite @clockify-bot
```

---

## 7. Local development (optional)

Copy the example secrets file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

Run locally:

```bash
npm run dev
```

Use [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose the local port to Slack for testing.

---

## Per-user setup

Each person sends this message **once** in the Slack channel (then deletes it immediately so the API key isn't left in history):

```
setup
api_key: YOUR_CLOCKIFY_API_KEY
workspace_id: YOUR_WORKSPACE_ID
projects: my-project=CLOCKIFY_PROJECT_ID, another-project=CLOCKIFY_PROJECT_ID
start_hour: 9
```

- `api_key` — Clockify Profile Settings → API
- `workspace_id` — Clockify Workspace Settings → General
- `projects` — comma-separated `name=clockify_project_id` pairs
- `start_hour` — work day start in UTC (Bangladesh UTC+6: 9am = `start_hour: 3`)

To look up your Clockify project IDs:

```bash
curl -H "X-Api-Key: YOUR_API_KEY" \
  https://api.clockify.me/api/v1/workspaces/YOUR_WORKSPACE_ID/projects \
  | jq '.[] | {name, id}'
```
