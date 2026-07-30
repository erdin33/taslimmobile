import { useState, useCallback } from "react";
import type { BarangKeluarItem } from "@/types/transaction";

export const useOutboundSession = () => {
  const [barangKeluar, setBarangKeluar] = useState<BarangKeluarItem[]>([]);

  const addItem = useCallback((item: BarangKeluarItem) => {
    setBarangKeluar((current) => [item, ...current]);
  }, []);

  const deleteItem = useCallback((id: string | number) => {
    setBarangKeluar((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearSession = useCallback(() => {
    setBarangKeluar([]);
  }, []);

  return {
    barangKeluar,
    addItem,
    deleteItem,
    clearSession,
  };
};
