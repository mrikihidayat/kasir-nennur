'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { submitOrder, updateOrder, getOrderDetail } from '@/services/api';
import Swal from 'sweetalert2';
import { Search, ShoppingCart, Truck, X } from 'lucide-react';

const OrderForm = ({ allMenus, onOrderProcessed, formatRupiah, editingOrderId, setEditingOrderId }) => {
  const [customerName, setCustomerName] = useState('');
  const [isDeliveryOrder, setIsDeliveryOrder] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const nameInputRef = useRef(null);

  const handleResetForm = useCallback(() => {
    setCustomerName('');
    setIsDeliveryOrder(false);
    setQuantities({});
    setNotes({});
    setIsEditMode(false);
    setEditingOrderId(null);
    setIsLoadingEdit(false);
    setSearchTerm('');
    nameInputRef.current?.focus();
  }, [setEditingOrderId]);

  useEffect(() => {
    if (editingOrderId) {
      setIsLoadingEdit(true);
      setIsEditMode(true);
      setSearchTerm('');
      (async () => {
        try {
          const result = await getOrderDetail(editingOrderId);
          const o = result.order;
          setCustomerName(o.customerName || '');
          setIsDeliveryOrder(o.isDeliveryOrder || false);
          const initialQty = {}, initialNotes = {};
          o.items.forEach((item) => {
            initialQty[item.menuId] = item.quantity === 0 ? '' : item.quantity.toString();
            initialNotes[item.menuId] = item.notes || '';
          });
          setQuantities(initialQty);
          setNotes(initialNotes);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat data pesanan: ' + error.message });
          setEditingOrderId(null);
        } finally {
          setIsLoadingEdit(false);
        }
      })();
    } else {
      if (isEditMode) handleResetForm();
    }
  }, [editingOrderId, handleResetForm, isEditMode, setEditingOrderId]);

  const filteredAllMenus = useMemo(() => {
    if (!allMenus?.length) return [];
    return allMenus.filter((m) => m.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allMenus, searchTerm]);

  const handleQtyChange = (menuId, value) => {
    if (value === '') { setQuantities((p) => ({ ...p, [menuId]: '' })); return; }
    const num = Number(value);
    if (isNaN(num) || num < 0) return;
    setQuantities((p) => ({ ...p, [menuId]: num }));
  };

  const currentTotal = useMemo(() => {
    let total = 0;
    allMenus.forEach((m) => { total += m.harga * (Number(quantities[m._id]) || 0); });
    return total;
  }, [quantities, allMenus]);

  const selectedCount = useMemo(
    () => Object.values(quantities).filter((v) => Number(v) > 0).length,
    [quantities]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = [];
    allMenus.forEach((m) => {
      const qty = Number(quantities[m._id]) || 0;
      if (qty > 0) items.push({ menuId: m._id, quantity: qty, notes: notes[m._id] || '' });
    });

    if (items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Kosong!', text: 'Pilih minimal satu menu dengan kuantitas > 0.' });
      return;
    }

    try {
      if (isEditMode) await updateOrder(editingOrderId, { customerName, items, isDeliveryOrder });
      else await submitOrder({ customerName, items, isDeliveryOrder });

      Swal.fire({
        icon: 'success',
        title: 'Sukses!',
        text: `Pesanan ${customerName} berhasil ${isEditMode ? 'diubah' : 'dibuat'}!`,
        timer: 1800,
        showConfirmButton: false,
      });
      onOrderProcessed();
      handleResetForm();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message });
    }
  };

  const getInputValue = (menuId) => {
    const val = quantities[menuId];
    if (val === '') return '';
    if (val === undefined) return 0;
    return val;
  };

  if (isLoadingEdit)
    return <div className="text-center p-8 text-xl font-semibold text-indigo-600 animate-pulse">Memuat data pesanan...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={nameInputRef}
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        placeholder="Nama Pelanggan"
        required
        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent"
      />

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isDeliveryOrder}
          onChange={(e) => setIsDeliveryOrder(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <span className="font-medium text-gray-700 flex items-center gap-1.5">
          <Truck size={16} className="text-blue-500" /> Delivery Order (DO)
        </span>
      </label>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-700 flex items-center gap-1.5">
            <ShoppingCart size={16} /> Daftar Menu
          </h3>
          {selectedCount > 0 && (
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              {selectedCount} item dipilih
            </span>
          )}
        </div>

        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari menu..."
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredAllMenus.map((menu) => {
            const isUnavailable = !menu.isAvailable || menu.stok === 0;
            const qty = Number(quantities[menu._id]) || 0;
            const isSelected = qty > 0;

            return (
              <div
                key={menu._id}
                className={`rounded-xl p-2.5 border transition ${
                  isUnavailable ? 'bg-gray-50 opacity-60 border-gray-200' :
                  isSelected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isUnavailable ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {menu.nama}
                    </p>
                    <p className="text-xs text-gray-500">
                      Rp {formatRupiah(menu.harga)}
                      {menu.stok > 0 && !isUnavailable && <span className="ml-1 text-gray-400">· stok {menu.stok}</span>}
                      {isUnavailable && <span className="ml-1 text-red-400 font-medium">· HABIS/NON-AKTIF</span>}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={getInputValue(menu._id)}
                    onChange={(e) => handleQtyChange(menu._id, e.target.value)}
                    className="w-16 p-1.5 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-green-400"
                    disabled={isUnavailable}
                  />
                </div>
                {isSelected && (
                  <input
                    type="text"
                    value={notes[menu._id] || ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [menu._id]: e.target.value }))}
                    placeholder="Keterangan (cth: Paha semua, Sambal pisah)"
                    className="mt-1.5 w-full p-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-green-400"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xl font-bold text-gray-800">
          Total: <span className="text-green-600">Rp {formatRupiah(currentTotal)}</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className={`flex-1 py-3 rounded-xl font-bold text-white transition ${
            isEditMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isEditMode ? 'SIMPAN PERUBAHAN' : 'BUAT PESANAN'}
        </button>
        {isEditMode && (
          <button type="button" onClick={handleResetForm}
            className="py-3 px-4 bg-gray-400 hover:bg-gray-500 text-white rounded-xl font-bold transition flex items-center gap-1">
            <X size={16} /> Batal
          </button>
        )}
      </div>
    </form>
  );
};

export default OrderForm;
