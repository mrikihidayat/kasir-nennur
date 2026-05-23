import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';

export async function PUT(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const confirmedOrder = await Order.findByIdAndUpdate(
      id,
      { status: 'Selesai' },
      { new: true }
    ).select('customerName status');
    if (!confirmedOrder) return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({
      message: `Pesanan dari ${confirmedOrder.customerName} telah dikonfirmasi SELESAI.`,
      order: confirmedOrder,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengonfirmasi pesanan.' }, { status: 500 });
  }
}
