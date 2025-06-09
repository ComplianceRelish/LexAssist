import requests
import json
import sys

def test_ecourts_api(api_key, endpoint=None):
    """Test the E-Courts API with the provided access key"""
    
    # If no specific endpoint is provided, test these common endpoints
    if not endpoint:
        endpoints = [
            "https://api.ecourts.gov.in/api/v1/cases",
            "https://api.ecourts.gov.in/api/v1/courts",
            "https://api.ecourts.gov.in/api/v1/status",
            "https://api-ecourts.gov.in/api/v1/cases",
            "https://api-ecourts.gov.in/api/v1/courts",
            "https://api-ecourts.gov.in/api/v1/causelist",
            "https://api-ecourts.gov.in/api/v1/judgments"
        ]
    else:
        endpoints = [endpoint]
    
    # Common authentication methods to try
    auth_methods = [
        # Method 1: Bearer token in Authorization header
        {"headers": {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}},
        
        # Method 2: API key in Authorization header
        {"headers": {"Authorization": f"APIKey {api_key}", "Content-Type": "application/json"}},
        
        # Method 3: X-API-KEY header
        {"headers": {"X-API-KEY": api_key, "Content-Type": "application/json"}},
        
        # Method 4: api_key query parameter
        {"params": {"api_key": api_key}},
        
        # Method 5: apikey query parameter
        {"params": {"apikey": api_key}},
        
        # Method 6: key query parameter
        {"params": {"key": api_key}}
    ]
    
    print(f"Testing E-Courts API key: {api_key}")
    
    successful_configs = []
    
    for endpoint in endpoints:
        print(f"\nTesting endpoint: {endpoint}")
        
        for i, auth_method in enumerate(auth_methods):
            try:
                print(f"\nTrying authentication method {i+1}...")
                
                if "headers" in auth_method:
                    print(f"Headers: {auth_method['headers']}")
                    response = requests.get(endpoint, headers=auth_method["headers"], timeout=15)
                else:
                    print(f"Params: {auth_method['params']}")
                    response = requests.get(endpoint, params=auth_method["params"], timeout=15)
                
                print(f"Status code: {response.status_code}")
                
                if response.status_code == 200:
                    print("SUCCESS! Authentication worked.")
                    try:
                        data = response.json()
                        print("\nJSON Response preview:")
                        print(json.dumps(data, indent=2)[:500] + "..." if len(json.dumps(data)) > 500 else json.dumps(data, indent=2))
                        
                        # Save the successful configuration
                        successful_configs.append({
                            "endpoint": endpoint,
                            "auth_method": auth_method,
                            "response_preview": str(data)[:100]
                        })
                    except json.JSONDecodeError:
                        print("\nResponse is not JSON format. First 500 characters:")
                        print(response.text[:500])
                else:
                    print(f"Error response code: {response.status_code}")
                    print("First 200 characters of response:")
                    print(response.text[:200])
            except requests.exceptions.RequestException as e:
                print(f"Request error: {e}")
    
    # Summary of results
    if successful_configs:
        print("\n\n=== SUMMARY OF SUCCESSFUL CONFIGURATIONS ===")
        for i, config in enumerate(successful_configs):
            print(f"\nConfiguration {i+1}:")
            print(f"Endpoint: {config['endpoint']}")
            print(f"Auth Method: {config['auth_method']}")
            print(f"Response Preview: {config['response_preview']}")
        
        return successful_configs
    else:
        print("\nAll tests failed. The API key might be invalid or the endpoints are incorrect.")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
        endpoint = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        # Default to the provided API key if no arguments are given
        api_key = "ECIAPI-BvNNWpNAAevvi2NKBKeNK8RiGS4OzS7L"
        endpoint = None
    
    test_ecourts_api(api_key, endpoint)
