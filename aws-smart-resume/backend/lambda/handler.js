import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { extractGeoData } from "./utils/geo.js";
import { validatePayload } from "./utils/validator.js";
import { sendAlert } from "./utils/notifier.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "SmartResumeVisits";

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    // Fix for CORS Preflight (if handled by API Gateway this might be redundant but safe)
    if (event.requestContext && event.requestContext.http.method === 'OPTIONS') {
        return { statusCode: 200 };
    }

    // 1. Validate Input
    const { valid, data, error } = validatePayload(event.body);
    if (!valid) {
        return { statusCode: 400, body: JSON.stringify({ error }) };
    }

    // 2. Extract Geo & Metadata
    const geo = extractGeoData(event);
    const visitId = data.sessionId;

    try {
        // 3. Check existing session
        const getRes = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { sessionId: visitId }
        }));

        const isNewSession = !getRes.Item;
        const currentData = { ...geo, ...data, lastUpdated: new Date().toISOString() };

        // 4. Update Database
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: currentData
        }));

        // 5. Alerting Logic
        if (isNewSession) {
            // First time seeing this session
            await sendAlert("NEW_VISIT", currentData);
        } else {
            // Check for high engagement updates
            // Alert if time > 90s and we haven't alerted for long stay yet (tracked via DB flag if needed, 
            // but for simplicity we rely on stateless checks or client-side triggers usually. 
            // Here, we'll alert if time > 90s. To avoid spam, we might check if previous time was < 90s.)

            const prevTime = getRes.Item.timeSpent || 0;
            if (currentData.timeSpent > 90 && prevTime <= 90) {
                await sendAlert("HIGH_INTEREST", currentData);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Tracked successfully", id: visitId })
        };

    } catch (err) {
        console.error("DynamoDB Error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
