from sqlalchemy import Column, String, Text, Numeric, Integer, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import enum
import uuid

class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    waiting_payment = "waiting_payment"
    paid = "paid"
    purchasing = "purchasing"
    shipping = "shipping"
    completed = "completed"
    cancelled = "cancelled"

class Order(Base, TimestampMixin):
    __tablename__ = "orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.pending)
    subtotal = Column(Numeric(10,2))
    shipping_fee = Column(Numeric(10,2))
    service_fee = Column(Numeric(10,2))
    total = Column(Numeric(10,2))
    shipping_address = Column(JSON)
    customer_notes = Column(Text, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_receipt_url = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    telegram_message_id = Column(String, nullable=True)

    user = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    product_name_snapshot = Column(String, nullable=False)
    unit_price = Column(Numeric(10,2), nullable=False)
    quantity = Column(Integer, nullable=False)
    total_price = Column(Numeric(10,2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")