# test_order_notification.py
import requests

BASE_URL = "http://localhost:8000/api"
BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

print("=" * 60)
print("TESTING ORDER NOTIFICATION - bath@gmail.com")
print("=" * 60)

# Login as bath@gmail.com
print("\n1. Logging in...")
login = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "bath@gmail.com",
    "password": "1234"
})

if login.status_code != 200:
    print(f"❌ Login failed: {login.json()}")
    exit()

token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Check Telegram status
print("\n2. Checking Telegram connection...")
me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
user = me.json()
telegram_status = user.get('telegram_chat_id')
print(f"   Name: {user['full_name']}")
print(f"   Telegram: {'✅ Connected' if telegram_status else '❌ Not Connected'}")

if not telegram_status:
    print("\n❌ Telegram still not connected!")
    print("   Did you send /start to @ecommerce_system_bot?")
    print("   https://t.me/ecommerce_system_bot")
    exit()

# Get a product
print("\n3. Getting product...")
products = requests.get(f"{BASE_URL}/products", params={"limit": 1})
data = products.json()
items = data.get("items", data) if isinstance(data, dict) else data

if not items or len(items) == 0:
    print("❌ No products found!")
    exit()

product = items[0]
product_id = product["id"] if isinstance(product, dict) else product.id
product_name = product["name"] if isinstance(product, dict) else product.name
print(f"   Product: {product_name} (ID: {product_id})")

# Clear cart first
requests.delete(f"{BASE_URL}/cart", headers=headers)

# Add to cart
print("\n4. Adding to cart...")
cart = requests.post(f"{BASE_URL}/cart/items", params={
    "product_id": product_id,
    "quantity": 1
}, headers=headers)
print(f"   Status: {'✅' if cart.status_code == 200 else '❌'}")

# Place order
print("\n5. Placing order...")
order = requests.post(f"{BASE_URL}/orders", json={
    "shipping_address": {
        "full_name": user['full_name'],
        "address_line1": "123 Test Street",
        "city": "Test City",
        "state": "TS",
        "postal_code": "12345",
        "phone": "1234567890"
    },
    "payment_method": "bank_transfer"
}, headers=headers)

print(f"   Status: {order.status_code}")

if order.status_code == 200:
    result = order.json()
    print(f"\n✅ Order #{result.get('id')} created successfully!")
    print(f"   Total: ${result.get('total')}")
    print(f"\n📱 CHECK YOUR TELEGRAM NOW!")
    print(f"   👉 Open @ecommerce_system_bot")
    print(f"   You should see:")
    print(f"   ✅ Order Confirmed!")
    print(f"   Order ID: #{result.get('id')}")
    print(f"   Total: ${result.get('total')}")
    
    # Also send test message directly
    print(f"\n6. Sending test message to your Chat ID...")
    test = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={
            "chat_id": telegram_status,
            "text": f"🧪 <b>Test Notification</b>\n\n"
                    f"Order #{result.get('id')} was just created!\n"
                    f"Total: ${result.get('total')}\n\n"
                    f"✅ If you see this, notifications are working!",
            "parse_mode": "HTML"
        }
    )
    if test.json().get("ok"):
        print(f"   ✅ Test message sent!")
    else:
        print(f"   ❌ Failed: {test.json()}")
else:
    print(f"❌ Order failed: {order.text}")

print("\n" + "=" * 60)