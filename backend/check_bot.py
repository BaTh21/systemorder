# check_bot.py
import requests

BOT_TOKEN = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"

# Get bot information
response = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
data = response.json()

print("=" * 50)
print("YOUR BOT INFORMATION")
print("=" * 50)
print(f"Bot Name: {data['result']['first_name']}")
print(f"Bot Username: @{data['result']['username']}")
print(f"Bot ID: {data['result']['id']}")
print("=" * 50)
print(f"\n👉 Open Telegram and search for: @{data['result']['username']}")
print(f"👉 Or click: https://t.me/{data['result']['username']}")
print(f"👉 Send /start to the bot first!")