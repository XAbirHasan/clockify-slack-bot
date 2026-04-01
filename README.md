# clockify-slack-bot

A Cloudflare Worker that listens to a Slack channel and logs time entries to Clockify. Send your daily update in a structured format and it handles the rest — no manual timers.

## How it works

Each person stores their own Clockify credentials in the bot (encrypted in Cloudflare KV). When you send a daily update message, the bot parses it, maps your project names to Clockify project IDs, and creates time entries stacked from your configured work start time.

---

## Requirements

- [Cloudflare account](https://dash.cloudflare.com) (free tier is fine)
- [Slack app](https://api.slack.com/apps) with bot token
- Clockify account with an API key

---

## Deployment & setup

See [SETUP.md](SETUP.md) for the full step-by-step deployment guide (KV namespace, secrets, Slack app config, local dev).

Quick deploy (once SETUP.md steps 1–4 are done):

```bash
npm run deploy
```

---

## Per-user setup

Each person who wants to use the bot sends this message **once** in the channel:

```
setup
api_key: YOUR_CLOCKIFY_API_KEY
workspace_id: YOUR_WORKSPACE_ID
projects: my-project=CLOCKIFY_PROJECT_ID, another-project=CLOCKIFY_PROJECT_ID
start_hour: 9
```

- `api_key` — your personal Clockify API key (Profile Settings → API)
- `workspace_id` — found in Clockify → Workspace Settings → General
- `projects` — a comma-separated list of `name=clockify_project_id` pairs. The names are what you'll use in daily update messages (lowercased, case-insensitive).
- `start_hour` — your work day start in UTC (e.g. `9` = 09:00 UTC)

The bot does **not** delete your setup message automatically — **delete it yourself** after sending so the API key doesn't stay in Slack history. Your config is stored encrypted in Cloudflare KV.

To find your Clockify project IDs, you can run:
```bash
curl -H "X-Api-Key: YOUR_API_KEY" \
  https://api.clockify.me/api/v1/workspaces/YOUR_WORKSPACE_ID/projects \
  | jq '.[] | {name, id}'
```

---

## Daily usage

Send a message like this in the channel:

```
[project-1] [6h]
• Reviewed PR for feature X
  ◦ added details in the PR description
• Fixed the login bug
• Team standup

[project-2] [2h]
• Upgraded dependencies
• Fixed flaky test
```

Numbered lists work too:

```
[project-1] [6h]
1. Reviewed PR for feature X
   a. added details in the PR description
2. Fixed the login bug
[project-2] [2h]
1. Upgraded dependencies
2. Fixed flaky test
```

- Project names (inside `[ ]`) are matched case-insensitively against your `projects` config
- Duration supports: `8h`, `30m`, `8h30m`, `8:30`, `8.5`
- Top-level bullets/numbers become task entries; indented sub-bullets become sub-items in the Clockify description
- Multiple blocks in one message each get their own time entry, stacked sequentially from `start_hour`
- On success the bot adds a ✅ reaction to your message — no reply clutter
- **Editing** your message re-logs all entries (🔄 reaction replaces ✅)
- **Deleting** your message removes all entries logged from it

---
