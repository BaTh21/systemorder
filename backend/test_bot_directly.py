# test_bot_directly.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

print("=" * 60)
print("TESTING BOT DIRECTLY")
print("=" * 60)

# 1. Check bot info
print("\n1. Checking bot...")
response = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
data = response.json()

if data.get("ok"):
    bot = data["result"]
    print(f"   ✅ Bot is working!")
    print(f"   Name: {bot['first_name']}")
    print(f"   Username: @{bot['username']}")
    print(f"   Link: https://t.me/{bot['username']}")
else:
    print(f"   ❌ Bot error: {data}")
    exit()

# 2. Check for ANY messages
print("\n2. Checking for messages...")
updates = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
data = updates.json()

if data.get("ok"):
    messages = data.get("result", [])
    print(f"   Found {len(messages)} message(s)")
    
    if len(messages) == 0:
        print("\n   ⚠️  NO MESSAGES RECEIVED!")
        print(f"\n   👉 Open Telegram and click this link:")
        print(f"   https://t.me/{bot['username']}")
        print(f"\n   Then:")
        print(f"   1. Click the 'START' button at the bottom")
        print(f"   2. Or type /start and send")
        print(f"   3. Then type 'Hello' and send")
        print(f"\n   After that, run this script again!")
    else:
        print("\n   Messages found:")
        for i, msg in enumerate(messages, 1):
            if "message" in msg:
                m = msg["message"]
                chat = m["chat"]
                print(f"\n   Message {i}:")
                print(f"   From: {chat.get('first_name', 'Unknown')}")
                print(f"   Chat ID: {chat['id']}")
                print(f"   Text: {m.get('text', 'N/A')[:50]}")
else:
    print(f"   ❌ Error: {data}")

# 3. Show bot link clearly
print("\n" + "=" * 60)
print("🔗 OPEN THIS LINK ON YOUR PHONE OR TELEGRAM APP:")
print(f"   https://t.me/{bot['username']}")
print("=" * 60)