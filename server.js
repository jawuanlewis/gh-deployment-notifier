import express from "express";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.raw({ type: "application/json" }));

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const PROJECT_CONFIGS = {
  "jawuanlewis/gpt-powered-chatbot": {
    slackChannel: "#prev-deployments",
    customDeploymentUrl: process.env.GPT_PREVIEW_URL,
    displayName: "Jawuan's GPT",
  },
  "jawuanlewis/hangman-web-app": {
    slackChannel: "#prod-deployments",
    customDeploymentUrl: process.env.HANGMAN_URL,
    displayName: "Hangman",
  },
  default: {
    slackChannel: "#prod-deployments",
    displayName: null,
  },
};

function verifyGitHubSignature(payload, signature) {
  if (!GITHUB_WEBHOOK_SECRET) return true;

  const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(payload, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function getProjectConfig(repoName) {
  return PROJECT_CONFIGS[repoName] || PROJECT_CONFIGS["default"];
}

function getEnvironmentEmoji(environment) {
  const envMap = {
    Production: "🚀",
    Preview: "🔍",
    Staging: "🧪",
    Development: "🛠️",
  };
  return envMap[environment] || "✅";
}

async function sendSlackNotification(config, deploymentData, isSuccess) {
  const {
    repository,
    environment,
    deploymentUrl,
    commitSha,
    commitMessage,
    author,
    projectName,
  } = deploymentData;

  const emoji = isSuccess ? getEnvironmentEmoji(environment) : "⚠️";
  const status = isSuccess ? "Successful" : "Failed";

  let messageText = `*Project:* ${projectName}`;
  messageText += `\n*Environment:* ${environment}`;
  messageText += `\n*Author:* ${author}`;
  messageText += `\n*Commit:* \`${commitSha}\``;

  if (isSuccess && commitMessage) {
    messageText += `\n*Message:* ${commitMessage}`;
  } else if (!isSuccess) {
    messageText += `\n\n❗ *Check your deployment dashboard for error details.*`;
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${environment} Deployment ${status}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: messageText,
      },
    },
  ];

  const actionElements = [];

  if (isSuccess && deploymentUrl) {
    actionElements.push({
      type: "button",
      text: { type: "plain_text", text: "🌐 View Deployment" },
      url: deploymentUrl,
      style: "primary",
    });
  }

  actionElements.push({
    type: "button",
    text: { type: "plain_text", text: "📝 View Commit" },
    url: `https://github.com/${repository}/commit/${commitSha}`,
  });

  if (actionElements.length > 0) {
    blocks.push({ type: "actions", elements: actionElements });
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: config.slackChannel,
      blocks: blocks,
    }),
  });

  return await response.json();
}

async function fetchCommitMessage(repository, commitSha) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/commits/${commitSha}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "deployment-notifier",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data.commit.message.substring(0, 100);
    }
  } catch (error) {
    console.error("Error fetching commit message:", error);
  }
  return "Unable to fetch commit message";
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    service: "gh-deployment-notifier",
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const payload = JSON.stringify(req.body);

    if (!verifyGitHubSignature(payload, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body;

    // Only handle deployment events
    if (!event.deployment_status) {
      return res.status(200).json({ message: "Not a deployment status event" });
    }

    const { deployment_status, deployment, repository } = event;

    // Only handle success and failure states
    if (!["success", "failure"].includes(deployment_status.state)) {
      return res.status(200).json({
        message: "Ignoring deployment state: " + deployment_status.state,
      });
    }

    const config = getProjectConfig(repository.full_name);
    const projectName = config.displayName || repository.name;

    let deploymentUrl = deployment_status.target_url;
    if (config.customDeploymentUrl) {
      deploymentUrl = config.customDeploymentUrl;
    }

    const commitMessage = await fetchCommitMessage(
      repository.full_name,
      deployment.sha,
    );

    const deploymentData = {
      repository: repository.full_name,
      environment: deployment_status.environment,
      deploymentUrl: deploymentUrl,
      commitSha: deployment.sha.substring(0, 7),
      commitMessage: commitMessage,
      author: deployment.creator.login,
      projectName: projectName,
    };

    const isSuccess = deployment_status.state === "success";
    await sendSlackNotification(config, deploymentData, isSuccess);

    console.log(
      `Sent ${isSuccess ? "success" : "failure"} notification for ${repository.full_name}`,
    );

    return res.status(200).json({
      message: "Notification sent successfully",
      project: repository.full_name,
      environment: deployment_status.environment,
      state: deployment_status.state,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`GitHub Deployment Notifier running on port ${PORT}`);
});
