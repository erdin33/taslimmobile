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
  const token = localStorage.getItem("arxiva-auth-token");
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
