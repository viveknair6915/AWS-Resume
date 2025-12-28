import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: "us-east-1" });
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const parseUserAgent = (ua) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows';
    return ua.substring(0, 20);
};

export const sendAlert = async (type, data) => {
    try {
        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const location = `${data.city || 'Unknown'}, ${data.country || 'Unknown'}`;
        const device = parseUserAgent(data.userAgent);
        const visits = data.visitCount || 1;
        const page = (data.sectionsViewed && Object.keys(data.sectionsViewed).length > 0)
            ? Object.keys(data.sectionsViewed).join(', ')
            : 'Resume';

        let subject = "📢 Resume Alert";
        let message = "";

        if (type === "NEW_VISIT") {
            subject = `👀 Resume Visit #${visits} from ${data.city || 'Unknown'}`;
            message = `🚀 *New Resume Visit!* \n` +
                `👤 *Visitor:* #${visits} (Unique)\n` +
                `🌍 *Location:* ${location}\n` +
                `📱 *Device:* ${device}\n` +
                `⏰ *Time:* ${timestamp}`;
        } else if (type === "HIGH_INTEREST") {
            subject = `🔥 High Interest (${data.city || 'Unknown'})`;
            message = `🔥 *High Interest Detected!* \n` +
                `⏱ *Time:* ${Math.round(data.timeSpent || 0)}s\n` +
                `📜 *Scroll:* ${data.scrollDepth || 0}%\n` +
                `👀 *Sections:* ${page}\n` +
                `🌍 *Location:* ${location}`;
        }

        // 1. Send SNS (Email)
        console.log("Attempting to publish to:", TOPIC_ARN);
        if (TOPIC_ARN) {
            await snsClient.send(new PublishCommand({
                TopicArn: TOPIC_ARN,
                Message: message.replace(/\*/g, ''), // Plain text for email
                Subject: subject
            }));
            console.log("SNS Alert Sent");
        } else {
            console.warn("SNS_TOPIC_ARN not set. Skipping Email.");
        }

        // 2. Send Slack (Webhook)
        if (SLACK_WEBHOOK_URL) {
            try {
                const slackBody = { text: message };
                const res = await fetch(SLACK_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(slackBody)
                });
                if (!res.ok) console.error(`Slack Error: ${res.status}`);
                else console.log("Slack Alert Sent");
            } catch (slackErr) {
                console.error("Slack Request Failed:", slackErr);
            }
        }

    } catch (err) {
        console.error("Notifier Failed:", err);
    }
};
