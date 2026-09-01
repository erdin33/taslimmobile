import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  PackagePlus,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  Search,
  Copy,
  Check,
  User,
  Calendar,
  RefreshCw,
  X,
  Inbox,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import type { DashboardRequest } from "@/types/transaction";
import { ReturApprovalModal } from "@/features/barang-masuk/components/ReturApprovalModal";
import { BastReturModal } from "@/features/barang-masuk/components/BastReturModal";
import { getBaseUrl, getHeaders } from "@/features/barang-masuk/api/barangMasukApi";

export default function PenerimaanReturPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [pendingReturs, setPendingReturs] = useState<DashboardRequest[]>([]);
  const [completedReturs, setCompletedReturs] = useState<DashboardRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DashboardRequest | null>(null);
  const [bastRequest, setBastRequest] = useState<DashboardRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReturRequests = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from server API
      let apiRequests: DashboardRequest[] = [];
      try {
        const res = await fetch(`${getBaseUrl()}/requests`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const resData = await res.json();
          const list = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
          apiRequests = list.filter((req: any) => req.type === "RETUR");
        }
      } catch (e) {
        console.warn("Gagal mengambil retur dari API, menggunakan data lokal:", e);
      }

      // 2. Load from localStorage
      const localData: DashboardRequest[] = JSON.parse(localStorage.getItem("mock_retur_requests") || "[]");
      const localReturs = localData.filter((req: DashboardRequest) => req.type === "RETUR");

      // 3. Merge by ID / requestNumber
      const combinedMap = new Map<string, DashboardRequest>();
      localReturs.forEach((r) => combinedMap.set(r.id || r.requestNumber, r));
      apiRequests.forEach((r) => combinedMap.set(r.id || r.requestNumber, r));

      const allReturs = Array.from(combinedMap.values());

      setPendingReturs(allReturs.filter((r) => (r.status || "").toLowerCase() === "menunggu"));
      setCompletedReturs(
        allReturs.filter((r) => (r.status || "").toLowerCase() === "selesai" || (r.status || "").toLowerCase() === "diterima")
      );
    } catch (error) {
      console.error("Gagal mengambil data retur:", error);
      toast.error("Gagal memuat data tiket retur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturRequests();
  }, [user]);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Nomor ${text} disalin!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenModal = (req: DashboardRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const handleOpenBast = (req: DashboardRequest) => {
    setBastRequest(req);
    setIsBastModalOpen(true);
  };

  const handleOpenDirectPdf = async (req: DashboardRequest, isFinal = false, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const token = localStorage.getItem("taslim-auth-token") || "";
      const endpoint = isFinal ? "pdf-signed" : "pdf-draft";
      const url = `${getBaseUrl()}/requests/${req.id || req.requestNumber}/${endpoint}?token=${token}`;
      try {
        await openUrl(url);
        toast.success("Membuka PDF BAST...");
      } catch {
        window.open(url, "_blank");
      }
    } catch {
      handleOpenBast(req);
    }
  };

  const handleApproveSuccess = () => {
    setIsModalOpen(false);
    const approved = selectedRequest;
    setSelectedRequest(null);
    fetchReturRequests();

    if (approved) {
      setBastRequest({ ...approved, status: "SELESAI" });
      setIsBastModalOpen(true);
    }
  };

  const filterList = (list: DashboardRequest[]) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.requestNumber || "").toLowerCase().includes(q) ||
        (r.requesterName || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        (r.returItems || []).some(
          (item: any) =>
            (item.nomor || "").toLowerCase().includes(q) ||
            (item.merek || "").toLowerCase().includes(q) ||
            (item.tipe || "").toLowerCase().includes(q)
        )
    );
  };

  const filteredPending = useMemo(() => filterList(pendingReturs), [pendingReturs, searchTerm]);
  const filteredCompleted = useMemo(() => filterList(completedReturs), [completedReturs, searchTerm]);
  const currentList = activeTab === "pending" ? filteredPending : filteredCompleted;

  if (user?.role === "mitra") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3.5 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <PackagePlus className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Penerimaan Retur Mitra
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Konfirmasi barang kembali dari mitra dan penerbitan Dokumen BAST resmi.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReturRequests}
            disabled={isLoading}
            className="gap-2 shrink-0 cursor-pointer shadow-2xs self-end sm:self-auto h-9 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Toolbar: Segmented Tab Pills & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Segmented Tab Controls */}
          <div className="flex p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-background text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-3.5 text-amber-500" />
              <span>Menunggu Konfirmasi</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "pending"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {pendingReturs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "completed"
                  ? "bg-background text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Riwayat Retur Selesai</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "completed"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {completedReturs.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari no tiket / mitra / SN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-8 h-9 text-xs bg-background shadow-2xs border-border/70"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="space-y-3">
          {/* 1. Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[170px] px-5 py-3 text-xs font-bold text-muted-foreground uppercase">
                    No Tiket
                  </TableHead>
                  <TableHead className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">
                    Tanggal Pengajuan
                  </TableHead>
                  <TableHead className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">
                    Mitra Penyerah
                  </TableHead>
                  <TableHead className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase text-center">
                    Jumlah Barang
                  </TableHead>
                  <TableHead className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-xs">
                      <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                      Memuat data tiket retur...
                    </TableCell>
                  </TableRow>
                ) : currentList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Inbox className="size-9 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">
                          {activeTab === "pending"
                            ? "Tidak ada tiket retur yang menunggu"
                            : "Belum ada riwayat retur yang diselesaikan"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {searchTerm
                            ? "Coba ubah kata kunci pencarian Anda."
                            : activeTab === "pending"
                            ? "Tiket pengembalian baru dari mitra akan muncul di sini secara otomatis."
                            : "Retur yang telah diterima akan tercatat di sini beserta dokumen BAST."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentList.map((req) => (
                    <TableRow key={req.id || req.requestNumber} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground text-xs">{req.requestNumber}</span>
                          <button
                            type="button"
                            className="size-5 inline-flex items-center justify-center text-muted-foreground hover:text-primary rounded cursor-pointer"
                            onClick={(e) => handleCopy(req.requestNumber, e)}
                            title="Salin No Tiket"
                          >
                            {copiedId === req.requestNumber ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground text-xs">
                        {req.requestedAt && !isNaN(new Date(req.requestedAt).getTime())
                          ? new Date(req.requestedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 font-medium text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground" />
                          <span>{req.requesterName || "Mitra"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold px-2.5 py-0.5 ${
                            activeTab === "pending"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {req.itemsCount || req.returItems?.length || 0} Unit
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        {activeTab === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBast(req)}
                              className="gap-1 text-xs h-8 cursor-pointer"
                            >
                              <FileText className="size-3.5" />
                              BAST Draft
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpenModal(req)}
                              className="gap-1.5 text-xs h-8 font-semibold shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Terima Retur
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleOpenDirectPdf(req, true, e)}
                              className="gap-1.5 text-xs h-8 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 font-semibold cursor-pointer"
                              title="Buka File PDF Resmi dari Server"
                            >
                              <FileText className="size-3.5" />
                              BAST PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBast(req)}
                              className="gap-1.5 text-xs h-8 text-primary border-primary/30 hover:bg-primary/10 font-semibold cursor-pointer"
                            >
                              <Printer className="size-3.5" />
                              Cetak BAST
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 2. Mobile Responsive Card List (Layar HP) */}
          <div className="flex flex-col gap-3 md:hidden">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center">
                <RefreshCw className="size-5 animate-spin text-primary mb-2" />
                Memuat tiket retur...
              </div>
            ) : currentList.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-card/60">
                <Inbox className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {activeTab === "pending" ? "Tidak ada tiket retur menunggu" : "Belum ada riwayat retur"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchTerm ? "Tidak ada tiket yang cocok dengan kata kunci." : "Daftar pengembalian akan muncul di sini."}
                </p>
              </div>
            ) : (
              currentList.map((req) => {
                const totalItems = req.itemsCount || req.returItems?.length || 0;
                const itemsPreview = (req.returItems || []).slice(0, 2);

                return (
                  <Card
                    key={req.id || req.requestNumber}
                    className="border-border/70 bg-card shadow-2xs rounded-xl overflow-hidden p-0 gap-0"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* Top Bar: Ticket No & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {req.requestNumber}
                            </span>
                            <button
                              type="button"
                              className="size-5 inline-flex items-center justify-center text-muted-foreground hover:text-primary rounded cursor-pointer"
                              onClick={(e) => handleCopy(req.requestNumber, e)}
                            >
                              {copiedId === req.requestNumber ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="size-3 text-primary" />
                            <span className="font-semibold text-foreground">{req.requesterName || "Mitra"}</span>
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold px-2 py-0.5 shrink-0 ${
                            activeTab === "pending"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {totalItems} Unit
                        </Badge>
                      </div>

                      {/* Items Preview Chips */}
                      {itemsPreview.length > 0 && (
                        <div className="bg-muted/40 p-2 rounded-lg border border-border/40 space-y-1 text-xs">
                          {itemsPreview.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-medium text-foreground truncate max-w-[180px]">
                                {item.nomor}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {item.merek || item.brand || ""} {item.kondisi ? `(${item.kondisi})` : ""}
                              </span>
                            </div>
                          ))}
                          {totalItems > 2 && (
                            <p className="text-[10px] text-muted-foreground text-right pt-0.5">
                              +{totalItems - 2} barang lainnya
                            </p>
                          )}
                        </div>
                      )}

                      {/* Date & Note Info */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>
                            {req.requestedAt && !isNaN(new Date(req.requestedAt).getTime())
                              ? new Date(req.requestedAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-primary">
                          Tujuan: Gudang KP
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {activeTab === "pending" ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenBast(req)}
                            className="w-full text-xs h-9 font-medium cursor-pointer"
                          >
                            <FileText className="size-3.5 mr-1" />
                            BAST Draft
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenModal(req)}
                            className="w-full text-xs h-9 font-bold shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Terima Retur
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleOpenDirectPdf(req, true, e)}
                            className="w-full text-xs h-9 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 font-semibold shadow-2xs cursor-pointer"
                          >
                            <FileText className="size-3.5 mr-1" />
                            BAST PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenBast(req)}
                            className="w-full text-xs h-9 text-primary border-primary/30 hover:bg-primary/10 font-semibold shadow-2xs cursor-pointer"
                          >
                            <Printer className="size-3.5 mr-1" />
                            Cetak BAST
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedRequest && (
        <ReturApprovalModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          request={selectedRequest}
          onSuccess={handleApproveSuccess}
        />
      )}

      {bastRequest && (
        <BastReturModal
          isOpen={isBastModalOpen}
          onOpenChange={setIsBastModalOpen}
          request={bastRequest}
        />
      )}
    </div>
  );
}
