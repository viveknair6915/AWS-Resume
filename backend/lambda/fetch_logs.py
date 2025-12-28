import boto3
import time

def get_logs():
    client = boto3.client('logs', region_name='us-east-1')
    group = '/aws/lambda/SmartResumeTracker'
    
    try:
        # Get latest stream
        streams = client.describe_log_streams(
            logGroupName=group,
            orderBy='LastEventTime',
            descending=True,
            limit=1
        )
        stream_name = streams['logStreams'][0]['logStreamName']
        print(f"Reading stream: {stream_name}")
        
        # Get events
        events = client.get_log_events(
            logGroupName=group,
            logStreamName=stream_name,
            limit=200
        )
        
        for event in events['events']:
            print(event['message'])

    except Exception as e:
        print(f"Error fetching logs: {e}")

if __name__ == "__main__":
    get_logs()
