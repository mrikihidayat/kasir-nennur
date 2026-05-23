import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  menuName: { type: String, required: true },
  menuPrice: { type: Number, required: true },
});

const OrderSchema = new mongoose.Schema({
  customerName: { type: String, default: 'Pelanggan' },
  items: [ItemSchema],
  totalHarga: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Selesai', 'Dibatalkan'],
    default: 'Pending',
  },
  isDeliveryOrder: { type: Boolean, default: false },
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
