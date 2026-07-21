import { useState, useEffect, useRef, useCallback } from "react";
import { BadgeCheck, Boxes, PackagePlus, ScanLine, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CameraScanner } from "@/components/camera-scanner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BrandOption, BrandDefinition, KategoriOption, LokasiOption, LocationDefinition, InventoryItem, KodeBarangUpdate } from "@/types/inventory";
import type { BarangMasukItem } from "@/types/transaction";
import type { Partner } from "@/types/partner";

/**
 * Helper: Mengembalikan Base URL untuk pemanggilan API.
 * 
 * @returns {string} String URL API Backend.
 */
const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

/**
 * Helper: Menyusun header HTTP secara otomatis beserta Authorization token.
 * 
 * @returns {Record<string, string>} Object header HTTP.
 */
const getHeaders = () => {
  const token = localStorage.getItem("arxiva-auth-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `${token}`;
  }
  return headers;
};

const ADMIN_LOCATION = "KP Tasikmalaya";

/**
 * Mendeteksi merek barang secara otomatis berdasarkan awalan (prefix) kode serial number.
 * Berguna saat memasukkan barang baru yang belum pernah terdaftar sebelumnya.
 * 
 * @param {string} code - Serial number yang di-scan.
 * @param {BrandDefinition[]} brands - Daftar referensi merek (master data).
 * @returns {BrandOption} Nama merek yang terdeteksi, atau string kosong jika tidak ada yang cocok.
 */
const detectBrandFromCode = (code: string, brands: BrandDefinition[]): BrandOption => {
  if (!code || !brands || brands.length === 0) return "";
  const normalizedCode = code.trim().toUpperCase();

  const brandEntries: { name: string; identifier: string }[] = [];
  for (const brand of brands) {
    if (!brand.identifier || !brand.name) continue;
    const parts = brand.identifier.split(/[,;\s]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
    for (const part of parts) {
      brandEntries.push({ name: brand.name, identifier: part });
    }
  }

  // Sort by identifier length descending so longer identifiers match first
  brandEntries.sort((a, b) => b.identifier.length - a.identifier.length);

  const match = brandEntries.find((entry) => normalizedCode.startsWith(entry.identifier));
  return match ? match.name : "";
};

/**
 * Mengecek apakah event berasal dari elemen input teks, textarea, atau konten editable.
 * Berguna agar global keyboard listener (scanner) tidak membajak input pengguna saat mengetik.
 */
const detectMitraFromSN = (sn: string, partners: Partner[]): string => {
  if (!sn) return "";
  const normalizedSN = sn.trim().toUpperCase();
  const matched = partners.find((partner) => {
    const code = (partner.code || "").trim().toUpperCase();
    return code && normalizedSN.startsWith(code);
  });
  return matched?.name || "";
};

const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
};

const normalizeKodeBarang = (code: string) => code.trim().toUpperCase();
const normalizeBrand = (brand: string) => brand.trim().toLocaleLowerCase("id-ID");
const normalizeStatus = (status: string) => status.trim().toLocaleLowerCase("id-ID");
const normalizeOwner = (owner?: string | null) =>
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
const isValidMitraInboundSource = (
  item: InventoryItem,
  mitraName: string
) => {
  const owner = normalizeOwner(item.mitra);
  const status = normalizeStatus(item.status);
  const location = normalizeStatus(item.lokasiPenyimpanan || "");

  // Barang dianggap "di luar KP" jika statusnya keluar/diluar,
  // ATAU lokasinya adalah "Keluar"/"Diluar"
  const isOutbound =
    status === "keluar" ||
    status === "diluar" ||
    location === "keluar" ||
    location === "diluar";

  if (!isOutbound) return false;

  // Jika lokasi fisik sudah "Diluar"/"Keluar", barang terbukti berada
  // di luar gudang KP — izinkan mitra menerimanya tanpa validasi owner ketat,
  // karena pengecekan owner bisa gagal akibat perbedaan nama/spasi.
  if (location === "keluar" || location === "diluar") return true;

  // Jika hanya status yang menandakan keluar (lokasi masih di KP),
  // validasi owner agar hanya barang milik mitra sendiri atau KP yang bisa diterima.
  return (
    owner === normalizeOwner(mitraName) ||
    owner === normalizeOwner(ADMIN_LOCATION) ||
    owner === normalizeOwner("KP Tasikmalaya") ||
    owner === normalizeOwner("KP") ||
    owner === ""
  );
};

const getRecommendedLocation = (
  brand: BrandOption,
  locations: LocationDefinition[],
  availableCapacity: Record<string, number>
): LokasiOption => {
  const availableLocations = locations.filter(
    (location) => (availableCapacity[location.name] ?? 0) > 0
  );
  const normalizedBrand = normalizeBrand(brand);

  if (normalizedBrand) {
    const matchingLocation = availableLocations.find(
      (location) => normalizeBrand(location.brandRule) === normalizedBrand
    );
    if (matchingLocation) return matchingLocation.name;
  }

  const mixedLocation = availableLocations.find((location) => {
    const normalizedRule = normalizeBrand(location.brandRule);
    return !normalizedRule || normalizedRule === "campuran";
  });

  return mixedLocation?.name || availableLocations[0]?.name || "";
};

const getMitraDefaultLocation = (mitraName: string): LokasiOption =>
  `Gudang ${mitraName.trim() || "Mitra"}`;

