'use client';
import { useState, useMemo } from 'react';
import { updateMenu, toggleMenu, deleteMenuApi, getPendingNotesByMenuIdApi, importMenuFromJson } from '@/services/api';
import Modal from './Modal';
import Swal from 'sweetalert2';
import {
  Search, PlusCircle, Edit2, ToggleLeft, ToggleRight, Trash2,
  Users, Upload, ChevronDown, ChevronUp, ShoppingBag, AlertTriangle
} from 'lucide-react';

// Sub-komponen: Siapa yang pesan menu ini
const MenuOrderersContent = ({ orderers, menuName }) => {
  if (orderers === null)
    return <div className="text-center p-4 text-indigo-600 animate-pulse">Memuat data pemesan...</div>;
  if (orderers.length === 0)
    return <p className="text-gray-500 italic text-sm">Tidak ada pesanan Pending untuk menu ini.</p>;

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {orderers.map((o, i) => (
        <div key={i} className="flex items-start justify-between border-b pb-2 pt-1">
          <div>
            <p className="font-semibold text-gray-800 flex items-center gap-1">
              {o.isDeliveryOrder && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">DO</span>
              )}
              {o.customerName}
            </p>
            {o.notes && <p className="text-xs italic text-red-600 ml-1 mt-0.5">📝 {o.notes}</p>}
          </div>
          <span className="font-bold text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded-full">{o.quantity}x</span>
        </div>
      ))}
    </div>
  );
};

// Sub-komponen: Import Menu via JSON
const ImportMenuModal = ({ onImported }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);

  const placeholder = `Contoh format JSON:\n[\n  { "nama": "Ayam Balado", "harga": 8000, "stok": 20 },\n  { "nama": "Tempe Goreng", "harga": 3000, "stok": 30 },\n  { "nama": "Sayur Asem", "harga": 5000, "stok": 0 }\n]`;

  const handleImport = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      Swal.fire({ icon: 'error', title: 'Format Salah', text: 'JSON tidak valid. Cek lagi formatnya.' });
      return;
    }

    setLoading(true);
    try {
      const result = await importMenuFromJson(parsed);
      Swal.fire({
        icon: 'success',
        title: 'Import Berhasil!',
        html: `<b>${result.added}</b> menu baru ditambahkan<br><b>${result.updated}</b> menu diperbarui${result.errors?.length ? `<br><span class="text-red-500 text-sm">${result.errors.length} error</span>` : ''}`,
      });
      setJsonText('');
      setIsOpen(false);
      onImported();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Import Gagal', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm bg-violet-100 text-violet-700 hover:bg-violet-200 px-3 py-1.5 rounded-lg font-semibold transition"
      >
        <Upload size={14} /> Import JSON
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Import Menu via JSON">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Paste JSON array menu di bawah. Menu yang sudah ada akan diperbarui, menu baru akan ditambahkan.
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={placeholder}
            rows={10}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
          />
          <button
            onClick={handleImport}
            disabled={loading || !jsonText.trim()}
            className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? '⏳ Mengimpor...' : <><Upload size={16} /> Proses Import</>}
          </button>
        </div>
      </Modal>
    </>
  );
};

