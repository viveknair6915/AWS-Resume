import boto3
import time

def add_stats_behavior():
    client = boto3.client('cloudfront', region_name='us-east-1')
    dist_id = "EU5DDI0MDWH3M"
    
    # 2. Get Distribution Config
    try:
        resp = client.get_distribution_config(Id=dist_id)
        etag = resp['ETag']
        config = resp['DistributionConfig']
        origin_id = config['Origins']['Items'][0]['Id']

        # 3. Create New Behavior for /stats
        new_behavior = {
            'PathPattern': '/stats',
            'TargetOriginId': origin_id,
            'ViewerProtocolPolicy': 'redirect-to-https',
            'AllowedMethods': {
                'Quantity': 3,
                'Items': ['GET', 'HEAD', 'OPTIONS'],
                'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
            },
            'SmoothStreaming': False,
            'Compress': True,
            'LambdaFunctionAssociations': {'Quantity': 0},
            'FunctionAssociations': {'Quantity': 0},
            'FieldLevelEncryptionId': '',
            'CachePolicyId': '4135ea2d-6df8-44a3-9df3-4b5a84be39ad' # Managed-CachingDisabled
            # No OriginRequestPolicy needed if we just want basics, but maybe forward Auth headers later? 
            # For now, no args needed.
        }

        # 4. Add to CacheBehaviors
        if 'CacheBehaviors' not in config or 'Items' not in config['CacheBehaviors']:
            config['CacheBehaviors'] = {'Quantity': 0, 'Items': []}
        
        # Check if exists and update, or append
        existing_idx = -1
        if config['CacheBehaviors']['Quantity'] > 0:
            for idx, item in enumerate(config['CacheBehaviors']['Items']):
                if item['PathPattern'] == '/stats':
                    existing_idx = idx
                    break
        
        if existing_idx >= 0:
            print("Updating existing /stats behavior")
            config['CacheBehaviors']['Items'][existing_idx] = new_behavior
        else:
            print("Adding new /stats behavior")
            config['CacheBehaviors']['Items'].append(new_behavior)
            config['CacheBehaviors']['Quantity'] += 1

        # 5. Update Distribution
        print("Updating Distribution...")
        client.update_distribution(
            Id=dist_id,
            IfMatch=etag,
            DistributionConfig=config
        )
        print("Success! /stats behavior updated.")
        
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
    add_stats_behavior()
