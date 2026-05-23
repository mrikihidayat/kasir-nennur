const BASE = '/api/admin';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan pada server.');
  return data;
}

// --- Menu ---
export const getMenuRecap = () => apiFetch('/rekap');
export const getAllMenus = () => apiFetch('/menu');
export const updateMenu = (menuData) => apiFetch('/menu', { method: 'POST', body: JSON.stringify(menuData) });
export const toggleMenu = (id) => apiFetch(`/menu/${id}/toggle`, { method: 'PUT' });
export const deleteMenuApi = (id) => apiFetch(`/menu/${id}`, { method: 'DELETE' });
export const getPendingNotesByMenuIdApi = (menuId) => apiFetch(`/menu/${menuId}/pending-notes`);
export const importMenuFromJson = (menus) => apiFetch('/import-menu', { method: 'POST', body: JSON.stringify(menus) });

// --- Orders ---
export const getOrdersList = () => apiFetch('/orders');
export const getOrderDetail = (id) => apiFetch(`/order/${id}`);
export const confirmOrder = (id) => apiFetch(`/order/${id}/confirm`, { method: 'PUT' });
export const submitOrder = (orderData) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(orderData) });
export const updateOrder = (id, orderData) => apiFetch(`/order/${id}`, { method: 'PUT', body: JSON.stringify(orderData) });
export const deleteOrderApi = (id) => apiFetch(`/order/${id}`, { method: 'DELETE' });
export const getPendingOrdersWithReceipt = () => apiFetch('/orders/print-all-pending');
export const getLaporanPenjualan = (startDate = '', endDate = '') => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return apiFetch(`/orders/laporan?${params.toString()}`);
};
