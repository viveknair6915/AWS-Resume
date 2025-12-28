import boto3

def verify_subscriptions():
    client = boto3.client('sns', region_name='us-east-1')
    topic_arn = "arn:aws:sns:us-east-1:149536499949:ResumeAlerts"
    
    print("Active Subscriptions:")
    paginator = client.get_paginator('list_subscriptions_by_topic')
    for page in paginator.paginate(TopicArn=topic_arn):
        for sub in page['Subscriptions']:
            print(f" - {sub.get('Endpoint')} ({sub.get('SubscriptionArn')})")

if __name__ == "__main__":
    verify_subscriptions()
