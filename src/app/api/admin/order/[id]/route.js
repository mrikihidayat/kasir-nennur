import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';
import { updateExistingOrder, returnCancelledStock, generateReceiptData } from '@/services/OrderService';

export async function GET(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    const receiptText = generateReceiptData(order);
    return NextResponse.json({ message: 'Detail pesanan berhasil diambil.', order, receiptText });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil detail pesanan.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const { customerName, items, kasir } = await request.json();
    const { updatedOrder, receiptText } = await updateExistingOrder(id, customerName, items, kasir);
    return NextResponse.json({ message: 'Pesanan berhasil diubah!', orderId: updatedOrder._id, receipt: receiptText });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    await returnCancelledStock(id);
    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({
      message: `Pesanan dari ${deletedOrder.customerName} berhasil dihapus/dibatalkan.`,
      deletedId: id,
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
