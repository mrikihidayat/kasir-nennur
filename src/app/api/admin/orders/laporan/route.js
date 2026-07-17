import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/OrderModel';
import Menu from '@/models/MenuModel';

export const dynamic = 'force-dynamic';

// Helper: buat Date awal/akhir hari dalam WIB (UTC+7)
function wibDayRange(dateStr) {
  // dateStr format: "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  // WIB midnight = UTC 17:00 hari sebelumnya
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const end   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 7 * 60 * 60 * 1000);
  return { start, end };
}

export async function GET(request) {
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) {
        matchQuery.timestamp.$gte = wibDayRange(startDate).start;
      }
      if (endDate) {
        matchQuery.timestamp.$lte = wibDayRange(endDate).end;
      }
    }

    const orders = await Order.find(matchQuery).sort({ timestamp: -1 });

    const ordersWithSubtotal = orders.map((order) => ({
      ...order.toObject(),
      items: order.items.map((item) => ({
        ...item.toObject(),
        subtotal: item.menuPrice * item.quantity,
      })),
    }));

    const grandTotal = ordersWithSubtotal.reduce((sum, o) => sum + o.totalHarga, 0);

    // Rekap uang per kasir (5 orang yang bisa pegang uang hasil jualan)
    const kasirTotals = { mamah: 0, bapa: 0, kojengkang: 0, kiki: 0, rumah: 0 };
    ordersWithSubtotal.forEach((order) => {
      const key = kasirTotals.hasOwnProperty(order.kasir) ? order.kasir : 'rumah';
      kasirTotals[key] += order.totalHarga;
    });
    const kasirRecap = Object.entries(kasirTotals).map(([kasir, total]) => ({ kasir, total }));
    const kasirTotalSum = kasirRecap.reduce((sum, k) => sum + k.total, 0);
    const kasirCocokDenganGrandTotal = kasirTotalSum === grandTotal;

    // Rekap per menu: total porsi terjual & omzet per menu dalam periode ini
    const recapMap = new Map();
    ordersWithSubtotal.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.menuId.toString();
        const existing = recapMap.get(key) || { menuName: item.menuName, totalQty: 0, totalOmzet: 0 };
        existing.totalQty += item.quantity;
        existing.totalOmzet += item.subtotal;
        recapMap.set(key, existing);
      });
    });

    // Gabungkan dengan sisa stok saat ini
    const allMenus = await Menu.find();
    const menuRecap = allMenus
      .map((menu) => {
        const sold = recapMap.get(menu._id.toString());
        return {
          menuName: menu.nama,
          totalQty: sold ? sold.totalQty : 0,
          totalOmzet: sold ? sold.totalOmzet : 0,
          sisaStok: menu.stok > 0 ? menu.stok : (menu.stok === 0 ? 0 : null), // null = stok tak terbatas
          isAvailable: menu.isAvailable,
        };
      })
      .filter((m) => m.totalQty > 0 || m.sisaStok !== null)
      .sort((a, b) => b.totalQty - a.totalQty);

    return NextResponse.json({
      orders: ordersWithSubtotal,
      grandTotal,
      totalTransaksi: ordersWithSubtotal.length,
      menuRecap,
      kasirRecap,
      kasirTotalSum,
      kasirCocokDenganGrandTotal,
    });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal mengambil laporan: ' + error.message }, { status: 500 });
  }
}
