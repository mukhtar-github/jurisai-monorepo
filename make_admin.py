import requests
import json

# This script uses the JWT token to update a user's role to admin using the Role Management API
# we implemented in our RBAC system.

# 1. Login to get a token
login_url = "https://jurisai-monorepo-production.up.railway.app/auth/login"
login_data = {
    "username": "test@example.com",
    "password": "securepassword123"
}
login_headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

print("Logging in to get access token...")
login_response = requests.post(login_url, data=login_data, headers=login_headers)

if login_response.status_code != 200:
    print(f"Failed to login: {login_response.text}")
    exit(1)

token_data = login_response.json()
token = token_data["access_token"]
user_id = token_data["user"]["id"]
print(f"Successfully logged in as user ID: {user_id}")

# 2. Create an admin role if it doesn't exist
roles_url = "https://jurisai-monorepo-production.up.railway.app/roles"
auth_headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("Checking existing roles...")
roles_response = requests.get(roles_url, headers=auth_headers)

if roles_response.status_code == 200:
    roles = roles_response.json()
    admin_role = None
    
    for role in roles:
        if role.get("name") == "admin":
            admin_role = role
            print(f"Found existing admin role with ID: {admin_role['id']}")
            break
    
    if not admin_role:
        print("Creating admin role...")
        create_role_data = {
            "name": "admin",
            "description": "Administrator with full access"
        }
        create_role_response = requests.post(roles_url, json=create_role_data, headers=auth_headers)
        
        if create_role_response.status_code == 201:
            admin_role = create_role_response.json()
            print(f"Created admin role with ID: {admin_role['id']}")
        else:
            print(f"Failed to create admin role: {create_role_response.text}")
            # Try an alternate approach - update user directly
            update_user_url = f"https://jurisai-monorepo-production.up.railway.app/users/{user_id}/role"
            update_data = {"role": "admin"}
            update_response = requests.put(update_user_url, json=update_data, headers=auth_headers)
            
            if update_response.status_code == 200:
                print(f"Successfully updated user to admin role via direct user update")
                
                # Verify the change
                me_url = "https://jurisai-monorepo-production.up.railway.app/auth/me"
                me_response = requests.get(me_url, headers=auth_headers)
                if me_response.status_code == 200:
                    user_data = me_response.json()
                    print(f"User role is now: {user_data.get('role')}")
                
                exit(0)
            else:
                print(f"Failed to update user role directly: {update_response.text}")
                exit(1)
    
    # 3. Assign the admin role to the user
    if admin_role:
        print(f"Assigning admin role to user ID {user_id}...")
        assign_url = f"https://jurisai-monorepo-production.up.railway.app/users/{user_id}/roles"
        assign_data = {"role_id": admin_role["id"]}
        assign_response = requests.post(assign_url, json=assign_data, headers=auth_headers)
        
        if assign_response.status_code in [200, 201]:
            print("Successfully assigned admin role to user")
            
            # Test admin access
            features_url = "https://jurisai-monorepo-production.up.railway.app/system/features"
            features_response = requests.get(features_url, headers=auth_headers)
            if features_response.status_code == 200:
                print("Successfully accessed admin-only features endpoint!")
                print(f"Features response: {features_response.text[:100]}...")
            else:
                print(f"Still unable to access admin features: {features_response.text}")
        else:
            print(f"Failed to assign admin role: {assign_response.text}")
            
            # Try an alternate approach - update user directly
            print("Trying alternate approach - updating user role directly...")
            update_user_url = f"https://jurisai-monorepo-production.up.railway.app/users/{user_id}/role"
            update_data = {"role": "admin"}
            update_response = requests.put(update_user_url, json=update_data, headers=auth_headers)
            
            if update_response.status_code == 200:
                print(f"Successfully updated user to admin role via direct user update")
            else:
                print(f"Failed to update user role directly: {update_response.text}")
else:
    print(f"Failed to get roles: {roles_response.text}")
    
    # Try an alternate approach - update user directly
    print("Trying alternate approach - updating user role directly...")
    update_user_url = f"https://jurisai-monorepo-production.up.railway.app/users/{user_id}/role"
    update_data = {"role": "admin"}
    update_response = requests.put(update_user_url, json=update_data, headers=auth_headers)
    
    if update_response.status_code == 200:
        print(f"Successfully updated user to admin role via direct user update")
    else:
        print(f"Failed to update user role directly: {update_response.text}")

# Finally, verify user profile to confirm role
me_url = "https://jurisai-monorepo-production.up.railway.app/auth/me"
me_response = requests.get(me_url, headers=auth_headers)
if me_response.status_code == 200:
    user_data = me_response.json()
    print(f"User profile after update:")
    print(f"  ID: {user_data.get('id')}")
    print(f"  Name: {user_data.get('name')}")
    print(f"  Email: {user_data.get('email')}")
    print(f"  Role: {user_data.get('role')}")
else:
    print(f"Failed to get user profile: {me_response.text}")
