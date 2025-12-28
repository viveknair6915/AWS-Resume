# AWS Smart Resume - Watch the Recruiter 👀

**A "Zero-Cost" Serverless Resume that tracks who views it, where they are from, and exactly what they read.**

##  Features

*   **Serverless Hosting**: HTLM5 Resume hosted on S3 + CloudFront (CDN) for global low-latency.
*   **Real-time Tracking**: Detects Page View, Scroll Depth (25%, 50%, 100%), and Section Visibility (e.g., Recruiter spent 20s on "Projects").
*   **Geolocation**: Identifies the Country and City of the visitor.
*   **Instant Alerts**: Sends an SNS Email immediately when someone opens the resume (First Visit).
*   **High Engagement Alert**: Triggers a second alert if they stay longer than 90 seconds.

##  Architecture

1.  **Frontend**: Static Website (S3) served via CloudFront.
2.  **Tracking**: `tracker.js` collects events and sends `POST` beacons.
3.  **API**: API Gateway (HTTP) receives payloads.
4.  **Backend**: AWS Lambda (Node.js 18) processes data.
5.  **Database**: DynamoDB (On-Demand) stores session logs.
6.  **Notifications**: SNS publishes email alerts.

## "Zero Cost" Analysis

This project runs 100% within the AWS Free Tier.

| Service | Free Tier Limit | Estimated Usage | Cost |
| :--- | :--- | :--- | :--- |
| **S3** | 5GB Storage | < 5MB | $0 |
| **CloudFront** | 1TB Transfer | < 100MB | $0 |
| **Lambda** | 400,000 GB-seconds | Minimal | $0 |
| **DynamoDB** | 25GB Storage | < 10MB | $0 |
| **SNS** | 1,000 Emails | < 50 | $0 |
| **API Gateway** | 1 Million calls (12mo) | < 10k | $0 |

---

##  Deployment Instructions

### Prerequisites
*   AWS Account
*   Node.js installed (for local dev/zipping)
*   AWS CLI (optional, can use Console)

### Step 1: Backend Deployment
1.  Navigate to `backend/lambda`.
2.  Run `npm install` (to get UUID/SDK if needed, though AWS provides SDK).
    *   *Note: The code uses standard AWS SDK v3.*
3.  Zip the contents of `backend/lambda` (ensure `handler.js` is at root of zip).
4.  **AWS Lambda**: Create function `SmartResumeTracker` (Node.js 18). Upload Zip.
5.  **IAM**: Give it permissions (see `infra/iam.md`).
6.  **Env Variables**: Set `TABLE_NAME=SmartResumeVisits`, `SNS_TOPIC_ARN=...`.

### Step 2: Infrastructure Setup
Follow the guides in `infra/` folder in order:
1.  [DynamoDB](infra/dynamodb.md)
2.  [SNS](infra/sns.md)
3.  [API Gateway](infra/api-gateway.md) -> **Copy the API URL**.

### Step 3: Frontend Config
1.  Open `frontend/config.js`.
2.  Replace the URL with your API Gateway Invoke URL.

### Step 4: Hosting
1.  [S3 Setup](infra/s3-setup.md).
2.  [CloudFront Setup](infra/cloudfront.md).
3.  **Upload** `frontend/` files to S3 bucket.

### Step 5: Test
1.  Open your CloudFront URL.
2.  Check your email for the "New Visit" alert! 🚀

---

## Interview Explanation

**"Why did you build this?"**
> "I wanted to demonstrate full-stack cloud competency. Instead of just listing 'AWS' as a skill, I used AWS to build the resume itself, adding observability to understand user engagement—just like we would for a production product."

**Key Technical Decisions:**
*   **DynamoDB On-Demand**: Used for unpredictable traffic spikes (e.g., if a post goes viral).
*   **Beacon API**: Used `navigator.sendBeacon` for reliable data transmission on page unload.
*   **Batching**: `tracker.js` debounces scroll events to reduce API calls and save costs.
