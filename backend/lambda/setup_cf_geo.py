import boto3
import time
from botocore.exceptions import ClientError

def setup_cloudfront():
    client = boto3.client('cloudfront', region_name='us-east-1')
    dist_id = "EU5DDI0MDWH3M"
    policy_name = "ResumeGeoPolicy"
    
    # 1. Get/Create Policy ID
    policy_id = None
    try:
        # Try finding it first (since we might have created it in prev run)
        res = client.list_origin_request_policies(Type='custom')
        for item in res.get('OriginRequestPolicyList', {}).get('Items', []):
            if item.get('OriginRequestPolicy', {}).get('OriginRequestPolicyConfig', {}).get('Name') == policy_name:
                policy_id = item['OriginRequestPolicy']['Id']
                print(f"Found Existing Policy ID: {policy_id}")
                break
        
        if not policy_id:
             print("Creating new Policy...")
             response = client.create_origin_request_policy(
                OriginRequestPolicyConfig={
                    'Comment': 'Forward Geo Headers',
                    'Name': policy_name,
                    'HeadersConfig': {
                        'HeaderBehavior': 'whitelist',
                        'Headers': {
                            'Quantity': 5,
                            'Items': [
                                'CloudFront-Viewer-Country',
                                'CloudFront-Viewer-City',
                                'CloudFront-Viewer-Country-Name',
                                'CloudFront-Viewer-Region',
                                'Referer'
                            ]
                        }
                    },
                    'CookiesConfig': {'CookieBehavior': 'none'},
                    'QueryStringsConfig': {'QueryStringBehavior': 'none'}
                }
             )
             policy_id = response['OriginRequestPolicy']['Id']
             print(f"Created Policy: {policy_id}")

    except Exception as e:
        print(f"Error getting policy: {e}")
        return

    # 2. Update Distribution
    try:
        print(f"Updating Distribution {dist_id}...")
        dist_config_response = client.get_distribution_config(Id=dist_id)
        etag = dist_config_response['ETag']
        config = dist_config_response['DistributionConfig']
        behavior = config['DefaultCacheBehavior']
        
        # MIGRATION: Switch to CachePolicy + OriginRequestPolicy
        # 1. Set Policies
        behavior['CachePolicyId'] = '658327ea-f89d-4fab-a63d-7e88639e58f6' # Managed-CachingOptimized
        behavior['OriginRequestPolicyId'] = policy_id
        
        # 2. Remove Legacy Fields (Directives irrelevant when CachePolicyId is present)
        keys_to_remove = ['ForwardedValues', 'MinTTL', 'MaxTTL', 'DefaultTTL']
        for key in keys_to_remove:
            if key in behavior:
                del behavior[key]

        client.update_distribution(
            Id=dist_id,
            IfMatch=etag,
            DistributionConfig=config
        )
        print("Distribution Updated Successfully!")
        
        # 3. Invalidate
        print("Invalidating Cache...")
        client.create_invalidation(
            DistributionId=dist_id,
            InvalidationBatch={
                'Paths': {'Quantity': 1, 'Items': ['/*']},
                'CallerReference': str(time.time())
            }
        )
        print("Invalidation Started.")

    except Exception as e:
        print(f"Error updating distribution: {e}")

if __name__ == "__main__":
    setup_cloudfront()
