'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMenuRecap, getOrdersList, getAllMenus, getPendingOrdersWithReceipt } from '@/services/api';
import { connectPrinter, getPrinterStatus, printData } from '@/services/bluetooth';
import MenuStatus from '@/components/MenuStatus';
import OrderForm from '@/components/OrderForm';
import OrderList from '@/components/OrderList';
import LaporanPDF from '@/components/LaporanPDF';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { Printer, Wifi, WifiOff, ClipboardList, MessageSquare, BookOpen } from 'lucide-react';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID').format(n);

export default function AdminDashboard() {
  const [recapData, setRecapData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [printerName, setPrinterName] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      const [recap, listOrders, menus] = await Promise.all([getMenuRecap(), getOrdersList(), getAllMenus()]);
      setRecapData(recap);
      setOrders(listOrders);
      setAllMenus(menus);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal Muat Data', text: error.message });
    }
  }, []);

  useEffect(() => {
    setPrinterName(getPrinterStatus());
    loadAllData();
  }, [loadAllData]);

  const handleConnectPrinter = async () => {
    try {
      const name = await connectPrinter();
      setPrinterName(name);
      Swal.fire({ icon: 'success', title: 'Printer Terhubung!', text: `"${name}" berhasil tersambung.`, timer: 1500, showConfirmButton: false });
    } catch (error) {
      setPrinterName(null);
      Swal.fire({ icon: 'error', title: 'Koneksi Gagal', text: error.message });
    }
  };

  const handleOrderProcessed = () => { setEditingOrderId(null); loadAllData(); };

  const handlePrintAllPending = async () => {
    if (!printerName) {
      Swal.fire({ icon: 'warning', title: 'Printer Belum Terhubung!', text: 'Hubungkan printer terlebih dahulu.' });
      return;
    }
    try {
      const pendingData = await getPendingOrdersWithReceipt();
      if (!pendingData?.length) {
        Swal.fire({ icon: 'info', text: 'Tidak ada pesanan pending untuk dicetak.' });
        return;
      }
      const confirm = await Swal.fire({
        title: 'Cetak Semua Struk?',
        text: `${pendingData.length} struk akan dicetak sekaligus.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Cetak!',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#f97316',
      });
      if (!confirm.isConfirmed) return;

      for (const order of pendingData) {
        if (order.receiptText) {
          await printData(order.receiptText);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      Swal.fire({ icon: 'success', text: 'Semua struk berhasil dikirim ke printer!', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal Cetak Massal', text: error.message });
    }
  };

  const generatePromoText = () => {
    if (!allMenus?.length) return null;
    const menuReady = allMenus.filter((m) => m.isAvailable && (m.stok === undefined || m.stok > 0));
    if (!menuReady.length) return '🙏 Maaf, semua menu hari ini sudah habis atau non-aktif.';
    let txt = 'Lauk masih ready ya! \n\n';
    menuReady.forEach((m) => { txt += `${m.nama} ${formatRupiah(m.harga)}\n`; });
    return txt;
  };

  const handleCopyPromo = async () => {
    const text = generatePromoText();
    if (!text) { Swal.fire({ icon: 'warning', text: 'Data menu belum termuat.' }); return; }
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({ icon: 'success', title: 'Tersalin!', text: 'Teks promo berhasil disalin ke clipboard.', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', text: 'Gagal menyalin teks.' });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-800">Dashboard Admin Kasir</h1>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <Link
            href="/bank-menu"
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
          >
            <BookOpen size={15} /> Bank Menu
          </Link>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${printerName ? 'text-green-600' : 'text-red-500'}`}>
            {printerName ? <Wifi size={15} /> : <WifiOff size={15} />}
            {printerName || 'Printer Terputus'}
          </span>
          <button
            onClick={handleConnectPrinter}
            disabled={!!printerName}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-white text-sm font-semibold transition ${printerName ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Printer size={15} />
            {printerName ? 'Tersambung' : 'Hubungkan Printer'}
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panel Kiri: Rekap & Status Menu */}
        <div className="lg:col-span-2 bg-white shadow-xl rounded-xl p-6 h-full">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
            📊 Rekap Harian & Status Menu
          </h2>
          <MenuStatus recapData={recapData} loadDataCallback={loadAllData} formatRupiah={formatRupiah} />
        </div>

        {/* Panel Tengah: Input Pesanan */}
        <div className="lg:col-span-2 bg-white shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
            🛒 {editingOrderId ? 'Edit Pesanan' : 'Input Pesanan Baru'}
          </h2>
          <OrderForm
            allMenus={allMenus}
            onOrderProcessed={handleOrderProcessed}
            formatRupiah={formatRupiah}
            editingOrderId={editingOrderId}
            setEditingOrderId={setEditingOrderId}
          />
        </div>

        {/* Panel Kanan: List Pesanan */}
        <div className="lg:col-span-1 bg-white shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
            <ClipboardList size={18} /> List Pesanan
          </h2>
          <OrderList
            orders={orders}
            loadDataCallback={loadAllData}
            formatRupiah={formatRupiah}
            printerStatus={printerName}
            setEditingOrderId={setEditingOrderId}
          />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-8 p-5 bg-white border-t rounded-2xl shadow-sm flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
        <button
          onClick={handleCopyPromo}
          className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-white font-bold transition-all duration-200 bg-purple-600 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 w-full md:w-auto min-w-44"
        >
          <MessageSquare size={16} /> Teks WA
        </button>
        <button
          onClick={handlePrintAllPending}
          className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-white font-bold transition-all duration-200 bg-orange-600 hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-200 w-full md:w-auto min-w-44"
        >
          <Printer size={16} /> Cetak Semua Pending
        </button>
        <LaporanPDF />
      </footer>
    </div>
  );
}
