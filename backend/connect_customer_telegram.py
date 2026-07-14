# connect_customer_telegram.py
import requests

BASE_URL = "http://localhost:8000/api"
BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

# Step 1: Login as customer
print("1. Logging in as customer...")
login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "bath@gmail.com",
    "password": "1234"
})

if login.status_code != 200:
    print("❌ Login failed")
    exit()

token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Step 2: Get current profile
print("\n2. Current profile:")
me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
user = me.json()
print(f"   Name: {user['full_name']}")
print(f"   Telegram: {user.get('telegram_chat_id', 'Not connected')}")

# Step 3: Get available Chat IDs from bot
print("\n3. Available Chat IDs from bot:")
updates = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
data = updates.json()

if data.get("ok") and data.get("result"):
    for update in data["result"]:
        if "message" in update:
            chat = update["message"]["chat"]
            print(f"   - {chat.get('first_name')}: {chat['id']}")
    
    # Step 4: Connect Telegram
    # Replace with actual Chat ID from the list above
    chat_id = input("\n4. Enter the Chat ID to connect: ").strip()
    
    if chat_id:
        connect = requests.post(
            f"{BASE_URL}/telegram/connect",
            json={"chat_id": chat_id},
            headers=headers
        )
        
        if connect.status_code == 200:
            print(f"\n✅ Telegram connected!")
            print(f"   Chat ID: {chat_id}")
            
            # Verify
            me2 = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            user2 = me2.json()
            print(f"   Status: {'✅ Connected' if user2.get('telegram_chat_id') else '❌ Failed'}")
        else:
            print(f"❌ Connection failed: {connect.json()}")
else:
    print("   No users found. Send /start to @ecommerce_system_bot first!")