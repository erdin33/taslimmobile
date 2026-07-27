"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Edit, Trash2, Search, CircleStar, MoreVertical, Loader2
} from "lucide-react";
/**
 * Helper: Mengembalikan Base URL untuk pemanggilan API.
 * 
 * @returns {string} String URL API Backend.
 */
const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

/**
 * Helper: Menyusun header HTTP secara otomatis beserta Authorization token.
 * 
 * @returns {Record<string, string>} Object header HTTP.
 */
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Merek } from "@/types/inventory";

/**
 * Komponen MerekBarangPage
 * 
 * Halaman untuk mengelola Master Data Merek Barang. Memungkinkan pengguna
 * untuk melihat, mencari, menambah, mengedit, dan menghapus merek.
 * Terintegrasi dengan data kategori untuk dropdown pilihan.
 * 
 * @returns {JSX.Element} Antarmuka halaman manajemen merek.
 */
export default function MerekBarangPage() {
  const [brands, setBrands] = useState<Merek[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Alert state
  const [deleteAlertData, setDeleteAlertData] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [origin, setOrigin] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");

  const loadCategories = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/categories`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error("Gagal mengambil data kategori");
      }
      const data = await response.json();
      const categoriesList = data.data || data.categories || data;
      setCategories(Array.isArray(categoriesList) ? categoriesList.map((c: any) => ({
        ...c,
        id: String(c.id),
        name: c.nama || c.name || "",
        description: c.deskripsi || c.description || "",
        totalItems: c.totalItems !== undefined ? c.totalItems : (c.total_items || 0),
        safetyStock: c.safetyStock !== undefined ? c.safetyStock : (c.safety_stock || 5),
      })) : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Gagal mengambil data kategori dari server.");
    }
  };

  /**
   * Mengambil data seluruh merek dari API Backend.
   */
  const loadBrands = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/brands`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error("Gagal mengambil data merek");
      }
      const data = await response.json();
      
      // Standarisasi field nama dari backend
      const brandsList = data.data || data.brands || data;
      setBrands(Array.isArray(brandsList) ? brandsList.map((b: any) => ({
        ...b,
        id: String(b.id),
        totalItems: b.totalItems !== undefined ? b.totalItems : (b.total_items || 0)
      })) : []);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      toast.error("Gagal mengambil data merek dari server.");
    }
  };

  useEffect(() => {
    loadBrands();
    loadCategories();
  }, []);

  const filteredBrands = useMemo(() => {
    return brands.filter(brand =>
      brand.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.origin.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  const handleOpenSheet = (id?: string) => {
    if (id) {
      const brand = brands.find(b => b.id === id);
      if (brand) {
        setName(brand.nama);
        setIdentifier(brand.identifier);
        setOrigin(brand.origin);
        setCategoryId((brand as any).categoryId ? String((brand as any).categoryId) : (brand as any).kategoriId ? String((brand as any).kategoriId) : "");
        setEditId(id);
      }
    } else {
      setName("");
      setIdentifier("");
      setOrigin("");
      setCategoryId("");
      setEditId(null);
    }
    setFormErrors({});
    setIsSheetOpen(true);
  };

  /**
   * Menyimpan data form Merek ke API Backend (Berfungsi untuk Tambah & Edit).
   * Melakukan validasi duplikasi untuk nama dan identifier.
   */
  const handleSave = async () => {
    if (isSaving) return;
    const trimmedName = name.trim();
    
    // Auto-generate identifier dari 3 huruf pertama jika kosong
    const normalizedIdentifier =
      identifier.trim().toUpperCase() ||
      trimmedName.slice(0, 3).toUpperCase();
    const errors: Record<string, string> = {};

    if (!trimmedName) {
      errors.name = "Nama merek wajib diisi.";
    }
    if (!normalizedIdentifier) {
      errors.identifier = "Identifier merek wajib diisi.";
    }

    // Cek duplikasi nama merek di sisi klien
    const duplicateName = brands.some(
      (brand) =>
        brand.id !== editId &&
        brand.nama.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      errors.name = "Nama merek sudah terdaftar.";
    }

    // Cek duplikasi identifier di sisi klien (harus unik untuk print barcode/QR dll)
    const duplicateIdentifier = brands.some(
      (brand) =>
        brand.id !== editId &&
        brand.identifier.trim().toLowerCase() === normalizedIdentifier.toLowerCase()
    );
    if (duplicateIdentifier) {
      errors.identifier = "Identifier merek sudah digunakan.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Merek tidak dapat disimpan karena data harus unik.");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const brand = brands.find(b => b.id === editId);
        const response = await fetch(`${getBaseUrl()}/brands/${editId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            name: trimmedName,
            identifier: normalizedIdentifier,
            origin: origin.trim() || "-",
            totalItems: brand?.totalItems || 0
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || "Gagal memperbarui merek");
        }
      } else {
        const response = await fetch(`${getBaseUrl()}/brands`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            nama: trimmedName,
            identifier: normalizedIdentifier,
            origin: origin.trim() || "-",
            categoryId: categoryId ? parseInt(categoryId) : undefined,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || "Gagal menambahkan merek");
        }
      }
      await loadBrands();
      setIsSheetOpen(false);
      toast.success(`Berhasil ${editId ? "menyimpan perubahan" : "menambahkan"} data merek`);
    } catch (error: any) {
      console.error("Failed to save brand:", error);
      toast.error(error.message || (typeof error === "string" ? error : "Gagal menyimpan merek."));
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = (id: string, name: string) => {
    setDeleteAlertData({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    const { id } = deleteAlertData;
    if (!id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${getBaseUrl()}/brands/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Gagal menghapus merek");
      }

      await loadBrands();
      toast.success("Berhasil menghapus merek");
    } catch (error: any) {
      console.error("Failed to delete brand:", error);
      toast.error(error.message || "Gagal menghapus merek.");
    } finally {
      setIsDeleting(false);
      setDeleteAlertData({ isOpen: false, id: "", name: "" });
    }
  };

  return (
    <div className="p-6 min-h-full flex flex-col gap-6 text-foreground mx-auto w-full md:pt-10 md:pb-8">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari merek atau identifier..."
            className="w-full pl-9 bg-background border-border focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={() => handleOpenSheet()}>
          <Plus className="w-4 h-4" /> Tambah Merek
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
        {filteredBrands.map(brand => (
          <Card key={brand.id} className="overflow-hidden relative group transition-all duration-300 hover:border-border/50 hover:bg-muted/50">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                  <CircleStar className="w-5 h-5 text-orange-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">{brand.nama}</h3>
                  <p className="text-xs text-muted-foreground truncate">{brand.identifier}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full hover:bg-muted text-muted-foreground transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                    <DropdownMenuItem className="cursor-pointer focus:bg-muted" onClick={() => handleOpenSheet(brand.id)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Merek
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer" onClick={() => requestDelete(brand.id, brand.nama)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Hapus Merek
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total Barang</span>
                <span className="text-xs font-medium text-foreground">{brand.totalItems} Unit</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredBrands.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Merek Tidak Ditemukan</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Coba gunakan kata kunci lain atau tambahkan merek baru.</p>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md border-border bg-popover p-0 flex flex-col text-foreground">
          <SheetHeader className="p-6 border-b border-border/50 bg-muted/50">
            <SheetTitle className="text-xl text-foreground">{editId ? "Edit Merek" : "Tambah Merek Baru"}</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Isi formulir di bawah ini untuk mengelola informasi merek barang.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label>Nama Merek</Label>
                <Input
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    setFormErrors(current => ({ ...current, name: "" }))
                  }}
                  placeholder="Contoh: Cisco"
                  className={`bg-background ${formErrors.name ? "border-destructive" : "border-border"}`}
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Identifier</Label>
                <Input
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value.toUpperCase())
                    setFormErrors(current => ({ ...current, identifier: "" }))
                  }}
                  placeholder="Contoh: CIS"
                  className={`bg-background font-mono uppercase ${formErrors.identifier ? "border-destructive" : "border-border"}`}
                />
                {formErrors.identifier && (
                  <p className="text-xs text-destructive">{formErrors.identifier}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={categoryId}
                  onValueChange={(value) => {
                    setCategoryId(value)
                    setFormErrors(current => ({ ...current, category: "" }))
                  }}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]" position="popper">
                    {categories.length > 0 ? (
                      categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Tidak ada kategori
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asal</Label>
                <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Contoh: Amerika Serikat" className="bg-background border-border" />
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-border/50 bg-muted/50 flex sm:justify-end gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} className="hover:bg-muted text-foreground" disabled={isSaving}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteAlertData.isOpen} onOpenChange={(open) => !open && !isDeleting && setDeleteAlertData({ ...deleteAlertData, isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan dan semua data terkait akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
