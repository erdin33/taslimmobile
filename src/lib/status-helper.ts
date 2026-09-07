export function formatItemStatus(
  status: string | undefined | null,
  _role?: string | undefined | null,
  mitra?: string | null,
  lokasiPenyimpanan?: string | null,
  paNumber?: string | null
): string {
  if (!status) return "-";
  
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedLoc = (lokasiPenyimpanan || "").trim().toLowerCase();
  const normMitra = (mitra || "").trim().toLowerCase();
  const userRole = (_role || "").trim().toLowerCase();
  const isUserMitra = userRole === "mitra";
  
  // Barang di mitra jika mitra tercatat bukan KP
  const isAtMitra = normMitra !== "" && normMitra !== "kp tasikmalaya" && normMitra !== "kp" && normMitra !== "-";

  const hasPa = Boolean(paNumber && paNumber.trim()) ||
    normalizedLoc.startsWith("pa-") ||
    normalizedLoc.startsWith("pa ") ||
    normalizedLoc.startsWith("pa:");

  // 1. Status Kondisi Khusus (Prioritas Tertinggi)
  if (normalizedStatus === "rusak" || normalizedLoc === "rusak") return "Rusak";
  if (normalizedStatus === "hilang" || normalizedLoc === "hilang") return "Hilang";
  if (normalizedStatus === "dismantle" || normalizedLoc === "dismantle") return "Dismantle";

  // 2. Status Digunakan (sudah keluar dari mitra / terpasang di pelanggan dengan PA)
  // Untuk Mitra: Barang HANYA dianggap digunakan jika statusnya 'digunakan', lokasinya 'digunakan', atau memiliki PA.
  // Untuk Admin: Barang dianggap digunakan jika ada PA / status digunakan, ATAU keluar tapi bukan ke mitra.
  const isActuallyUsed =
    normalizedStatus === "digunakan" ||
    normalizedLoc === "digunakan" ||
    hasPa ||
    (!isUserMitra && !isAtMitra && (normalizedStatus === "keluar" || normalizedLoc === "keluar"));

  if (isActuallyUsed) {
    return "Digunakan";
  }

  // 3. Status Distribusi / Stok di Mitra
  // Jika barang berada di mitra atau dikirim ke mitra (status keluar dari KP, terdistribusi, diluar, mitra):
  // Bagi Mitra -> statusnya adalah "Tersedia" (karena stok ada di tangan mitra dan siap dipakai)
  // Bagi Admin -> statusnya adalah "Terdistribusi"
  const isDistributed =
    isAtMitra ||
    normalizedStatus === "terdistribusi" ||
    normalizedLoc === "terdistribusi" ||
    normalizedStatus === "diluar" ||
    normalizedLoc === "diluar" ||
    normalizedLoc === "mitra" ||
    normalizedStatus === "keluar" ||
    normalizedLoc === "keluar";

  if (isDistributed) {
    if (isUserMitra) {
      return "Tersedia";
    }
    return "Terdistribusi";
  }
  
  // 4. Default: Barang berada di Gudang KP
  return "Tersedia";
}

export function formatItemLocation(
  lokasiPenyimpanan: string | undefined | null,
  mitra: string | undefined | null,
  paNumber?: string | null
): string {
  if (!lokasiPenyimpanan) {
    if (paNumber && paNumber.trim()) {
      const p = paNumber.trim();
      return /^pa[\s\-_:]/i.test(p) ? p : `PA: ${p}`;
    }
    return "-";
  }
  
  const normalizedLokasi = lokasiPenyimpanan.trim().toLowerCase();
  
  if (normalizedLokasi === "digunakan") {
    if (paNumber && paNumber.trim()) {
      const p = paNumber.trim();
      return /^pa[\s\-_:]/i.test(p) ? p : `PA: ${p}`;
    }
    return "Digunakan";
  }
  
  if ((normalizedLokasi === "mitra" || normalizedLokasi === "terdistribusi" || normalizedLokasi === "diluar" || normalizedLokasi === "keluar") && mitra) {
    return mitra;
  }
  
  return lokasiPenyimpanan.trim();
}

/**
 * Helper untuk memfilter status barang secara presisi untuk Admin maupun Mitra.
 */
export function isItemMatchingStatus(
  item: {
    status?: string | null;
    lokasiPenyimpanan?: string | null;
    storage_location?: string | null;
    lokasi?: string | null;
    mitra?: string | null;
    partner?: string | null;
    paNumber?: string | null;
    pa_number?: string | null;
  },
  filterStatus: string,
  userRole?: string | null
): boolean {
  if (!filterStatus || filterStatus === "all") return true;
  const normFilter = filterStatus.trim().toLowerCase();

  const rawStatus = item.status || "";
  const rawLoc = item.lokasiPenyimpanan || item.storage_location || item.lokasi || "";
  const rawMitra = item.mitra || item.partner || "";
  const rawPa = item.paNumber || item.pa_number || "";

  const effectiveStatus = formatItemStatus(rawStatus, userRole, rawMitra, rawLoc, rawPa);
  return effectiveStatus.toLowerCase() === normFilter;
}
