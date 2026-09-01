import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { BarangUnit } from "@/types/inventory";

const getBaseUrl = () => {
  const baseUrl = (import.meta as any).env.URL || (import.meta as any).env.VITE_URL || "http://172.168.9.139:3000/";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getHeaders = () => {
  const token = localStorage.getItem("taslim-auth-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `${token}`;
  }
  return headers;
};

export interface PartnerSummary {
  id: string;
  name: string;
  totalAssigned: number;
  verifiedCount: number;
  pendingCount: number;
  compliancePct: number;
  status: "complete" | "partial" | "none";
}

export interface ReconItemDetail extends BarangUnit {
  isVerified: boolean;
  verifiedAt?: string;
  proofImageUrl?: string;
  geotag?: { lat: number; lng: number };
}

export const useLaporanReconLogic = () => {
  const [items, setItems] = useState<BarangUnit[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "verified" | "pending">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Modal Detail Bukti Foto
  const [viewingProof, setViewingProof] = useState<{
    isOpen: boolean;
    item: ReconItemDetail | null;
  }>({
    isOpen: false,
    item: null,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, usersRes] = await Promise.all([
        fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() }),
        fetch(`${getBaseUrl()}/users`, { method: "GET", headers: getHeaders() }).catch(() => null),
      ]);

      let rawPartners: { id: string; name: string }[] = [];
      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json();
        const userList = Array.isArray(usersJson.data) ? usersJson.data : (Array.isArray(usersJson) ? usersJson : []);
        rawPartners = userList
          .filter((u: any) => (u.role || "").toUpperCase() === "MITRA")
          .map((u: any) => ({
            id: u.id || u._id,
            name: u.displayName || u.name || u.username,
          }));
      }

      if (!itemsRes.ok) throw new Error("Gagal mengambil data barang");
      const itemsJson = await itemsRes.json();
      const rawItems: BarangUnit[] = Array.isArray(itemsJson.data)
        ? itemsJson.data
        : Array.isArray(itemsJson)
        ? itemsJson
        : [];

      // Extract unique partner names from items if users API doesn't list all
      const partnersFromItems = Array.from(
        new Set(
          rawItems
            .map((i) => i.mitra)
            .filter((m): m is string => Boolean(m && m.toLowerCase() !== "admin" && m.toLowerCase() !== "gudang kp"))
        )
      ).map((name) => ({ id: name, name }));

      const combinedPartnersMap = new Map<string, { id: string; name: string }>();
      rawPartners.forEach((p) => combinedPartnersMap.set(p.name.toLowerCase(), p));
      partnersFromItems.forEach((p) => {
        if (!combinedPartnersMap.has(p.name.toLowerCase())) {
          combinedPartnersMap.set(p.name.toLowerCase(), p);
        }
      });

      setPartners(Array.from(combinedPartnersMap.values()));
      setItems(rawItems);
    } catch (err: any) {
      console.error("Error loading recon report data:", err);
      toast.error(err.message || "Gagal memuat laporan rekonsiliasi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate local & server recon proofs
  const reconProofsMap = useMemo(() => {
    const map: Record<string, { imageUrl: string; timestamp: string; geotag?: { lat: number; lng: number } }> = {};

    // Check localStorage for all recon records matching selectedDate
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("taslim_recon_") && key.endsWith(`_${selectedDate}`)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            Object.assign(map, parsed);
          }
        }
      }
    } catch (e) {
      console.warn("Could not read localStorage for recon proofs:", e);
    }

    return map;
  }, [selectedDate]);

  // Items currently assigned to partners
  const partnerItems = useMemo(() => {
    return items.filter((item) => {
      const isWithPartner =
        item.mitra &&
        item.mitra.toLowerCase() !== "admin" &&
        item.mitra.toLowerCase() !== "gudang kp" &&
        item.mitra.toLowerCase() !== "keluar" &&
        String(item.status).toLowerCase() !== "keluar";
      return Boolean(isWithPartner);
    });
  }, [items]);

  // Detailed items with recon status
  const detailedItems: ReconItemDetail[] = useMemo(() => {
    return partnerItems.map((item) => {
      const proof = reconProofsMap[item.id] || reconProofsMap[item.serialNumber];
      const isVerified = Boolean(proof || (item as any).isReconVerified);

      return {
        ...item,
        isVerified,
        verifiedAt: proof?.timestamp,
        proofImageUrl: proof?.imageUrl,
        geotag: proof?.geotag,
      };
    });
  }, [partnerItems, reconProofsMap]);

  // Summary per partner
  const partnerSummaries: PartnerSummary[] = useMemo(() => {
    return partners.map((partner) => {
      const assigned = detailedItems.filter(
        (i) => (i.mitra || "").toLowerCase() === partner.name.toLowerCase()
      );
      const verified = assigned.filter((i) => i.isVerified).length;
      const total = assigned.length;
      const pending = Math.max(0, total - verified);
      const compliancePct = total > 0 ? Math.round((verified / total) * 100) : 100;

      let status: "complete" | "partial" | "none" = "none";
      if (total > 0 && verified === total) status = "complete";
      else if (verified > 0) status = "partial";

      return {
        id: partner.id,
        name: partner.name,
        totalAssigned: total,
        verifiedCount: verified,
        pendingCount: pending,
        compliancePct,
        status,
      };
    });
  }, [partners, detailedItems]);

  // Filtered detailed items
  const filteredItems = useMemo(() => {
    return detailedItems.filter((item) => {
      // Filter Partner
      if (selectedPartner !== "all" && (item.mitra || "").toLowerCase() !== selectedPartner.toLowerCase()) {
        return false;
      }

      // Filter Status
      if (selectedStatus === "verified" && !item.isVerified) return false;
      if (selectedStatus === "pending" && item.isVerified) return false;

      // Filter Category
      if (selectedCategory !== "all" && (item.kategori || "").toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSN = item.serialNumber.toLowerCase().includes(q);
        const matchMerek = (item.merek || "").toLowerCase().includes(q);
        const matchTipe = (item.tipe || "").toLowerCase().includes(q);
        const matchMitra = (item.mitra || "").toLowerCase().includes(q);
        if (!matchSN && !matchMerek && !matchTipe && !matchMitra) return false;
      }

      return true;
    });
  }, [detailedItems, selectedPartner, selectedStatus, selectedCategory, searchQuery]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const totalAssigned = detailedItems.length;
    const totalVerified = detailedItems.filter((i) => i.isVerified).length;
    const totalPending = totalAssigned - totalVerified;
    const overallCompliance = totalAssigned > 0 ? Math.round((totalVerified / totalAssigned) * 100) : 100;
    const completePartnersCount = partnerSummaries.filter((p) => p.totalAssigned > 0 && p.status === "complete").length;
    const activePartnersCount = partnerSummaries.filter((p) => p.totalAssigned > 0).length;

    return {
      totalAssigned,
      totalVerified,
      totalPending,
      overallCompliance,
      completePartnersCount,
      activePartnersCount,
    };
  }, [detailedItems, partnerSummaries]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    partnerItems.forEach((i) => {
      if (i.kategori) set.add(i.kategori);
    });
    return Array.from(set);
  }, [partnerItems]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = ["No", "Serial Number", "Kategori", "Merek", "Tipe", "Mitra Penanggung Jawab", "Status Recon", "Waktu Verifikasi"];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      `"${item.serialNumber}"`,
      `"${item.kategori || "-"}"`,
      `"${item.merek || "-"}"`,
      `"${item.tipe || "-"}"`,
      `"${item.mitra || "-"}"`,
      `"${item.isVerified ? "TERVERIFIKASI" : "BELUM RECON / SELISIH"}"`,
      `"${item.verifiedAt || "-"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Recon_Mitra_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Berhasil mengekspor Laporan Recon ke CSV!");
  };

  return {
    items,
    partners,
    isLoading,
    selectedPartner,
    setSelectedPartner,
    selectedStatus,
    setSelectedStatus,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    viewingProof,
    setViewingProof,
    partnerSummaries,
    filteredItems,
    overallStats,
    categories,
    loadData,
    handleExportCSV,
  };
};
