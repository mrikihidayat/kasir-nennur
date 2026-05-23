import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';
import Order from '@/models/OrderModel';

export async function DELETE() {
  await connectDB();
  try {
    const [menuResult, orderResult] = await Promise.all([
      Menu.deleteMany({}),
      Order.deleteMany({}),
    ]);
    return NextResponse.json({
      message: `Database berhasil direset. ${menuResult.deletedCount} menu & ${orderResult.deletedCount} pesanan dihapus.`,
      deletedMenus: menuResult.deletedCount,
      deletedOrders: orderResult.deletedCount,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal reset database: ' + error.message }, { status: 500 });
  }
}
