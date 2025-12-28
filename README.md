# AWS Smart Resume - Watch the Recruiter 👀

**A "Zero-Cost" Serverless Resume that tracks who views it, where they are from, and exactly what they read.**

| **Live Resume** | **Visitor Dashboard** |
| :---: | :---: |
| ![Resume](screenshots/resume_home.png) | ![Dashboard](screenshots/dashboard_overview.png) |
| *Hosted on S3 + CloudFront* | *Real-time Analytics* |

### 🕵️‍♂️ Detailed Activity Log
![Activity Log](screenshots/dashboard_activity.png)
*See every visit, device type, and location in real-time.*

##  Features

*   **Serverless Hosting**: HTLM5 Resume hosted on S3 + CloudFront (CDN) for global low-latency.
*   **Real-time Tracking**: Detects Page View, Scroll Depth (25%, 50%, 100%), and Section Visibility (e.g., Recruiter spent 20s on "Projects").
*   **Geolocation**: Identifies the Country and City of the visitor.
*   **Visitor Dashboard**: A password-protected (optional) analytics page to view traffic stats and charts.
*   **Instant Alerts**: Sends an SNS Email immediately when someone opens the resume (First Visit).
*   **Slack Integration**: Optional webhook integration to get alerts directly in a Slack channel.
*   **High Engagement Alert**: Triggers a second alert if they stay longer than 90 seconds.

##  Architecture

1.  **Frontend**: Static Website (S3) served via CloudFront.
2.  **Tracking**: `tracker.js` collects events and sends `POST` beacons.
3.  **API**: API Gateway (HTTP) receives payloads and serves stats (`GET /stats`).
4.  **Backend**: AWS Lambda (Node.js 18) processes data and generates charts JSON.
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

## Deployment Instructions

You have two options for deployment:

### Option A: Automated Deployment (PowerShell)
For a quick setup on Windows, use the automated guide:
 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

### Option B: Manual Setup
If you prefer to configure resources manually via the AWS Console, follow the consolidated infrastructure guide:
 **[INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md)**

This guide covers:
1.  DynamoDB Table
2.  SNS Topic & Subscription
3.  API Gateway (HTTP API)
4.  Lambda Function & IAM Role
5.  S3 Bucket & Static Hosting
6.  CloudFront CDN (Optional)

### Step 3: Frontend Config
Once your API is deployed:
1.  Open `frontend/config.js`.
2.  Replace the URL with your API Gateway Invoke URL.

### Step 4: Hosting
1.  Upload `frontend/` files to your S3 bucket.
2.  Enable Static Hosting in S3 Properties.

### Step 5: Secure with CloudFront (HTTPS)
To fix "Not Secure" warnings, create a CloudFront distribution pointing to your S3 bucket.
*   Origin: Your S3 Bucket
*   Viewer Protocol Policy: Redirect HTTP to HTTPS

### Step 6: Test
1.  Open your website URL.
2.  Check your email for the "New Visit" alert!

---

##  Live Demo
**Reference Implementation:** [https://dlgh3w0a41apx.cloudfront.net](https://dlgh3w0a41apx.cloudfront.net)

---

## Interview Explanation

**"Why did you build this?"**
> "I wanted to demonstrate full-stack cloud competency. Instead of just listing 'AWS' as a skill, I used AWS to build the resume itself, adding observability to understand user engagement—just like we would for a production product."

**Key Technical Decisions:**
*   **DynamoDB On-Demand**: Used for unpredictable traffic spikes (e.g., if a post goes viral).
*   **Beacon API**: Used `navigator.sendBeacon` for reliable data transmission on page unload.
*   **Batching**: `tracker.js` debounces scroll events to reduce API calls and save costs.