const MenuStatus = ({ recapData, loadDataCallback, formatRupiah }) => {
  const [form, setForm] = useState({ id: null, nama: '', harga: '', stok: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isOrderersModalOpen, setIsOrderersModalOpen] = useState(false);
  const [selectedOrderers, setSelectedOrderers] = useState(null);
  const [selectedMenuName, setSelectedMenuName] = useState('');

  const filteredMenuStatus = useMemo(() => {
    if (!recapData?.menuStatus) return [];
    return recapData.menuStatus.filter((m) =>
      m.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recapData, searchTerm]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleEdit = (menu) => {
    setForm({ id: menu._id, nama: menu.nama, harga: menu.harga.toString(), stok: menu.stok.toString() });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await updateMenu({ nama: form.nama, harga: parseInt(form.harga), stok: parseInt(form.stok) || 0 });
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message, timer: 1500, showConfirmButton: false });
      setForm({ id: null, nama: '', harga: '', stok: '' });
      setIsFormOpen(false);
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handleToggle = async (id, isAvailable, nama) => {
    const confirm = await Swal.fire({
      title: `${isAvailable ? 'Non-aktifkan' : 'Aktifkan'} menu?`,
      text: `Menu: ${nama}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
      confirmButtonColor: isAvailable ? '#ef4444' : '#22c55e',
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await toggleMenu(id);
      Swal.fire({ icon: 'success', text: result.message, timer: 1200, showConfirmButton: false });
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handleDelete = async (id, nama) => {
    const confirm = await Swal.fire({
      title: 'Hapus Menu?',
      html: `Menu <b>"${nama}"</b> akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await deleteMenuApi(id);
      Swal.fire({ icon: 'success', text: result.message, timer: 1200, showConfirmButton: false });
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  const handleShowOrderers = async (menuId, menuName) => {
    setSelectedMenuName(menuName);
    setSelectedOrderers(null);
    setIsOrderersModalOpen(true);
    try {
      const data = await getPendingNotesByMenuIdApi(menuId);
      setSelectedOrderers(data.orderers || []);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
      setIsOrderersModalOpen(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirm1 = await Swal.fire({
      title: '⚠️ Hapus Seluruh Database?',
      html: `Semua <b>data menu</b> dan <b>data pesanan</b> akan dihapus permanen.<br><br>Aksi ini <b>tidak bisa dibatalkan</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Lanjutkan',
      cancelButtonText: 'Batal',
    });
    if (!confirm1.isConfirmed) return;

    const { value: inputText } = await Swal.fire({
      title: 'Konfirmasi Penghapusan',
      html: `Ketik <b>HAPUS SEMUA</b> untuk konfirmasi:`,
      input: 'text',
      inputPlaceholder: 'HAPUS SEMUA',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Hapus Sekarang',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (value !== 'HAPUS SEMUA') return 'Ketik persis: HAPUS SEMUA';
      },
    });
    if (!inputText) return;

    try {
      const res = await fetch('/api/admin/reset-database', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal reset database');
      Swal.fire({ icon: 'success', title: 'Database Direset!', text: data.message, timer: 2000, showConfirmButton: false });
      loadDataCallback();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
  };

  if (!recapData) return <div className="text-gray-400 animate-pulse">Memuat data rekap...</div>;
  const { omzetToday, totalOrdersToday } = recapData;

  return (
    <div>
      {/* Rekap */}
      <div className="mb-5 space-y-1.5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-lg">
          <span className="font-semibold text-gray-600">Total Omzet Hari Ini:</span>{' '}
          <span className="font-bold text-green-600 text-xl">Rp {formatRupiah(omzetToday)}</span>
        </p>
        <p className="text-base">
          <span className="font-semibold text-gray-600">Total Pesanan:</span>{' '}
          <span className="font-bold">{totalOrdersToday} Order</span>
        </p>
      </div>

      {/* Header Kelola Menu */}
      <div className="flex items-center justify-between border-t pt-4 mb-3">
        <h3 className="text-lg font-semibold text-gray-700">Kelola Menu Harian</h3>
        <div className="flex gap-2">
          <ImportMenuModal onImported={loadDataCallback} />
          <button
            onClick={() => { setIsFormOpen(!isFormOpen); setForm({ id: null, nama: '', harga: '', stok: '' }); }}
            className="flex items-center gap-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-semibold transition"
          >
            {isFormOpen ? <ChevronDown size={14} /> : <PlusCircle size={14} />}
            {isFormOpen ? 'Tutup' : 'Tambah'}
          </button>
        </div>
      </div>

      {/* Form Tambah/Edit */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="space-y-2.5 mb-5 p-4 bg-gray-50 rounded-xl border">
          <input
            type="text" name="nama" value={form.nama} onChange={handleChange}
            placeholder="Nama Menu (cth: Ayam Balado)" required
            disabled={!!form.id}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent disabled:bg-gray-100"
          />
          <input
            type="number" name="harga" value={form.harga} onChange={handleChange}
            placeholder="Harga (Rp)" required
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          <input
            type="number" name="stok" value={form.stok} onChange={handleChange}
            placeholder="Stok (0 = tidak terbatas)"
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1">
              {form.id ? <><Edit2 size={14} /> UPDATE MENU</> : <><PlusCircle size={14} /> TAMBAH MENU</>}
            </button>
            {form.id && (
              <button type="button" onClick={() => { setForm({ id: null, nama: '', harga: '', stok: '' }); setIsFormOpen(false); }}
                className="bg-gray-400 hover:bg-gray-500 text-white py-2 px-3 rounded-lg text-sm">
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      {/* Daftar Menu & Stok */}
      <div className="flex items-center gap-2 mb-3 mt-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700 flex-1">Daftar Menu & Stok</h3>
      </div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari menu..."
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredMenuStatus.map((menu) => {
          let statusText, statusColor;
          if (!menu.isAvailable) { statusText = 'NON-AKTIF'; statusColor = 'text-red-600 bg-red-50'; }
          else if (menu.stok === 0) { statusText = 'HABIS'; statusColor = 'text-orange-600 bg-orange-50'; }
          else {
            const stokDisplay = menu.stok > 0 ? menu.stok : '∞';
            statusText = `READY`;
            statusColor = 'text-green-600 bg-green-50';
          }

          return (
            <div key={menu._id} className="border rounded-xl p-3 flex justify-between items-start gap-2 hover:bg-gray-50 transition">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{menu.nama}</p>
                <p className="text-sm text-gray-500">Rp {formatRupiah(menu.harga)}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusText}</span>
                  {/* Stok badge */}
                  {menu.isAvailable && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      menu.stok === 0
                        ? 'text-orange-700 bg-orange-50'
                        : menu.stok > 0
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-gray-500 bg-gray-100'
                    }`}>
                      Stok: {menu.stok > 0 ? menu.stok : menu.stok === 0 ? '0' : '∞'}
                    </span>
                  )}
                  {menu.totalOrdered > 0 && (
                    <button
                      onClick={() => handleShowOrderers(menu._id, menu.nama)}
                      className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full font-semibold transition"
                    >
                      <ShoppingBag size={11} /> {menu.totalOrdered} terpesan
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => handleShowOrderers(menu._id, menu.nama)}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition">
                  <Users size={11} /> Pemesan
                </button>
                <button onClick={() => handleEdit(menu)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition">
                  <Edit2 size={11} /> Edit
                </button>
                <button onClick={() => handleToggle(menu._id, menu.isAvailable, menu.nama)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition">
                  {menu.isAvailable ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                  {menu.isAvailable ? 'Non-aktif' : 'Aktifkan'}
                </button>
                <button onClick={() => handleDelete(menu._id, menu.nama)}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition">
                  <Trash2 size={11} /> Hapus
                </button>
              </div>
            </div>
          );
        })}
        {filteredMenuStatus.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">Tidak ada menu ditemukan.</p>
        )}
      </div>

      {/* Tombol Hapus Database */}
      <div className="mt-5 pt-4 border-t">
        <button
          onClick={handleResetDatabase}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 font-semibold text-sm transition"
        >
          <AlertTriangle size={15} /> Reset Database Harian
        </button>
        <p className="text-center text-xs text-gray-400 mt-1.5">Hapus semua menu & pesanan (untuk hari baru)</p>
      </div>

      {/* Modal Siapa yang Pesan */}
      <Modal isOpen={isOrderersModalOpen} onClose={() => setIsOrderersModalOpen(false)} title={`Pemesan: ${selectedMenuName}`}>
        <MenuOrderersContent orderers={selectedOrderers} menuName={selectedMenuName} />
      </Modal>
    </div>
  );
};

export default MenuStatus;
