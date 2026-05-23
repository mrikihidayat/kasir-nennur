import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';
import { createNewOrder } from '@/services/OrderService';

export async function GET() {
  await connectDB();
  try {
    const ordersList = await Order.find()
      .select('customerName totalHarga timestamp status isDeliveryOrder')
      .sort({ timestamp: -1 });
    return NextResponse.json(ordersList);
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil data orderan.' }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const { customerName, items, isDeliveryOrder } = await request.json();
    const { newOrder, receiptText } = await createNewOrder(customerName, items, isDeliveryOrder || false);
    return NextResponse.json(
      { message: 'Pesanan berhasil dibuat!', orderId: newOrder._id, receipt: receiptText },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
