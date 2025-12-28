# AWS Infrastructure Setup Guide

This document consolidates the setup instructions for all AWS resources required for the **AWS Smart Resume** project. A detailed `DEPLOYMENT_GUIDE.md` (at the project root) provides the automated PowerShell commands, while this file explains the specific configurations.

---

## 1. DynamoDB Setup (Database)
**Purpose**: Stores visitor sessions and analytics data.
1.  **Create Table**
    *   Name: `SmartResumeVisits`
    *   Partition Key: `sessionId` (String)
    *   Sort Key: None
    *   **Global Secondary Index (GSI)**:
        *   Index Name: `VisitorIndex`
        *   Partition Key: `visitorId` (String)
        *   Projection: `KEYS_ONLY` (or Include `lastUpdated`, `city`, `country`)
3.  **Capacity Settings**
    *   **On-demand** (Pay per request) - Falls under Free Tier usage limits.
3.  **Tags**
    *   Project: `AWS-Smart-Resume`

---

## 2. SNS Setup (Notifications)
**Purpose**: Sends email alerts when resumes are viewed.
1.  **Create Topic**
    *   Name: `ResumeAlerts`
    *   Type: Standard
2.  **Create Subscription**
    *   Protocol: `Email`
    *   Endpoint: `your.email@example.com`
    *   **Action**: Confirm subscription via the email link you receive.
3.  **Environment Variable**
    *   Copy the Topic ARN for the Lambda configuration (`SNS_TOPIC_ARN`).

---

## 3. IAM Permissions (Lambda Role)
**Purpose**: Grants Lambda permission to write to DB and publish to SNS.
Create a role with the following policy connected to your Lambda function:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/SmartResumeVisits",
                "arn:aws:dynamodb:*:*:table/SmartResumeVisits/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": "sns:Publish",
            "Resource": "arn:aws:sns:*:*:ResumeAlerts"
        },
        {
            "Effect": "Allow",
            "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

---

## 4. API Gateway Setup (HTTP API)
**Purpose**: Receives traffic from the frontend and triggers Lambda.
1.  **Create API**
    *   Type: **HTTP API**
    *   Name: `SmartResumeAPI`
    *   Integration: Lambda (`SmartResumeTracker`)
2.  **Routes**
    *   **Route 1**: `POST /track` (For recording visits)
    *   **Route 2**: `GET /stats` (For dashboard analytics)
3.  **CORS Configuration**
    *   Origin: `*` (or your CloudFront/S3 URL)
    *   Methods: `POST, GET, OPTIONS`
    *   Headers: `content-type`
4.  **Endpoint**:
    *   Copy the URL => Update `frontend/config.js`.

---

## 5. S3 Bucket Setup (Hosting)
**Purpose**: Hosts static frontend files (HTML, CSS, JS).
1.  **Create Bucket**
    *   Name: Unique (e.g., `smart-resume-hosting-123`)
    *   Region: `us-east-1`
    *   **Block Public Access**: OFF (for static website hosting) OR ON (if using CloudFront only).
2.  **Upload Content**
    *   Upload all contents of `frontend/`.
3.  **Static Website Hosting**
    *   Enable in Properties.
    *   Index document: `index.html`.

---

## 6. CloudFront CDN Setup (Optional/Production)
**Purpose**: HTTPS, Caching, and Geo-Location headers.
1.  **Origin**: Select your S3 bucket.
2.  **Origin Access**: OAC (Origin Access Control) recommended for security.
3.  **Viewer Protocol**: Redirect HTTP to HTTPS.
4.  **Root Object**: `index.html`.
5.  **Geo-Headers (Critical for Tracking)**:
    *   If routing API via CloudFront, set Origin Request Policy to include `CloudFront-Viewer-Country`, `City`, etc.
    *   Otherwise, API Gateway + Lambda extracts IP-based location directly.
