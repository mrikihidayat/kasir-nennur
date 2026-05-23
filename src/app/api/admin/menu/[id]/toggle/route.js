import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';

export async function PUT(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const menu = await Menu.findById(id);
    if (!menu) return NextResponse.json({ message: 'Menu tidak ditemukan.' }, { status: 404 });
    menu.isAvailable = !menu.isAvailable;
    await menu.save();
    return NextResponse.json({
      message: `Status ${menu.nama} berhasil diubah menjadi ${menu.isAvailable ? 'Tersedia' : 'Habis/Non-aktif'}.`,
      isAvailable: menu.isAvailable,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengubah status menu.' }, { status: 500 });
  }
}
