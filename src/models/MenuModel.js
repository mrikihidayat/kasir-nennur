import mongoose from 'mongoose';

const MenuSchema = new mongoose.Schema({
  nama: { type: String, required: true, unique: true },
  harga: { type: Number, required: true },
  stok: { type: Number, default: 1 },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
