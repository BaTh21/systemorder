# get_chat_id.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

# Get updates to find your chat ID
response = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
data = response.json()

print("=" * 50)
print("FINDING YOUR CHAT ID")
print("=" * 50)

if data.get("ok") and data.get("result"):
    print(f"Found {len(data['result'])} message(s):\n")
    
    for update in data["result"]:
        if "message" in update:
            chat = update["message"]["chat"]
            print(f"Chat ID: {chat['id']}")
            print(f"Name: {chat.get('first_name', '')} {chat.get('last_name', '')}")
            print(f"Username: @{chat.get('username', 'N/A')}")
            print(f"Message: {update['message'].get('text', '')}")
            print("-" * 30)
            
            # Use this as your admin chat ID
            print(f"\n✅ UPDATE YOUR .env FILE WITH:")
            print(f"TELEGRAM_ADMIN_CHAT_ID={chat['id']}")
else:
    print("❌ No messages found!")
    print("\nPlease do this first:")
    print("1. Open Telegram")
    print("2. Search for your bot (run check_bot.py to find username)")
    print("3. Send /start to your bot")
    print("4. Run this script again")