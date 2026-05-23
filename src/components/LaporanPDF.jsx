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
      const { orders, grandTotal, totalTransaksi } = data;

      if (!orders?.length) {
        Swal.fire({ icon: 'info', title: 'Tidak Ada Data', text: 'Belum ada pesanan hari ini.' });
        setLoading(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN PENJUALAN', 105, 15, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text('Warung Ibu Eni', 105, 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Periode: ${shortDate(today)}`, 105, 28, { align: 'center' });
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 33, { align: 'center' });
      doc.setDrawColor(180,180,180); doc.line(10, 36, 200, 36);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(`Total Transaksi : ${totalTransaksi}`, 14, 42);
      doc.text(`Grand Total     : ${fmt(grandTotal)}`, 14, 48);
      doc.line(10, 51, 200, 51);

      const tableBody = [];
      orders.forEach((order, idx) => {
        order.items.forEach((item, itemIdx) => {
          tableBody.push([
            itemIdx === 0 ? String(idx + 1) : '',
            itemIdx === 0 ? order.customerName : '',
            itemIdx === 0 ? fmtDate(order.timestamp) : '',
            item.menuName + (item.notes ? `\n(${item.notes})` : ''),
            String(item.quantity),
            fmt(item.menuPrice),
            fmt(item.subtotal),
            itemIdx === 0 ? fmt(order.totalHarga) : '',
          ]);
        });
      });

      autoTable(doc, {
        startY: 55,
        head: [['No','Nama Pembeli','Waktu','Menu','Qty','Harga Satuan','Subtotal','Total Pesanan']],
        body: tableBody,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'top', textColor: [50,50,50] },
        headStyles: { fillColor: [41,128,185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 32 }, 2: { cellWidth: 28 },
          3: { cellWidth: 45 }, 4: { cellWidth: 8, halign: 'center' },
          5: { cellWidth: 27, halign: 'right' }, 6: { cellWidth: 24, halign: 'right' }, 7: { cellWidth: 27, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [245,249,255] },
        foot: [['','','','','','',
          { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: fmt(grandTotal), styles: { fontStyle: 'bold', halign: 'right', textColor: [41,128,185] } },
        ]],
        footStyles: { fillColor: [236,240,241], fontSize: 8.5 },
        margin: { left: 10, right: 10 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
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
