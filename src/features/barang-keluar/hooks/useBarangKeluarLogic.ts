import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { InventoryItem, LokasiOption, KodeBarangUpdate } from "@/types/inventory";
import type { Partner } from "@/types/partner";
import { useOutboundSession } from "./useOutboundSession";
import {
  normalizeKodeBarang,
  isOutsideStatus,
  findOlderFifoItem,
  getQueuedSerialNumbers,
  getFifoToastDescription,
  normalizeOwner,
  compareFifoItems,
} from "../utils/fifoChecker";

const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
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

export const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
};

export const useBarangKeluarLogic = () => {
  const { user } = useAuth();
  const session = useOutboundSession();

  const [kodeBarang, setKodeBarang] = useState("");
  const [kuota, setKuota] = useState<Record<string, number>>({});
  const [destinationType, setDestinationType] = useState<"PA" | "MITRA">("PA");
  const inputRef = useRef<HTMLInputElement>(null);
  const kodeBarangRef = useRef("");
  const [dbItems, setDbItems] = useState<InventoryItem[]>([]);
  const [dbPartners, setDbPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [ticketGangguan, setTicketGangguan] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchItemsAndLocations = async () => {
      try {
        const resItems = await fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() });
        const rawItems = await resItems.json();
        const items: InventoryItem[] = Array.isArray(rawItems.data || rawItems) ? (rawItems.data || rawItems) : [];
        setDbItems(
          user?.role === "mitra"
            ? items.filter((item) => {
              if (!item.mitra) return false;
              const itemMitra = item.mitra.trim().toLowerCase();
              return (
                itemMitra === user.displayName.trim().toLowerCase() ||
                itemMitra === user.username.trim().toLowerCase() ||
                (user.identityCode &&
                  itemMitra.includes(user.identityCode.trim().toLowerCase()))
              );
            })
            : items
        );

        if (user?.role === "mitra") {
          setDbPartners([]);
          setSelectedPartnerId("");
        } else {
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
          const activePartners = partners.filter((partner) => partner.isActive);
          setDbPartners(activePartners);
          if (activePartners.length === 1) {
            setSelectedPartnerId(activePartners[0].id);
          }
        }

        const resLoc = await fetch(`${getBaseUrl()}/locations`, { method: "GET", headers: getHeaders() });
        const rawLoc = await resLoc.json();
        const locationsData = rawLoc.data || rawLoc;
        const newKuota: Record<string, number> = {};
        const locationOwner = user?.role === "mitra" ? user.displayName : "KP Tasikmalaya";

        (Array.isArray(locationsData) ? locationsData : []).forEach((loc: any) => {
          if (loc.name === "Keluar" || loc.name === "Diluar") return;
          if ((loc.owner || "KP Tasikmalaya").trim().toLowerCase() !== locationOwner.trim().toLowerCase()) {
            return;
          }

          if (loc.type === "Rak" && loc.levels) {
            loc.levels.forEach((lvl: any) => {
              const name = `${loc.name} - ${lvl.name}`;
              const actualUsed = (Array.isArray(items) ? items : []).filter((item: any) => {
                if (!item.lokasiPenyimpanan) return false;
                const st = (item.status || "").trim().toLowerCase();
                return item.lokasiPenyimpanan.trim() === name.trim() && st !== "diluar" && st !== "keluar" && st !== "terdistribusi";
              }).length;
              newKuota[name] = Math.max(0, lvl.capacity - actualUsed);
            });
          } else {
            const actualUsed = (Array.isArray(items) ? items : []).filter((item: any) => {
              if (!item.lokasiPenyimpanan) return false;
              const st = (item.status || "").trim().toLowerCase();
              return item.lokasiPenyimpanan.trim() === loc.name.trim() && st !== "diluar" && st !== "keluar" && st !== "terdistribusi";
            }).length;
            newKuota[loc.name] = Math.max(0, (loc.capacity || 0) - actualUsed);
          }
        });
        setKuota(newKuota);
      } catch (error) {
        console.error("Gagal mengambil data dari server:", error);
        toast.error("Gagal memuat data barang keluar.");
      }
    };
    fetchItemsAndLocations();
  }, [user]);

  const updateKodeBarang = useCallback((value: KodeBarangUpdate) => {
    const nextValue = typeof value === "function" ? value(kodeBarangRef.current) : value;
    kodeBarangRef.current = nextValue;
    setKodeBarang(nextValue);
  }, []);

  const focusKodeBarangInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (kodeOverride: any = kodeBarang) => {
    let codeStr = kodeBarang;
    if (typeof kodeOverride === "string") {
      codeStr = kodeOverride;
    } else if (Array.isArray(kodeOverride) && kodeOverride.length > 0) {
      codeStr = kodeOverride[0];
    }
    const trimmedKode = codeStr.trim();
    if (!trimmedKode) return { success: false, message: "Kode barang kosong" };

    const isUserMitra = user?.role?.toLowerCase() === "mitra";
    const selectedPartner = isUserMitra
      ? null 
      : dbPartners.find((partner) => partner.id === selectedPartnerId);

    const targetMitraName = isUserMitra
      ? user.displayName 
      : selectedPartner?.name;

    if (!targetMitraName && !isUserMitra) {
      toast.error("Pilih mitra tujuan sebelum menambahkan barang keluar.");
      focusKodeBarangInput();
      return { success: false, message: "Pilih mitra tujuan" };
    }

    if (isUserMitra && !keterangan.trim()) {
      toast.error("PA / keterangan wajib diisi sebelum menambahkan barang keluar.");
      focusKodeBarangInput();
      return { success: false, message: "PA/keterangan wajib diisi" };
    }

    const isDuplicate = session.barangKeluar.some(
      (item) => normalizeKodeBarang(item.nomor) === normalizeKodeBarang(trimmedKode)
    );

    if (isDuplicate) {
      toast.error("Serial number sudah ada di sesi ini.", { description: trimmedKode });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: "Sudah ada di sesi ini" };
    }

    const matchedItem = dbItems.find(
      (item) => normalizeKodeBarang(item.serialNumber) === normalizeKodeBarang(trimmedKode)
    );

    if (!matchedItem) {
      toast.error("Data serial number tidak ditemukan.", { description: trimmedKode });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: "Serial number tidak ditemukan" };
    }

    if (isOutsideStatus(matchedItem.status, user?.role)) {
      toast.error("Barang ini sudah berada di luar dan tidak dapat dikeluarkan kembali.", {
        description: `Status saat ini: ${matchedItem.status}`,
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: "Barang sudah di luar" };
    }

    // FIFO ditiadakan untuk Mitra karena mereka bekerja di lapangan
    const olderFifoItem = (user?.role?.toLowerCase() === "mitra") 
      ? null 
      : findOlderFifoItem(dbItems, matchedItem, getQueuedSerialNumbers(session.barangKeluar), user?.role);

    if (olderFifoItem) {
      toast.error("FIFO aktif: keluarkan barang yang lebih lama terlebih dahulu.", {
        description: getFifoToastDescription(olderFifoItem),
      });
      updateKodeBarang("");
      focusKodeBarangInput();
      return { success: false, message: "FIFO aktif" };
    }

    const originalLoc = matchedItem.lokasiPenyimpanan || "-";

    session.addItem({
      id: Date.now(),
      nomor: trimmedKode,
      merek: matchedItem.merek || "-",
      kategori: matchedItem.kategori || "-",
      tipe: matchedItem.tipe || undefined,
      lokasi: originalLoc as LokasiOption,
      mitra: targetMitraName || "",
      keterangan: user?.role?.toLowerCase() === "mitra" ? keterangan.trim() : "",
      ticketGangguan: (user?.role?.toLowerCase() === "mitra" && (user as any)?.partnerType === "GANGGUAN") || (selectedPartner?.partnerType === "GANGGUAN") ? ticketGangguan.trim() : undefined,
      status: "Valid",
    });

    setKuota((current) => ({
      ...current,
      [originalLoc]: (current[originalLoc as LokasiOption] || 0) + 1,
    }));

    updateKodeBarang("");
    focusKodeBarangInput();
    return { success: true };
  }, [
    session, dbItems, dbPartners, focusKodeBarangInput, kodeBarang, keterangan,
    selectedPartnerId, updateKodeBarang, user
  ]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return;
      }
      const isSupportedKey = event.key.length === 1 || event.key === "Backspace" || event.key === "Enter";
      if (!isSupportedKey || isTextInputTarget(event.target)) {
        return;
      }
      if (document.querySelector("[data-slot='select-content']")) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();

      if (event.key === "Enter") {
        handleSubmit(kodeBarangRef.current);
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
    const itemToDelete = session.barangKeluar.find((item) => item.id === id);
    if (itemToDelete) {
      setKuota((current) => ({
        ...current,
        [itemToDelete.lokasi]: (current[itemToDelete.lokasi] || 0) - 1,
      }));
    }
    session.deleteItem(id);
  };

  const handleValidateAll = async () => {
    if (isSaving) return;
    if (user?.role === "mitra" && !keterangan.trim()) {
      toast.error("PA / keterangan wajib diisi sebelum transaksi disimpan.");
      return;
    }

    setIsSaving(true);
    try {
      const sessionDate = new Date().toISOString().slice(0, 10);
      const dateStr = sessionDate.replace(/-/g, "");

      const resTrx = await fetch(`${getBaseUrl()}/transactions`, { method: "GET", headers: getHeaders() });
      const rawTrx = await resTrx.json();
      const txs = rawTrx.data || rawTrx;
      const prefix = `OUT-${dateStr}-`;
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

      const latestVisibleItems = user?.role === "mitra"
        ? latestItems.filter((item) => {
          if (!item.mitra) return false
          const itemMitra = normalizeOwner(item.mitra)
          return (
            itemMitra === normalizeOwner(user.displayName) ||
            itemMitra === normalizeOwner(user.username) ||
            (user.identityCode && itemMitra.includes(normalizeOwner(user.identityCode)))
          )
        })
        : latestItems;

      const findLatestSessionItem = (nomor: string) =>
        latestVisibleItems.find((dbItem) => normalizeKodeBarang(dbItem.serialNumber) === normalizeKodeBarang(nomor));

      const invalidItem = session.barangKeluar.find((item) => {
        const latestItem = findLatestSessionItem(item.nomor);
        return !latestItem || isOutsideStatus(latestItem.status, user?.role);
      });

      if (invalidItem) {
        const latestItem = findLatestSessionItem(invalidItem.nomor);
        toast.error(
          latestItem
            ? "Barang yang sudah berada di luar tidak dapat dikeluarkan kembali."
            : "Data barang tidak lagi ditemukan di data master.",
          { description: invalidItem.nomor }
        );
        setDbItems(latestVisibleItems);
        setIsSaving(false);
        return;
      }

      const queuedSerialNumbers = getQueuedSerialNumbers(session.barangKeluar);
      const fifoInvalidItem = (user?.role?.toLowerCase() === "mitra") 
        ? undefined 
        : session.barangKeluar.find((item) => {
            const latestItem = findLatestSessionItem(item.nomor);
            return latestItem ? Boolean(findOlderFifoItem(latestVisibleItems, latestItem, queuedSerialNumbers, user?.role)) : false;
          });

      if (fifoInvalidItem) {
        const latestItem = findLatestSessionItem(fifoInvalidItem.nomor);
        const olderFifoItem = latestItem ? findOlderFifoItem(latestVisibleItems, latestItem, queuedSerialNumbers, user?.role) : undefined;
        toast.error("FIFO aktif: masih ada barang lama yang harus keluar lebih dulu.", {
          description: olderFifoItem ? getFifoToastDescription(olderFifoItem) : fifoInvalidItem.nomor,
        });
        setDbItems(latestVisibleItems);
        setIsSaving(false);
        return;
      }

      const fifoSortedBarangKeluar = [...session.barangKeluar].sort((a, b) => {
        const itemA = findLatestSessionItem(a.nomor);
        const itemB = findLatestSessionItem(b.nomor);
        if (!itemA || !itemB) return 0;
        return compareFifoItems(itemA, itemB);
      });

      for (const item of fifoSortedBarangKeluar) {
        const originalItem = findLatestSessionItem(item.nomor)!;
        const originalLoc = originalItem.lokasiPenyimpanan || "-";
        const isMitraRole = user?.role === "mitra";
        const newStatus = isMitraRole ? "Digunakan" : "Terdistribusi";
        const newLocation = isMitraRole ? "Digunakan" : (item.mitra || "Terdistribusi");

        const updatedItem: InventoryItem = {
          ...originalItem,
          status: newStatus,
          lokasiPenyimpanan: newLocation,
          tanggalKeluar: sessionDate,
          mitra: item.mitra || originalItem.mitra,
        };
        const resUp = await fetch(`${getBaseUrl()}/items/${updatedItem.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(updatedItem),
        });
        if (!resUp.ok) throw new Error(`Gagal update item ${item.nomor}`);

        const newTransaction = {
          id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tanggal: sessionDate,
          nomor: sessionNomor,
          kategori: "Keluar",
          status: "Selesai",
          sn: item.nomor,
          merek: item.merek,
          asal: originalLoc,
          tujuan: item.mitra,
          mitra: item.mitra,
          keterangan: item.ticketGangguan
            ? `${item.keterangan ? item.keterangan + " | " : ""}Tiket Gangguan: ${item.ticketGangguan}`
            : (item.keterangan || null),
        };
        const resAddTrx = await fetch(`${getBaseUrl()}/transactions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(newTransaction),
        });
        if (!resAddTrx.ok) throw new Error(`Gagal mencatat transaksi ${item.nomor}`);
      }

      toast.success(`${session.barangKeluar.length} barang keluar berhasil disimpan.`);

      if (user?.role === "mitra" && session.barangKeluar.length > 0) {
        const notificationId = `permintaan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const requestCount = session.barangKeluar.length;
        const title = `Permintaan barang mitra ${user.displayName}`;
        const message = `${user.displayName} mengajukan permintaan ${requestCount} barang keluar.${keterangan ? ` Keterangan: ${keterangan}` : ""}`;

        try {
          await fetch(`${getBaseUrl()}/notifications`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              userId: user.id,
              title,
              message,
              type: "REQUEST",
              referenceId: notificationId
            })
          });
        } catch (notificationError) {
          console.error("Gagal membuat notifikasi permintaan:", notificationError);
        }
      }

      // Update local dbItems to match changes
      const isMitraRole = user?.role === "mitra";
      const newStatus = isMitraRole ? "Digunakan" : "Terdistribusi";
      const newLocation = isMitraRole ? "Digunakan" : "Terdistribusi";
      const updatedVisibleItems = latestVisibleItems.map(item => {
        if (queuedSerialNumbers.has(normalizeKodeBarang(item.serialNumber))) {
          return { ...item, status: newStatus, lokasiPenyimpanan: newLocation };
        }
        return item;
      });
      setDbItems(updatedVisibleItems);
      session.clearSession();
      setKeterangan("");
      setTicketGangguan("");

      // Emit event jika menggunakan Tauri
      if ((window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("update_inventory_count");
        } catch (e) {
          console.error("Gagal mengirim event update_inventory_count", e);
        }
      }
    } catch (error) {
      console.error("Gagal menyimpan sesi barang keluar:", error);
      toast.error("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    user,
    session,
    kodeBarang,
    kuota,
    inputRef,
    kodeBarangRef,
    dbItems,
    dbPartners,
    selectedPartnerId,
    setSelectedPartnerId,
    keterangan,
    setKeterangan,
    ticketGangguan,
    setTicketGangguan,
    isSaving,
    updateKodeBarang,
    focusKodeBarangInput,
    handleSubmit,
    handleDeleteItem,
    handleValidateAll,
    destinationType,
    setDestinationType,
  };
};
