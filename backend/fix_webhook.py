# fix_webhook.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

print("=" * 60)
print("FIXING TELEGRAM BOT")
print("=" * 60)

# Step 1: Delete the webhook
print("\n1. Deleting webhook...")
delete = requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook")
print(f"   Result: {delete.json()}")

# Step 2: Check bot info
print("\n2. Checking bot...")
bot = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
print(f"   Bot: @{bot.json()['result']['username']}")

# Step 3: Get messages
print("\n3. Getting messages...")
updates = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
data = updates.json()

if data.get("ok"):
    messages = data.get("result", [])
    print(f"   Found {len(messages)} message(s)")
    
    for msg in messages:
        if "message" in msg:
            chat = msg["message"]["chat"]
            print(f"\n   From: {chat.get('first_name', 'Unknown')}")
            print(f"   Chat ID: {chat['id']}")
            print(f"   Text: {msg['message'].get('text', '')}")
    
    if len(messages) == 0:
        print("\n   ⚠️  No messages yet!")
        print(f"   👉 Open Telegram and send /start to @ecommerce_system_bot")
        print(f"   👉 https://t.me/ecommerce_system_bot")
else:
    print(f"   ❌ Error: {data}")

# Step 4: Don't set webhook again (we'll use direct API calls)
print("\n" + "=" * 60)
print("✅ Webhook deleted!")
print("   The bot will now use direct API calls (no webhook needed)")
print("   Send /start to @ecommerce_system_bot, then run check_and_connect.py")
print("=" * 60)