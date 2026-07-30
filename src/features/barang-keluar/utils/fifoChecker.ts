import type { InventoryItem } from "@/types/inventory";
import type { BarangKeluarItem } from "@/types/transaction";

const ADMIN_LOCATION = "KP Tasikmalaya";

export const normalizeKodeBarang = (code?: string | null) => (code || "").trim().toUpperCase();
const normalizeStatus = (status: string) => status.trim().toLocaleLowerCase("id-ID");
export const normalizeText = (text?: string | null) => (text || "").trim().toLocaleLowerCase("id-ID");
export const normalizeOwner = (owner?: string | null) => normalizeText(owner || ADMIN_LOCATION);

export const isOutsideStatus = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus === "keluar" || normalizedStatus === "diluar";
};

export const getEntryDateTime = (item: InventoryItem) => {
  const parsedTime = Date.parse(item.tanggalMasuk);
  return Number.isFinite(parsedTime) ? parsedTime : Number.MAX_SAFE_INTEGER;
};

export const compareFifoItems = (a: InventoryItem, b: InventoryItem) => {
  const dateDiff = getEntryDateTime(a) - getEntryDateTime(b);
  if (dateDiff !== 0) return dateDiff;

  return normalizeKodeBarang(a.serialNumber).localeCompare(normalizeKodeBarang(b.serialNumber));
};

export const isSameFifoGroup = (item: InventoryItem, referenceItem: InventoryItem) =>
  normalizeText(item.merek) === normalizeText(referenceItem.merek) &&
  normalizeText(item.kategori) === normalizeText(referenceItem.kategori) &&
  normalizeOwner(item.mitra) === normalizeOwner(referenceItem.mitra);

export const getQueuedSerialNumbers = (items: BarangKeluarItem[]) =>
  new Set(items.map((item) => normalizeKodeBarang(item.nomor)).filter(Boolean));

export const findOlderFifoItem = (
  items: InventoryItem[],
  requestedItem: InventoryItem,
  queuedSerialNumbers: Set<string>
) => {
  const requestedSerial = normalizeKodeBarang(requestedItem.serialNumber);
  const requestedEntryTime = getEntryDateTime(requestedItem);

  return items
    .filter((item) => {
      const itemSerial = normalizeKodeBarang(item.serialNumber);
      return (
        itemSerial &&
        itemSerial !== requestedSerial &&
        !queuedSerialNumbers.has(itemSerial) &&
        !isOutsideStatus(item.status) &&
        isSameFifoGroup(item, requestedItem) &&
        getEntryDateTime(item) < requestedEntryTime
      );
    })
    .sort(compareFifoItems)[0];
};

export const formatTanggalMasuk = (tanggal: string) => {
  if (!tanggal) return "tanggal masuk belum tersedia";

  const [datePart] = tanggal.split("T");
  return datePart || tanggal;
};

export const getFifoToastDescription = (olderItem: InventoryItem) =>
  `Scan ${olderItem.serialNumber} terlebih dahulu (masuk ${formatTanggalMasuk(
    olderItem.tanggalMasuk
  )}, lokasi ${olderItem.lokasiPenyimpanan || "-"}).`;
