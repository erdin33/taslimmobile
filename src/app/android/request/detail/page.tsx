import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import type { DashboardRequest } from "@/types/transaction";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getUnitByCategory = (categoryName?: string) => {
  if (!categoryName) return "Unit";
  const name = categoryName.toLowerCase();
  if (name.includes("kabel") || name.includes("foc") || name.includes("dropwire")) {
    return "Meter";
  }
  return "Unit";
};

const getCleanCategoryName = (categoryName?: string) => {
  if (!categoryName) return "-";
  const name = categoryName.toLowerCase();
  if (name.includes("ont")) return "ONT";
  if (name.includes("dropwire") || name.includes("kabel") || name.includes("foc")) return "DropWire";
  return categoryName;
};

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

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<DashboardRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchRequest = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/requests/${id}`, {
          method: "GET",
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Gagal mengambil data detail permintaan");
        const data = await res.json();

        const formatted: DashboardRequest = {
          id: data.id,
          requestNumber: data.requestNumber,
          requesterName: data.requester?.profile?.nama || data.requester?.username,
          partnerCategory: data.requester?.profile?.partnerType || "Mitra",
          status: data.status,
          notes: data.notes || "-",
          requestedAt: data.requestedAt,
          itemsCount: data.requestItems?.reduce((acc: number, item: any) => acc + item.quantity, 0),
          requestItems: data.requestItems?.map((item: any) => ({
            id: item.id,
            category: getCleanCategoryName(item.category?.nama),
            brand: item.brand?.nama,
            quantity: item.quantity,
            unit: getUnitByCategory(item.category?.nama)
          })),
          requestAllocations: data.requestItems?.flatMap((item: any) =>
            item.allocations?.map((alloc: any) => ({
              id: alloc.id,
              materialNumber: alloc.item?.paNumber || "-",
              materialCategory: getCleanCategoryName(item.category?.nama),
              brand: alloc.item?.brand?.nama || item.brand?.nama,
              materialName: `${getCleanCategoryName(item.category?.nama)} ${alloc.item?.brand?.nama || item.brand?.nama}`,
              serialNumber: alloc.item?.serialNumber,
              quantity: 1,
              unit: getUnitByCategory(item.category?.nama)
            })) || []
          )
        };
        setRequest(formatted);
      } catch (error) {
        console.error(error);
        toast.error("Gagal memuat detail permintaan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat detail permintaan...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <h2 className="text-xl font-semibold">Data Permintaan Tidak Ditemukan</h2>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="size-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const status = request.status?.toLowerCase() || "";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:block print:max-w-none">
      <div className="flex items-center gap-4 border-b pb-4 print:hidden">
        <Button onClick={() => navigate(-1)} variant="outline" size="icon" className="shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">{request.requestNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Detail Informasi Permintaan
          </p>
        </div>
        <div className="ml-auto flex gap-2 shrink-0">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium uppercase tracking-wider">
            {request.status}
          </Badge>
        </div>
      </div>

      <div className={`grid gap-6 grid-cols-1 print:block print:gap-0`}>
        {/* ===== KOLOM KIRI: Detail Transaksi ===== */}
        <div className="flex flex-col gap-6 print:hidden">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Informasi Umum</CardTitle>
              <CardDescription>Rincian pemohon dan waktu pengajuan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Pemohon</Label>
                  <div className="font-semibold text-base">{request.requesterName}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Kategori</Label>
                  <div className="font-semibold text-base">{request.partnerCategory}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Tanggal Pengajuan</Label>
                  <div className="font-semibold text-base">
                    {new Date(request.requestedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Total Item</Label>
                  <div className="font-semibold text-base">{request.itemsCount}</div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Catatan</Label>
                <div className="text-sm bg-muted/30 p-4 rounded-md min-h-[80px] border border-muted">
                  {request.notes && request.notes !== "-" ? request.notes : <span className="italic text-muted-foreground">Tidak ada catatan yang dilampirkan.</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>
                {request.requestAllocations && request.requestAllocations.length > 0 ? "Alokasi Barang (Material)" : "Daftar Barang (Item)"}
              </CardTitle>
              <CardDescription>Daftar material atau barang untuk permintaan ini</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {['SIAP', 'SELESAI', 'DITERIMA'].includes(request.status?.toUpperCase() || "") ? (
                <div className="flex flex-col gap-3">
                  {request.requestAllocations && request.requestAllocations.length > 0 ? (
                    request.requestAllocations.map((ra, idx) => (
                      <div key={ra.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-neutral-100">{ra.materialName}</span>
                            <span className="text-xs text-neutral-400">{ra.materialCategory} • {ra.brand}</span>
                          </div>
                          <div className="flex items-end gap-1 shrink-0">
                            <span className="font-bold text-sm text-neutral-100">{ra.quantity}</span>
                            <span className="text-xs text-neutral-400 font-medium">{ra.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                      Belum ada alokasi material spesifik.
                    </div>
                  )}
                </div>
              ) : request.status?.toUpperCase() === 'DISETUJUI' ? (
                <div className="flex flex-col gap-3">
                  {request.requestItems && request.requestItems.length > 0 ? (
                    request.requestItems.map((ri, idx) => (
                      <div key={ri.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-neutral-100">{ri.category}</span>
                            <span className="text-xs text-neutral-400">Merek: {ri.brand}</span>
                          </div>
                          <div className="flex items-end gap-1 shrink-0">
                            <span className="font-bold text-sm text-neutral-100">{ri.quantity}</span>
                            <span className="text-xs text-neutral-400 font-medium">{ri.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                      Tidak ada item.
                    </div>
                  )}
                </div>
              ) : request.requestItems && request.requestItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {request.requestItems.map((ri, idx) => (
                    <div key={ri.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-neutral-100">{ri.category}</span>
                          <span className="text-xs text-neutral-400">Merek: {ri.brand}</span>
                        </div>
                        <div className="flex items-end gap-1 shrink-0">
                          <span className="font-bold text-sm text-neutral-100">{ri.quantity}</span>
                          <span className="text-xs text-neutral-400 font-medium">{ri.unit || "Unit"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/5">
                  Tidak ada data barang yang tersedia.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
