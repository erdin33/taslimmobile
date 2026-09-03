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

export interface PartnerHistorySummary {
  date: string;
  totalAssigned: number;
  verifiedCount: number;
  pendingCount: number;
  compliancePct: number;
  status: "complete" | "partial" | "none";
  items: ReconItemDetail[];
}

export interface PartnerWithHistory extends PartnerSummary {
  history: PartnerHistorySummary[];
}

export const useLaporanReconLogic = () => {
  const [items, setItems] = useState<BarangUnit[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverReconProofs, setServerReconProofs] = useState<Record<string, Record<string, { imageUrl: string; timestamp: string; geotag?: { lat: number; lng: number } }>>>({});

  // Generate last 7 dates
  const recentDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });
  }, []);

  // Filters
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
            .filter((m): m is string => {
              if (!m) return false;
              const l = m.trim().toLowerCase();
              return l !== "" && l !== "-" && !l.includes("admin") && !l.includes("gudang") && !l.includes("kp tasikmalaya") && l !== "kp";
            })
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

  useEffect(() => {
    const fetchReconProgress = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/recon-progress`, {
          method: "GET",
          headers: getHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          const progressList = Array.isArray(json.data) ? json.data : [];
          const map: Record<string, Record<string, any>> = {};
          
          progressList.forEach((p: any) => {
            if (p.itemId && p.date) {
              if (!map[p.date]) map[p.date] = {};
              map[p.date][p.itemId] = {
                imageUrl: p.imageUrl,
                timestamp: p.timestamp,
                geotag: p.geotag
              };
            }
          });
          setServerReconProofs(map);
        }
      } catch (err) {
        console.error("Failed fetching recon progress", err);
      }
    };
    fetchReconProgress();
  }, []);

  // Aggregate server recon proofs
  const reconProofsMap = useMemo(() => {
    return { ...serverReconProofs };
  }, [serverReconProofs]);

  // Items currently assigned to partners
  const partnerItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.mitra || String(item.status).toLowerCase() === "keluar") return false;
      const mitraNameLower = item.mitra.trim().toLowerCase();
      return partners.some((p) => p.name.toLowerCase() === mitraNameLower);
    });
  }, [items, partners]);

  const partnerHistoryData: PartnerWithHistory[] = useMemo(() => {
    let filteredPartners = partners;
    if (selectedPartner !== "all") {
      filteredPartners = partners.filter((p) => p.name.toLowerCase() === selectedPartner.toLowerCase());
    }

    return filteredPartners.map((partner) => {
      // Base items for this partner
      const assignedBase = partnerItems.filter(
        (i) => (i.mitra || "").toLowerCase() === partner.name.toLowerCase()
      );

      const history: PartnerHistorySummary[] = recentDates.map((date) => {
        const proofsForDate = reconProofsMap[date] || {};
        
        // Detail items for this date
        const dateItems: ReconItemDetail[] = assignedBase.map((item) => {
          const proof = proofsForDate[item.id] || proofsForDate[item.serialNumber];
          const isVerified = Boolean(proof); 
          
          return {
            ...item,
            isVerified,
            verifiedAt: proof?.timestamp,
            proofImageUrl: proof?.imageUrl,
            geotag: proof?.geotag,
          };
        });

        // Filter search query
        const filteredDateItems = dateItems.filter((item) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchSN = item.serialNumber.toLowerCase().includes(q);
            const matchMerek = (item.merek || "").toLowerCase().includes(q);
            const matchTipe = (item.tipe || "").toLowerCase().includes(q);
            return matchSN || matchMerek || matchTipe;
          }
          return true;
        });

        const verifiedCount = filteredDateItems.filter((i) => i.isVerified).length;
        const total = filteredDateItems.length;
        const pendingCount = Math.max(0, total - verifiedCount);
        const compliancePct = total > 0 ? Math.round((verifiedCount / total) * 100) : 100;
        let status: "complete" | "partial" | "none" = "none";
        if (total > 0 && verifiedCount === total) status = "complete";
        else if (verifiedCount > 0) status = "partial";

        return {
          date,
          totalAssigned: total,
          verifiedCount,
          pendingCount,
          compliancePct,
          status,
          items: filteredDateItems,
        };
      });

      // Top level summary from the most recent date (today)
      const todaySummary = history[0];
      
      return {
        id: partner.id,
        name: partner.name,
        totalAssigned: todaySummary.totalAssigned,
        verifiedCount: todaySummary.verifiedCount,
        pendingCount: todaySummary.pendingCount,
        compliancePct: todaySummary.compliancePct,
        status: todaySummary.status,
        history,
      };
    });
  }, [partners, partnerItems, recentDates, reconProofsMap, searchQuery, selectedPartner]);

  // Overall Statistics for Today
  const overallStats = useMemo(() => {
    let totalAssigned = 0;
    let totalVerified = 0;
    let completePartnersCount = 0;
    let activePartnersCount = 0;

    partnerHistoryData.forEach((p) => {
      if (p.totalAssigned > 0) {
        activePartnersCount++;
        totalAssigned += p.totalAssigned;
        totalVerified += p.verifiedCount;
        if (p.status === "complete") completePartnersCount++;
      }
    });

    const totalPending = totalAssigned - totalVerified;
    const overallCompliance = totalAssigned > 0 ? Math.round((totalVerified / totalAssigned) * 100) : 100;

    return {
      totalAssigned,
      totalVerified,
      totalPending,
      overallCompliance,
      completePartnersCount,
      activePartnersCount,
    };
  }, [partnerHistoryData]);

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
    const allItemsToExport = partnerHistoryData.flatMap(p => 
      p.history[0].items // Export items for today by default, or all history? Let's just export today's status
    );

    if (allItemsToExport.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = ["No", "Serial Number", "Kategori", "Merek", "Tipe", "Mitra Penanggung Jawab", "Status Recon", "Waktu Verifikasi"];
    const rows = allItemsToExport.map((item, idx) => [
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
    link.setAttribute("download", `Laporan_Recon_Mitra_${recentDates[0]}.csv`);
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
    searchQuery,
    setSearchQuery,
    viewingProof,
    setViewingProof,
    partnerHistoryData,
    overallStats,
    categories,
    recentDates,
    loadData,
    handleExportCSV,
  };
};
