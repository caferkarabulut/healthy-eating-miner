import requests
import json

BASE_URL = "https://healthy-eating-api-cafer.azurewebsites.net"

def test_api():
    print(f"Testing API at {BASE_URL}")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    payload = {"email": "cafer@example.com", "password": "cafer123"}
    
    print("Attempting login...")
    try:
        response = requests.post(login_url, json=payload)
        response.raise_for_status()
        data = response.json()
        token = data.get("access_token")
        print(f"Login successful! Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        try:
            print(response.text)
        except:
            pass
        return

    # 2. Get Meals
    meals_url = f"{BASE_URL}/meals"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching meals...")
    try:
        response = requests.get(meals_url, headers=headers)
        response.raise_for_status()
        meals = response.json()
        print(f"Meals fetched successfully!")
        print(f"Total meals returned: {len(meals)}")
        if len(meals) > 0:
            print("First meal:", meals[0])
    except Exception as e:
        print(f"Fetch meals failed: {e}")
        print(response.text)

if __name__ == "__main__":
    test_api()
