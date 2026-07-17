import Menu from '@/models/MenuModel';
import Order from '@/models/OrderModel';

export const generateReceiptData = (order) => {
  const orderTime = new Date(order.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const orderDate = new Date(order.timestamp).toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  let receipt = `===============================\nSTRUK WARUNG IBU ENI\n`;
  receipt += `Nama: ${order.customerName}\n`;
  receipt += `Waktu: ${orderDate} - ${orderTime}\n`;
  receipt += `-------------------------------\n`;

  for (const item of order.items) {
    receipt += `${item.quantity}x ${item.menuName} @${item.menuPrice.toLocaleString('id-ID')}\n`;
    if (item.notes) {
      receipt += `   >> KETERANGAN: ${item.notes.toUpperCase()}\n`;
    }
  }
  receipt += `-------------------------------\n`;
  receipt += `TOTAL: Rp ${order.totalHarga.toLocaleString('id-ID')}\n`;
  receipt += `===============================`;
  return receipt;
};

export const getAllPendingOrdersWithReceipt = async () => {
  const orders = await Order.find({ status: 'Pending' }).sort({ timestamp: 1 });
  return orders.map((order) => ({
    ...order._doc,
    receiptText: generateReceiptData(order),
  }));
};

export const createNewOrder = async (customerName, items, kasir = 'rumah') => {
  const menuIds = items.map((i) => i.menuId);
  const menus = await Menu.find({ _id: { $in: menuIds } });
  const menuMap = new Map(menus.map((m) => [m._id.toString(), m]));

  let totalHarga = 0;
  const menuItems = [];
  const itemUpdates = [];

  for (const item of items) {
    const menu = menuMap.get(item.menuId.toString());
    if (!menu) throw new Error(`Menu dengan ID ${item.menuId} tidak ditemukan.`);
    if (!menu.isAvailable) throw new Error(`Menu "${menu.nama}" sedang tidak tersedia hari ini.`);
    if (menu.stok === 0 && item.quantity > 0) throw new Error(`Stok "${menu.nama}" sudah habis.`);
    if (menu.stok > 0 && item.quantity > menu.stok)
      throw new Error(`Stok "${menu.nama}" tidak mencukupi. Tersisa ${menu.stok}.`);

    menuItems.push({
      menuId: menu._id,
      menuName: menu.nama,
      menuPrice: menu.harga,
      quantity: item.quantity,
      notes: item.notes || '',
    });
    totalHarga += menu.harga * item.quantity;

    if (menu.stok > 0) {
      itemUpdates.push(Menu.findByIdAndUpdate(item.menuId, { $inc: { stok: -item.quantity } }));
    }
  }

  await Promise.all(itemUpdates);

  const newOrder = new Order({
    customerName,
    items: menuItems,
    totalHarga,
    status: 'Pending',
    kasir: kasir || 'rumah',
  });
  await newOrder.save();

  return { newOrder, receiptText: generateReceiptData(newOrder) };
};

export const updateExistingOrder = async (orderId, customerName, newItems, kasir) => {
  const oldOrder = await Order.findById(orderId);
  if (!oldOrder) throw new Error('Pesanan tidak ditemukan.');

  await Promise.all(
    oldOrder.items.map((item) =>
      Menu.findByIdAndUpdate(item.menuId, { $inc: { stok: item.quantity } })
    )
  );

  let totalHarga = 0;
  const menuItems = [];
  const stockDeductionUpdates = [];

  const menuIds = newItems.map((i) => i.menuId);
  const menus = await Menu.find({ _id: { $in: menuIds } });
  const menuMap = new Map(menus.map((m) => [m._id.toString(), m]));

  for (const item of newItems) {
    const menu = menuMap.get(item.menuId.toString());
    if (!menu) throw new Error(`Menu "${item.menuId}" tidak ditemukan.`);
    if (!menu.isAvailable) throw new Error(`Menu "${menu.nama}" tidak tersedia.`);
    if (menu.stok === 0 && item.quantity > 0) throw new Error(`Stok "${menu.nama}" habis.`);
    if (menu.stok > 0 && item.quantity > menu.stok)
      throw new Error(`Stok "${menu.nama}" tidak mencukupi. Tersisa ${menu.stok}.`);

    menuItems.push({
      menuId: menu._id,
      menuName: menu.nama,
      menuPrice: menu.harga,
      quantity: item.quantity,
      notes: item.notes || '',
    });
    totalHarga += menu.harga * item.quantity;

    if (menu.stok > 0) {
      stockDeductionUpdates.push(
        Menu.findByIdAndUpdate(item.menuId, { $inc: { stok: -item.quantity } })
      );
    }
  }

  await Promise.all(stockDeductionUpdates);

  const updateData = { customerName, items: menuItems, totalHarga, timestamp: Date.now() };
  if (kasir !== undefined) updateData.kasir = kasir || 'rumah';

  const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
  return { updatedOrder, receiptText: generateReceiptData(updatedOrder) };
};

export const returnCancelledStock = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return false;
  await Promise.all(
    order.items.map((item) =>
      Menu.findByIdAndUpdate(item.menuId, { $inc: { stok: item.quantity } })
    )
  );
  return true;
};

export const getPendingNotesByMenuId = async (menuId) => {
  const pendingOrders = await Order.find({
    status: 'Pending',
    'items.menuId': menuId,
  }).select('customerName items');

  if (pendingOrders.length === 0) return [];

  const notesList = [];
  pendingOrders.forEach((order) => {
    const item = order.items.find((i) => i.menuId.toString() === menuId);
    if (item && item.notes) {
      notesList.push({
        customerName: order.customerName,
        notes: item.notes,
        quantity: item.quantity,
        orderId: order._id,
      });
    }
  });
  return notesList;
};

// Ambil semua pelanggan yang memesan menu tertentu (fitur baru)
export const getOrderersByMenuId = async (menuId) => {
  const pendingOrders = await Order.find({
    status: 'Pending',
    'items.menuId': menuId,
  }).select('customerName items timestamp');

  const result = [];
  pendingOrders.forEach((order) => {
    const item = order.items.find((i) => i.menuId.toString() === menuId);
    if (item) {
      result.push({
        customerName: order.customerName,
        quantity: item.quantity,
        notes: item.notes || '',
        timestamp: order.timestamp,
        orderId: order._id,
      });
    }
  });
  return result;
};
