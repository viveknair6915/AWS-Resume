import boto3
import time

def add_track_behavior():
    client = boto3.client('cloudfront', region_name='us-east-1')
    dist_id = "EU5DDI0MDWH3M"
    policy_name = "ResumeGeoPolicy"
    
    # 1. Get ResumeGeoPolicy ID
    policy_id = None
    res = client.list_origin_request_policies(Type='custom')
    for item in res.get('OriginRequestPolicyList', {}).get('Items', []):
        if item.get('OriginRequestPolicy', {}).get('OriginRequestPolicyConfig', {}).get('Name') == policy_name:
            policy_id = item['OriginRequestPolicy']['Id']
            break
    
    if not policy_id:
        print("Policy not found!")
        return

    print(f"Using Policy ID: {policy_id}")

    # 2. Get Distribution Config
    try:
        resp = client.get_distribution_config(Id=dist_id)
        etag = resp['ETag']
        config = resp['DistributionConfig']
        origin_id = config['Origins']['Items'][0]['Id'] # Use the existing origin

        # 3. Create New Behavior
        new_behavior = {
            'PathPattern': '/track',
            'TargetOriginId': origin_id,
            'ViewerProtocolPolicy': 'redirect-to-https',
            'AllowedMethods': {
                'Quantity': 7,
                'Items': ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
                'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
            },
            'SmoothStreaming': False,
            'Compress': True,
            'LambdaFunctionAssociations': {'Quantity': 0},
            'FunctionAssociations': {'Quantity': 0},
            'FieldLevelEncryptionId': '',
            'CachePolicyId': '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', # Managed-CachingDisabled
            'OriginRequestPolicyId': policy_id
        }

        # 4. Add to CacheBehaviors
        if 'CacheBehaviors' not in config or 'Items' not in config['CacheBehaviors']:
            config['CacheBehaviors'] = {'Quantity': 0, 'Items': []}
        
        # Check if exists and update, or append
        existing_idx = -1
        if config['CacheBehaviors']['Quantity'] > 0:
            for idx, item in enumerate(config['CacheBehaviors']['Items']):
                if item['PathPattern'] == '/track':
                    existing_idx = idx
                    break
        
        if existing_idx >= 0:
            print("Updating existing /track behavior")
            config['CacheBehaviors']['Items'][existing_idx] = new_behavior
        else:
            print("Adding new /track behavior")
            config['CacheBehaviors']['Items'].append(new_behavior)
            config['CacheBehaviors']['Quantity'] += 1

        # 5. Update Distribution
        print("Updating Distribution...")
        client.update_distribution(
            Id=dist_id,
            IfMatch=etag,
            DistributionConfig=config
        )
        print("Success! /track behavior updated.")
        
        # 6. Invalidate
        client.create_invalidation(
            DistributionId=dist_id,
            InvalidationBatch={
                'Paths': {'Quantity': 1, 'Items': ['/*']},
                'CallerReference': str(time.time())
            }
        )
        print("Invalidation Started.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_track_behavior()