function EmptyScanTableState() {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
          <PackagePlus className="size-7" strokeWidth={1.8} />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">Belum ada barang masuk</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Scan atau masukkan serial number dari form di sebelah kiri untuk menambahkan item ke sesi ini.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen BarangMasukPage
 * 
 * Modul operasional Gudang untuk mencatat penerimaan barang masuk.
 * Menangani pembuatan inventaris baru (untuk Admin/KP) dan 
 * penerimaan distribusi (untuk Mitra) dengan deteksi cerdas merek & lokasi rak.
 * 
 * @returns {JSX.Element} Antarmuka halaman barang masuk.
 */
export default function BarangMasukPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kodeBarang, setKodeBarang] = useState("");
  const [inputMode, setInputMode] = useState<"auto" | "manual">("auto");
  const [merekFallback, setMerekFallback] = useState<BrandOption>("");
  const [kategoriBarang, setKategoriBarang] = useState<KategoriOption>("");
  const [barangMasuk, setBarangMasuk] = useState<BarangMasukItem[]>([]);
  const [kuota, setKuota] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const processedCodesRef = useRef<Set<string>>(new Set());
  const kodeBarangRef = useRef("");
  const [dbBrands, setDbBrands] = useState<BrandDefinition[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbLocations, setDbLocations] = useState<LocationDefinition[]>([]);
  const [, setDbItems] = useState<InventoryItem[]>([]);
  const [dbPartners, setDbPartners] = useState<Partner[]>([]);
  const [asalBarangManual, setAsalBarangManual] = useState<boolean>(false);
  const [asalBarang, setAsalBarang] = useState<string>("SBU Regional Jawa Barat");
  const [kondisiBarang, setKondisiBarang] = useState<string>("Baru");
  const [isSaving, setIsSaving] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"scan" | "daftar">("scan");
  const [keperluan, setKeperluan] = useState<"Pusat" | "SBU" | "Gangguan" | "Aktivasi" | "Mitra">("SBU");
  const [nomorTicket, setNomorTicket] = useState<string>("");

  const refreshInventoryItems = useCallback(async () => {
    try {
      const resItems = await fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() });
      const rawItems = await resItems.json();
      const items = Array.isArray(rawItems.data || rawItems) ? (rawItems.data || rawItems) : [];
      setDbItems(items);
      return items as InventoryItem[];
    } catch (error) {
      console.error("Gagal memperbarui data barang dari server:", error);
      toast.error("Gagal memperbarui data barang dari server.");
      return [] as InventoryItem[];
    }
  }, []);

  // Fetch brands, categories, and locations from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resPartners = await fetch(`${getBaseUrl()}/users`, { method: "GET", headers: getHeaders() });
        const rawPartners = await resPartners.json();
        const usersList = rawPartners.data || rawPartners.users || rawPartners;
        const partners: Partner[] = (Array.isArray(usersList) ? usersList : []).filter((u: any) => u.role === "MITRA").map((u: any) => ({
          id: String(u.id),
          code: u.profile?.code || u.code || "-",
          name: u.profile?.nama || u.profile?.name || u.name || u.username || "",
          partnerType: u.profile?.partnerType || u.partnerType || "Supplier",
          contactPerson: u.profile?.contactPerson || u.contactPerson || "-",
          phone: u.profile?.telepon || u.profile?.phone || u.phone || "-",
          email: u.profile?.email || u.email || "-",
          address: u.profile?.alamat || u.profile?.address || u.address || "-",
          isActive: u.isAktif !== undefined ? u.isAktif : (u.isActive !== undefined ? u.isActive : true),
          username: u.username || null,
        }));
        setDbPartners(partners.filter((partner) => partner.isActive));

        const resBrands = await fetch(`${getBaseUrl()}/brands`, { method: "GET", headers: getHeaders() });
        const rawBrands = await resBrands.json();
        const brands = rawBrands.data || rawBrands;
        const brandDefinitions = (Array.isArray(brands) ? brands : []).map((brand: any) => ({
          name: brand.name || brand.nama || "",
          identifier: brand.identifier || brand.kode || "",
        }));
        setDbBrands(brandDefinitions);

        const resCat = await fetch(`${getBaseUrl()}/categories`, { method: "GET", headers: getHeaders() });
        const rawCat = await resCat.json();
        const categories = rawCat.data || rawCat;
        const categoryNames = (Array.isArray(categories) ? categories : []).map((c: any) => c.name || c.nama || "");
        setDbCategories(categoryNames);

        if (categoryNames.length > 0) {
          setKategoriBarang(categoryNames[0]);
        }

        const items = await refreshInventoryItems();

        const resLoc = await fetch(`${getBaseUrl()}/locations`, { method: "GET", headers: getHeaders() });
        const rawLoc = await resLoc.json();
        const locationsData = rawLoc.data || rawLoc;
        const locs: LocationDefinition[] = [];
        const newKuota: Record<string, number> = {};
        const locationOwner =
          user?.role === "mitra" ? user.displayName : ADMIN_LOCATION;

        (Array.isArray(locationsData) ? locationsData : []).forEach((loc: any) => {
          if (loc.isActive === false) return;
          if (loc.name === "Keluar" || loc.name === "Diluar") return;
          if (
            normalizeOwner(loc.owner || ADMIN_LOCATION) !==
            normalizeOwner(locationOwner)
          ) {
            return;
          }

          if (loc.type === "Rak" && loc.levels) {
            loc.levels.forEach((lvl: any) => {
              if (lvl.isActive === false) return;

              const name = `${loc.name} - ${lvl.name}`;
              locs.push({
                name,
                brandRule: lvl.brandRule || "Campuran",
              });
              const actualUsed = (Array.isArray(items) ? items : []).filter((item: any) => {
                if (!item.lokasiPenyimpanan) return false;
                const st = (item.status || "").trim().toLowerCase();
                return item.lokasiPenyimpanan.trim() === name.trim() && st !== "diluar" && st !== "keluar";
              }).length;
              newKuota[name] = Math.max(0, lvl.capacity - actualUsed);
            });
          } else {
            locs.push({
              name: loc.name,
              brandRule: loc.brandRule || "Campuran",
            });
            const actualUsed = (Array.isArray(items) ? items : []).filter((item: any) => {
              if (!item.lokasiPenyimpanan) return false;
              const st = (item.status || "").trim().toLowerCase();
              return item.lokasiPenyimpanan.trim() === loc.name.trim() && st !== "diluar" && st !== "keluar";
            }).length;
            newKuota[loc.name] = Math.max(
              0,
              (loc.capacity || 0) - actualUsed
            );
          }
        });
        setDbLocations(locs);
        setKuota(newKuota);

      } catch (error) {
        console.error("Gagal mengambil data dari database:", error);
        toast.error("Gagal memuat data barang masuk.");
      }
    };
    void fetchData();
  }, [refreshInventoryItems, user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshInventoryItems();
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshInventoryItems]);

  const detectedBrand = detectBrandFromCode(kodeBarang, dbBrands);
  const totalKuotaTersedia = Object.values(kuota).reduce((total, value) => total + value, 0);
  const validItems = barangMasuk.filter((item) => item.status === "Valid").length;

  const updateKodeBarang = useCallback((value: KodeBarangUpdate) => {
    setKodeBarang((current) => {
      const nextValue = typeof value === "function" ? value(current) : value;
      kodeBarangRef.current = nextValue;
      return nextValue;
    });
  }, []);

  const focusKodeBarangInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Auto-focus pada input ketika component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-detect merek berdasarkan awal input kode
  useEffect(() => {
    if (detectedBrand) {
      setMerekFallback(detectedBrand);
    } else {
      setMerekFallback("");
    }
  }, [detectedBrand]);

  /**
   * Menangani aksi submit (scan/input manual) kode barang.
   * Melakukan validasi kompleks seperti rekomendasi lokasi otomatis
   * berdasarkan sisa kuota dan aturan merek rak.
   * 
   * @param {string} kodeOverride - Kode serial number yang akan disubmit.
   */
  // Auto-detect mitra dari SN dan set asal barang otomatis
  useEffect(() => {
    if (asalBarangManual) return;
    const detectedMitra = detectMitraFromSN(kodeBarang, dbPartners);
    if (detectedMitra) {
      setAsalBarang(detectedMitra);
    } else {
      setAsalBarang("SBU Regional Jawa Barat");
    }
  }, [kodeBarang, dbPartners, asalBarangManual]);

  const handleSubmit = useCallback(async (kodeOverride = kodeBarang) => {
    const trimmedKode = kodeOverride.trim();
    if (!trimmedKode) return { success: false, message: "Serial number kosong" };

    // Validasi duplikasi pada sesi saat ini
    const isDuplicate = barangMasuk.some(
      (item) => normalizeKodeBarang(item.nomor) === normalizeKodeBarang(trimmedKode)
    );

    if (isDuplicate) {
      const msg = "Serial number sudah ada di sesi ini.";
      toast.error(msg, {
        description: trimmedKode,
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: msg };
    }

    const latestItems = await refreshInventoryItems();
    const existingItem = latestItems.find(
      (item) => normalizeKodeBarang(item.serialNumber) === normalizeKodeBarang(trimmedKode)
    );

    if (user?.role === "mitra" && !existingItem) {
      const msg = "Barang belum terdaftar di KP.";
      toast.error(msg, {
        description: `${trimmedKode} harus didaftarkan oleh Admin terlebih dahulu.`,
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: msg };
    }

    if (
      user?.role === "mitra" &&
      existingItem &&
      !isValidMitraInboundSource(existingItem, user.displayName)
    ) {
      console.debug("Barang ditolak untuk Mitra - pemeriksaan detail:", {
        kode: trimmedKode,
        existingItem,
        isValid: isValidMitraInboundSource(existingItem, user.displayName),
      });

      const msg = "Barang belum bisa diterima.";
      const status = existingItem.status || "tidak diketahui";
      const lokasi = existingItem.lokasiPenyimpanan || "gudang KP";
      toast.error(msg, {
        description: `${trimmedKode} masih berstatus "${status}" di "${lokasi}". Barang harus sudah keluar dari KP terlebih dahulu.`,
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: msg };
    }

    const detectedBrand = detectBrandFromCode(trimmedKode, dbBrands);

    if (!detectedBrand && !existingItem) {
      const msg = "Serial number tidak sesuai dengan identifier merek apa pun.";
      toast.error(msg, {
        description: trimmedKode,
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: msg };
    }

    const itemBrand = existingItem?.merek || detectedBrand || merekFallback || "Lainnya";
    let recommendedLocation = getRecommendedLocation(itemBrand, dbLocations, kuota);
    const isMitraUser = user?.role === "mitra";

    if (isMitraUser && !recommendedLocation && existingItem) {
      recommendedLocation = getMitraDefaultLocation(user.displayName);
    }

    if (
      !isMitraUser &&
      existingItem &&
      normalizeStatus(existingItem.status) !== "keluar" &&
      normalizeStatus(existingItem.status) !== "diluar"
    ) {
      if (recommendedLocation && recommendedLocation.trim().toLowerCase() === (existingItem.lokasiPenyimpanan || "").trim().toLowerCase()) {
        const alternativeLocation = dbLocations.find(
          (loc) => (kuota[loc.name] ?? 0) > 0 && loc.name.trim().toLowerCase() !== (existingItem.lokasiPenyimpanan || "").trim().toLowerCase()
        );
        if (alternativeLocation) {
          recommendedLocation = alternativeLocation.name;
        } else {
          const msg = "Barang sudah berada di lokasi tersebut.";
          toast.error("Barang sudah berada di lokasi tersebut dan tidak dapat dimasukkan kembali kecuali pindah penyimpanan.", {
            description: `Lokasi saat ini: ${existingItem.lokasiPenyimpanan}`,
          });
          updateKodeBarang("");
          focusKodeBarangInput();
          return { success: false, message: msg };
        }
      }
    }

    if (!recommendedLocation) {
      const msg = dbLocations.length === 0
        ? "Tidak ada lokasi penyimpanan aktif."
        : "Semua lokasi penyimpanan sudah penuh.";
      toast.error(
        dbLocations.length === 0
          ? "Tidak ada lokasi penyimpanan aktif yang tersedia."
          : "Semua lokasi penyimpanan sudah penuh."
      );
      focusKodeBarangInput();
      return { success: false, message: msg };
    }

    const newItem: BarangMasukItem = {
      id: Date.now(),
      nomor: trimmedKode,
      merek: itemBrand || "(otomatis)",
      kategori: existingItem?.kategori || kategoriBarang,
      lokasi: recommendedLocation,
      status: "Valid",
      existingItemId: existingItem?.id,
      source:
        user?.role === "mitra" && existingItem && isValidMitraInboundSource(existingItem, user.displayName)
          ? "KP"
          : normalizeOwner(existingItem?.mitra) === normalizeOwner(ADMIN_LOCATION) || normalizeOwner(existingItem?.mitra) === normalizeOwner("KP Tasikmalaya")
            ? "KP"
            : existingItem
              ? "Mitra"
              : "Baru",
      asal: asalBarang,
      kondisi: kondisiBarang,
      replacementFor: "",
    };

    setBarangMasuk((current) => [newItem, ...current]);
    setKuota((current) => ({
      ...current,
      [recommendedLocation]: current[recommendedLocation] - 1,
    }));

    updateKodeBarang("");
    setMerekFallback("");
    setAsalBarangManual(false);

    // Auto-focus kembali ke input setelah submit
    focusKodeBarangInput();
    return { success: true };
  }, [
    barangMasuk,
    dbBrands,
    dbLocations,
    refreshInventoryItems,
    focusKodeBarangInput,
    kategoriBarang,
    kodeBarang,
    kuota,
    merekFallback,
    updateKodeBarang,
    user,
    asalBarang,
    kondisiBarang,
    asalBarangManual,
  ]);

  // Handle auto-submit if code is passed via URL query param
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && !processedCodesRef.current.has(code)) {
      processedCodesRef.current.add(code);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("code");
        return next;
      }, { replace: true });
      
      void handleSubmit(code);
    }
  }, [searchParams, setSearchParams]);

  /**
   * Mengarahkan input keyboard atau barcode scanner ke field Kode/SN secara otomatis.
   * Listener global ini memungkinkan user melakukan "blind scan".
   */
  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      // Abaikan shortcut sistem (Ctrl/Cmd/Alt)
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return;
      }

      // Pastikan hanya tombol karakter tunggal, backspace, atau enter yang ditangkap
      const isSupportedKey = event.key.length === 1 || event.key === "Backspace" || event.key === "Enter";
      if (!isSupportedKey || isTextInputTarget(event.target)) {
        return;
      }

      // Hindari saat select dropdown terbuka
      if (document.querySelector("[data-slot='select-content']")) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();

      if (event.key === "Enter") {
        void handleSubmit(kodeBarangRef.current);
        return;
      }

      if (event.key === "Backspace") {
        updateKodeBarang((current) => current.slice(0, -1));
        return;
      }

      updateKodeBarang((current) => `${current}${event.key}`);
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [handleSubmit, updateKodeBarang]);

  const handleDeleteItem = (id: number) => {
    const itemToDelete = barangMasuk.find((item) => item.id === id);
    if (itemToDelete) {
      // Tambah kembali kuota lokasi
      setKuota((current) => {
        if (!(itemToDelete.lokasi in current)) return current;

        return {
          ...current,
          [itemToDelete.lokasi]: current[itemToDelete.lokasi] + 1,
        };
      });
    }
    setBarangMasuk((current) => current.filter((item) => item.id !== id));
  };

  const handleUpdateLokasi = (id: number, newLokasi: LokasiOption) => {
    const itemToUpdate = barangMasuk.find((item) => item.id === id);
    if (!itemToUpdate) return;

    const oldLokasi = itemToUpdate.lokasi;

    // Check if kuota lokasi baru tersedia
    if (newLokasi !== oldLokasi && (kuota[newLokasi] ?? Number.POSITIVE_INFINITY) <= 0) {
      toast.error("Kuota lokasi sudah penuh.", {
        description: newLokasi,
      });
      return;
    }

    // Update barang lokasi
    setBarangMasuk((current) =>
      current.map((item) =>
        item.id === id ? { ...item, lokasi: newLokasi } : item
      )
    );

    // Update kuota: kembalikan kuota lokasi lama, kurangi kuota lokasi baru
    if (newLokasi !== oldLokasi) {
      setKuota((current) => ({
        ...current,
        ...(oldLokasi in current ? { [oldLokasi]: current[oldLokasi] + 1 } : {}),
        ...(newLokasi in current ? { [newLokasi]: current[newLokasi] - 1 } : {}),
      }));
    }
  };

  /**
   * Memvalidasi seluruh transaksi di sesi saat ini ke database dan melakukan update/insert status inventaris.
   * Menyimpan histori ('transactions') dan membuat/mengubah item ('items') menjadi berstatus "Tersedia".
   */
  const handleValidateAll = async () => {
    if (isSaving) return;

    const hasInvalid = barangMasuk.some((item) => item.status === "Invalid");
    if (hasInvalid) {
      toast.error("Tidak dapat menyimpan data.", {
        description: "Terdapat item dengan status tidak valid. Silakan hapus item tersebut terlebih dahulu.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const sessionDate = new Date().toISOString().slice(0, 10);
      const dateStr = sessionDate.replace(/-/g, "");

      // Prefix based on Keperluan
      let prefixPart = "IN";
      if (keperluan === "Pusat") prefixPart = "PST";
      else if (keperluan === "SBU") prefixPart = "SBU";
      else if (keperluan === "Gangguan") prefixPart = "GG";
      else if (keperluan === "Aktivasi") prefixPart = "AKV";
      else if (keperluan === "Mitra") prefixPart = "MTR";

      const prefix = `${prefixPart}-${dateStr}-`;

      // Mendapatkan nomor urut transaksi harian
      const resTrx = await fetch(`${getBaseUrl()}/transactions`, { method: "GET", headers: getHeaders() });
      const rawTrx = await resTrx.json();
      const txs = rawTrx.data || rawTrx;
      let maxNum = 0;
      (Array.isArray(txs) ? txs : []).forEach((t: any) => {
        if (t.nomor && t.nomor.startsWith(prefix)) {
          const numStr = t.nomor.slice(prefix.length);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const sessionNomor = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
      const resLatestItems = await fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() });
      const rawLatestItems = await resLatestItems.json();
      const latestItems: InventoryItem[] = Array.isArray(rawLatestItems.data || rawLatestItems) ? (rawLatestItems.data || rawLatestItems) : [];

      const invalidItem = barangMasuk.find((item) => {
        const existingItem = latestItems.find(
          (dbItem) =>
            dbItem.id === item.existingItemId ||
            normalizeKodeBarang(dbItem.serialNumber) === normalizeKodeBarang(item.nomor)
        );

        if (user?.role === "mitra") {
          return (
            !existingItem ||
            !isValidMitraInboundSource(existingItem, user.displayName)
          );
        }

        if (item.existingItemId && !existingItem) return true;
        if (existingItem && normalizeStatus(existingItem.status) !== "keluar" && normalizeStatus(existingItem.status) !== "diluar") {
          return item.lokasi.trim().toLowerCase() === (existingItem.lokasiPenyimpanan || "").trim().toLowerCase();
        }
        return false;
      });

      if (invalidItem) {
        const existingItem = latestItems.find(
          (dbItem) =>
            dbItem.id === invalidItem.existingItemId ||
            normalizeKodeBarang(dbItem.serialNumber) === normalizeKodeBarang(invalidItem.nomor)
        );

        toast.error(
          user?.role === "mitra"
            ? existingItem
              ? `Barang belum bisa diterima — masih berstatus "${existingItem.status}" di "${existingItem.lokasiPenyimpanan || "gudang KP"}". Scan keluar dari KP terlebih dahulu.`
              : "Barang tidak ditemukan di data KP. Hubungi Admin untuk mendaftarkan barang ini."
            : existingItem
              ? normalizeStatus(existingItem.status) !== "keluar" && normalizeStatus(existingItem.status) !== "diluar"
                ? "Barang sudah berstatus Tersedia di lokasi tersebut dan tidak dapat dimasukkan kembali kecuali pindah penyimpanan."
                : "Barang tidak dapat diproses sebagai masuk kembali."
              : "Data barang keluar tidak lagi ditemukan.",
          {
            description: existingItem
              ? `${invalidItem.nomor} berstatus ${existingItem.status} pada ${existingItem.mitra || "KP Tasikmalaya"}`
              : invalidItem.nomor,
          }
        );
        setDbItems(latestItems);
        return;
      }

      for (const item of barangMasuk) {
        const existingItem = latestItems.find(
          (dbItem) =>
            dbItem.id === item.existingItemId ||
            normalizeKodeBarang(dbItem.serialNumber) === normalizeKodeBarang(item.nomor)
        );

        if (user?.role === "mitra" && !existingItem) {
          throw new Error(
            `${item.nomor} tidak ditemukan di KP dan tidak dapat dibuat oleh Mitra.`
          );
        }

        // Tentukan status berdasarkan kondisi barang masuk
        const isBadMaterial = item.kondisi === "Rusak / Bad" || item.kondisi === "Cacat Pabrik";
        const itemStatus = isBadMaterial ? "Rusak" : "Tersedia";

        if (existingItem) {
          const updatedItem: InventoryItem = {
            ...existingItem,
            serialNumber: item.nomor,
            kategori: item.kategori,
            merek: item.merek,
            status: itemStatus,
            lokasiPenyimpanan: item.lokasi,
            tanggalMasuk: sessionDate,
            tanggalKeluar: undefined,
            mitra:
              user?.role === "mitra"
                ? user.displayName
                : "KP Tasikmalaya",
          };
          const resUp = await fetch(`${getBaseUrl()}/items/${updatedItem.id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(updatedItem),
          });
          if (!resUp.ok) throw new Error(`Gagal update item ${item.nomor}`);
        } else {
          const newItem: InventoryItem = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            serialNumber: item.nomor,
            kategori: item.kategori,
            merek: item.merek,
            status: itemStatus,
            lokasiPenyimpanan: item.lokasi,
            tanggalMasuk: sessionDate,
            mitra:
              user?.role === "mitra"
                ? user.displayName
                : "KP Tasikmalaya",
          };
          const resAdd = await fetch(`${getBaseUrl()}/items`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(newItem),
          });
          if (!resAdd.ok) throw new Error(`Gagal menambah item ${item.nomor}`);
        }

        const newTransaction = {
          id: `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          tanggal: sessionDate,
          nomor: sessionNomor,
          kategori: "Masuk",
          status: "Selesai",
          sn: item.nomor,
          merek: item.merek,
          asal: item.asal || asalBarang,
          tujuan: item.lokasi,
          mitra:
            user?.role === "mitra"
              ? user.displayName
              : "KP Tasikmalaya",
          keterangan: item.replacementFor 
            ? `SN Baru pengganti SN Rusak: ${item.replacementFor} (Ticket Gangguan: ${nomorTicket || '-'})` 
            : (item.kondisi || kondisiBarang),
          keperluan: keperluan,
          nomorTicket: keperluan === "Gangguan" ? nomorTicket : undefined,
          replacementFor: item.replacementFor || undefined,
        };
        const resAddTrx = await fetch(`${getBaseUrl()}/transactions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(newTransaction),
        });
        if (!resAddTrx.ok) throw new Error(`Gagal mencatat transaksi ${item.nomor}`);

        // Jika ada penggantian SN Rusak
        if (item.replacementFor) {
          const oldSN = item.replacementFor.trim().toUpperCase();
          const existingOldItem = latestItems.find(
            (dbItem) => normalizeKodeBarang(dbItem.serialNumber) === oldSN
          );

          if (existingOldItem) {
            const updatedOldItem: InventoryItem = {
              ...existingOldItem,
              status: "Rusak",
            };
            await fetch(`${getBaseUrl()}/items/${updatedOldItem.id}`, {
              method: "PUT",
              headers: getHeaders(),
              body: JSON.stringify(updatedOldItem),
            });
          }

          const replacementTransaction = {
            id: `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 10)}-REP`,
            tanggal: sessionDate,
            nomor: sessionNomor,
            kategori: "Masuk",
            status: "Selesai",
            sn: oldSN,
            merek: existingOldItem?.merek || item.merek,
            asal: item.asal || asalBarang,
            tujuan: item.lokasi,
            mitra:
              user?.role === "mitra"
                ? user.displayName
                : "KP Tasikmalaya",
            keterangan: `Digantikan oleh SN Baru: ${item.nomor} (Ticket Gangguan: ${nomorTicket || '-'})`,
            keperluan: keperluan,
            nomorTicket: keperluan === "Gangguan" ? nomorTicket : undefined,
          };
          const resAddTrxRep = await fetch(`${getBaseUrl()}/transactions`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(replacementTransaction),
          });
          if (!resAddTrxRep.ok) throw new Error(`Gagal mencatat transaksi penggantian untuk ${oldSN}`);
        }
      }
      toast.success(`${barangMasuk.length} barang masuk berhasil disimpan.`);
      setBarangMasuk([]); // Clear local state after saving
      setActiveMobileTab("daftar");

      const resRefresh = await fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() });
      const rawRefresh = await resRefresh.json();
      setDbItems(Array.isArray(rawRefresh.data || rawRefresh) ? (rawRefresh.data || rawRefresh) : []);
    } catch (error: any) {
      console.error("Gagal menyimpan ke database:", error);
      toast.error(error?.message || "Gagal menyimpan barang masuk ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-full gap-4 px-4 py-4 select-none pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        {/* Stats Summary Cards for Mobile */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <PackagePlus className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Sesi Scan</p>
              <p className="text-base font-bold tabular-nums">{barangMasuk.length} Unit</p>
            </div>
          </Card>
          
          <Card className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Boxes className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Kuota</p>
              <p className="text-base font-bold tabular-nums">{totalKuotaTersedia} Slot</p>
            </div>
          </Card>
        </div>

        {/* Mobile Tabs */}
        <Tabs value={activeMobileTab} onValueChange={(val) => setActiveMobileTab(val as any)} className="flex-1 flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">Scan & Form</TabsTrigger>
            <TabsTrigger value="daftar">Daftar Barang Masuk ({barangMasuk.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-0 flex flex-1 flex-col gap-4">
            {/* Auto Scanner Card */}
            <Card className="p-4 flex flex-col items-center justify-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScanLine className="size-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Scan Barcode / QR</p>
                <p className="text-xs text-muted-foreground">Sistem akan otomatis mendeteksi pola serial number.</p>
              </div>
              <CameraScanner
                onScan={(code) => handleSubmit(code)}
                className="w-full max-w-[200px]"
                buttonText="Scan via Kamera"
              />
            </Card>

            {/* Hasil Scan Sesi Ini */}
            <Card className="p-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hasil Scan Sesi Ini</p>
                <Button
                  variant="ghost"
                  className="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10 cursor-pointer rounded-md font-medium"
                  onClick={() => setBarangMasuk([])}
                  disabled={barangMasuk.length === 0}
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-[140px] overflow-y-auto border rounded-lg bg-muted/10 p-2 text-xs font-mono space-y-1">
                {barangMasuk.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 select-none">Belum ada barang di-scan</p>
                ) : (
                  barangMasuk.map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b last:border-0 border-muted/30">
                      <span className="truncate pr-2">{idx + 1}. {item.nomor}</span>
                      <span className="text-[10px] text-emerald-500 font-semibold shrink-0">{item.merek}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Form Fields: Asal Barang, Keperluan, Kategori */}
            <Card className="p-4 flex flex-col gap-4">
              {user?.role !== "mitra" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="asal-barang-mobile" className="text-xs">Asal Barang</Label>
                  <Select value={asalBarang} onValueChange={(val) => { setAsalBarang(val); setAsalBarangManual(true); }}>
                    <SelectTrigger id="asal-barang-mobile" className="w-full h-9 text-xs">
                      <SelectValue placeholder="Pilih asal barang..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBU Regional Jawa Barat">SBU Regional Jawa Barat</SelectItem>
                      {dbPartners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.name}>{partner.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="keperluan-barang-mobile" className="text-xs">Keperluan Transaksi</Label>
                <Select value={keperluan} onValueChange={(val) => setKeperluan(val as any)}>
                  <SelectTrigger id="keperluan-barang-mobile" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Pilih keperluan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pusat">Pusat (PST)</SelectItem>
                    <SelectItem value="SBU">SBU (SBU)</SelectItem>
                    <SelectItem value="Gangguan">Gangguan (GG)</SelectItem>
                    <SelectItem value="Aktivasi">Aktivasi (AKV)</SelectItem>
                    <SelectItem value="Mitra">Mitra (MTR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="kategori-barang-mobile" className="text-xs">Kategori Barang</Label>
                <Select value={kategoriBarang} onValueChange={(val) => setKategoriBarang(val as any)}>
                  <SelectTrigger id="kategori-barang-mobile" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dbCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Simpan Semua Button */}
            <Button
              className="w-full h-11 text-xs font-bold gap-2 mt-2 cursor-pointer"
              onClick={handleValidateAll}
              disabled={barangMasuk.length === 0 || isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan Semua
            </Button>
          </TabsContent>

          <TabsContent value="daftar" className="mt-0 flex flex-1 flex-col gap-4">
            <Card className="flex-1 flex flex-col min-h-[300px]">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm">Detail Daftar Barang Masuk</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">No</TableHead>
                      <TableHead className="text-xs">Serial Number</TableHead>
                      <TableHead className="text-xs">Merek</TableHead>
                      <TableHead className="text-xs">Lokasi</TableHead>
                      <TableHead className="text-xs text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barangMasuk.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs py-10 text-muted-foreground select-none">
                          Belum ada barang masuk di sesi ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      barangMasuk.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[120px]">{item.nomor}</TableCell>
                          <TableCell className="text-xs">{item.merek}</TableCell>
                          <TableCell className="text-xs">
                            <Select
                              value={item.lokasi}
                              onValueChange={(val) => handleUpdateLokasi(item.id, val as LokasiOption)}
                            >
                              <SelectTrigger className="h-8 text-[11px] w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {dbLocations.map((l) => (
                                  <SelectItem key={l.name} value={l.name} disabled={kuota[l.name] <= 0}>
                                    {l.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="@container/main flex min-h-full select-none flex-col gap-4 py-4 md:gap-6 md:pt-10 md:pb-8">
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card relative">
          <div className="flex flex-row items-center">
            <div className="ml-4 rounded-lg bg-primary/10 p-3">
              <PackagePlus className="text-primary" />
            </div>
            <div className="flex w-full flex-col">
              <CardHeader className="flex flex-col">
                <CardDescription>Sesi Scan</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {barangMasuk.length} <span className="text-sm font-normal text-muted-foreground">Unit</span>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
        </Card>

        <Card className="@container/card relative">
          <div className="flex flex-row items-center">
            <div className="ml-4 rounded-lg bg-primary/10 p-3">
              <ScanLine className="text-primary" />
            </div>
            <div className="flex w-full flex-col">
              <CardHeader className="flex flex-col">
                <CardDescription>Merek Terdeteksi</CardDescription>
                <CardTitle className="truncate text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {merekFallback || "-"}
                </CardTitle>
              </CardHeader>
            </div>
          </div>
        </Card>

        <Card className="@container/card relative">
          <div className="flex flex-row items-center">
            <div className="ml-4 rounded-lg bg-primary/10 p-3">
              <BadgeCheck className="text-primary" />
            </div>
            <div className="flex w-full flex-col">
              <CardHeader className="flex flex-col">
                <CardDescription>Validasi</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {validItems} <span className="text-sm font-normal text-muted-foreground">Valid</span>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
        </Card>

        <Card className="@container/card relative">
          <div className="flex flex-row items-center">
            <div className="ml-4 rounded-lg bg-primary/10 p-3">
              <Boxes className="text-primary" />
            </div>
            <div className="flex w-full flex-col">
              <CardHeader className="flex flex-col">
                <CardDescription>Kuota Tersisa</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {totalKuotaTersedia} <span className="text-sm font-normal text-muted-foreground">Slot</span>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid h-full gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[minmax(320px,380px)_1fr]">
        <Card className="@container/card flex flex-col @5xl/main:min-h-[calc(107svh-var(--header-height)-15rem)]">
          <Tabs
            value={inputMode}
            onValueChange={(value) => {
              setInputMode(value as "auto" | "manual");
              focusKodeBarangInput();
            }}
            className="flex flex-1 flex-col gap-4"
          >
            <CardHeader className="flex flex-col gap-4 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto">Auto</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {user?.role === "mitra" && (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs leading-5 text-sky-600 dark:text-sky-400 space-y-1">
                  <p className="font-semibold">Ketentuan Penerimaan Barang Mitra</p>
                  <p>Barang hanya dapat diterima jika sudah berstatus <span className="font-semibold">Keluar</span> atau <span className="font-semibold">Diluar</span> dari KP. Barang yang masih tersimpan di gudang KP tidak dapat dipindah ke gudang mitra.</p>
                </div>
              )}

              {user?.role !== "mitra" && (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="asal-barang">Asal Barang</Label>
                  <Select
                    value={asalBarang}
                    onValueChange={(value) => {
                      setAsalBarang(value);
                      setAsalBarangManual(true);
                      focusKodeBarangInput();
                    }}
                  >
                    <SelectTrigger id="asal-barang" className="w-full">
                      <SelectValue placeholder="Pilih asal barang..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBU Regional Jawa Barat">SBU Regional Jawa Barat</SelectItem>
                      {dbPartners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.name}>
                          {partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!asalBarangManual && detectMitraFromSN(kodeBarang, dbPartners) && (
                    <p className="text-xs text-sky-600 dark:text-sky-400">
                      Terdeteksi otomatis dari SN
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Label htmlFor="keperluan-barang">Keperluan Transaksi</Label>
                <Select
                  value={keperluan}
                  onValueChange={(value) => {
                    setKeperluan(value as any);
                    focusKodeBarangInput();
                  }}
                >
                  <SelectTrigger id="keperluan-barang" className="w-full">
                    <SelectValue placeholder="Pilih keperluan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pusat">Pusat (PST)</SelectItem>
                    <SelectItem value="SBU">SBU (SBU)</SelectItem>
                    <SelectItem value="Gangguan">Gangguan (GG)</SelectItem>
                    <SelectItem value="Aktivasi">Aktivasi (AKV)</SelectItem>
                    <SelectItem value="Mitra">Mitra (MTR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {keperluan === "Gangguan" && (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="ticket-gangguan">Nomor Ticket Gangguan</Label>
                  <Input
                    id="ticket-gangguan"
                    placeholder="Contoh: TKT-12345"
                    value={nomorTicket}
                    onChange={(e) => setNomorTicket(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Label htmlFor="kondisi-barang">Kategori / Kondisi</Label>
                <Select
                  value={kondisiBarang}
                  onValueChange={(value) => {
                    setKondisiBarang(value);
                    focusKodeBarangInput();
                  }}
                >
                  <SelectTrigger id="kondisi-barang" className="w-full">
                    <SelectValue placeholder="Pilih kondisi barang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baru">Baru</SelectItem>
                    <SelectItem value="Dismantle">Dismantle</SelectItem>
                    <SelectItem value="Rusak / Bad">Rusak / Bad</SelectItem>
                    <SelectItem value="Cacat Pabrik">Cacat Pabrik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="auto" className="mt-0 flex flex-1 flex-col">
                <Input
                  ref={inputRef}
                  id="kode-barang-auto"
                  value={kodeBarang}
                  onChange={(event) => updateKodeBarang(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="Masukkan kode barang atau serial number"
                  className="hidden"
                />
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ScanLine className="size-8 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 flex flex-col items-center">
                    <p className="text-base font-semibold text-foreground">
                      Silakan scan menggunakan scanner
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Sistem akan menangkap kode secara otomatis dan menambahkannya ke daftar barang masuk.
                    </p>
                    <CameraScanner
                      onScan={(code) => handleSubmit(code)}
                      className="mt-4 w-full max-w-[200px]"
                      buttonText="Scan / Upload Foto"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="mt-0 flex flex-col gap-3">
                <Label htmlFor="kode-barang-manual">Kode / SN</Label>
                <Input
                  ref={inputRef}
                  id="kode-barang-manual"
                  value={kodeBarang}
                  onChange={(event) => updateKodeBarang(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="Masukkan kode barang atau serial number"
                />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="merek-fallback">Merek fallback</Label>
                    <span className="text-xs text-muted-foreground">
                      {merekFallback && detectedBrand === merekFallback
                        ? "Terdeteksi otomatis"
                        : "Jika pola SN tidak dikenali"}
                    </span>
                  </div>
                  <Select
                    value={merekFallback}
                    onValueChange={(value) => {
                      setMerekFallback(value as BrandOption);
                      focusKodeBarangInput();
                    }}
                  >
                    <SelectTrigger id="merek-fallback" className="w-full">
                      <SelectValue placeholder="Pilih merek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {dbBrands.map((brand) => (
                          <SelectItem key={brand.name} value={brand.name}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3">
                  <Label htmlFor="kategori-barang">Kategori Barang</Label>
                  <Select
                    value={kategoriBarang}
                    onValueChange={(value) => {
                      setKategoriBarang(value as KategoriOption);
                      focusKodeBarangInput();
                    }}
                  >
                    <SelectTrigger id="kategori-barang" className="w-full">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {dbCategories.map((kategori) => (
                          <SelectItem key={kategori} value={kategori}>
                            {kategori}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>

          {inputMode === "manual" ? (
            <CardFooter className="mt-auto justify-end gap-2">
              <Button className="w-full gap-2 sm:w-auto" size="lg" onClick={() => void handleSubmit()}>
                <PackagePlus className="size-4" />
                Simpan barang masuk
              </Button>
            </CardFooter>
          ) : null}
        </Card>

        <Card className="@container/card flex flex-col @5xl/main:min-h-[calc(100svh-var(--header-height)-15rem)]">
          <CardHeader className="flex flex-col gap-3 border-b pb-4 @lg/card:flex-row @lg/card:items-center @lg/card:justify-between">
            <div className="space-y-1">
              <CardTitle>Daftar Barang Masuk</CardTitle>
            </div>
            <Badge variant="outline" className="w-fit">
              {barangMasuk.length} Item
            </Badge>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex-1 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead className="w-14">No</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Merek</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Asal</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead className="w-48">Ganti SN Rusak (Opsional)</TableHead>
                    <TableHead>Rekomendasi Lokasi</TableHead>
                    <TableHead>Status Validasi</TableHead>
                    <TableHead className="w-16 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barangMasuk.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="p-0">
                        <EmptyScanTableState />
                      </TableCell>
                    </TableRow>
                  ) : (
                    barangMasuk.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono">{item.nomor}</TableCell>
                        <TableCell>{item.status === "Invalid" ? "-" : (item.merek || "-")}</TableCell>
                        <TableCell>
                          {item.status === "Invalid" ? "-" : (
                            <Badge variant="secondary" className="font-normal px-2.5 py-0.5">
                              {item.kategori}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.status === "Invalid" ? "-" : (item.asal || asalBarang)}</TableCell>
                        <TableCell>
                          {item.status === "Invalid" ? "-" : (
                            <Badge variant="outline" className="font-normal px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary">
                              {item.kondisi || kondisiBarang}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={item.status === "Invalid"}
                            className="font-mono text-xs w-[180px] h-8 bg-zinc-900 border-neutral-800"
                            placeholder={item.status === "Invalid" ? "-" : "Ketik SN Rusak..."}
                            value={item.replacementFor || ""}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setBarangMasuk(current => current.map(it => it.id === item.id ? { ...it, replacementFor: val } : it));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {item.status === "Invalid" ? "-" : (
                            <Select
                              value={item.lokasi}
                              onValueChange={(value) => {
                                const selectedLokasi = value as LokasiOption;
                                if ((kuota[selectedLokasi] ?? Number.POSITIVE_INFINITY) <= 0) {
                                  toast.error("Kuota lokasi sudah penuh dan tidak dapat dipilih.", {
                                    description: selectedLokasi,
                                  });
                                  focusKodeBarangInput();
                                  return;
                                }
                                handleUpdateLokasi(item.id, selectedLokasi);
                                focusKodeBarangInput();
                              }}
                            >
                              <SelectTrigger className="w-220px">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {!dbLocations.some((lokasi) => lokasi.name === item.lokasi) && (
                                    <SelectItem value={item.lokasi}>
                                      {item.lokasi}
                                    </SelectItem>
                                  )}
                                  {dbLocations.map((lokasi) => {
                                    const isDisabled = kuota[lokasi.name] <= 0;
                                    return (
                                      <SelectItem
                                        key={lokasi.name}
                                        value={lokasi.name}
                                        disabled={isDisabled}
                                      >
                                        {lokasi.name}{isDisabled ? " (Kuota penuh)" : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal gap-1.5 px-2.5 py-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "Invalid" 
                                ? "bg-rose-500 animate-pulse" 
                                : item.existingItemId 
                                  ? "bg-sky-500" 
                                  : "bg-emerald-500"
                            }`} />
                            {item.status === "Invalid"
                              ? "Tidak Valid"
                              : user?.role === "mitra" && item.source === "KP"
                                ? "Dari KP"
                                : item.existingItemId
                                  ? "Masuk Kembali"
                                  : item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <X className="size-4" />
                            <span className="sr-only">Hapus item</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Button
              className="w-full gap-2 sm:w-auto"
              size="lg"
              onClick={handleValidateAll}
              disabled={barangMasuk.length === 0 || isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan Semua
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
