# generate_qr.py
import qrcode

# Bank transfer QR code format
payment_info = "000123456789"  # Your account number
bank_info = "ABA Bank - TeleShop Inc."

# Create QR code
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(f"bank:{bank_info}\naccount:{payment_info}")
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("uploads/payments/qr-code.png")
print("✅ QR Code saved to uploads/payments/qr-code.png")