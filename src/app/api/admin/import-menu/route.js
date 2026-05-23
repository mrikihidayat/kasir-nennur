import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const menus = Array.isArray(body) ? body : body.menus;

    if (!menus || !Array.isArray(menus)) {
      return NextResponse.json({ message: 'Format JSON tidak valid. Harus array atau { menus: [...] }' }, { status: 400 });
    }

    const results = { added: 0, updated: 0, errors: [] };

    for (const item of menus) {
      if (!item.nama || item.harga === undefined) {
        results.errors.push(`Item tidak valid (nama/harga wajib): ${JSON.stringify(item)}`);
        continue;
      }
      try {
        const existing = await Menu.findOne({ nama: item.nama });
        if (existing) {
          existing.harga = Number(item.harga);
          if (item.stok !== undefined) existing.stok = Number(item.stok);
          if (item.isAvailable !== undefined) existing.isAvailable = item.isAvailable;
          await existing.save();
          results.updated++;
        } else {
          await Menu.create({
            nama: item.nama,
            harga: Number(item.harga),
            stok: item.stok !== undefined ? Number(item.stok) : 1,
            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
          });
          results.added++;
        }
      } catch (e) {
        results.errors.push(`Gagal proses "${item.nama}": ${e.message}`);
      }
    }

    return NextResponse.json({
      message: `Import selesai: ${results.added} ditambah, ${results.updated} diperbarui.`,
      ...results,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal memproses JSON: ' + error.message }, { status: 400 });
  }
}
