# check_customer.py
import requests

BASE_URL = "http://localhost:8000/api"

# Login as customer
login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "bath@gmail.com",
    "password": "1234"
})

if login.status_code == 200:
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check customer profile
    me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user = me.json()
    
    print("=" * 50)
    print("CUSTOMER TELEGRAM STATUS")
    print("=" * 50)
    print(f"Name: {user.get('full_name')}")
    print(f"Email: {user.get('email')}")
    print(f"Telegram Chat ID: {user.get('telegram_chat_id', 'NOT SET')}")
    print(f"Status: {'✅ Connected' if user.get('telegram_chat_id') else '❌ Not Connected'}")
    print("=" * 50)
    
    if not user.get('telegram_chat_id'):
        print("\nTo connect Telegram:")
        print(f"1. Send /start to @ecommerce_system_bot")
        print(f"2. Run get_my_chat_id.py to get your Chat ID")
        print(f"3. Use the Profile page to connect")
else:
    print("Login failed")