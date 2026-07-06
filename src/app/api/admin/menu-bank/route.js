import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuBank from '@/models/MenuBankModel';

export async function GET() {
  await connectDB();
  const menus = await MenuBank.find().sort({ nama: 1 });
  return NextResponse.json(menus);
}

export async function POST(request) {
  await connectDB();
  try {
    const { nama, harga, foto, deskripsi } = await request.json();

    if (!nama || harga === undefined) {
      return NextResponse.json({ message: 'Nama dan harga wajib diisi.' }, { status: 400 });
    }

    const existing = await MenuBank.findOne({ nama });
    if (existing) {
      return NextResponse.json({ message: `Menu "${nama}" sudah ada di bank menu.` }, { status: 409 });
    }

    const menu = await MenuBank.create({ nama, harga: Number(harga), foto: foto || null, deskripsi: deskripsi || '' });
    return NextResponse.json({ message: `Menu "${nama}" berhasil ditambahkan ke bank menu.`, menu }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/menu-bank] Error asli:', error);
    return NextResponse.json({ message: 'Gagal menambahkan menu bank: ' + error.message }, { status: 500 });
  }
}
