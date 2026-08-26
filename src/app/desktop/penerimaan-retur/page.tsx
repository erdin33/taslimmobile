import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PackagePlus, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { DashboardRequest } from "@/types/transaction";
import { ReturApprovalModal } from "@/features/barang-masuk/components/ReturApprovalModal";

export default function PenerimaanReturPage() {
  const { user } = useAuth();
  const [returRequests, setReturRequests] = useState<DashboardRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DashboardRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReturRequests = async () => {
    setIsLoading(true);
    try {
      // Mock fetch from localStorage
      const data = JSON.parse(localStorage.getItem("mock_retur_requests") || "[]");
      
      // Filter hanya yang type === "RETUR" dan status "Menunggu"
      const returData = data.filter((req: DashboardRequest) => req.type === "RETUR" && req.status.toLowerCase() === "menunggu");
      setReturRequests(returData);
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

  const handleOpenModal = (req: DashboardRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    fetchReturRequests();
  };

  if (user?.role === "mitra") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-primary" />
              Penerimaan Retur Mitra
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Persetujuan pengembalian barang dari mitra dan penetapan lokasi kardus.
            </p>
          </div>
        </div>

        <Card className="border-sidebar-border bg-sidebar shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-muted/50 border-b border-border pb-4 pt-5 px-6">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Menunggu Konfirmasi
              <Badge variant="secondary" className="ml-auto bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                {returRequests.length} Tiket
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[120px] px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">No Tiket</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Mitra</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Jumlah Barang</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : returRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Tidak ada tiket retur yang menunggu konfirmasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  returRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/50 transition-colors border-border">
                      <TableCell className="px-6 py-4 font-medium">{req.requestNumber}</TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {req.requestedAt && !isNaN(new Date(req.requestedAt).getTime()) 
                          ? new Date(req.requestedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium">{req.requesterName}</TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Badge variant="outline" className="font-semibold">
                          {req.itemsCount || req.returItems?.length || 0} Item
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button size="sm" onClick={() => handleOpenModal(req)}>
                          Review & Terima
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedRequest && (
        <ReturApprovalModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          request={selectedRequest}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
}
