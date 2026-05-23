'use client';
import { useState, useMemo } from 'react';
import { deleteOrderApi, confirmOrder, getOrderDetail } from '@/services/api';
import { printData } from '@/services/bluetooth';
import Modal from './Modal';
import Swal from 'sweetalert2';
import { Search, CheckCircle, Printer, Edit2, Trash2, Truck, Package } from 'lucide-react';

const OrderDetailContent = ({ order, formatRupiah }) => (
  <div className="space-y-3">
    <h3 className="text-lg font-bold border-b pb-2 flex items-center gap-2 flex-wrap">
      {order.customerName}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.isDeliveryOrder ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
        {order.isDeliveryOrder ? '🚚 DELIVERY' : '🏠 AMBIL SENDIRI'}
      </span>
    </h3>
    <ul className="space-y-2 max-h-72 overflow-y-auto">
      {order.items.map((item, i) => (
        <li key={i} className="border-b pb-2 text-gray-700">
          <p className="font-semibold text-sm">{item.quantity}x {item.menuName} <span className="text-gray-400 font-normal">@Rp{formatRupiah(item.menuPrice)}</span></p>
          {item.notes && <p className="text-xs text-red-600 italic ml-3 mt-0.5">📝 {item.notes}</p>}
        </li>
      ))}
    </ul>
    <p className="text-xl font-bold text-green-600">TOTAL: Rp {formatRupiah(order.totalHarga)}</p>
  </div>
);

const OrderList = ({ orders, loadDataCallback, formatRupiah, printerStatus, setEditingOrderId }) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailOrderData, setDetailOrderData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    const s = searchTerm.toLowerCase();
    return orders.filter((o) => o.customerName.toLowerCase().includes(s) || o._id.toString().toLowerCase().includes(s));
  }, [orders, searchTerm]);

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Batalkan Pesanan?',
      html: `Pesanan dari <b>${name}</b> akan dihapus. Stok akan dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Tidak',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteOrderApi(id);
      Swal.fire({ icon: 'success', text: res.message, timer: 1500, showConfirmButton: false });
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handleConfirm = async (id, name) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Selesai?',
      html: `Pesanan <b>${name}</b> akan ditandai SELESAI.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      confirmButtonText: 'Ya, Selesai!',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await confirmOrder(id);
      Swal.fire({ icon: 'success', text: res.message, timer: 1200, showConfirmButton: false });
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handlePrintStruk = async (id) => {
    try {
      const result = await getOrderDetail(id);
      setPrintModalData(result);
      setIsPrintModalOpen(true);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handlePrintAction = async () => {
    if (!printModalData?.receiptText) return;
    try {
      await printData(printModalData.receiptText);
      Swal.fire({ icon: 'success', text: 'Struk berhasil dikirim ke printer!', timer: 1200, showConfirmButton: false });
      setIsPrintModalOpen(false);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'GAGAL CETAK', text: error.message });
    }
  };

  const handleShowDetail = async (id) => {
    try {
      const result = await getOrderDetail(id);
      setDetailOrderData(result.order);
      setIsDetailModalOpen(true);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Selesai') return 'bg-green-100 text-green-800';
    if (status === 'Dibatalkan') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getCardStyle = (order) => {
    if (order.status === 'Selesai') return 'border-green-300 bg-green-50';
    if (order.status === 'Dibatalkan') return 'border-red-200 opacity-60';
    if (order.isDeliveryOrder) return 'border-yellow-400 bg-yellow-50';
    return 'border-gray-200 bg-white hover:bg-gray-50';
  };

  if (!orders.length)
    return <div className="text-gray-400 text-center py-8">Belum ada pesanan hari ini.</div>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari pelanggan..."
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
        {filteredOrders.map((order) => (
          <div
            key={order._id}
            className={`p-3 rounded-xl border cursor-pointer transition ${getCardStyle(order)}`}
            onClick={() => handleShowDetail(order._id)}
          >
            <div className="flex items-start justify-between gap-1 mb-1">
              <p className="font-bold text-gray-800 text-sm truncate">{order.customerName || 'Anonim'}</p>
              {order.isDeliveryOrder && <Truck size={13} className="text-blue-600 shrink-0 mt-0.5" />}
            </div>
            <p className="text-sm font-semibold text-gray-700">Rp {formatRupiah(order.totalHarga)}</p>
            <p className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleTimeString('id-ID')}</p>
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(order.status)}`}>{order.status}</span>
              {order.isDeliveryOrder && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-medium">DO</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
              {order.status !== 'Selesai' && (
                <button onClick={() => handleConfirm(order._id, order.customerName)}
                  className="flex items-center gap-0.5 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-lg transition">
                  <CheckCircle size={11} /> Selesai
                </button>
              )}
              <button onClick={() => handlePrintStruk(order._id)}
                className="flex items-center gap-0.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2 py-1 rounded-lg transition">
                <Printer size={11} /> Cetak
              </button>
              <button onClick={() => setEditingOrderId(order._id)}
                className="flex items-center gap-0.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded-lg transition">
                <Edit2 size={11} /> Edit
              </button>
              <button onClick={() => handleDelete(order._id, order.customerName)}
                className="flex items-center gap-0.5 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg transition">
                <Trash2 size={11} /> Batal
              </button>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">Tidak ada pesanan cocok.</div>
        )}
      </div>

      {/* Modal Detail */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detail Pesanan">
        {detailOrderData && <OrderDetailContent order={detailOrderData} formatRupiah={formatRupiah} />}
      </Modal>

      {/* Modal Cetak */}
      <Modal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title="Preview Struk & Cetak">
        {printModalData && (
          <div className="space-y-4">
            <p className="font-bold text-lg">{printModalData.order.customerName}</p>
            <p className="font-bold text-green-600">Rp {formatRupiah(printModalData.order.totalHarga)}</p>
            <div className="bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono">{printModalData.receiptText}</pre>
            </div>
            <button
              onClick={handlePrintAction}
              className={`w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${printerStatus ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
              disabled={!printerStatus}
            >
              <Printer size={16} />
              {printerStatus ? 'CETAK SEKARANG' : 'HUBUNGKAN PRINTER DAHULU'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderList;
