'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getAllMenuBank,
  getAllMenus,
  createMenuBank,
  updateMenuBank,
  deleteMenuBank,
  activateMenuBankToDaily,
} from '@/services/api';
import Swal from 'sweetalert2';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Edit2, Trash2, Search, ImagePlus, CheckSquare,
  Square, Zap, X, Save, Camera, BookOpen, LayoutGrid, List,
  Download, Image as ImageIcon, CalendarCheck, Crop, Check,
} from 'lucide-react';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID').format(n);

// ─── Grid Promosi (canvas) ───────────────────────────────────────────────────
// Bikin gambar grid promosi dari bank menu yang punya foto, max 6 menu/gambar.
// Kalau lebih dari 6 menu, otomatis dipecah jadi beberapa gambar unduhan.
const GRID_COLS = 3;
const GRID_ROWS = 2;
const ITEMS_PER_GRID = GRID_COLS * GRID_ROWS; // 6
const CELL_SIZE = 320;
const CELL_GAP = 16;
const GRID_PADDING = 24;
const CAPTION_HEIGHT = 74;

const loadImageEl = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal load foto'));
    img.src = src;
  });

const roundRectPath = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const truncateCanvasText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
};

const buildGridCanvas = async (menusChunk) => {
  const cellTotalH = CELL_SIZE + CAPTION_HEIGHT;
  const width = GRID_PADDING * 2 + GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
  const height = GRID_PADDING * 2 + GRID_ROWS * cellTotalH + (GRID_ROWS - 1) * CELL_GAP;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff7ed';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < menusChunk.length; i++) {
    const menu = menusChunk[i];
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = GRID_PADDING + col * (CELL_SIZE + CELL_GAP);
    const y = GRID_PADDING + row * (cellTotalH + CELL_GAP);

    try {
      const img = await loadImageEl(menu.foto);
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.save();
      roundRectPath(ctx, x, y, CELL_SIZE, CELL_SIZE, 16);
      ctx.clip();
      ctx.drawImage(img, sx, sy, s, s, x, y, CELL_SIZE, CELL_SIZE);
      ctx.restore();
    } catch {
      ctx.fillStyle = '#fde68a';
      roundRectPath(ctx, x, y, CELL_SIZE, CELL_SIZE, 16);
      ctx.fill();
    }

    ctx.fillStyle = '#7c2d12';
    roundRectPath(ctx, x, y + CELL_SIZE + 8, CELL_SIZE, CAPTION_HEIGHT - 8, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(truncateCanvasText(ctx, menu.nama, CELL_SIZE - 24), x + CELL_SIZE / 2, y + CELL_SIZE + 36);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#fed7aa';
    ctx.fillText(`Rp ${formatRupiah(menu.harga)}`, x + CELL_SIZE / 2, y + CELL_SIZE + 60);
  }

  return canvas;
};

const dataUrlSizeBytes = (dataUrl) => Math.ceil((dataUrl.length * 3) / 4);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });

// ─── Crop Modal ────────────────────────────────────────────────────────────
// Crop bebas geser + zoom, hasil akhir selalu persegi (cocok buat thumbnail
// kartu menu & grid promosi yang sama-sama pakai object-cover 1:1).
const CROP_VIEWPORT = 300; // ukuran kotak crop di layar (px)
const CROP_OUTPUT = 900;   // ukuran gambar hasil crop (px)

const clampOffset = (offset, displayed, viewport) => {
  const max = Math.max(0, (displayed - viewport) / 2);
  return Math.min(max, Math.max(-max, offset));
};

