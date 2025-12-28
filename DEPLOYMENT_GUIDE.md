#  AWS Smart Resume - Deployment Guide (PowerShell)

These commands will deploy your project using the **AWS CLI** on Windows.
Ensure you have ran `aws configure` before starting.

## 1️⃣ Setup Environment Variables
Run this block to set names for your resources:
```powershell
$SUFFIX = Get-Random -Maximum 9999
$BUCKET_NAME = "smart-resume-hosting-$SUFFIX"
$TABLE_NAME = "SmartResumeVisits"
$LAMBDA_NAME = "SmartResumeTracker"
$REGION = "us-east-1" # Change if needed
```

## 2️⃣ Backend Deployment

### Create DynamoDB Table
```powershell
aws dynamodb create-table `
    --table-name $TABLE_NAME `
    --attribute-definitions AttributeName=sessionId,AttributeType=S `
    --key-schema AttributeName=sessionId,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $REGION
```

### Create SNS Topic
```powershell
$SNS_ARN = aws sns create-topic --name ResumeAlerts --output text --query TopicArn --region $REGION
Write-Host "SNS Topic ARN: $SNS_ARN"
# Subscribe your email (Replace email!)
aws sns subscribe --topic-arn $SNS_ARN --protocol email --notification-endpoint "viveknair6915@gmail.com" --region $REGION
```

### Create IAM Role for Lambda
First, create the trust policy file:
```powershell
Set-Content -Path "trust-policy.json" -Value '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}'

$ROLE_ARN = aws iam create-role `
    --role-name SmartResumeLambdaRole `
    --assume-role-policy-document file://trust-policy.json `
    --output text --query Role.Arn

# Attach Permissions (Use Managed Policies for simplicity and reliability)
aws iam attach-role-policy --role-name SmartResumeLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name SmartResumeLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name SmartResumeLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess

# Clean up local file
Remove-Item trust-policy.json
```

### Deploy Lambda Function
**Important:** We must zip the *contents* of the lambda folder, not the folder itself.
```powershell
# Install dependencies
Push-Location aws-smart-resume/backend/lambda
npm install

# Zip the function correctly (files at root)
Compress-Archive -Path * -DestinationPath ../../../function.zip -Force
Pop-Location

# Wait for role to propagate (sleep 10s)
Start-Sleep -Seconds 10

# Create Function
aws lambda create-function `
    --function-name $LAMBDA_NAME `
    --zip-file fileb://function.zip `
    --handler handler.handler `
    --runtime nodejs18.x `
    --role $ROLE_ARN `
    --environment "Variables={TABLE_NAME=$TABLE_NAME,SNS_TOPIC_ARN=$SNS_ARN}" `
    --region $REGION

# Clean up zip
Remove-Item function.zip
```

---

## 3️⃣ API Gateway Setup (HTTP API)
*Note: Doing this via CLI is verbose. The Console is easier, but here is the command:*
```powershell
# Create API
$API_ID = aws apigatewayv2 create-api `
    --name "SmartResumeAPI" `
    --protocol-type HTTP `
    --target $LAMBDA_ARN `
    --output text --query ApiId `
    --region $REGION

# Permission for API Gateway to invoke Lambda
# Note: "source-arn" is often tricky to get exactly right in CLI without Account ID. 
# We will use a broader permission or rely on the integration.
aws lambda add-permission `
    --function-name $LAMBDA_NAME `
    --statement-id API_Gateway_Invoke `
    --action lambda:InvokeFunction `
    --principal apigateway.amazonaws.com `
    --region $REGION

Write-Host "✅ API Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com"
```
**ACTION:** Copy the URL above and paste it into `frontend/config.js` (inside `API_ENDPOINT`).

---

## 4️⃣ Frontend Deployment

### Run Locally (Test)
```powershell
# Requires Node.js
npx http-server aws-smart-resume/frontend
```

### Deploy to S3 (Public Website)
```powershell
# Create Bucket
aws s3 mb "s3://$BUCKET_NAME" --region $REGION

# 1. Disable "Block Public Access" (REQUIRED for website hosting)
aws s3api put-public-access-block `
    --bucket $BUCKET_NAME `
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 2. Enable Static Hosting
aws s3 website "s3://$BUCKET_NAME" --index-document index.html

# 3. Add Bucket Policy for Public Read Access
$POLICY = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
"@
Set-Content -Path "bucket_policy.json" -Value $POLICY
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket_policy.json
Remove-Item bucket_policy.json

# 4. Sync Files
aws s3 sync aws-smart-resume/frontend "s3://$BUCKET_NAME"

Write-Host "🌍 Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
```

---
## 🧹 Cleanup (Optional)
To delete everything:
```powershell
aws lambda delete-function --function-name $LAMBDA_NAME
aws s3 rb "s3://$BUCKET_NAME" --force
aws dynamodb delete-table --table-name $TABLE_NAME
aws sns delete-topic --topic-arn $SNS_ARN
```
