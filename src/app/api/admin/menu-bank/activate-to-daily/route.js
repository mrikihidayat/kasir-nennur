import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuBank from '@/models/MenuBankModel';
import Menu from '@/models/MenuModel';

// POST: activate selected bank menus as today's daily menu
// Body: { menuBankIds: [...], resetFirst?: boolean }
export async function POST(request) {
  await connectDB();
  try {
    const { menuBankIds, resetFirst = false } = await request.json();

    if (!Array.isArray(menuBankIds) || menuBankIds.length === 0) {
      return NextResponse.json({ message: 'Pilih minimal satu menu dari bank.' }, { status: 400 });
    }

    // Optionally reset (non-active) daily menus first
    if (resetFirst) {
      await Menu.updateMany({}, { isAvailable: false });
    }

    const bankMenus = await MenuBank.find({ _id: { $in: menuBankIds } });
    if (bankMenus.length === 0) {
      return NextResponse.json({ message: 'Tidak ada menu bank yang ditemukan.' }, { status: 404 });
    }

    const results = { added: 0, updated: 0, errors: [] };

    for (const bMenu of bankMenus) {
      try {
        const existing = await Menu.findOne({ nama: bMenu.nama });
        if (existing) {
          existing.harga = bMenu.harga;
          existing.isAvailable = true;
          existing.stok = 1;
          await existing.save();
          results.updated++;
        } else {
          await Menu.create({
            nama: bMenu.nama,
            harga: bMenu.harga,
            stok: 1,
            isAvailable: true,
          });
          results.added++;
        }
      } catch (e) {
        results.errors.push(`Gagal aktivasi "${bMenu.nama}": ${e.message}`);
      }
    }

    return NextResponse.json({
      message: `${results.added} menu baru ditambahkan, ${results.updated} menu diaktifkan kembali.`,
      ...results,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal aktivasi menu bank.', error: error.message }, { status: 500 });
  }
}
