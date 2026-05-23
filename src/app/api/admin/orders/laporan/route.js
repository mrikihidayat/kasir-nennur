import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';

export async function GET(request) {
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.timestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.timestamp.$lte = end;
      }
    }

    const orders = await Order.find(matchQuery).sort({ timestamp: -1 });

    const ordersWithSubtotal = orders.map((order) => ({
      ...order.toObject(),
      items: order.items.map((item) => ({
        ...item.toObject(),
        subtotal: item.menuPrice * item.quantity,
      })),
    }));

    const grandTotal = ordersWithSubtotal.reduce((sum, o) => sum + o.totalHarga, 0);

    return NextResponse.json({
      orders: ordersWithSubtotal,
      grandTotal,
      totalTransaksi: ordersWithSubtotal.length,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil laporan: ' + error.message }, { status: 500 });
  }
}
