import type { InventoryItem } from "@/types/inventory";

export const REQUIRED_FIELDS_MITRA = [
  "kondisi",
];

export const normalizeKodeBarang = (code: string) => code.trim().toUpperCase();
export const normalizeBrand = (brand: string) => brand.trim().toLocaleLowerCase("id-ID");
export const normalizeStatus = (status: string) => status.trim().toLocaleLowerCase("id-ID");
export const normalizeOwner = (owner?: string | null) =>
  (owner || "").trim().toLocaleLowerCase("id-ID");

/**
 * Memvalidasi apakah Mitra diizinkan untuk menerima/memasukkan barang ini.
 * Mitra hanya bisa menerima barang yang didistribusikan oleh KP, atau barang
 * miliknya sendiri yang sedang berada "diluar".
 * 
 * @param {InventoryItem} item - Data inventaris barang.
 * @param {string} mitraName - Nama Mitra yang sedang login.
 * @returns {boolean} True jika diizinkan, false sebaliknya.
 */
export const isValidMitraInboundSource = (
  item: InventoryItem,
  mitraName: string
) => {
  const owner = normalizeOwner(item.mitra);
  const status = normalizeStatus(item.status);
  const location = normalizeStatus(item.lokasiPenyimpanan || "");

  // Barang dianggap "bisa dikembalikan" jika tidak sedang berada di Gudang Pusat (Masuk)
  // Atau secara eksplisit statusnya menandakan barang di luar.
  const isOutbound =
    status === "keluar" ||
    status === "diluar" ||
    status === "terdistribusi" ||
    location === "keluar" ||
    location === "diluar" ||
    owner === normalizeOwner(mitraName);

  if (!isOutbound) return false;

  // Jika barang ada di Gudang Utama dan statusnya Valid/Masuk, maka tidak bisa dikembalikan lagi oleh Mitra
  if ((location === "gudang utama" || location === "inbound") && (status === "valid" || status === "masuk" || status === "rusak")) {
    return false;
  }

  return true;
};
