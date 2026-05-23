import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/MenuModel';
import Order from '@/models/OrderModel';

// Hitung awal hari WIB (UTC+7): ambil waktu sekarang, kurangi offset 7 jam,
// lalu snap ke midnight UTC — hasilnya = 00:00:00 WIB dalam UTC
function startOfTodayWIB() {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const nowWIB = new Date(now.getTime() + wibOffset);
  // Ambil tanggal WIB
  const y = nowWIB.getUTCFullYear();
  const m = nowWIB.getUTCMonth();
  const d = nowWIB.getUTCDate();
  // Buat midnight WIB = UTC jam 17:00 hari sebelumnya
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - wibOffset);
}

export async function GET() {
  await connectDB();
  try {
    const menuStatus = await Menu.find().sort({ _id: 1 });
    const startOfDay = startOfTodayWIB();

    const totalOrdersToday = await Order.countDocuments({ timestamp: { $gte: startOfDay } });

    const omzetResult = await Order.aggregate([
      { $match: { timestamp: { $gte: startOfDay } } },
      { $group: { _id: null, totalOmzet: { $sum: '$totalHarga' } } },
    ]);
    const omzetToday = omzetResult.length > 0 ? omzetResult[0].totalOmzet : 0;

    const orderedQuantities = await Order.aggregate([
      { $match: { timestamp: { $gte: startOfDay }, status: 'Pending' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.menuId', totalOrdered: { $sum: '$items.quantity' } } },
    ]);

    const menuStatusWithSales = menuStatus.map((menu) => {
      const orderedData = orderedQuantities.find((s) => s._id.equals(menu._id));
      return { ...menu.toObject(), totalOrdered: orderedData ? orderedData.totalOrdered : 0 };
    });

    return NextResponse.json({ menuStatus: menuStatusWithSales, totalOrdersToday, omzetToday });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal membuat rekap data.' }, { status: 500 });
  }
}
