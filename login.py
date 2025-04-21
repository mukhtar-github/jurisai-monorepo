import requests
import json

# API endpoint
url = "https://jurisai-monorepo-production.up.railway.app/auth/login"

# JSON payload
payload = {
    "username": "test@example.com",
    "password": "securepassword123"
}

# Headers
headers = {
    "Content-Type": "application/json"
}

# Make request
response = requests.post(url, json=payload, headers=headers)

# Print details
print("Status Code:", response.status_code)
print("Response Body:", response.text)

# If successful, save token for later use
if response.status_code == 200:
    data = response.json()
    if "access_token" in data:
        with open("access_token.txt", "w") as f:
            f.write(data["access_token"])
        print("Token saved to access_token.txt")
