import boto3
def list_policies():
    client = boto3.client('cloudfront', region_name='us-east-1')
    res = client.list_origin_request_policies(Type='custom')
    print("Custom Policies:")
    for item in res.get('OriginRequestPolicyList', {}).get('Items', []):
        print(f" - {item['OriginRequestPolicy']['Id']}: {item['OriginRequestPolicy']['OriginRequestPolicyConfig']['Name']}")

if __name__ == "__main__":
    list_policies()
