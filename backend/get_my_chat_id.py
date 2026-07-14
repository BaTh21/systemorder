# get_my_chat_id.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

print("=" * 50)
print("GET YOUR TELEGRAM CHAT ID")
print("=" * 50)

# Get all users who messaged the bot
response = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
data = response.json()

if data.get("ok") and data.get("result"):
    print(f"\nUsers who messaged @ecommerce_system_bot:\n")
    
    seen_chats = set()
    for update in data["result"]:
        if "message" in update:
            chat = update["message"]["chat"]
            chat_id = str(chat["id"])
            
            if chat_id not in seen_chats:
                seen_chats.add(chat_id)
                print(f"👤 {chat.get('first_name', 'Unknown')} {chat.get('last_name', '')}")
                print(f"   Chat ID: {chat['id']}")
                print(f"   Username: @{chat.get('username', 'N/A')}")
                print("-" * 40)
    
    print(f"\n✅ Copy your Chat ID and enter it on the TeleShop Profile page!")
else:
    print("\n❌ No users found!")
    print("1. Open Telegram")
    print("2. Search for @ecommerce_system_bot")
    print("3. Send /start")
    print("4. Run this script again")