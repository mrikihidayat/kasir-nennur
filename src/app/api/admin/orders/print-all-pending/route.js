import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAllPendingOrdersWithReceipt } from '@/services/OrderService';

export async function GET() {
  await connectDB();
  try {
    const ordersWithReceipt = await getAllPendingOrdersWithReceipt();
    return NextResponse.json(ordersWithReceipt);
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil data cetak massal: ' + error.message }, { status: 500 });
  }
}
