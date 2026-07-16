# calculate_revenue.py
import asyncio
from app.core.database import async_session
from sqlalchemy import select, func
from app.models.product import Product
from app.models.order import Order, OrderStatus

async def calculate():
    async with async_session() as db:
        
        # ===== PRODUCT INVENTORY VALUE =====
        result = await db.execute(
            select(Product).where(Product.is_active == True)
        )
        products = result.scalars().all()
        
        total_inventory_value = 0
        total_products = len(products)
        
        for product in products:
            price = float(product.base_price) if product.base_price else 0
            stock = product.stock or 0
            total_inventory_value += price * stock
        
        # ===== ORDER REVENUE =====
        # Total all orders
        result = await db.execute(
            select(func.sum(Order.total))
        )
        total_all_orders = result.scalar() or 0
        
        # Completed orders
        result = await db.execute(
            select(func.sum(Order.total)).where(Order.status == OrderStatus.completed)
        )
        total_completed = result.scalar() or 0
        
        # Pending orders
        result = await db.execute(
            select(func.sum(Order.total)).where(Order.status.in_([
                OrderStatus.pending,
                OrderStatus.confirmed,
                OrderStatus.waiting_payment,
                OrderStatus.paid,
                OrderStatus.purchasing,
                OrderStatus.shipping,
            ]))
        )
        total_pending = result.scalar() or 0
        
        # Count orders
        result = await db.execute(select(func.count(Order.id)))
        total_order_count = result.scalar() or 0
        
        result = await db.execute(
            select(func.count(Order.id)).where(Order.status == OrderStatus.completed)
        )
        completed_count = result.scalar() or 0
        
        # ===== POTENTIAL REVENUE (if all stock sells) =====
        # Average price
        avg_price = total_inventory_value / total_products if total_products > 0 else 0
        
        # Total potential if all stock sells
        total_potential = total_inventory_value
        
        # ===== SUMMARY =====
        print("\n" + "="*60)
        print("💰 TELE-SHOP REVENUE REPORT")
        print("="*60)
        
        print(f"\n📦 PRODUCT INVENTORY")
        print(f"   Total Products: {total_products}")
        print(f"   Average Price: ${avg_price:,.2f}")
        print(f"   Total Inventory Value: ${total_inventory_value:,.2f}")
        
        print(f"\n📊 ORDERS")
        print(f"   Total Orders: {total_order_count}")
        print(f"   Completed Orders: {completed_count}")
        print(f"   Total Revenue (All): ${float(total_all_orders):,.2f}")
        print(f"   Completed Revenue: ${float(total_completed):,.2f}")
        print(f"   Pending Revenue: ${float(total_pending):,.2f}")
        
        print(f"\n🎯 POTENTIAL")
        print(f"   Max Revenue (Sell All): ${total_potential:,.2f}")
        
        # Top products
        result = await db.execute(
            select(Product)
            .where(Product.is_active == True)
            .order_by(Product.base_price.desc())
            .limit(10)
        )
        top_products = result.scalars().all()
        
        print(f"\n🏆 TOP 10 MOST EXPENSIVE PRODUCTS:")
        for i, p in enumerate(top_products, 1):
            value = float(p.base_price) * (p.stock or 0)
            print(f"   {i}. {p.name[:40]} - ${float(p.base_price):,.2f} x {p.stock} = ${value:,.2f}")
        
        # Category breakdown
        result = await db.execute(
            select(
                Product.category_id,
                func.count(Product.id).label('count'),
                func.sum(Product.base_price * Product.stock).label('value')
            )
            .where(Product.is_active == True)
            .group_by(Product.category_id)
        )
        cat_stats = result.all()
        
        print(f"\n📁 REVENUE BY CATEGORY:")
        for cat_id, count, value in cat_stats:
            if value:
                print(f"   Category #{cat_id}: {count} products - ${float(value):,.2f}")
        
        print("\n" + "="*60)
        print(f"💰 GRAND TOTAL POTENTIAL: ${total_potential:,.2f}")
        print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(calculate())