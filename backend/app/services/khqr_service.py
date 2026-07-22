# app/services/khqr_service.py
import qrcode
import io
import base64
from typing import Optional
from datetime import datetime

class KHQRGenerator:
    """Generate KHQR / Bakong QR codes for Cambodian payments"""
    
    @staticmethod
    def generate_khqr_data(
        bank_account: str = "003039935",
        bank_name: str = "ABA Bank",
        account_name: str = "MOK KOLSAMBATH",
        amount: float = 0,
        currency: str = "USD",
        order_id: Optional[str] = None,
    ) -> str:
        """
        Generate KHQR string for Bakong payment
        Uses the format that Cambodian banking apps actually scan
        """
        clean_account = bank_account.replace(" ", "").replace("-", "")
        
        # Simple, clean format that banking apps can read
        # This is the standard Bakong MDC format
        khqr_data = (
            f"BAKONG|"
            f"{clean_account}|"
            f"{account_name}|"
            f"{bank_name}|"
            f"{amount:.2f}|"
            f"{currency}"
        )
        
        if order_id:
            khqr_data += f"|{order_id}"
        
        return khqr_data
    
    @staticmethod
    def generate_qr_base64(data: str, size: int = 350) -> str:
        """Generate QR code as base64 image"""
        try:
            qr = qrcode.QRCode(
                version=2,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img = img.resize((size, size))
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_base64}"
        except Exception as e:
            print(f"QR generation error: {e}")
            return None
    
    @staticmethod
    def get_simple_payment_qr(amount: float, order_id: str = "") -> str:
        """
        Generate a simple payment QR that ABA can scan
        Format: bank|account|name|amount|currency
        """
        data = f"ABA|003039935|MOK KOLSAMBATH|{amount:.2f}|USD"
        if order_id:
            data += f"|{order_id}"
        return data
    
    @staticmethod
    def get_payment_text_for_telegram(amount: float, order_id: str) -> str:
        """Generate payment instructions for Telegram"""
        return f"""
💰 <b>Payment Required - Order #{order_id}</b>

<b>Amount:</b> ${amount:.2f}

━━━━━━━━━━━━━━━━━━━━
🏦 <b>ABA Bank Transfer Details</b>
━━━━━━━━━━━━━━━━━━━━

👤 <b>Name:</b> MOK KOLSAMBATH
🔢 <b>Account:</b> <code>003039935</code>
🏦 <b>Bank:</b> ABA Bank

━━━━━━━━━━━━━━━━━━━━
📱 <b>How to Pay:</b>
━━━━━━━━━━━━━━━━━━━━

1️⃣ Open ABA Mobile App
2️⃣ Tap <b>Scan QR</b> or <b>Transfer</b>
3️⃣ Enter account: <code>003039935</code>
4️⃣ Enter name: <b>MOK KOLSAMBATH</b>
5️⃣ Enter amount: <b>${amount:.2f}</b>
6️⃣ Confirm payment

✅ Works with <b>ACLEDA, Wing, TrueMoney</b>
📸 Upload screenshot on website after payment
"""