from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

class Product(Base, TimestampMixin):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    description = Column(Text)
    base_price = Column(Numeric(10,2), nullable=False)
    stock = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    supplier = Column(String)
    supplier_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    discount_percent = Column(Float, default=0.0)

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    image_url = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)
    product = relationship("Product", back_populates="images")

class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    name = Column(String, nullable=False)
    price_modifier = Column(Numeric(10,2), default=0)
    stock = Column(Integer, default=0)
    product = relationship("Product", back_populates="variants")