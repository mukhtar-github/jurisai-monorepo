import requests
import json

# API endpoint
url = "https://jurisai-monorepo-production.up.railway.app/auth/login"

# Form data (NOT JSON!)
form_data = {
    "username": "test@example.com",
    "password": "securepassword123"
}

# Headers for form data
headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

# Make request with form data
response = requests.post(url, data=form_data, headers=headers)

# Print details
print("Status Code:", response.status_code)
print("Response Body:", response.text)

# If successful, save token for later use
if response.status_code == 200:
    data = response.json()
    if "access_token" in data:
        token = data["access_token"]
        with open("access_token.txt", "w") as f:
            f.write(token)
        print("Token saved to access_token.txt")
        
        # Test a protected endpoint with the token
        features_url = "https://jurisai-monorepo-production.up.railway.app/system/features"
        auth_headers = {
            "Authorization": f"Bearer {token}"
        }
        features_response = requests.get(features_url, headers=auth_headers)
        print("\nFeatures API Test:")
        print("Status Code:", features_response.status_code)
        print("Response Body:", features_response.text)
