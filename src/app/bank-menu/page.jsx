'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getAllMenuBank,
  createMenuBank,
  updateMenuBank,
  deleteMenuBank,
  activateMenuBankToDaily,
} from '@/services/api';
import Swal from 'sweetalert2';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, ImagePlus, CheckSquare,
  Square, Zap, X, Save, Camera, BookOpen, LayoutGrid, List
} from 'lucide-react';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID').format(n);

// ─── Photo Uploader ───────────────────────────────────────────────────────────
const PhotoUploader = ({ value, onChange }) => {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Foto terlalu besar', text: 'Maksimal ukuran foto 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => inputRef.current?.click()}
        className="w-full h-36 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer flex flex-col items-center justify-center gap-2 transition overflow-hidden relative"
      >
        {value ? (
          <img src={value} alt="preview" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <>
            <Camera size={28} className="text-amber-400" />
            <span className="text-sm text-amber-600 font-medium">Klik untuk upload foto</span>
            <span className="text-xs text-amber-400">PNG/JPG, max 2MB</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
        >
          <X size={12} /> Hapus foto
        </button>
      )}
    </div>
  );
};

// ─── Form Modal ───────────────────────────────────────────────────────────────
const MenuBankForm = ({ editData, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nama: editData?.nama || '',
    harga: editData?.harga?.toString() || '',
    deskripsi: editData?.deskripsi || '',
    foto: editData?.foto || null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.harga) {
      Swal.fire({ icon: 'warning', text: 'Nama dan harga wajib diisi.' });
      return;
    }
    setLoading(true);
    try {
      const payload = { nama: form.nama.trim(), harga: parseInt(form.harga), deskripsi: form.deskripsi, foto: form.foto };
      if (editData) {
        await updateMenuBank(editData._id, payload);
        Swal.fire({ icon: 'success', text: 'Menu berhasil diperbarui!', timer: 1400, showConfirmButton: false });
      } else {
        await createMenuBank(payload);
        Swal.fire({ icon: 'success', text: 'Menu berhasil ditambahkan ke bank!', timer: 1400, showConfirmButton: false });
      }
      onSaved();
      onClose();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={18} className="text-amber-500" />
            {editData ? 'Edit Menu Bank' : 'Tambah Menu ke Bank'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <PhotoUploader value={form.foto} onChange={(v) => setForm((p) => ({ ...p, foto: v }))} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Menu *</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
              placeholder="cth: Ayam Balado, Tempe Goreng..."
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Harga (Rp) *</label>
            <input
              type="number"
              value={form.harga}
              onChange={(e) => setForm((p) => ({ ...p, harga: e.target.value }))}
              placeholder="cth: 8000"
              required
              min="0"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi (opsional)</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm((p) => ({ ...p, deskripsi: e.target.value }))}
              placeholder="cth: Pedas, cocok buat DO..."
              rows={2}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? '⏳ Menyimpan...' : <><Save size={15} /> {editData ? 'Simpan Perubahan' : 'Tambah ke Bank'}</>}
            </button>
            <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Menu Card (Grid View) ────────────────────────────────────────────────────
const MenuCard = ({ menu, selected, onToggleSelect, onEdit, onDelete }) => (
  <div
    className={`relative rounded-2xl border-2 overflow-hidden transition cursor-pointer group ${
      selected ? 'border-amber-400 shadow-lg shadow-amber-100' : 'border-gray-200 hover:border-amber-300 hover:shadow-md'
    }`}
    onClick={() => onToggleSelect(menu._id)}
  >
    {/* Checkbox overlay */}
    <div className={`absolute top-2 left-2 z-10 transition ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow ${selected ? 'bg-amber-500 text-white' : 'bg-white/90 text-gray-400 border border-gray-300'}`}>
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </div>
    </div>

    {/* Photo */}
    <div className="h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
      {menu.foto ? (
        <img src={menu.foto} alt={menu.nama} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-amber-300">
          <ImagePlus size={28} />
          <span className="text-xs">No photo</span>
        </div>
      )}
    </div>

    {/* Info */}
    <div className="p-3">
      <p className="font-bold text-gray-800 text-sm truncate">{menu.nama}</p>
      <p className="text-amber-600 font-semibold text-sm mt-0.5">Rp {formatRupiah(menu.harga)}</p>
      {menu.deskripsi && <p className="text-xs text-gray-400 mt-1 truncate">{menu.deskripsi}</p>}

      <div className="flex gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onEdit(menu)}
          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition"
        >
          <Edit2 size={11} /> Edit
        </button>
        <button
          onClick={() => onDelete(menu._id, menu.nama)}
          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition"
        >
          <Trash2 size={11} /> Hapus
        </button>
      </div>
    </div>
  </div>
);

// ─── Menu Row (List View) ─────────────────────────────────────────────────────
const MenuRow = ({ menu, selected, onToggleSelect, onEdit, onDelete }) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
      selected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
    }`}
    onClick={() => onToggleSelect(menu._id)}
  >
    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${selected ? 'text-amber-500' : 'text-gray-300'}`}>
      {selected ? <CheckSquare size={18} /> : <Square size={18} />}
    </div>

    <div className="w-12 h-12 rounded-lg overflow-hidden bg-amber-50 flex-shrink-0 flex items-center justify-center">
      {menu.foto ? (
        <img src={menu.foto} alt={menu.nama} className="w-full h-full object-cover" />
      ) : (
        <ImagePlus size={18} className="text-amber-300" />
      )}
    </div>

    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-800 text-sm truncate">{menu.nama}</p>
      <p className="text-amber-600 font-semibold text-xs">Rp {formatRupiah(menu.harga)}</p>
      {menu.deskripsi && <p className="text-xs text-gray-400 truncate">{menu.deskripsi}</p>}
    </div>

    <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onEdit(menu)}
        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
      >
        <Edit2 size={13} />
      </button>
      <button
        onClick={() => onDelete(menu._id, menu.nama)}
        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BankMenuPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activating, setActivating] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllMenuBank();
      setMenus(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal muat bank menu', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  const filtered = useMemo(() =>
    menus.filter((m) => m.nama.toLowerCase().includes(searchTerm.toLowerCase())),
    [menus, searchTerm]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m._id)));
    }
  };

  const handleDelete = async (id, nama) => {
    const confirm = await Swal.fire({
      title: 'Hapus dari Bank Menu?',
      html: `Menu <b>"${nama}"</b> akan dihapus dari bank.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteMenuBank(id);
      Swal.fire({ icon: 'success', text: 'Menu dihapus dari bank.', timer: 1200, showConfirmButton: false });
      loadMenus();
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    }
  };

  const handleActivate = async () => {
    if (selectedIds.size === 0) {
      Swal.fire({ icon: 'warning', text: 'Pilih minimal satu menu terlebih dahulu.' });
      return;
    }

    const { isConfirmed, value: resetFirst } = await Swal.fire({
      title: `Aktifkan ${selectedIds.size} Menu?`,
      html: `
        <p class="text-gray-600 text-sm mb-3">Menu yang dipilih akan ditambahkan ke menu harian aktif.</p>
        <label class="flex items-center gap-2 justify-center cursor-pointer text-sm">
          <input type="checkbox" id="resetFirst" class="h-4 w-4" />
          <span>Non-aktifkan dulu menu harian yang lain</span>
        </label>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: '⚡ Aktifkan Sekarang',
      cancelButtonText: 'Batal',
      preConfirm: () => document.getElementById('resetFirst')?.checked || false,
    });

    if (!isConfirmed) return;

    setActivating(true);
    try {
      const result = await activateMenuBankToDaily(Array.from(selectedIds), resetFirst);
      Swal.fire({
        icon: 'success',
        title: 'Menu Diaktifkan!',
        html: `<b>${result.added}</b> menu baru ditambahkan<br><b>${result.updated}</b> menu diaktifkan kembali`,
        timer: 2000,
        showConfirmButton: false,
      });
      setSelectedIds(new Set());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    } finally {
      setActivating(false);
    }
  };

  const handleEdit = (menu) => {
    setEditData(menu);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-amber-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition text-sm font-medium">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-amber-500" />
            <h1 className="text-lg font-bold text-gray-800">Bank Menu</h1>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full ml-1">
            {menus.length} menu tersimpan
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Action Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari menu di bank..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={() => { setEditData(null); setShowForm(true); }}
              className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <Plus size={15} /> Tambah Menu
            </button>
          </div>
        </div>

        {/* Activation Bar — appears when selection is active */}
        {selectedIds.size > 0 && (
          <div className="bg-amber-500 text-white rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-200">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} />
              <span className="font-semibold">{selectedIds.size} menu dipilih</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-amber-200 hover:text-white ml-1 transition"
              >
                <X size={15} />
              </button>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-2 bg-white text-amber-600 hover:bg-amber-50 font-bold px-5 py-2 rounded-xl text-sm transition disabled:opacity-60 shadow-sm"
            >
              <Zap size={15} />
              {activating ? 'Mengaktifkan...' : `Aktifkan ke Menu Harian`}
            </button>
          </div>
        )}

        {/* Select All bar */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-600 transition font-medium"
            >
              {selectedIds.size === filtered.length && filtered.length > 0
                ? <><CheckSquare size={15} className="text-amber-500" /> Batalkan semua</>
                : <><Square size={15} /> Pilih semua ({filtered.length})</>
              }
            </button>
            <span className="text-xs text-gray-400">{filtered.length} dari {menus.length} menu</span>
          </div>
        )}

        {/* Menu Grid/List */}
        {loading ? (
          <div className="text-center py-16 text-amber-400 animate-pulse font-semibold">Memuat bank menu...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-amber-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {searchTerm ? 'Tidak ada menu yang cocok.' : 'Bank menu masih kosong.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold text-sm"
              >
                <Plus size={14} /> Tambahkan menu pertama
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((menu) => (
              <MenuCard
                key={menu._id}
                menu={menu}
                selected={selectedIds.has(menu._id)}
                onToggleSelect={toggleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((menu) => (
              <MenuRow
                key={menu._id}
                menu={menu}
                selected={selectedIds.has(menu._id)}
                onToggleSelect={toggleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MenuBankForm
          editData={editData}
          onClose={handleFormClose}
          onSaved={loadMenus}
        />
      )}
    </div>
  );
}
