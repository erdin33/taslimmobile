export function formatItemStatus(
  status: string | undefined | null,
  role: string | undefined | null,
  mitra?: string | null,
  lokasiPenyimpanan?: string | null
): string {
  if (!status) return "-";
  
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedLoc = (lokasiPenyimpanan || "").trim().toLowerCase();
  const isUserMitra = (role || "").trim().toLowerCase() === "mitra";
  
  // 1. Status Digunakan (sudah keluar/terpasang di pelanggan)
  if (normalizedStatus === "digunakan" || normalizedLoc === "digunakan") {
    return "Digunakan";
  }
  
  // 2. Status Kondisi Khusus
  if (normalizedStatus === "rusak") return "Rusak";
  if (normalizedStatus === "hilang") return "Hilang";
  if (normalizedStatus === "dismantle") return "Dismantle";

  // 3. Status Distribusi (Barang di tangan mitra / di luar gudang KP)
  const normMitra = (mitra || "").trim().toLowerCase();
  const isAtMitra = normMitra !== "" && normMitra !== "kp tasikmalaya" && normMitra !== "kp";
  const isDistributed =
    normalizedStatus === "diluar" ||
    normalizedStatus === "terdistribusi" ||
    normalizedStatus === "keluar" ||
    normalizedLoc === "keluar" ||
    normalizedLoc === "diluar" ||
    normalizedLoc === "terdistribusi" ||
    isAtMitra;

  if (isDistributed) {
    // Di akun Mitra, barang pegangan mitra berstatus 'Tersedia' (siap dipakai)
    if (isUserMitra) {
      return "Tersedia";
    }
    // Di akun Admin/KP, barang di mitra berstatus 'Terdistribusi'
    return "Terdistribusi";
  }
  
  // 4. Default: Barang berada di Gudang KP
  return "Tersedia";
}

export function formatItemLocation(lokasiPenyimpanan: string | undefined | null, mitra: string | undefined | null): string {
  if (!lokasiPenyimpanan) return "-";
  
  const normalizedLokasi = lokasiPenyimpanan.trim().toLowerCase();
  
  if (normalizedLokasi === "digunakan") {
    return "Digunakan";
  }
  
  if ((normalizedLokasi === "mitra" || normalizedLokasi === "terdistribusi" || normalizedLokasi === "diluar" || normalizedLokasi === "keluar") && mitra) {
    return mitra;
  }
  
  return lokasiPenyimpanan.trim();
}
