# GitHub Deployment Notifier

A centralized webhook service that automatically sends Slack notifications for deployment events across all your GitHub repositories.

## ✨ Features

- **Zero per-repo setup** - automatically works for all repositories in your organization
- **Environment-aware notifications** - different styling for Production, Preview, and Staging
- **Rich Slack messages** - interactive buttons to view deployments and commits
- **Real-time notifications** - instant alerts for both successful and failed deployments
- **Multi-project support** - centralized configuration for all your projects

## 🚀 Quick Start

1. **Deploy to Railway**: Connect this repository to [Railway](https://railway.app)
2. **Configure environment variables** in Railway dashboard
3. **Set up GitHub webhook** at organization level
4. **Invite Slack bot** to your notification channels

## 📋 Environment Variables

Configure these in your Railway project settings:

| Variable            | Description                                | Required |
| ------------------- | ------------------------------------------ | -------- |
| `SLACK_BOT_TOKEN`   | Your Slack bot token (starts with `xoxb-`) | ✅       |
| `GH_WEBHOOK_SECRET` | Secret for webhook verification            | ✅       |
| `PROJECT_URL_1`     | URL for project 1                          | ❌       |
| `PROJECT_URL_2`     | URL for project 2 (and so on)              | ❌       |

## ⚙️ Project Configuration

Edit the `PROJECT_CONFIGS` object in `server.js` to customize notifications for your repositories:

```javascript
const PROJECT_CONFIGS = {
  "your-username/awesome-mern-app": {
    slackChannel: "#deployments",
    customDeploymentUrl: process.env.PROJECT_URL_1,
    displayName: "Awesome MERN App",
  },
  "your-username/portfolio-site": {
    slackChannel: "#frontend-deployments",
    displayName: "Portfolio Site",
  },
  "your-username/api-service": {
    slackChannel: "#backend-deployments",
    displayName: "API Service",
  },
  // Default configuration for unlisted repositories
  default: {
    slackChannel: "#deployments",
    displayName: null, // Uses repository name
  },
};
```

## 🔗 GitHub Webhook Setup

**Organization Level (Recommended):**

1. Go to `https://github.com/orgs/YOUR_ORG/settings/hooks`
2. Add webhook with these settings:
   - **Payload URL**: `https://your-railway-url.up.railway.app/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your `GH_WEBHOOK_SECRET`
   - **Events**: Select "Deployment statuses" only

## 🤖 Slack Bot Setup

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add these OAuth scopes:
   - `chat:write` - Send messages
   - `channels:read` - Access channel information
3. Install the app to your workspace
4. Copy the Bot User OAuth Token
5. Invite the bot to your notification channels: `/invite @YourBotName`

## 📨 Notification Examples

**Success Notification:**

```
🚀 Production Deployment Successful

Project: Awesome MERN App
Environment: Production
Author: your-username
Commit: a1b2c3d
Message: Fix mobile responsiveness and update homepage

[🌐 View Deployment] [📝 View Commit]
```

**Failure Notification:**

```
⚠️ Preview Deployment Failed

Project: API Service
Environment: Preview
Author: vercel[bot]
Commit: x9y8z7w

❗ Check your deployment dashboard for error details.

[📝 View Commit] [🔧 Dashboard]
```

## 🛠️ Adding New Projects

1. Add your repository to `PROJECT_CONFIGS` in `server.js`
2. Commit and push changes
3. Railway will automatically deploy the updated configuration
4. New deployments will immediately start sending notifications

## 🔍 Monitoring & Debugging

**Health Check Endpoint:**

```bash
curl https://your-railway-url.up.railway.app/
# Returns: {"status":"healthy","service":"github-deployment-notifier",...}
```

**Check Railway Logs:**

- Railway Dashboard → Your Project → Deployments → View Logs

**Verify GitHub Webhook Delivery:**

- GitHub Repository → Settings → Webhooks → Recent Deliveries

## 🏗️ Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export SLACK_BOT_TOKEN="your-token"
export GH_WEBHOOK_SECRET="your-secret"

# Start the server
npm run dev
# Server runs on http://localhost:3000
```

## 📊 Supported Deployment Platforms

- ✅ Vercel
- ✅ Netlify
- ✅ Heroku
- ✅ Railway
- ✅ Any platform that triggers GitHub deployment events

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your own deployments
5. Submit a pull request

## 📄 License

MIT License - feel free to use this in your own projects!

---

**Need help?** Check the Railway logs or create an issue in this repository.
