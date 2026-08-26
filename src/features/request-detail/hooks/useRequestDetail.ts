import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getBaseUrl } from "@/lib/api";
import type { DashboardRequest } from "@/types/transaction";

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
  const token = localStorage.getItem("taslim-auth-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `${token}`;
  }
  return headers;
};

export const useRequestDetail = (id?: string) => {
  const [request, setRequest] = useState<DashboardRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchRequest = async () => {
      try {
        setIsLoading(true);
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
          rejectionReason: data.rejectionReason || data.adminRemarks || data.adminNotes || data.adminNote || data.remarks || data.rejectionNotes || data.cancelReason || data.alasanPenolakan || undefined,
          requestedAt: data.requestedAt,
          itemsCount: data.requestItems?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0,
          requestItems: data.requestItems?.map((item: any) => ({
            id: item.id,
            category: getCleanCategoryName(item.materialCategory?.nama || item.category?.nama || item.category),
            brand: item.brand?.nama || item.brand || "-",
            quantity: item.quantity,
            unit: getUnitByCategory(item.materialCategory?.nama || item.category?.nama || item.category)
          })),
          requestAllocations: data.requestItems?.flatMap((item: any) =>
            item.allocations?.map((alloc: any) => {
              const itemObj = alloc.item || alloc
              const catName = getCleanCategoryName(itemObj?.model?.materialCategory?.nama || itemObj?.kategori || item.materialCategory?.nama || item.category?.nama)
              const brandName = itemObj?.brand?.nama || itemObj?.model?.brand?.nama || itemObj?.merek || item.brand?.nama || item.brand || "-"
              const matCode = itemObj?.paNumber || itemObj?.model?.code || itemObj?.tipe || "-"
              return {
                id: alloc.id || itemObj?.id,
                materialNumber: matCode,
                materialCategory: catName,
                brand: brandName,
                materialName: `${catName} ${brandName}${itemObj?.model?.nama ? ` (${itemObj.model.nama})` : ''}`,
                serialNumber: itemObj?.serialNumber || "-",
                quantity: 1,
                unit: getUnitByCategory(catName)
              }
            }) || []
          ),
          deliveryDocument: data.deliveryDocument,
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

  return {
    request,
    isLoading,
  };
};
