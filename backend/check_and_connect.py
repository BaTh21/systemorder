# check_and_connect.py
import requests

BASE_URL = "http://localhost:8000/api"
BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

print("=" * 60)
print("CHECK & CONNECT: bath@gmail.com")
print("=" * 60)

# Step 1: Login
print("\n1. Logging in...")
login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "bath@gmail.com",
    "password": "1234"
})

if login.status_code != 200:
    print(f"   ❌ Login failed: {login.json()}")
    exit()

token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("   ✅ Logged in")

# Step 2: Check current Telegram status
print("\n2. Checking Telegram status...")
me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
user = me.json()
print(f"   Name: {user['full_name']}")
print(f"   Telegram Chat ID: {user.get('telegram_chat_id') or '❌ NOT SET'}")

if user.get('telegram_chat_id'):
    print("   ✅ Telegram IS connected!")
    
    # Send test message
    print("\n3. Sending test message...")
    test = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={
            "chat_id": user['telegram_chat_id'],
            "text": "🧪 <b>Test Message!</b>\n\nIf you see this, your Telegram is connected!\n\nNow place an order to test notifications.",
            "parse_mode": "HTML"
        }
    )
    if test.json().get("ok"):
        print("   ✅ Test message sent! Check Telegram!")
    else:
        print(f"   ❌ Failed: {test.json()}")
else:
    print("   ❌ Telegram is NOT connected!")
    
    # Step 3: Get available Chat IDs
    print("\n3. Getting available Chat IDs from bot...")
    updates = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
    data = updates.json()
    
    if data.get("ok") and data.get("result"):
        print("   Recent messages to bot:")
        chat_ids = []
        for update in reversed(data["result"]):
            if "message" in update:
                chat = update["message"]["chat"]
                chat_id = str(chat["id"])
                name = f"{chat.get('first_name', '')} {chat.get('last_name', '')}"
                username = chat.get('username', 'N/A')
                text = update["message"].get("text", "")[:50]
                
                if chat_id not in [c["id"] for c in chat_ids]:
                    chat_ids.append({
                        "id": chat_id,
                        "name": name,
                        "username": username,
                        "text": text
                    })
                    print(f"   - {name} (@{username})")
                    print(f"     Chat ID: {chat_id}")
                    print(f"     Message: {text}")
                    print()
        
        if chat_ids:
            # Use the most recent Chat ID
            customer_chat_id = chat_ids[0]["id"]
            print(f"\n4. Connecting Chat ID: {customer_chat_id}...")
            
            connect = requests.post(
                f"{BASE_URL}/telegram/connect",
                json={"chat_id": customer_chat_id},
                headers=headers
            )
            
            if connect.status_code == 200:
                print("   ✅ Telegram connected successfully!")
                
                # Send welcome message
                requests.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": customer_chat_id,
                        "text": f"✅ <b>Connected to TeleShop!</b>\n\n"
                                f"Welcome {user['full_name']}!\n\n"
                                f"You'll now receive order updates here.",
                        "parse_mode": "HTML"
                    }
                )
                print("   ✅ Welcome message sent!")
            else:
                print(f"   ❌ Failed: {connect.json()}")
        else:
            print("   ❌ No Chat IDs found!")
    else:
        print("   ❌ No messages found!")
    
    print("\n   👉 Send /start to @ecommerce_system_bot first:")
    print("   https://t.me/ecommerce_system_bot")

# Step 4: Test order notification
if user.get('telegram_chat_id') or 'customer_chat_id' in locals():
    chat = user.get('telegram_chat_id') or customer_chat_id
    
    print(f"\n5. Testing order with notification...")
    
    # Get product
    products = requests.get(f"{BASE_URL}/products", params={"limit": 1})
    data = products.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    
    if items and len(items) > 0:
        product_id = items[0]["id"] if isinstance(items[0], dict) else items[0].id
        
        # Add to cart
        requests.post(f"{BASE_URL}/cart/items", params={
            "product_id": product_id, "quantity": 1
        }, headers=headers)
        
        # Clear any previous orders that might block
        requests.delete(f"{BASE_URL}/cart", headers=headers)
        
        # Add again
        requests.post(f"{BASE_URL}/cart/items", params={
            "product_id": product_id, "quantity": 1
        }, headers=headers)
        
        # Place order
        order = requests.post(f"{BASE_URL}/orders", json={
            "shipping_address": {
                "full_name": user['full_name'],
                "address_line1": "123 Test St",
                "city": "Test",
                "state": "TS",
                "postal_code": "12345",
                "phone": "1234567890"
            },
            "payment_method": "bank_transfer"
        }, headers=headers)
        
        if order.status_code == 200:
            result = order.json()
            print(f"   ✅ Order #{result.get('id')} created!")
            print(f"\n📱 CHECK YOUR TELEGRAM NOW!")
            print(f"   You should see:")
            print(f"   1. ✅ Order Confirmation message")
            print(f"   Check: @ecommerce_system_bot")
        else:
            print(f"   ❌ Order failed: {order.text}")
    else:
        print("   ⚠️  No products available")

print("\n" + "=" * 60)