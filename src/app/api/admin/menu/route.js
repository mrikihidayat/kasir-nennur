import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';

export async function GET() {
  await connectDB();
  const menus = await Menu.find().sort({ _id: 1 });
  return NextResponse.json(menus);
}

export async function POST(request) {
  await connectDB();
  try {
    const { nama, harga, stok } = await request.json();
    let menu = await Menu.findOne({ nama });

    if (menu) {
      menu.harga = harga;
      menu.stok = stok !== undefined ? stok : menu.stok;
      await menu.save();
      return NextResponse.json({ message: 'Menu berhasil diperbarui.', menu });
    } else {
      menu = new Menu({ nama, harga, stok });
      await menu.save();
      return NextResponse.json({ message: 'Menu baru berhasil ditambahkan.', menu }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'Gagal memproses menu.', error: error.message }, { status: 500 });
  }
}
