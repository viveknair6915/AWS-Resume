import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const sendAlert = async (type, data) => {
    if (!TOPIC_ARN) {
        console.warn("SNS_TOPIC_ARN is not set. Skipping alert.");
        return;
    }

    let subject = "📢 Resume Alert";
    let message = "";

    if (type === "NEW_VISIT") {
        subject = `👀 Resume Viewed from ${data.country}`;
        message = `
Someone just opened your resume!

📍 Location: ${data.city}, ${data.country}
🌐 IP: ${data.ip}
📱 Device: ${data.userAgent}
🔗 Referrer: ${data.referrer}
        `;
    } else if (type === "HIGH_INTEREST") {
        subject = `🔥 High Interest Detected (${data.city})`;
        message = `
Recruiter is deeply engaged!

⏱ Time Spent: ${Math.round(data.timeSpent)} seconds
📜 Scroll Depth: ${data.scrollDepth}%
👀 Sections Viewed: ${Object.keys(data.sectionsViewed).filter(k => data.sectionsViewed[k] > 1).join(', ')}
        `;
    }

    try {
        await snsClient.send(new PublishCommand({
            TopicArn: TOPIC_ARN,
            Subject: subject,
            Message: message.trim()
        }));
        console.log(`Alert sent: ${subject}`);
    } catch (error) {
        console.error("Failed to send SNS alert:", error);
    }
};
