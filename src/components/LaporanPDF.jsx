'use client';
import { useState } from 'react';
import { getLaporanPenjualan } from '@/services/api';
import Swal from 'sweetalert2';
import { FileDown, Loader2 } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtDate = (s) => new Date(s).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const shortDate = (s) => { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

function LaporanPDF() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    const today = todayStr();
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const data = await getLaporanPenjualan(today, today);
      const { orders, grandTotal, totalTransaksi, menuRecap } = data;

      if (!orders?.length) {
        Swal.fire({ icon: 'info', title: 'Tidak Ada Data', text: 'Belum ada pesanan hari ini.' });
        setLoading(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Palet hitam-putih saja (hemat tinta)
      const BLACK = [0, 0, 0];
      const GRAY_LINE = [120, 120, 120];
      const GRAY_TEXT = [90, 90, 90];
      const LIGHT_GRID = [210, 210, 210];

      // --- Header (ringkas, tanpa warna) ---
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
      doc.text('LAPORAN PENJUALAN', 105, 14, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
      doc.text('Warung Ibu Eni', 105, 19, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Periode: ${shortDate(today)}  |  Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 24, { align: 'center' });
      doc.setDrawColor(...GRAY_LINE);
      doc.line(10, 27, 200, 27);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
      doc.text(`Total Transaksi: ${totalTransaksi}`, 14, 32);
      doc.text(`Grand Total: ${fmt(grandTotal)}`, 130, 32);
      doc.line(10, 35, 200, 35);

      let cursorY = 39;

      // --- Tabel 1: Rekap Per Menu (terjual & sisa stok) ---
      if (menuRecap?.length) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('REKAP PER MENU', 14, cursorY);
        cursorY += 3;

        autoTable(doc, {
          startY: cursorY,
          head: [['Menu', 'Terjual', 'Omzet', 'Sisa Stok']],
          body: menuRecap.map((m) => [
            m.menuName,
            String(m.totalQty),
            fmt(m.totalOmzet),
            m.sisaStok === null ? 'Tanpa Batas' : (m.isAvailable ? String(m.sisaStok) : 'Non-aktif'),
          ]),
          styles: { fontSize: 7.5, cellPadding: 1.2, textColor: BLACK, lineColor: LIGHT_GRID, lineWidth: 0.1 },
          headStyles: { fillColor: false, textColor: BLACK, fontStyle: 'bold', halign: 'center', lineColor: BLACK, lineWidth: 0.2 },
          columnStyles: {
            0: { cellWidth: 75 }, 1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 45, halign: 'right' }, 3: { cellWidth: 45, halign: 'center' },
          },
          theme: 'grid',
          margin: { left: 10, right: 10 },
        });

        cursorY = doc.lastAutoTable.finalY + 6;
      }

      // --- Tabel 2: Detail Transaksi ---
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('DETAIL TRANSAKSI', 14, cursorY);
      cursorY += 3;

      const tableBody = [];
      orders.forEach((order, idx) => {
        order.items.forEach((item, itemIdx) => {
          tableBody.push([
            itemIdx === 0 ? String(idx + 1) : '',
            itemIdx === 0 ? order.customerName : '',
            itemIdx === 0 ? fmtDate(order.timestamp) : '',
            item.menuName + (item.notes ? ` (${item.notes})` : ''),
            String(item.quantity),
            fmt(item.subtotal),
            itemIdx === 0 ? fmt(order.totalHarga) : '',
          ]);
        });
      });

      autoTable(doc, {
        startY: cursorY,
        head: [['No','Pembeli','Waktu','Menu','Qty','Subtotal','Total']],
        body: tableBody,
        styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak', valign: 'top', textColor: BLACK, lineColor: LIGHT_GRID, lineWidth: 0.1 },
        headStyles: { fillColor: false, textColor: BLACK, fontStyle: 'bold', halign: 'center', lineColor: BLACK, lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 28 }, 2: { cellWidth: 24 },
          3: { cellWidth: 55 }, 4: { cellWidth: 8, halign: 'center' },
          5: { cellWidth: 24, halign: 'right' }, 6: { cellWidth: 24, halign: 'right' },
        },
        theme: 'grid',
        foot: [['','','','','',
          { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: fmt(grandTotal), styles: { fontStyle: 'bold', halign: 'right' } },
        ]],
        footStyles: { fillColor: false, textColor: BLACK, fontSize: 8, lineColor: BLACK, lineWidth: 0.2 },
        margin: { left: 10, right: 10 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
        doc.text(`Halaman ${i} dari ${pageCount}  |  Laporan Penjualan Warung Ibu Eni`, 105, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
      }

      doc.save(`Laporan_${today}.pdf`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membuat PDF: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={loading}
      className={`flex items-center gap-2 py-3 px-8 rounded-xl text-white font-bold transition-all duration-200 min-w-52 justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg hover:shadow-green-200'}`}>
      {loading ? <><Loader2 size={16} className="animate-spin" /> Membuat PDF...</> : <><FileDown size={16} /> Download Laporan Hari Ini</>}
    </button>
  );
}

export default LaporanPDF;
