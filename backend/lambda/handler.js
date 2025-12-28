import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { extractGeoData } from "./utils/geo.js";
import { validatePayload } from "./utils/validator.js";
import { sendAlert } from "./utils/notifier.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "SmartResumeVisits";

// CORS Headers
const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    const routeKey = event.routeKey || (event.requestContext?.http?.method + " " + event.rawPath); // Fixed syntax - concatenation Preflight
    if (event.requestContext && event.requestContext.http.method === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        // ROUTE: GET /stats
        if (routeKey.includes("GET /stats")) {
            return await getStats();
        }

        // ROUTE: POST /track
        if (routeKey.includes("POST") && (routeKey.includes("/track") || event.rawPath === "/track")) {
            return await trackVisit(event);
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: "Route not found" }) };

    } catch (err) {
        console.error("Critical Handler Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: err.message })
        };
    }
};

// --- Logic: Get Stats ---
const getStats = async () => {
    try {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            Limit: 50
        });
        const response = await docClient.send(command);
        const items = response.Items || [];

        // Sort by time descending (client-side sort for small dataset)
        items.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                total: items.length, // Only counts last 50? For total scan without limit.
                // Actually for a real total we need a separate counter or full scan.
                // For MVP, just returning items.
                items: items
            })
        };
    } catch (err) {
        console.error("Stats Error:", err);
        throw err;
    }
};

// --- Logic: Track Visit ---
const trackVisit = async (event) => {
    // 1. Validate Input
    const { valid, data, error } = validatePayload(event.body);
    if (!valid) {
        return { statusCode: 400, headers, body: JSON.stringify({ error }) };
    }

    // 2. Extract Geo & Metadata
    const geo = await extractGeoData(event);
    const visitId = data.sessionId;
    const visitorId = data.visitorId || "unknown";

    // 3. Get Visitor Stats
    let visitCount = 1;
    try {
        const queryRes = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "VisitorIndex",
            KeyConditionExpression: "visitorId = :v",
            ExpressionAttributeValues: { ":v": visitorId },
            Select: "COUNT"
        }));
        visitCount = (queryRes.Count || 0) + 1;
    } catch (queryErr) {
        console.error("VisitorIndex Query Failed:", queryErr);
        visitCount = 1;
    }

    // 4. Update Database
    const currentData = {
        ...geo,
        ...data,
        visitCount,
        lastUpdated: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: currentData
    }));

    // 5. Alerting Logic
    await sendAlert("NEW_VISIT", currentData);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Tracked successfully", id: visitId, visitCount })
    };
};
