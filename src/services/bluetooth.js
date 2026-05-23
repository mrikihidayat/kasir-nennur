const BLUETOOTH_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const BLUETOOTH_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

let connectedPrinter = null;
let characteristic = null;

export async function connectPrinter() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLUETOOTH_SERVICE_UUID] }],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLUETOOTH_SERVICE_UUID);
    characteristic = await service.getCharacteristic(BLUETOOTH_CHARACTERISTIC_UUID);
    connectedPrinter = device;
    return connectedPrinter.name || 'Printer Terhubung';
  } catch (error) {
    throw new Error('Gagal menghubungkan printer. Pastikan Bluetooth aktif dan browser mendukung Web Bluetooth.');
  }
}

export async function printData(receiptText) {
  if (!characteristic) throw new Error('Printer belum terhubung.');
  try {
    const initialCommand = new Uint8Array([0x1b, 0x61, 0x01]);
    const finalCommand = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x01]);
    const textData = new TextEncoder().encode(receiptText);
    const combined = new Uint8Array(initialCommand.length + textData.length + finalCommand.length);
    combined.set(initialCommand, 0);
    combined.set(textData, initialCommand.length);
    combined.set(finalCommand, initialCommand.length + textData.length);
    await characteristic.writeValue(combined);
  } catch (error) {
    throw new Error(`Gagal mengirim data cetak: ${error.message}`);
  }
}

export function getPrinterStatus() {
  return connectedPrinter ? connectedPrinter.name : null;
}
