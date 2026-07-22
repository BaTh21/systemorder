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
        bank_account: str,
        bank_name: str,
        account_name: str,
        amount: float,
        currency: str = "USD",
        order_id: Optional[str] = None,
    ) -> str:
        """
        Generate KHQR string data for Bakong payment
        Uses the standard MDC (Merchant Data Code) format
        """
        # Clean the bank account number
        clean_account = bank_account.replace(" ", "").replace("-", "")
        
        # Build merchant info string
        merchant_info = f"{bank_name}|{clean_account}|{account_name}"
        
        # Build the KHQR data string
        khqr_lines = [
            "KHQR",
            f"BANK:{bank_name}",
            f"ACC:{clean_account}",
            f"NAME:{account_name}",
            f"AMT:{amount:.2f}",
            f"CUR:{currency}",
        ]
        
        if order_id:
            khqr_lines.append(f"REF:{order_id}")
        
        khqr_lines.append(f"TIME:{datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        return "\n".join(khqr_lines)
    
    @staticmethod
    def generate_qr_base64(data: str, size: int = 300) -> str:
        """
        Generate QR code as base64 image
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Resize if needed
            img = img.resize((size, size))
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_base64}"
        except Exception as e:
            print(f"QR generation error: {e}")
            return None