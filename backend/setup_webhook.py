# setup_webhook.py
import httpx
from app.core.config import settings
import asyncio

async def setup_webhook():
    webhook_url = "https://systemorder.onrender.com/api/telegram/webhook"
    telegram_api = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
    
    async with httpx.AsyncClient() as client:
        # Set webhook
        response = await client.post(f"{telegram_api}/setWebhook", json={
            "url": webhook_url
        })
        print(f"📡 Webhook setup: {response.json()}")
        
        # Get webhook info
        response = await client.get(f"{telegram_api}/getWebhookInfo")
        print(f"📡 Webhook info: {response.json()}")
        
        # Delete webhook (if needed)
        # response = await client.post(f"{telegram_api}/deleteWebhook")

if __name__ == "__main__":
    asyncio.run(setup_webhook())