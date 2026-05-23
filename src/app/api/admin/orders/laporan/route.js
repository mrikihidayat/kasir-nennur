import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';

// Helper: buat Date awal/akhir hari dalam WIB (UTC+7)
function wibDayRange(dateStr) {
  // dateStr format: "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  // WIB midnight = UTC 17:00 hari sebelumnya
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const end   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 7 * 60 * 60 * 1000);
  return { start, end };
}

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
        matchQuery.timestamp.$gte = wibDayRange(startDate).start;
      }
      if (endDate) {
        matchQuery.timestamp.$lte = wibDayRange(endDate).end;
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
