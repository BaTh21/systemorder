# verify_chat_id.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"
CHAT_ID = "1172933097"

print("=" * 50)
print("VERIFYING TELEGRAM SETUP")
print("=" * 50)

# 1. Check bot info
print("\n1. Checking bot...")
bot_info = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
if bot_info.json().get("ok"):
    bot = bot_info.json()["result"]
    print(f"   ✅ Bot: @{bot['username']}")
    print(f"   Name: {bot['first_name']}")
else:
    print(f"   ❌ Invalid bot token!")
    exit()

# 2. Try to send a test message to the chat ID
print(f"\n2. Testing Chat ID: {CHAT_ID}...")
test_msg = requests.post(
    f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
    json={
        "chat_id": CHAT_ID,
        "text": "🧪 Test message from TeleShop! If you see this, the Chat ID is correct! ✅",
        "parse_mode": "HTML"
    }
)

result = test_msg.json()
if result.get("ok"):
    print(f"   ✅ Chat ID {CHAT_ID} is valid!")
    print(f"   ✅ Message sent successfully!")
else:
    print(f"   ❌ Error: {result.get('description')}")
    print(f"   The Chat ID {CHAT_ID} is NOT valid!")
    
    # 3. Find the correct chat ID from getUpdates
    print(f"\n3. Looking for correct Chat ID...")
    updates = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
    data = updates.json()
    
    if data.get("ok") and data.get("result"):
        print(f"   Found {len(data['result'])} message(s):")
        chat_ids = set()
        for update in data["result"]:
            if "message" in update:
                chat = update["message"]["chat"]
                chat_ids.add(str(chat["id"]))
                print(f"   - Chat ID: {chat['id']} | Name: {chat.get('first_name', '')} | @{chat.get('username', 'N/A')}")
        
        if chat_ids:
            correct_id = list(chat_ids)[0]
            print(f"\n   ✅ Correct Chat ID: {correct_id}")
            print(f"   Update your .env file:")
            print(f"   TELEGRAM_ADMIN_CHAT_ID={correct_id}")
            
            # Send test to correct ID
            test2 = requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": correct_id,
                    "text": "✅ Found the correct Chat ID! You'll now receive order notifications! 🎉",
                    "parse_mode": "HTML"
                }
            )
            if test2.json().get("ok"):
                print(f"   ✅ Test message sent to correct Chat ID!")
    else:
        print(f"   ❌ No messages found!")
        print(f"\n   👉 Please do this FIRST:")
        print(f"   1. Open Telegram")
        print(f"   2. Search for @{bot['username']}")
        print(f"   3. Send /start to the bot")
        print(f"   4. Run this script again")

print("\n" + "=" * 50)