const CropModal = ({ src, onCancel, onConfirm }) => {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadImageEl(src)
      .then((im) => { if (alive) setImg(im); })
      .catch(() => {
        Swal.fire({ icon: 'error', title: 'Gagal memuat foto', text: 'Coba pilih foto lain.' });
        onCancel();
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const baseScale = img ? Math.max(CROP_VIEWPORT / img.width, CROP_VIEWPORT / img.height) : 1;
  const scale = baseScale * zoom;
  const displayedW = img ? img.width * scale : 0;
  const displayedH = img ? img.height * scale : 0;

  const reclamp = (nextZoom, prevOffset) => {
    const nextScale = baseScale * nextZoom;
    return {
      x: clampOffset(prevOffset.x, img.width * nextScale, CROP_VIEWPORT),
      y: clampOffset(prevOffset.y, img.height * nextScale, CROP_VIEWPORT),
    };
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: clampOffset(dragRef.current.startOffsetX + dx, displayedW, CROP_VIEWPORT),
      y: clampOffset(dragRef.current.startOffsetY + dy, displayedH, CROP_VIEWPORT),
    });
  };
  const handlePointerUp = () => { dragRef.current = null; };

  const handleZoomChange = (e) => {
    const nextZoom = parseFloat(e.target.value);
    setZoom(nextZoom);
    setOffset((prev) => reclamp(nextZoom, prev));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => {
      const nz = Math.min(3, Math.max(1, +(z + delta).toFixed(2)));
      setOffset((prev) => reclamp(nz, prev));
      return nz;
    });
  };

  const renderCrop = (quality, outputSize) => {
    const imgLeft = (CROP_VIEWPORT - displayedW) / 2 + offset.x;
    const imgTop = (CROP_VIEWPORT - displayedH) / 2 + offset.y;
    const sx = -imgLeft / scale;
    const sy = -imgTop / scale;
    const sSize = CROP_VIEWPORT / scale;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
    return canvas.toDataURL('image/jpeg', quality);
  };

  const handleConfirm = () => {
    if (!img) return;
    setSaving(true);
    try {
      let result = renderCrop(0.8, CROP_OUTPUT);
      // Kalau masih gede, kompres ulang lebih agresif
      if (dataUrlSizeBytes(result) > 700 * 1024) {
        result = renderCrop(0.6, 700);
      }
      onConfirm(result);
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal memproses foto', text: 'Coba lagi ya.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <Crop size={16} className="text-amber-500" /> Atur Foto
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {!img ? (
          <div className="h-[300px] flex items-center justify-center text-amber-400 text-sm animate-pulse">
            Memuat gambar...
          </div>
        ) : (
          <>
            <div
              className="relative mx-auto overflow-hidden rounded-xl bg-gray-900 touch-none select-none cursor-grab active:cursor-grabbing"
              style={{ width: CROP_VIEWPORT, height: CROP_VIEWPORT }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              <img
                src={src}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: (CROP_VIEWPORT - displayedW) / 2 + offset.x,
                  top: (CROP_VIEWPORT - displayedH) / 2 + offset.y,
                  width: displayedW,
                  height: displayedH,
                  maxWidth: 'none',
                }}
              />
              <div className="absolute inset-0 pointer-events-none ring-1 ring-white/40 rounded-xl" />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={handleZoomChange}
                className="flex-1 accent-amber-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">
              Geser foto buat atur posisi, scroll atau slider buat zoom.
            </p>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check size={15} /> Pakai Foto Ini
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition"
              >
                Batal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Photo Uploader ───────────────────────────────────────────────────────────
const PhotoUploader = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null); // sumber foto yang lagi dicrop

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // biar bisa pilih file yang sama lagi kalau mau ulang
    if (!file) return;

    // Batas file asli dilonggarkan (foto HP jaman sekarang gampang 5-10MB),
    // toh nanti dicrop & dikompres otomatis sebelum disimpan.
    if (file.size > 15 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Foto terlalu besar', text: 'Maksimal ukuran foto asli 15MB.' });
      return;
    }

    setReading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropSrc(dataUrl); // buka cropper dulu, belum langsung disimpan
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal membaca foto', text: err.message || 'Coba foto lain.' });
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => !reading && !value && inputRef.current?.click()}
        className={`w-full h-36 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center gap-2 transition overflow-hidden relative ${
          value ? '' : 'hover:bg-amber-100 cursor-pointer'
        }`}
      >
        {reading ? (
          <>
            <div className="h-6 w-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-amber-500">Membaca foto...</span>
          </>
        ) : value ? (
          <img src={value} alt="preview" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <>
            <Camera size={28} className="text-amber-400" />
            <span className="text-sm text-amber-600 font-medium">Klik untuk upload foto</span>
            <span className="text-xs text-amber-400">Bisa diatur crop-nya sebelum disimpan</span>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={reading} />

      {value && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setCropSrc(value)}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
          >
            <Crop size={12} /> Crop Ulang
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
          >
            <Camera size={12} /> Ganti Foto
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={12} /> Hapus foto
          </button>
        </div>
      )}

      {cropSrc && (
        <CropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={(result) => { onChange(result); setCropSrc(null); }}
        />
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
              placeholder="cth: Pedas, favorit anak-anak..."
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
const MenuCard = ({ menu, selected, isActiveToday, onToggleSelect, onEdit, onDelete }) => (
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

    {/* Badge aktif hari ini */}
    {isActiveToday && (
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
        <CalendarCheck size={10} /> Hari Ini
      </div>
    )}

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
const MenuRow = ({ menu, selected, isActiveToday, onToggleSelect, onEdit, onDelete }) => (
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
      <div className="flex items-center gap-1.5">
        <p className="font-semibold text-gray-800 text-sm truncate">{menu.nama}</p>
        {isActiveToday && (
          <span className="flex items-center gap-0.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
            <CalendarCheck size={9} /> Hari Ini
          </span>
        )}
      </div>
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
  const [activeTodayNames, setActiveTodayNames] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activating, setActivating] = useState(false);
  const [generatingGrid, setGeneratingGrid] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const [bankData, dailyData] = await Promise.all([
        getAllMenuBank(),
        getAllMenus().catch(() => []), // kalau gagal, badge "hari ini" cuma gak muncul, gak fatal
      ]);
      setMenus(bankData);
      setActiveTodayNames(
        new Set(
          (dailyData || [])
            .filter((m) => m.isAvailable)
            .map((m) => m.nama.toLowerCase())
        )
      );
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

    const { isConfirmed, value } = await Swal.fire({
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
      // PENTING: preConfirm tidak boleh return `false` mentah — SweetAlert2 akan
      // menganggapnya validasi gagal dan popup tidak akan tertutup. Makanya
      // dibungkus jadi object supaya nilainya selalu truthy.
      preConfirm: () => ({ resetFirst: document.getElementById('resetFirst')?.checked || false }),
    });

    if (!isConfirmed) return;
    const resetFirst = value?.resetFirst || false;

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

  const handleDownloadGridPromo = async () => {
    // Kalau ada yang dipilih manual, pakai itu. Kalau tidak, pakai menu yang
    // sedang aktif di menu harian hari ini.
    const usingSelection = selectedIds.size > 0;
    const source = usingSelection
      ? menus.filter((m) => selectedIds.has(m._id))
      : menus.filter((m) => activeTodayNames.has(m.nama.toLowerCase()));

    const withPhoto = source.filter((m) => m.foto);

    if (withPhoto.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Belum ada foto',
        text: usingSelection
          ? 'Menu yang dipilih belum ada fotonya.'
          : 'Belum ada menu aktif hari ini yang punya foto. Pilih menu manual dulu, atau aktifkan menu dari bank ke menu harian.',
      });
      return;
    }

    setGeneratingGrid(true);
    try {
      const chunks = [];
      for (let i = 0; i < withPhoto.length; i += ITEMS_PER_GRID) {
        chunks.push(withPhoto.slice(i, i + ITEMS_PER_GRID));
      }
      for (let i = 0; i < chunks.length; i++) {
        const canvas = await buildGridCanvas(chunks[i]);
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `promo-menu-${i + 1}.png` : 'promo-menu.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      const skipped = source.length - withPhoto.length;
      Swal.fire({
        icon: 'success',
        title: `${chunks.length} gambar grid diunduh!`,
        text: skipped > 0 ? `${skipped} menu tanpa foto dilewati.` : undefined,
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal membuat grid', text: err.message });
    } finally {
      setGeneratingGrid(false);
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
          {activeTodayNames.size > 0 && (
            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              <CalendarCheck size={11} /> {activeTodayNames.size} aktif hari ini
            </span>
          )}
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

            {/* Grid Promosi button */}
            <button
              onClick={handleDownloadGridPromo}
              disabled={generatingGrid}
              className="flex items-center justify-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm disabled:opacity-60"
            >
              {generatingGrid ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImageIcon size={15} />
              )}
              {generatingGrid ? 'Membuat...' : 'Grid Promosi'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Download size={11} />
            {selectedIds.size > 0
              ? `Bikin gambar grid dari ${selectedIds.size} menu terpilih (max 6/gambar).`
              : 'Bikin gambar grid dari menu yang aktif hari ini (max 6/gambar). Pilih menu manual untuk kombinasi lain.'}
          </p>
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
                isActiveToday={activeTodayNames.has(menu.nama.toLowerCase())}
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
                isActiveToday={activeTodayNames.has(menu.nama.toLowerCase())}
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
