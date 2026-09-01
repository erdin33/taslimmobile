import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { invoke, isTauri } from "@tauri-apps/api/core";
import QRCode from "qrcode";
import type { StorageLocation } from "@/types/inventory";
import type { SheetMode } from "@/types/ui";

const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getHeaders = () => {
  const token = localStorage.getItem("taslim-auth-token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `${token}`;
  return headers;
};

export interface CategoryStat {
  name: string;
  count: number;
  pct: number;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const useLokasiBarangLogic = () => {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [brands, setBrands] = useState<string[]>(["Campuran"]);
  const [items, setItems] = useState<any[]>([]);
  const [sheetMode, setSheetMode] = useState<SheetMode>("closed");
  const [activeItem, setActiveItem] = useState<{ parentId?: string; levelId?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"rak" | "kardus" | "pallet">("rak");
  const [sortBy, setSortBy] = useState<"util-desc" | "util-asc" | "name">("name");

  // Form States
  const [locName, setLocName] = useState("");
  const [locCapacity, setLocCapacity] = useState("1");
  const [locBrand, setLocBrand] = useState("Campuran");
  const [locLevelsCount, setLocLevelsCount] = useState("3");
  const [levelName, setLevelName] = useState("");
  const [deleteAlertData, setDeleteAlertData] = useState<{
    isOpen: boolean; type: "location" | "level" | null; id: string; name: string;
  }>({ isOpen: false, type: null, id: "", name: "" });

  const [relocateDialog, setRelocateDialog] = useState<{
    isOpen: boolean;
    sourceLocation: string;
    sourceName: string;
  }>({
    isOpen: false,
    sourceLocation: "",
    sourceName: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRelocating, setIsRelocating] = useState(false);

  const loadLocationsAndItems = async () => {
    try {
      // Fetch locations, users (mitra), dan items secara paralel
      const [locRes, usersRes, itemsRes] = await Promise.all([
        fetch(`${getBaseUrl()}/locations`, { method: "GET", headers: getHeaders() }),
        fetch(`${getBaseUrl()}/users`, { method: "GET", headers: getHeaders() }).catch(() => null),
        fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() }).catch(() => null),
      ]);

      if (itemsRes && itemsRes.ok) {
        const itemsJson = await itemsRes.json();
        const rawItems = Array.isArray(itemsJson.data) ? itemsJson.data : (Array.isArray(itemsJson) ? itemsJson : []);
        setItems(rawItems);
      }

      if (!locRes.ok) throw new Error("Gagal mengambil data lokasi");
      const locJson = await locRes.json();
      const data: StorageLocation[] = locJson.data || locJson || [];

      // Ambil daftar nama mitra dari users API
      let mitraNames: Set<string> = new Set();
      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json();
        const users = usersJson.data || usersJson || [];
        users.forEach((u: any) => {
          const role = (u.role || "").toUpperCase();
          if (role === "MITRA") {
            const name = u.profile?.nama || u.profile?.name || u.name || u.nama || "";
            if (name) mitraNames.add(name.toLowerCase());
          }
        });
      }

      const ADMIN_LOCATION = "KP Tasikmalaya";
      const normalizeOwner = (owner?: string | null) => (owner || ADMIN_LOCATION).trim().toLowerCase();
      const kpOwner = normalizeOwner(ADMIN_LOCATION);

      setLocations(
        data.filter(
          (loc) => 
            loc.name !== "Keluar" && 
            loc.name !== "Diluar" &&
            (loc as any).type !== "Partner" &&
            (loc as any).type !== "PARTNER" &&
            (loc as any).type !== "Mitra" &&
            (loc as any).type !== "MITRA" &&
            !mitraNames.has(loc.name.toLowerCase()) &&
            !loc.name.toUpperCase().startsWith("PT ") &&
            !loc.name.toUpperCase().startsWith("PT.") &&
            (normalizeOwner((loc as any).owner) === kpOwner || normalizeOwner((loc as any).owner) === "kp")
        )
      );
    } catch (error) {
      toast.error("Gagal mengambil data lokasi dari server.");
    }
  };

  const loadBrands = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/brands`, { method: "GET", headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal mengambil data merek");
      const data = await res.json();
      const brandsList = data.data || data.brands || data || [];
      setBrands(["Campuran", ...brandsList.map((b: any) => b.nama || b.name)]);
    } catch (error) {
      setBrands(["Campuran", "Huawei", "ZTE", "Nokia", "FiberHome"]);
    }
  };

  useEffect(() => {
    loadLocationsAndItems();
    loadBrands();
  }, []);

  // Hitung Breakdown per Kategori Barang di Gudang KP
  const categoryStats: CategoryStat[] = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    let totalItemsInKp = 0;

    items.forEach((item) => {
      const status = (item.status || "").toLowerCase();
      const loc = (item.lokasiPenyimpanan || "").toLowerCase();
      
      // Hitung hanya barang yang berada di gudang KP (bukan keluar / di mitra)
      if (status !== "keluar" && status !== "diluar" && loc !== "keluar" && loc !== "diluar") {
        const rawCat = (item.kategori || item.category || "Lainnya").trim();
        const cat = rawCat ? rawCat.toUpperCase() : "LAINNYA";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalItemsInKp++;
      }
    });

    const COLOR_PALETTES: Record<string, { color: string; bgColor: string; borderColor: string; textColor: string }> = {
      ONT: { color: "bg-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-600 dark:text-blue-400" },
      KABEL: { color: "bg-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", textColor: "text-emerald-600 dark:text-emerald-400" },
      DROPCORE: { color: "bg-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", textColor: "text-emerald-600 dark:text-emerald-400" },
      STB: { color: "bg-violet-500", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", textColor: "text-violet-600 dark:text-violet-400" },
      ADAPTOR: { color: "bg-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", textColor: "text-amber-600 dark:text-amber-400" },
      ACCESSORIES: { color: "bg-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", textColor: "text-cyan-600 dark:text-cyan-400" },
      AKSESORIS: { color: "bg-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", textColor: "text-cyan-600 dark:text-cyan-400" },
    };

    const DEFAULT_COLORS = [
      { color: "bg-indigo-500", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", textColor: "text-indigo-600 dark:text-indigo-400" },
      { color: "bg-rose-500", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30", textColor: "text-rose-600 dark:text-rose-400" },
      { color: "bg-teal-500", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30", textColor: "text-teal-600 dark:text-teal-400" },
    ];

    const result: CategoryStat[] = Object.entries(categoryCounts).map(([catName, count], idx) => {
      const pct = totalItemsInKp > 0 ? Math.round((count / totalItemsInKp) * 100) : 0;
      const palette = COLOR_PALETTES[catName] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      return {
        name: catName,
        count,
        pct,
        ...palette,
      };
    });

    // Urutkan dari jumlah terbanyak
    return result.sort((a, b) => b.count - a.count);
  }, [items]);

  // Breakdown kategori per nama lokasi / level
  const locationCategoryMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    items.forEach((item) => {
      const loc = (item.lokasiPenyimpanan || "").trim();
      if (loc && loc.toLowerCase() !== "keluar" && loc.toLowerCase() !== "diluar") {
        if (!map[loc]) map[loc] = {};
        const cat = (item.kategori || "ONT").toUpperCase();
        map[loc][cat] = (map[loc][cat] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  const stats = useMemo(() => {
    let totalRak = 0, totalKardus = 0, totalPallet = 0, maxCapacity = 0, usedCapacity = 0;
    locations.forEach(loc => {
      if (loc.type === "Rak") {
        totalRak++;
        loc.levels?.forEach(lvl => { maxCapacity += lvl.capacity; usedCapacity += lvl.usedCapacity; });
      } else if (loc.type === "Pallet") {
        totalPallet++; maxCapacity += loc.capacity || 0; usedCapacity += loc.usedCapacity || 0;
      } else {
        totalKardus++; maxCapacity += loc.capacity || 0; usedCapacity += loc.usedCapacity || 0;
      }
    });
    const utilizationPct = maxCapacity > 0 ? Math.round((usedCapacity / maxCapacity) * 100) : 0;
    return { totalRak, totalKardus, totalPallet, maxCapacity, usedCapacity, utilizationPct, totalItemsInKp: items.length };
  }, [locations, items]);

  const filteredAndSortedLocations = useMemo(() => {
    let result = locations.filter(loc => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = loc.name.toLowerCase().includes(q) ||
        (loc.brandRule && loc.brandRule.toLowerCase().includes(q)) ||
        (loc.levels && loc.levels.some(l => l.name.toLowerCase().includes(q) || l.brandRule.toLowerCase().includes(q)));
        
      const matchesType =  loc.type.toLowerCase() === filterType;
      
      return matchesSearch && matchesType;
    });

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "util-desc" || sortBy === "util-asc") {
      const getUsagePct = (loc: StorageLocation) => {
        if (loc.type === "Rak") {
          let cap = 0, used = 0;
          loc.levels?.forEach(lvl => { cap += lvl.capacity; used += lvl.usedCapacity; });
          return cap > 0 ? (used / cap) : 0;
        } else {
          const cap = loc.capacity || 0;
          return cap > 0 ? ((loc.usedCapacity || 0) / cap) : 0;
        }
      };
      result = [...result].sort((a, b) => {
        const pctA = getUsagePct(a);
        const pctB = getUsagePct(b);
        return sortBy === "util-desc" ? pctB - pctA : pctA - pctB;
      });
    }
    return result;
  }, [locations, searchQuery, filterType, sortBy]);

  const handleOpenSheet = (mode: SheetMode, item?: { parentId?: string; levelId?: string }) => {
    setSheetMode(mode);
    setActiveItem(item || null);
    
    // Reset form states
    setLocName("");
    setLocCapacity("1");
    setLocBrand("Campuran");
    setLocLevelsCount("3");
    setLevelName("");

    if (item && item.parentId) {
      const loc = locations.find(l => l.id === item.parentId);
      if (loc) {
        if (mode === "edit-rak" || mode === "edit-kardus" || mode === "edit-pallet") {
          setLocName(loc.name);
          if (loc.type === "Kardus" || loc.type === "Pallet") {
            setLocCapacity(loc.capacity?.toString() || "0");
            setLocBrand(loc.brandRule || "Campuran");
          }
        } else if (mode === "edit-level" && item.levelId) {
          const lvl = loc.levels?.find(l => l.id === item.levelId);
          if (lvl) {
            setLevelName(lvl.name);
            setLocCapacity(lvl.capacity.toString());
            setLocBrand(lvl.brandRule || "Campuran");
          }
        }
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (sheetMode === "add-rak") {
        const payload = {
          name: locName || "Rak Baru",
          type: "Rak",
          levels: Array.from({ length: parseInt(locLevelsCount) || 1 }).map((_, i) => ({
            name: `Level ${i + 1}`,
            capacity: 0,
            brandRule: "Campuran"
          }))
        };
        const res = await fetch(`${getBaseUrl()}/locations`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || "Gagal menambahkan rak");
        }
      } else if (sheetMode === "add-kardus" || sheetMode === "add-pallet") {
        const typeMap = { "add-kardus": "Kardus", "add-pallet": "Pallet" };
        const defaultName = { "add-kardus": "Kardus Baru", "add-pallet": "Pallet Baru" };
        const payload = {
          name: locName || defaultName[sheetMode as keyof typeof defaultName],
          type: typeMap[sheetMode as keyof typeof typeMap],
          capacity: parseInt(locCapacity) || 0,
          brandRule: locBrand
        };
        const res = await fetch(`${getBaseUrl()}/locations`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || `Gagal menambahkan ${typeMap[sheetMode as keyof typeof typeMap].toLowerCase()}`);
        }
      } else if (sheetMode === "edit-rak" && activeItem?.parentId) {
        const res = await fetch(`${getBaseUrl()}/locations/${activeItem.parentId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ name: locName })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || "Gagal memperbarui rak");
        }
      } else if ((sheetMode === "edit-kardus" || sheetMode === "edit-pallet") && activeItem?.parentId) {
        const res = await fetch(`${getBaseUrl()}/locations/${activeItem.parentId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ name: locName, capacity: parseInt(locCapacity) || 0, brandRule: locBrand })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || "Gagal memperbarui lokasi");
        }
      } else if (sheetMode === "add-level" && activeItem?.parentId) {
        const res = await fetch(`${getBaseUrl()}/locations`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name: levelName || "Level Baru",
            type: "Kardus",
            parentId: activeItem.parentId,
            capacity: parseInt(locCapacity) || 0,
            brandRule: locBrand
          })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || "Gagal menambahkan level");
        }
      } else if (sheetMode === "edit-level" && activeItem?.parentId && activeItem?.levelId) {
        const res = await fetch(`${getBaseUrl()}/locations/${activeItem.levelId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ name: levelName, capacity: parseInt(locCapacity) || 0, brandRule: locBrand })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || "Gagal memperbarui level");
        }
      }
      await loadLocationsAndItems();
      toast.success(sheetMode?.startsWith("add-") ? "Berhasil menambahkan lokasi baru" : "Berhasil menyimpan perubahan");
      setSheetMode("closed");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan data lokasi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLocation = async (id: string) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const loc = locations.find(l => l.id === id);
      if (loc) {
        const res = await fetch(`${getBaseUrl()}/locations/${id}/toggle`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ isActive: !loc.isActive })
        });
        if (!res.ok) throw new Error("Gagal mengubah status lokasi");
        await loadLocationsAndItems();
        toast.success(`Berhasil ${!loc.isActive ? 'mengaktifkan' : 'menonaktifkan'} lokasi`);
      }
    } catch {
      toast.error("Gagal mengubah status lokasi");
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleLevel = async (rakId: string, levelId: string) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const loc = locations.find(l => l.id === rakId);
      const lvl = loc?.levels?.find(l => l.id === levelId);
      if (lvl) {
        const res = await fetch(`${getBaseUrl()}/locations/${levelId}/toggle`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ isActive: !lvl.isActive })
        });
        if (!res.ok) throw new Error("Gagal mengubah status level");
        await loadLocationsAndItems();
        toast.success(`Berhasil ${!lvl.isActive ? 'mengaktifkan' : 'menonaktifkan'} level`);
      }
    } catch {
      toast.error("Gagal mengubah status level");
    } finally {
      setIsToggling(false);
    }
  };

  const requestDeleteLocation = (id: string, name: string) => setDeleteAlertData({ isOpen: true, type: "location", id, name });
  const requestDeleteLevel = (levelId: string, name: string) => setDeleteAlertData({ isOpen: true, type: "level", id: levelId, name });

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    const { type, id } = deleteAlertData;
    if (!type || !id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${getBaseUrl()}/locations/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal menghapus");
      await loadLocationsAndItems();
      toast.success(`Berhasil menghapus ${type === "location" ? "lokasi" : "level"}`);
      setDeleteAlertData({ isOpen: false, type: null, id: "", name: "" });
    } catch {
      toast.error("Gagal menghapus data");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadQrCode = async (url: string | null | undefined, locationName: string) => {
    if (!url) {
      toast.error("Link spreadsheet belum tersedia untuk lokasi ini.");
      return;
    }
    try {
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
      const img = new Image();
      img.src = qrDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 340;
      canvas.height = 380;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 340, 380);
      ctx.drawImage(img, 20, 20, 300, 300);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(locationName, 170, 345);
      const downloadUrl = canvas.toDataURL("image/png");
      const filename = `${locationName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;

      if (isTauri()) {
        const base64Data = downloadUrl.replace(/^data:image\/png;base64,/, "");
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const savedPath = await invoke<string>("save_taslim_file", { subfolder: "qr", filename, data: Array.from(bytes) });
        toast.success(`Berhasil menyimpan QR Code ke folder ${savedPath}`);
      } else {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Berhasil menyimpan QR Code untuk ${locationName}`);
      }
    } catch {
      toast.error("Terjadi kesalahan saat membuat QR Code.");
    }
  };

  const availableTargetLocations = useMemo(() => {
    const list: { id: string; name: string; type: string; availableCapacity: number; maxCapacity: number; usedCapacity: number }[] = [];
    locations.forEach((loc) => {
      if (loc.type === "Rak") {
        loc.levels?.forEach((lvl) => {
          list.push({
            id: lvl.id,
            name: `${loc.name} - ${lvl.name}`,
            type: "Rak",
            availableCapacity: Math.max(0, lvl.capacity - lvl.usedCapacity),
            maxCapacity: lvl.capacity,
            usedCapacity: lvl.usedCapacity,
          });
        });
      } else {
        list.push({
          id: loc.id,
          name: loc.name,
          type: loc.type,
          availableCapacity: Math.max(0, (loc.capacity || 0) - (loc.usedCapacity || 0)),
          maxCapacity: loc.capacity || 0,
          usedCapacity: loc.usedCapacity || 0,
        });
      }
    });
    return list;
  }, [locations]);

  const handleRelocateItems = async (
    sourceLocation: string,
    targetLocation: string,
    selectedCategory?: string,
    selectedCount?: number
  ) => {
    if (isRelocating) return;
    if (!targetLocation) {
      toast.error("Pilih lokasi tujuan terlebih dahulu.");
      return;
    }
    if (sourceLocation.toLowerCase() === targetLocation.toLowerCase()) {
      toast.error("Lokasi asal dan tujuan tidak boleh sama.");
      return;
    }

    setIsRelocating(true);
    try {
      let itemsInSource = items.filter(
        (i) =>
          (i.lokasiPenyimpanan || "").trim().toLowerCase() === sourceLocation.trim().toLowerCase()
      );

      if (selectedCategory && selectedCategory !== "ALL") {
        itemsInSource = itemsInSource.filter(
          (i) => (i.kategori || "").toUpperCase() === selectedCategory.toUpperCase()
        );
      }

      if (selectedCount && selectedCount > 0 && selectedCount < itemsInSource.length) {
        itemsInSource = itemsInSource.slice(0, selectedCount);
      }

      if (itemsInSource.length === 0) {
        toast.error("Tidak ada barang yang dapat dipindahkan dari lokasi ini.");
        setIsRelocating(false);
        return;
      }

      const promises = itemsInSource.map(async (item) => {
        const payload = {
          ...item,
          lokasiPenyimpanan: targetLocation.trim(),
        };
        const res = await fetch(`${getBaseUrl()}/items/${item.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`Gagal memindahkan unit ${item.serialNumber}`);
        }
        return res;
      });

      await Promise.all(promises);
      await loadLocationsAndItems();
      toast.success(`Berhasil memindahkan ${itemsInSource.length} unit ke ${targetLocation}`);
      setRelocateDialog({ isOpen: false, sourceLocation: "", sourceName: "" });
    } catch (err: any) {
      toast.error(err.message || "Gagal memindahkan barang ke lokasi baru.");
    } finally {
      setIsRelocating(false);
    }
  };

  return {
    locations, brands, items, categoryStats, locationCategoryMap, sheetMode, setSheetMode, activeItem,
    searchQuery, setSearchQuery, filterType, setFilterType, sortBy, setSortBy,
    locName, setLocName, locCapacity, setLocCapacity, locBrand, setLocBrand,
    locLevelsCount, setLocLevelsCount, levelName, setLevelName,
    deleteAlertData, setDeleteAlertData, isSaving, isDeleting, isToggling,
    relocateDialog, setRelocateDialog, isRelocating, availableTargetLocations, handleRelocateItems,
    stats, filteredAndSortedLocations, handleOpenSheet, handleSave,
    handleToggleLocation, handleToggleLevel, requestDeleteLocation, requestDeleteLevel,
    confirmDelete, handleDownloadQrCode
  };
};
