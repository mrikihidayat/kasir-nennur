import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';
import { getPendingNotesByMenuId, getOrderersByMenuId } from '@/services/OrderService';

export async function GET(request, { params }) {
  await connectDB();
  try {
    const { id: menuId } = await params;
    const menu = await Menu.findById(menuId).select('nama');
    if (!menu) return NextResponse.json({ message: 'Menu tidak ditemukan.' }, { status: 404 });

    const [notesList, orderers] = await Promise.all([
      getPendingNotesByMenuId(menuId),
      getOrderersByMenuId(menuId),
    ]);

    return NextResponse.json({
      menuName: menu.nama,
      notesList,
      orderers,
      message: `Berhasil mengambil data pesanan untuk ${menu.nama}.`,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}
