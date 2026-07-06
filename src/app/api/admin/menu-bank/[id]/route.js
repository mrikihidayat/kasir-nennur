import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuBank from '@/models/MenuBankModel';

export async function PUT(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const { nama, harga, foto, deskripsi } = await request.json();

    const menu = await MenuBank.findById(id);
    if (!menu) return NextResponse.json({ message: 'Menu bank tidak ditemukan.' }, { status: 404 });

    // Check nama conflict (excluding self)
    if (nama && nama !== menu.nama) {
      const conflict = await MenuBank.findOne({ nama, _id: { $ne: id } });
      if (conflict) return NextResponse.json({ message: `Nama "${nama}" sudah dipakai menu lain.` }, { status: 409 });
      menu.nama = nama;
    }

    if (harga !== undefined) menu.harga = Number(harga);
    if (foto !== undefined) menu.foto = foto;
    if (deskripsi !== undefined) menu.deskripsi = deskripsi;

    await menu.save();
    return NextResponse.json({ message: `Menu "${menu.nama}" berhasil diperbarui.`, menu });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal memperbarui menu bank.', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const deleted = await MenuBank.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: 'Menu bank tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ message: `Menu "${deleted.nama}" berhasil dihapus dari bank menu.`, deletedId: id });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal menghapus menu bank.', error: error.message }, { status: 500 });
  }
}
