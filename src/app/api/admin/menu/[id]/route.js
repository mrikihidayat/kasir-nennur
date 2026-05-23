import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';

export async function DELETE(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const deletedMenu = await Menu.findByIdAndDelete(id);
    if (!deletedMenu) return NextResponse.json({ message: 'Menu tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ message: `Menu "${deletedMenu.nama}" berhasil dihapus.`, deletedId: id });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal menghapus menu.', error: error.message }, { status: 500 });
  }
}
