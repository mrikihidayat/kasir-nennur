import mongoose from 'mongoose';

const MenuBankSchema = new mongoose.Schema({
  nama: { type: String, required: true, unique: true },
  harga: { type: Number, required: true },
  foto: { type: String, default: null }, // base64 data URL
  deskripsi: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

MenuBankSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.models.MenuBank || mongoose.model('MenuBank', MenuBankSchema);
