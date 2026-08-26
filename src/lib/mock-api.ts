/**
 * ============================================================
 *  MOCK API — Development Only
 *  Aktif saat VITE_DEV_BYPASS_AUTH=true di .env
 *
 *  Semua data disimpan di localStorage dengan prefix "mock_".
 *  Intercept window.fetch dan return response palsu sesuai
 *  endpoint yang dipanggil aplikasi.
 * ============================================================
 */

// ─── Storage helpers ────────────────────────────────────────

function store<T>(key: string, data: T): void {
  localStorage.setItem(`mock_${key}`, JSON.stringify(data));
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`mock_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Seed data ───────────────────────────────────────────────

function seedIfEmpty() {
  // Categories
  if (!localStorage.getItem("mock_categories")) {
    store("categories", [
      { id: "cat-1", nama: "Router", name: "Router", description: "Perangkat jaringan router", totalItems: 3, safetyStock: 5 },
      { id: "cat-2", nama: "Switch", name: "Switch", description: "Perangkat switch jaringan", totalItems: 2, safetyStock: 3 },
      { id: "cat-3", nama: "ODP", name: "ODP", description: "Optical Distribution Point", totalItems: 4, safetyStock: 10 },
      { id: "cat-4", nama: "ONT", name: "ONT", description: "Optical Network Terminal", totalItems: 5, safetyStock: 8 },
      { id: "cat-5", nama: "Kabel Fiber", name: "Kabel Fiber", description: "Kabel serat optik", totalItems: 2, safetyStock: 20 },
    ]);
  }

  // Brands / Merek
  if (!localStorage.getItem("mock_brands")) {
    store("brands", [
      { id: "br-1", nama: "Huawei", identifier: "HW", origin: "China", totalItems: 5 },
      { id: "br-2", nama: "Cisco", identifier: "CS", origin: "USA", totalItems: 3 },
      { id: "br-3", nama: "TP-Link", identifier: "TP", origin: "China", totalItems: 4 },
      { id: "br-4", nama: "ZTE", identifier: "ZTE", origin: "China", totalItems: 2 },
      { id: "br-5", nama: "Fiberhome", identifier: "FH", origin: "China", totalItems: 1 },
    ]);
  }

  // Material models / Tipe
  if (!localStorage.getItem("mock_material-models")) {
    store("material-models", [
      { id: 1, nama: "EG8145V5", materialCategoryId: 4, brandId: 1, materialCategory: { id: 4, nama: "ONT" }, brand: { id: 1, nama: "Huawei" } },
      { id: 2, nama: "HG8245H5", materialCategoryId: 4, brandId: 1, materialCategory: { id: 4, nama: "ONT" }, brand: { id: 1, nama: "Huawei" } },
      { id: 3, nama: "AX3000", materialCategoryId: 1, brandId: 3, materialCategory: { id: 1, nama: "Router" }, brand: { id: 3, nama: "TP-Link" } },
      { id: 4, nama: "SG108E", materialCategoryId: 2, brandId: 3, materialCategory: { id: 2, nama: "Switch" }, brand: { id: 3, nama: "TP-Link" } },
      { id: 5, nama: "C220", materialCategoryId: 3, brandId: 4, materialCategory: { id: 3, nama: "ODP" }, brand: { id: 4, nama: "ZTE" } },
    ]);
  }

  // Locations
  if (!localStorage.getItem("mock_locations")) {
    store("locations", [
      {
        id: "loc-1", name: "Rak A", type: "Rak", isActive: true, owner: "KP Tasikmalaya",
        levels: [
          { id: "lvl-1a", name: "Level 1", capacity: 20, usedCapacity: 3, brandRule: "Huawei", isActive: true },
          { id: "lvl-1b", name: "Level 2", capacity: 20, usedCapacity: 2, brandRule: "TP-Link", isActive: true },
        ],
      },
      {
        id: "loc-2", name: "Rak B", type: "Rak", isActive: true, owner: "KP Tasikmalaya",
        levels: [
          { id: "lvl-2a", name: "Level 1", capacity: 20, usedCapacity: 1, brandRule: "ZTE", isActive: true },
        ],
      },
      { id: "loc-3", name: "Kardus Huawei", type: "Kardus", isActive: true, owner: "KP Tasikmalaya", capacity: 30, usedCapacity: 5, brandRule: "Huawei" },
      { id: "loc-4", name: "Gudang Mitra A", type: "Pallet", isActive: true, owner: "Mitra Bandung", capacity: 50, usedCapacity: 0, brandRule: "" },
    ]);
  }

  // Items / Barang
  if (!localStorage.getItem("mock_items")) {
    store("items", [
      { id: "item-1", serialNumber: "HW-ONT-001", kategori: "ONT", merek: "Huawei", tipe: "EG8145V5", status: "Tersedia", lokasiPenyimpanan: "Rak A - Level 1", tanggalMasuk: "2025-01-10", mitra: "KP Tasikmalaya" },
      { id: "item-2", serialNumber: "HW-ONT-002", kategori: "ONT", merek: "Huawei", tipe: "HG8245H5", status: "Terdistribusi", lokasiPenyimpanan: "Rak A - Level 1", tanggalMasuk: "2025-01-15", mitra: "Mitra Bandung" },
      { id: "item-3", serialNumber: "TP-RTR-001", kategori: "Router", merek: "TP-Link", tipe: "AX3000", status: "Tersedia", lokasiPenyimpanan: "Rak A - Level 2", tanggalMasuk: "2025-02-01", mitra: "KP Tasikmalaya" },
      { id: "item-4", serialNumber: "TP-SWT-001", kategori: "Switch", merek: "TP-Link", tipe: "SG108E", status: "Rusak", lokasiPenyimpanan: "Rak A - Level 2", tanggalMasuk: "2025-02-10", mitra: "KP Tasikmalaya" },
      { id: "item-5", serialNumber: "ZTE-ODP-001", kategori: "ODP", merek: "ZTE", tipe: "C220", status: "Tersedia", lokasiPenyimpanan: "Rak B - Level 1", tanggalMasuk: "2025-03-05", mitra: "KP Tasikmalaya" },
      { id: "item-6", serialNumber: "HW-ONT-003", kategori: "ONT", merek: "Huawei", tipe: "EG8145V5", status: "Hilang", lokasiPenyimpanan: "Rak A - Level 1", tanggalMasuk: "2025-03-20", mitra: "KP Tasikmalaya" },
    ]);
  }

  // Transactions
  if (!localStorage.getItem("mock_transactions")) {
    store("transactions", [
      { id: "trx-1", tanggal: "2025-06-01", nomor: "TRX-001", kategori: "MASUK", status: "Selesai", sn: "HW-ONT-001", merek: "Huawei", asal: "Gudang Pusat", tujuan: "KP Tasikmalaya", mitra: "KP Tasikmalaya", createdAt: "2025-06-01T08:00:00Z" },
      { id: "trx-2", tanggal: "2025-06-05", nomor: "TRX-002", kategori: "KELUAR", status: "Selesai", sn: "HW-ONT-002", merek: "Huawei", asal: "KP Tasikmalaya", tujuan: "Mitra Bandung", mitra: "Mitra Bandung", createdAt: "2025-06-05T09:30:00Z" },
      { id: "trx-3", tanggal: "2025-06-10", nomor: "TRX-003", kategori: "MASUK", status: "Selesai", sn: "TP-RTR-001", merek: "TP-Link", asal: "Supplier", tujuan: "KP Tasikmalaya", mitra: "KP Tasikmalaya", createdAt: "2025-06-10T10:00:00Z" },
      { id: "trx-4", tanggal: "2025-06-15", nomor: "TRX-004", kategori: "RUSAK", status: "Selesai", sn: "TP-SWT-001", merek: "TP-Link", asal: "KP Tasikmalaya", tujuan: null, mitra: "KP Tasikmalaya", createdAt: "2025-06-15T11:00:00Z" },
      { id: "trx-5", tanggal: "2025-07-01", nomor: "TRX-005", kategori: "MASUK", status: "Selesai", sn: "ZTE-ODP-001", merek: "ZTE", asal: "Gudang Pusat", tujuan: "KP Tasikmalaya", mitra: "KP Tasikmalaya", createdAt: "2025-07-01T08:00:00Z" },
    ]);
  }

  // Requests
  if (!localStorage.getItem("mock_requests")) {
    store("requests", [
      {
        id: "req-1", requestNumber: "REQ-2025-001", requesterName: "Budi Santoso", status: "Pending",
        requestedAt: "2025-07-01T08:00:00Z", itemsCount: 2, notes: "Untuk proyek Tasikmalaya Barat",
        requestItems: [
          { id: 1, category: "ONT", brand: "Huawei", model: "EG8145V5", quantity: 1, unit: "unit" },
          { id: 2, category: "Router", brand: "TP-Link", model: "AX3000", quantity: 1, unit: "unit" },
        ],
      },
      {
        id: "req-2", requestNumber: "REQ-2025-002", requesterName: "Sari Dewi", status: "Approved",
        requestedAt: "2025-07-10T09:00:00Z", itemsCount: 3, notes: "",
        requestItems: [
          { id: 3, category: "ONT", brand: "Huawei", quantity: 3, unit: "unit" },
        ],
      },
      {
        id: "req-3", requestNumber: "REQ-2025-003", requesterName: "Rudi Hartono", status: "Delivered",
        requestedAt: "2025-07-20T10:00:00Z", itemsCount: 1, notes: "Penggantian perangkat rusak",
        requestItems: [
          { id: 4, category: "Switch", brand: "TP-Link", quantity: 1, unit: "unit" },
        ],
      },
    ]);
  }

  // Partners / Mitra
  if (!localStorage.getItem("mock_partners")) {
    store("partners", [
      { id: "mtr-1", nama: "Mitra Bandung", code: "MTR-BDG", category: "Kota", isActive: true },
      { id: "mtr-2", nama: "Mitra Garut", code: "MTR-GRT", category: "Kabupaten", isActive: true },
      { id: "mtr-3", nama: "Mitra Ciamis", code: "MTR-CMS", category: "Kabupaten", isActive: true },
    ]);
  }

  // Dashboard stats
  if (!localStorage.getItem("mock_dashboard_stats")) {
    store("dashboard_stats", {
      mitraPerformance: [
        { mitraName: "Mitra Bandung", requestCount: 12, deliveredCount: 10 },
        { mitraName: "Mitra Garut", requestCount: 8, deliveredCount: 7 },
        { mitraName: "Mitra Ciamis", requestCount: 5, deliveredCount: 5 },
      ],
    });
  }
}

// ─── Response builder ────────────────────────────────────────

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Pagination helper ───────────────────────────────────────

function paginate<T>(arr: T[], page: number, limit: number) {
  const totalItems = arr.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: arr.slice(start, start + limit),
    pagination: { currentPage: safePage, totalPages, totalItems, limit },
  };
}

// ─── Route handlers ──────────────────────────────────────────

function handleRequest(url: URL, method: string, body: any): Response | null {
  const path = url.pathname;
  const sp = url.searchParams;

  // ── /auth/login ──────────────────────────────────────────
  if (path.endsWith("/auth/login") && method === "POST") {
    return ok({
      token: "dev-mock-token-bypass",
      user: {
        id: "dev-001", username: body?.username ?? "dev@bypass.local",
        role: "admin", displayName: "Dev User (Bypass)",
        partnerId: null, identityCode: "ADM",
      },
    });
  }

  // ── /categories ──────────────────────────────────────────
  if (path.endsWith("/categories")) {
    const data = load<any[]>("categories", []);
    if (method === "GET") return ok({ data });
    if (method === "POST") {
      const newItem = { id: uid(), ...body, totalItems: 0 };
      store("categories", [...data, newItem]);
      return ok({ data: newItem }, 201);
    }
  }

  // ── /categories/:id ───────────────────────────────────────
  const catMatch = path.match(/\/categories\/([^/]+)$/);
  if (catMatch) {
    const id = catMatch[1];
    const data = load<any[]>("categories", []);
    if (method === "PUT") {
      const updated = data.map((c) => (c.id === id ? { ...c, ...body } : c));
      store("categories", updated);
      return ok({ data: updated.find((c) => c.id === id) });
    }
    if (method === "DELETE") {
      store("categories", data.filter((c) => c.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /brands ──────────────────────────────────────────────
  if (path.endsWith("/brands")) {
    const data = load<any[]>("brands", []);
    if (method === "GET") return ok({ data });
    if (method === "POST") {
      const newItem = { id: uid(), ...body, totalItems: 0 };
      store("brands", [...data, newItem]);
      return ok({ data: newItem }, 201);
    }
  }

  const brandMatch = path.match(/\/brands\/([^/]+)$/);
  if (brandMatch) {
    const id = brandMatch[1];
    const data = load<any[]>("brands", []);
    if (method === "PUT") {
      const updated = data.map((b) => (b.id === id ? { ...b, ...body } : b));
      store("brands", updated);
      return ok({ data: updated.find((b) => b.id === id) });
    }
    if (method === "DELETE") {
      store("brands", data.filter((b) => b.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /material-models ─────────────────────────────────────
  if (path.endsWith("/material-models")) {
    const data = load<any[]>("material-models", []);
    if (method === "GET") return ok({ data });
    if (method === "POST") {
      const newItem = { id: Date.now(), ...body };
      store("material-models", [...data, newItem]);
      return ok({ data: newItem }, 201);
    }
  }

  const modelMatch = path.match(/\/material-models\/([^/]+)$/);
  if (modelMatch) {
    const id = modelMatch[1];
    const data = load<any[]>("material-models", []);
    if (method === "PUT") {
      const updated = data.map((m) => (String(m.id) === id ? { ...m, ...body } : m));
      store("material-models", updated);
      return ok({ data: updated.find((m) => String(m.id) === id) });
    }
    if (method === "DELETE") {
      store("material-models", data.filter((m) => String(m.id) !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /locations ───────────────────────────────────────────
  if (path.endsWith("/locations")) {
    const data = load<any[]>("locations", []);
    if (method === "GET") return ok({ data });
    if (method === "POST") {
      const newItem = { id: uid(), ...body };
      store("locations", [...data, newItem]);
      return ok({ data: newItem }, 201);
    }
  }

  const locMatch = path.match(/\/locations\/([^/]+)$/);
  if (locMatch) {
    const id = locMatch[1];
    const data = load<any[]>("locations", []);
    if (method === "GET") return ok({ data: data.find((l) => l.id === id) ?? null });
    if (method === "PUT") {
      const updated = data.map((l) => (l.id === id ? { ...l, ...body } : l));
      store("locations", updated);
      return ok({ data: updated.find((l) => l.id === id) });
    }
    if (method === "DELETE") {
      store("locations", data.filter((l) => l.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /items ───────────────────────────────────────────────
  if (path.endsWith("/items")) {
    let data = load<any[]>("items", []);
    if (method === "GET") {
      // Apply filters
      const search = sp.get("search")?.toLowerCase() ?? "";
      const status = sp.get("status") ?? "";
      const kategori = sp.get("kategori") ?? "";
      const merek = sp.get("merek") ?? "";
      const page = parseInt(sp.get("page") ?? "1", 10);
      const limit = parseInt(sp.get("limit") ?? "10", 10);

      let filtered = data;
      if (search) filtered = filtered.filter((i) =>
        i.serialNumber?.toLowerCase().includes(search) ||
        i.kategori?.toLowerCase().includes(search) ||
        i.merek?.toLowerCase().includes(search)
      );
      if (status) filtered = filtered.filter((i) => i.status === status);
      if (kategori) filtered = filtered.filter((i) => i.kategori === kategori);
      if (merek) filtered = filtered.filter((i) => i.merek === merek);

      return ok(paginate(filtered, page, limit));
    }
    if (method === "POST") {
      // Check duplicate SN
      const dup = data.find((i) => i.serialNumber?.toLowerCase() === body?.serialNumber?.toLowerCase());
      if (dup) return err("Serial number sudah terdaftar", 409);
      const newItem = { id: uid(), ...body, tanggalMasuk: body.tanggalMasuk || now().split("T")[0] };
      store("items", [...data, newItem]);
      // Log transaction
      const txns = load<any[]>("transactions", []);
      store("transactions", [...txns, {
        id: uid(), tanggal: newItem.tanggalMasuk, nomor: `TRX-${uid()}`,
        kategori: "MASUK", status: "Selesai", sn: newItem.serialNumber,
        merek: newItem.merek, asal: newItem.mitra ?? "KP Tasikmalaya",
        tujuan: newItem.lokasiPenyimpanan, mitra: newItem.mitra ?? "KP Tasikmalaya",
        createdAt: now(),
      }]);
      return ok({ data: newItem }, 201);
    }
  }

  // ── /items/:id ───────────────────────────────────────────
  const itemMatch = path.match(/\/items\/([^/]+)$/);
  if (itemMatch) {
    const id = itemMatch[1];
    const data = load<any[]>("items", []);
    if (method === "GET") return ok({ data: data.find((i) => i.id === id) ?? null });
    if (method === "PUT") {
      const updated = data.map((i) => (i.id === id ? { ...i, ...body } : i));
      store("items", updated);
      return ok({ data: updated.find((i) => i.id === id) });
    }
    if (method === "DELETE") {
      store("items", data.filter((i) => i.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /transactions ────────────────────────────────────────
  if (path.endsWith("/transactions")) {
    const data = load<any[]>("transactions", []);
    if (method === "GET") {
      const page = parseInt(sp.get("page") ?? "1", 10);
      const limit = parseInt(sp.get("limit") ?? "50", 10);
      const sorted = [...data].sort((a, b) => new Date(b.createdAt ?? b.tanggal).getTime() - new Date(a.createdAt ?? a.tanggal).getTime());
      return ok(paginate(sorted, page, limit));
    }
    if (method === "POST") {
      const newTrx = { id: uid(), createdAt: now(), ...body };
      store("transactions", [...data, newTrx]);
      return ok({ data: newTrx }, 201);
    }
  }

  // ── /transactions/:id ────────────────────────────────────
  const trxMatch = path.match(/\/transactions\/([^/]+)$/);
  if (trxMatch) {
    const id = trxMatch[1];
    const data = load<any[]>("transactions", []);
    if (method === "GET") return ok({ data: data.find((t) => t.id === id) ?? null });
    if (method === "PUT") {
      const updated = data.map((t) => (t.id === id ? { ...t, ...body } : t));
      store("transactions", updated);
      return ok({ data: updated.find((t) => t.id === id) });
    }
    if (method === "DELETE") {
      store("transactions", data.filter((t) => t.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /requests ────────────────────────────────────────────
  if (path.endsWith("/requests")) {
    const data = load<any[]>("requests", []);
    if (method === "GET") {
      const page = parseInt(sp.get("page") ?? "1", 10);
      const limit = parseInt(sp.get("limit") ?? "20", 10);
      const sorted = [...data].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      return ok(paginate(sorted, page, limit));
    }
    if (method === "POST") {
      const newReq = {
        id: uid(), requestNumber: `REQ-${Date.now()}`, status: "Pending",
        requestedAt: now(), ...body,
      };
      store("requests", [...data, newReq]);
      return ok({ data: newReq }, 201);
    }
  }

  // ── /requests/:id/status ──────────────────────────────────
  const reqStatusMatch = path.match(/\/requests\/([^/]+)\/status$/);
  if (reqStatusMatch) {
    const id = reqStatusMatch[1];
    const data = load<any[]>("requests", []);
    if (method === "PUT") {
      const updated = data.map((r) => (r.id === id ? { ...r, ...body } : r));
      store("requests", updated);
      return ok({ data: updated.find((r) => r.id === id) });
    }
  }

  // ── /requests/:id ────────────────────────────────────────
  const reqMatch = path.match(/\/requests\/([^/]+)$/);
  if (reqMatch) {
    const id = reqMatch[1];
    const data = load<any[]>("requests", []);
    if (method === "GET") return ok({ data: data.find((r) => r.id === id) ?? null });
    if (method === "PUT") {
      const updated = data.map((r) => (r.id === id ? { ...r, ...body } : r));
      store("requests", updated);
      return ok({ data: updated.find((r) => r.id === id) });
    }
    if (method === "DELETE") {
      store("requests", data.filter((r) => r.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /partners ────────────────────────────────────────────
  if (path.endsWith("/partners")) {
    const data = load<any[]>("partners", []);
    if (method === "GET") return ok({ data });
    if (method === "POST") {
      const newItem = { id: uid(), ...body };
      store("partners", [...data, newItem]);
      return ok({ data: newItem }, 201);
    }
  }

  const partnerMatch = path.match(/\/partners\/([^/]+)$/);
  if (partnerMatch) {
    const id = partnerMatch[1];
    const data = load<any[]>("partners", []);
    if (method === "GET") return ok({ data: data.find((p) => p.id === id) ?? null });
    if (method === "PUT") {
      const updated = data.map((p) => (p.id === id ? { ...p, ...body } : p));
      store("partners", updated);
      return ok({ data: updated.find((p) => p.id === id) });
    }
    if (method === "DELETE") {
      store("partners", data.filter((p) => p.id !== id));
      return ok({ message: "Deleted" });
    }
  }

  // ── /dashboard/stats/mitra-performance ──────────────────
  if (path.includes("/dashboard/stats/mitra-performance")) {
    const stats = load<any>("dashboard_stats", { mitraPerformance: [] });
    return ok({ data: stats.mitraPerformance });
  }

  // ── Barang masuk / barang keluar submit ──────────────────
  if (path.endsWith("/barang-masuk") && method === "POST") {
    const items = load<any[]>("items", []);
    const txns = load<any[]>("transactions", []);
    const added: any[] = [];
    const bodyItems: any[] = Array.isArray(body) ? body : [body];
    for (const bm of bodyItems) {
      const existing = items.find((i) => i.serialNumber?.toLowerCase() === bm.serialNumber?.toLowerCase() || i.serialNumber?.toLowerCase() === bm.nomor?.toLowerCase());
      if (!existing) {
        const newItem = {
          id: uid(), serialNumber: bm.serialNumber || bm.nomor,
          kategori: bm.kategori || bm.category || "", merek: bm.merek || bm.brand || "",
          tipe: bm.tipe || "", status: "Tersedia", lokasiPenyimpanan: bm.lokasi || bm.lokasiPenyimpanan || "",
          tanggalMasuk: now().split("T")[0], mitra: bm.asal || "KP Tasikmalaya",
        };
        items.push(newItem);
        added.push(newItem);
      }
      txns.push({
        id: uid(), tanggal: now().split("T")[0], nomor: `TRX-${uid()}`,
        kategori: "MASUK", status: "Selesai", sn: bm.serialNumber || bm.nomor,
        merek: bm.merek || bm.brand || "", asal: bm.asal || "KP Tasikmalaya",
        tujuan: bm.lokasi || bm.lokasiPenyimpanan || "", mitra: bm.asal || "KP Tasikmalaya",
        createdAt: now(),
      });
    }
    store("items", items);
    store("transactions", txns);
    return ok({ message: "Berhasil disimpan", data: added }, 201);
  }

  if (path.endsWith("/barang-keluar") && method === "POST") {
    const items = load<any[]>("items", []);
    const txns = load<any[]>("transactions", []);
    const bodyItems: any[] = Array.isArray(body) ? body : [body];
    for (const bk of bodyItems) {
      const idx = items.findIndex((i) => i.serialNumber?.toLowerCase() === (bk.serialNumber || bk.nomor)?.toLowerCase());
      if (idx !== -1) {
        items[idx] = { ...items[idx], status: "Terdistribusi", mitra: bk.mitra };
      }
      txns.push({
        id: uid(), tanggal: now().split("T")[0], nomor: `TRX-${uid()}`,
        kategori: "KELUAR", status: "Selesai", sn: bk.serialNumber || bk.nomor,
        merek: bk.merek || bk.brand || "", asal: "KP Tasikmalaya",
        tujuan: bk.mitra || bk.tujuan || "", mitra: bk.mitra || "",
        createdAt: now(),
      });
    }
    store("items", items);
    store("transactions", txns);
    return ok({ message: "Berhasil disimpan" });
  }

  // ── Recon Reports ──────────────────────────────────────────
    if (path.endsWith("/recon-progress") && method === "GET") {
      let progress = load<any[]>("recon-progress", []);
      
      const userId = new URL(url).searchParams.get("userId");
      const date = new URL(url).searchParams.get("date");
      
      if (userId) {
        progress = progress.filter(p => p.userId === userId);
      }
      if (date) {
        progress = progress.filter(p => p.date === date);
      }
      
      return ok({ data: progress });
    }

    if (path.endsWith("/recon-progress") && method === "POST") {
      const progressList = load<any[]>("recon-progress", []);
      
      // Update or insert
      const existingIdx = progressList.findIndex(p => p.userId === body.userId && p.date === body.date && p.itemId === body.itemId);
      if (existingIdx >= 0) {
        progressList[existingIdx] = { ...progressList[existingIdx], ...body };
      } else {
        progressList.push({ id: uid(), createdAt: now(), ...body });
      }
      
      store("recon-progress", progressList);
      return ok({ message: "Progress disinkronkan", data: body }, 200);
    }
    
    if (path.endsWith("/recon-progress") && method === "DELETE") {
      let progressList = load<any[]>("recon-progress", []);
      
      const userId = new URL(url).searchParams.get("userId");
      const date = new URL(url).searchParams.get("date");
      
      if (userId && date) {
        progressList = progressList.filter(p => !(p.userId === userId && p.date === date));
        store("recon-progress", progressList);
      }
      
      return ok({ message: "Progress di-reset" });
    }

    if (path.endsWith("/recon-reports") && method === "GET") {
      let reports = load<any[]>("recon-reports", []);
      
      const userId = new URL(url).searchParams.get("userId");
      const date = new URL(url).searchParams.get("date"); // Format: YYYY-MM-DD
      
      if (userId) {
        reports = reports.filter(r => r.userId === userId);
      }
      
      if (date) {
        reports = reports.filter(r => {
          if (!r.createdAt) return false;
          return r.createdAt.startsWith(date) || (r.timestamp && r.timestamp.startsWith(date));
        });
      }
      
      return ok({ data: reports });
    }

    if (path.endsWith("/recon-reports") && method === "POST") {
    const reports = load<any[]>("recon-reports", []);
    const newReport = {
      id: uid(),
      createdAt: now(),
      ...body
    };
    store("recon-reports", [...reports, newReport]);
    return ok({ message: "Laporan Recon Berhasil Disimpan", data: newReport }, 201);
  }

  // ── Not matched ──────────────────────────────────────────
  return null;
}

// ─── Main: Install mock fetch interceptor ────────────────────

export function installMockApi() {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH !== "true") return;

  // Seed initial data
  seedIfEmpty();

  const baseUrl = (import.meta.env.VITE_URL ?? "").replace(/\/$/, "");
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init): Promise<Response> => {
    const reqUrl = typeof input === "string" ? input : (input as Request).url;

    // Only intercept requests going to the backend URL
    if (!reqUrl.startsWith(baseUrl) && !reqUrl.includes("api-taslim") && !reqUrl.includes("172.168")) {
      return originalFetch(input, init);
    }

    const method = (init?.method ?? "GET").toUpperCase();
    let body: any = undefined;
    if (init?.body) {
      try { body = JSON.parse(init.body as string); } catch { body = init.body; }
    }

    const url = new URL(reqUrl.startsWith("http") ? reqUrl : `http://localhost${reqUrl}`);

    console.info(`[MockAPI] ${method} ${url.pathname}${url.search}`);

    const response = handleRequest(url, method, body);
    if (response) return response;

    // Fallback: return empty success for unhandled endpoints
    console.warn(`[MockAPI] Unhandled: ${method} ${url.pathname} — returning empty OK`);
    return ok({ data: [], message: "mock fallback" });
  };

  console.info("%c[MockAPI] Installed — localStorage database aktif", "color: #4ade80; font-weight: bold;");
}
