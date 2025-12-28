import boto3

def manage_subscriptions():
    client = boto3.client('sns', region_name='us-east-1')
    topic_arn = "arn:aws:sns:us-east-1:149536499949:ResumeAlerts"
    old_email = "viveknair6915@gmail.com"
    new_email = "viveknair691512@gmail.com"

    try:
        # List Subscriptions
        paginator = client.get_paginator('list_subscriptions_by_topic')
        page_iterator = paginator.paginate(TopicArn=topic_arn)

        found_old = False
        
        for page in page_iterator:
            for sub in page['Subscriptions']:
                endpoint = sub.get('Endpoint')
                arn = sub.get('SubscriptionArn')
                
                print(f"Checking subscription: {endpoint} ({sub.get('Protocol')})")
                
                if endpoint == old_email:
                    print(f"Found old email {old_email}. Unsubscribing...")
                    if arn and arn != 'PendingConfirmation':
                        client.unsubscribe(SubscriptionArn=arn)
                        print("Successfully unsubscribed.")
                        found_old = True
                    elif arn == 'PendingConfirmation':
                        print("Old email is PendingConfirmation. Cannot unsubscribe via API (it will expire automatically) or requires Console.")
                        # Note: PendingConfirmation subscriptions cannot always be deleted via API if they don't have an ARN yet.
                        # But typically list_subscriptions returns an ARN or PendingConfirmation string.
                        # If it is literally the string "PendingConfirmation", we can't delete it easily via boto3 unsubscribe which needs an ARN.
                
                if endpoint == new_email:
                    print(f"Confirmed new email {new_email} is present.")

        if not found_old:
            print(f"Old email {old_email} not found in active subscriptions (or already removed).")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    manage_subscriptions()
