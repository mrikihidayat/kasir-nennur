// Daftar 5 orang yang bisa memegang/menerima uang hasil penjualan.
// value harus sama dengan enum di OrderModel (field `kasir`).
export const KASIR_OPTIONS = [
  { value: 'mamah', label: 'Mamah' },
  { value: 'bapa', label: 'Bapa' },
  { value: 'kojengkang', label: 'Kojengkang' },
  { value: 'kiki', label: 'Kiki' },
  { value: 'rumah', label: 'Rumah' },
];

export const KASIR_LABEL = Object.fromEntries(KASIR_OPTIONS.map((k) => [k.value, k.label]));
