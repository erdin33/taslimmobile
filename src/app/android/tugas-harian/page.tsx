"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Check,
  X,
  RotateCcw,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"

import type { BarangUnit } from "@/types/inventory"

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

const getTodayDateKey = (): string => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

export default function TugasHarianPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<BarangUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completedItems, setCompletedItems] = useState<Record<string, { imageUrl: string; timestamp: string }>>({})

  const [activeItem, setActiveItem] = useState<BarangUnit | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  // Foto asli TANPA watermark untuk diproses AI
  const [rawImage, setRawImage] = useState<string | null>(null)
  // State untuk melihat detail foto di tab selesai
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  
  // Geotag state (lokasi saat foto diambil)
  const [geotag, setGeotag] = useState<{lat: number, lng: number} | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetchItems()

    const loadReconForDate = (dateKey: string) => {
      if (!user) return
      const storageKey = `taslim_recon_${user.id}_${dateKey}`
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          setCompletedItems(JSON.parse(stored))
        } else {
          setCompletedItems({})
        }
      } catch (err) {
        console.error("Failed loading local recon cache", err)
      }

      // Then sync from API
      fetch(`${getBaseUrl()}/recon-progress?userId=${user.id}&date=${dateKey}`, {
        headers: getHeaders()
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.data && Array.isArray(data.data)) {
            const apiItems: Record<string, any> = {};
            data.data.forEach((p: any) => {
              apiItems[p.itemId] = { imageUrl: p.imageUrl, timestamp: p.timestamp };
            });
            
            setCompletedItems(prev => {
              const merged = { ...prev, ...apiItems };
              localStorage.setItem(storageKey, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(err => console.error("Failed fetching recon progress from API", err));
    }

    if (user) {
      loadReconForDate(getTodayDateKey())
    }

    // Auto-detect pergantian tanggal (jam 12 malam) agar tugas recon otomatis reset ke hari baru
    let lastDate = getTodayDateKey()
    const checkMidnightInterval = setInterval(() => {
      const currentDate = getTodayDateKey()
      if (currentDate !== lastDate) {
        lastDate = currentDate
        setCompletedItems({})
        fetchItems()
        loadReconForDate(currentDate)
      }
    }, 15000) // Cek setiap 15 detik

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentDate = getTodayDateKey()
        if (currentDate !== lastDate) {
          lastDate = currentDate
          setCompletedItems({})
          fetchItems()
          loadReconForDate(currentDate)
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(checkMidnightInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [user])

  // Mendapatkan lokasi GPS 1x saja saat halaman dimuat, dengan pengaman ketat!
  useEffect(() => {
    let isMounted = true
    let locationFound = false

    const fetchFallbackLocation = async () => {
      if (!isMounted || locationFound) return
      try {
        const res = await fetch("https://ipwho.is/")
        const data = await res.json()
        if (isMounted && data.success && !locationFound) {
          locationFound = true
          setGeotag({ lat: data.latitude, lng: data.longitude })
        } else if (isMounted && !locationFound) {
          locationFound = true
          setGeotag({ lat: 0, lng: 0 })
        }
      } catch (err) {
        console.warn("Fallback IP GPS gagal (tidak ada internet/diblokir)", err)
        if (isMounted && !locationFound) {
          locationFound = true
          setGeotag({ lat: 0, lng: 0 }) // Anggap koordinat 0 (gagal total) agar tidak stuck "Mencari..."
        }
      }
    }

    // 100% GARANSI: Paksa fallback IP jalan dalam 3 detik meskipun GPS HP "ngadat" (hang)
    const fallbackTimer = setTimeout(() => {
      if (!locationFound) {
        fetchFallbackLocation()
      }
    }, 3000)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted && !locationFound) {
            locationFound = true
            setGeotag({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          }
        },
        () => {
          if (!locationFound) fetchFallbackLocation()
        },
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 3000 }
      )
    } else {
      fetchFallbackLocation()
    }

    return () => {
      isMounted = false
      clearTimeout(fallbackTimer)
      stopCameraStream()
    }
  }, [])

  const fetchItems = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const res = await fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() })
      if (!res.ok) throw new Error("Gagal mengambil data barang")
      const rawData = await res.json()
      const data: BarangUnit[] = rawData.data || rawData

      const currentUserDisplayName = user.displayName || ""
      const mitraItems = data.filter(
        (item) => item.mitra?.trim().toLowerCase() === currentUserDisplayName.trim().toLowerCase()
      )
      setItems(mitraItems)
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat tugas harian")
    } finally {
      setIsLoading(false)
    }
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const handleStartScan = useCallback(async (item: BarangUnit) => {
    setCameraError(null)
    setPreviewImage(null)
    setActiveItem(item)
    setIsCameraOpen(true)
    
    // Lokasi GPS tidak lagi dicari di sini, tapi di latar belakang halaman

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => { })
        }
      }, 50)
    } catch (err: any) {
      console.error("Gagal membuka kamera:", err)
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan aplikasi."
          : "Tidak bisa membuka kamera. Pastikan tidak ada aplikasi lain yang sedang memakainya."
      )
    }
  }, [])

  const handleCloseCamera = useCallback(() => {
    stopCameraStream()
    setIsCameraOpen(false)
    setActiveItem(null)
    setCameraError(null)
    setPreviewImage(null)
    setRawImage(null)
  }, [])

  const drawWatermark = useCallback((sourceCanvas: HTMLCanvasElement, itemForWatermark: BarangUnit): string => {
    const ctx = sourceCanvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")

    const width = sourceCanvas.width
    const height = sourceCanvas.height

    const bottomOffset = 220
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    // Tinggi kotak hitam dinaikkan jadi 135px agar muat 3 baris
    ctx.fillRect(0, height - bottomOffset, width, 135)

    ctx.fillStyle = "white"
    ctx.font = "bold 24px sans-serif"
    const timestamp = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })
    
    // Baris 1: Waktu
    ctx.fillText(`Waktu: ${timestamp}`, 20, height - bottomOffset + 40)
    
    // Baris 2: Lokasi / Geotag
    if (geotag) {
      if (geotag.lat === 0 && geotag.lng === 0) {
        ctx.fillText(`Lokasi: Gagal mendapatkan sinyal`, 20, height - bottomOffset + 80)
      } else {
        ctx.fillText(`Lokasi: ${geotag.lat.toFixed(6)}, ${geotag.lng.toFixed(6)}`, 20, height - bottomOffset + 80)
      }
    } else {
      ctx.fillText(`Lokasi: Mencari GPS...`, 20, height - bottomOffset + 80)
    }
    
    // Baris 3: SN & User
    ctx.fillText(`SN: ${itemForWatermark.serialNumber}`, 20, height - bottomOffset + 120)
    ctx.fillText(`User: ${user?.displayName || "Mitra"}`, Math.max(20, width - 300), height - bottomOffset + 120)

    return sourceCanvas.toDataURL("image/jpeg", 0.8)
  }, [user, geotag])

  /**
   * Capture 1 frame ke canvas dan tampilkan sebagai PREVIEW dulu.
   * Belum langsung disimpan — user harus konfirmasi via tombol "Gunakan Foto".
   */
  const handleCapture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const currentItem = activeItem

    if (!video || !canvas || !currentItem) return

    try {
      const maxWidth = 1200
      let width = video.videoWidth
      let height = video.videoHeight
      if (width > maxWidth) {
        height = Math.floor(height * (maxWidth / width))
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not supported")
      ctx.drawImage(video, 0, 0, width, height)

      const rawBase64 = canvas.toDataURL("image/jpeg", 0.9)
      setRawImage(rawBase64)

      const watermarkedBase64 = drawWatermark(canvas, currentItem)
      setPreviewImage(watermarkedBase64)
    } catch (error: any) {
      console.error("Error saat capture foto:", error)
      toast.error("Gagal mengambil foto, coba lagi.")
    }
  }, [activeItem, drawWatermark])

  // User tekan "Ulangi" di layar preview -> kembali ke live camera
  const handleRetake = useCallback(() => {
    setPreviewImage(null)
    setRawImage(null)
  }, [])

  // User tekan "Gunakan Foto" -> Verifikasi Barcode lalu simpan ke local storage
  const handleConfirmPhoto = useCallback(async () => {
    const currentItem = activeItem
    if (!currentItem || !previewImage || !rawImage) return

    setIsProcessing(true)
    const toastId = toast.loading("Memeriksa Barcode pada foto...", { duration: 15000 })

    try {
      const file = dataURLtoFile(rawImage, "recon.jpg")
      const detectedValues: string[] = []

      // 1. Coba Native BarcodeDetector (lebih cepat jika didukung browser/WebView)
      if ("BarcodeDetector" in window) {
        try {
          const imageUrl = URL.createObjectURL(file)
          const img = new window.Image()
          img.src = imageUrl
          await img.decode()
          const detector = new (window as any).BarcodeDetector()
          const barcodes = await detector.detect(img)
          URL.revokeObjectURL(imageUrl)
          
          if (barcodes && barcodes.length > 0) {
            for (const b of barcodes) {
              if (b?.rawValue && typeof b.rawValue === "string") {
                detectedValues.push(b.rawValue.trim())
              }
            }
          }
        } catch (err) {
          console.warn("Native BarcodeDetector fail, fallback to html5-qrcode", err)
        }
      }

      // 2. Fallback ke Html5Qrcode jika native gagal / kosong
      if (detectedValues.length === 0) {
        try {
          const scanner = new Html5Qrcode("hidden-recon-scanner", { verbose: false })
          const scanned = await scanner.scanFile(file, false)
          if (scanned && typeof scanned === "string") {
            detectedValues.push(scanned.trim())
          }
        } catch (err) {
          console.log("html5-qrcode tidak menemukan barcode", err)
        }
      }

      // Validasi 1: Pastikan ada barcode yang terbaca
      if (detectedValues.length === 0) {
        toast.error("Barcode tidak terdeteksi. Pastikan Anda memotret gambar barcode dengan jelas dan fokus.", { id: toastId, duration: 5000 })
        setIsProcessing(false)
        return
      }

      // Normalisasi karakter untuk perbandingan yang presisi dan adil
      const cleanString = (val: string) => val.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      const targetSn = cleanString(currentItem.serialNumber)
      const targetWithoutPrefix = targetSn.replace(/^(sn|ser|no|snno)/i, "")

      const isMatch = detectedValues.some((val) => {
        const raw = cleanString(val)
        const rawWithoutPrefix = raw.replace(/^(sn|ser|no|snno)/i, "")

        // 1. Cocok persis (exact match setelah dibersihkan dari simbol)
        if (raw === targetSn) return true

        // 2. Cocok tanpa prefix 'SN' / 'SER' / 'NO' (misal database "SN123456" tapi barcode tercetak "123456" atau sebaliknya)
        if (targetWithoutPrefix && rawWithoutPrefix === targetWithoutPrefix) return true

        // 3. Barcode pabrik mengandung full SN (misal "MODEL-SN123456-VER1")
        if (targetSn.length >= 5 && raw.includes(targetSn)) return true
        if (targetWithoutPrefix.length >= 5 && rawWithoutPrefix.includes(targetWithoutPrefix)) return true

        return false
      })

      // Validasi 2: Pastikan SN benar-benar cocok dengan item yang sedang diperiksa
      if (!isMatch) {
        toast.error(
          `Nomor Seri (SN) tidak cocok! Diharapkan: ${currentItem.serialNumber}, Terdeteksi: ${detectedValues.join(", ")}`,
          { id: toastId, duration: 6000 }
        )
        setIsProcessing(false)
        return
      }

      toast.success("Foto valid! Barcode SN Terverifikasi.", { id: toastId })
      
      const timestamp = new Date().toLocaleString()
      
      setCompletedItems(prev => {
        const newItems = {
          ...prev,
          [currentItem.id]: { imageUrl: previewImage, timestamp }
        }

        if (user) {
          const today = getTodayDateKey()
          const storageKey = `taslim_recon_${user.id}_${today}`
          localStorage.setItem(storageKey, JSON.stringify(newItems))
          
          // Sync with API
          fetch(`${getBaseUrl()}/recon-progress`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              userId: user.id,
              date: today,
              itemId: currentItem.id,
              imageUrl: previewImage,
              timestamp
            })
          }).catch(err => console.error("Gagal sync progress recon ke API", err))
        }

        return newItems
      })

      stopCameraStream()
      setIsCameraOpen(false)
      setActiveItem(null)
      setPreviewImage(null)
      setRawImage(null)

    } catch (err) {
      console.error("Scanner Error:", err)
      toast.error("Gagal memproses foto. Silakan ulangi.", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }, [activeItem, previewImage, rawImage, user])

  const submitReport = async () => {
    const toastId = toast.loading("Mengirim laporan recon harian...")
    try {
      const today = getTodayDateKey()
      const reportData = {
        userId: user?.id,
        mitra: user?.displayName,
        tanggal: today,
        itemsCount: Object.keys(completedItems).length,
        items: Object.entries(completedItems).map(([id, data]) => ({
          itemId: id,
          ...data
        }))
      }

      const res = await fetch(`${getBaseUrl()}/recon-reports`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(reportData)
      })

      if (!res.ok) throw new Error("Gagal mengirim laporan")
      
      toast.success("Laporan Recon Harian berhasil dikirim ke pusat!", { id: toastId, duration: 5000 })
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengirim laporan", { id: toastId })
      console.error(err)
    }
  }

  const handleResetRecon = () => {
    if (user) {
      const today = getTodayDateKey()
      const storageKey = `taslim_recon_${user.id}_${today}`
      localStorage.removeItem(storageKey)
      setCompletedItems({})
      
      // Delete from API
      fetch(`${getBaseUrl()}/recon-progress?userId=${user.id}&date=${today}`, {
        method: "DELETE",
        headers: getHeaders()
      }).catch(err => console.error("Gagal reset recon di API", err))

      toast.success("Data recon harian berhasil di-reset!")
    }
  }

  const pendingItems = items.filter(i => !completedItems[i.id])
  const doneItems = items.filter(i => !!completedItems[i.id])

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:p-8 animate-fade-in max-w-3xl mx-auto relative">
      <canvas ref={canvasRef} className="hidden" />
      <div id="hidden-recon-scanner" className="hidden" />

      {/* Modal kamera in-page */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),32px)] text-white shrink-0">
            <div>
              <p className="text-sm text-white/70">Foto</p>
              <p className="font-mono font-bold">{activeItem?.serialNumber}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleCloseCamera}>
              <X className="size-5" />
            </Button>
          </div>

          {/* Area video/preview dan Kontrol (dijadikan overlay agar tombol tidak terpotong di layar HP) */}
          <div className="flex-1 relative overflow-hidden bg-black min-h-0 flex flex-col justify-end">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center text-white p-6 space-y-3 max-w-xs">
                  <AlertCircle className="size-10 mx-auto text-red-400" />
                  <p>{cameraError}</p>
                  <Button variant="outline" className="text-white border-white/30" onClick={() => activeItem && handleStartScan(activeItem)}>
                    <RotateCcw className="size-4 mr-2" />
                    Coba Lagi
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-contain ${previewImage ? 'hidden' : ''}`}
                />
                {previewImage && (
                  <img
                    src={previewImage}
                    alt="Preview hasil foto"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </>
            )}

            {/* Kontrol bawah: diposisikan overlay absolute di atas video agar tidak kelempar ke bawah */}
            {!cameraError && (
              <div className="absolute bottom-0 inset-x-0 p-6 pb-[calc(2rem+env(safe-area-inset-bottom,24px))] flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20">
                {previewImage ? (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-white border-white/30 flex-1 max-w-[160px] backdrop-blur-sm bg-black/20"
                      disabled={isProcessing}
                      onClick={handleRetake}
                    >
                      <RotateCcw className="size-4 mr-2" />
                      Ulangi
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 max-w-[160px] bg-primary text-primary-foreground font-semibold shadow-lg"
                      disabled={isProcessing}
                      onClick={handleConfirmPhoto}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="size-4 mr-2" />
                      )}
                      Oke
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      size="lg"
                      className="rounded-full size-20 p-0 shadow-2xl bg-white text-black hover:bg-gray-200 transition-transform active:scale-95 border-4 border-gray-400"
                      onClick={handleCapture}
                    >
                      <Camera className="size-8" />
                    </Button>
                    <span className="text-white drop-shadow-md text-sm font-medium">Ambil Foto</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-6 text-primary" />
            Tugas Harian (Recon)
          </h1>
          <p className="text-sm text-muted-foreground">
            Ambil foto fisik barang untuk memverifikasi ketersediaan material di lapangan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetRecon} className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
          <RotateCcw className="size-4 mr-2" />
          Reset
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="pending">Belum Selesai ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="done">Selesai ({doneItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="font-medium">Hore! Semua tugas selesai.</p>
              <p className="text-sm">Tidak ada barang yang perlu di-recon lagi hari ini.</p>
            </div>
          ) : (
            pendingItems.map(item => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-amber-500">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-bold text-base">{item.serialNumber}</h3>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>
                  </div>
                  <div className="flex text-xs text-muted-foreground gap-3">
                    <span>{item.merek}</span>
                    <span>&bull;</span>
                    <span>{item.kategori}</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleStartScan(item)}
                  disabled={isProcessing || isCameraOpen}
                  className="w-full sm:w-auto shadow-sm"
                >
                  <Camera className="size-4 mr-2" />
                  Foto
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="done" className="space-y-4">
          {doneItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <ImageIcon className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada barang yang diselesaikan.</p>
            </div>
          ) : (
            doneItems.map(item => {
              const result = completedItems[item.id]
              return (
                <Card key={item.id} className="p-4 flex flex-col md:flex-row gap-4 border-l-4 border-l-emerald-500 overflow-hidden">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold text-base">{item.serialNumber}</h3>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                        <Check className="size-3 mr-1" /> Terverifikasi
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Diverifikasi pada: {result.timestamp}
                    </div>
                  </div>

                  <div className="relative w-full md:w-32 h-24 rounded-md overflow-hidden bg-muted flex shrink-0 group border border-border shadow-sm">
                    <img
                      src={result.imageUrl}
                      alt={`Bukti SN ${item.serialNumber}`}
                      className="object-cover w-full h-full cursor-zoom-in"
                      onClick={() => setViewingImage(result.imageUrl)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-white font-medium">Klik u/ Buka</span>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      {doneItems.length > 0 && doneItems.length === items.length && (
        <Card className="p-4 mt-6 bg-primary/10 border-primary shadow-sm flex items-start gap-4">
          <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">Sesi Selesai</h4>
            <p className="text-xs text-muted-foreground">
              Semua tugas recon harian Anda telah diselesaikan. Dalam versi produksi, tombol "Kirim Laporan" akan muncul di sini untuk menyinkronkan data dengan sistem pusat.
            </p>
            <Button className="mt-3 w-full sm:w-auto" size="sm" onClick={submitReport}>
              Kirim Laporan Recon
            </Button>
          </div>
        </Card>
      )}

      {/* Lightbox / Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-fade-in backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),32px)] text-white shrink-0 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10">
            <span className="font-medium drop-shadow-md">Detail Foto</span>
            <Button variant="ghost" size="icon" onClick={() => setViewingImage(null)} className="text-white hover:bg-white/20 rounded-full">
              <X className="size-6" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 h-full">
            <img src={viewingImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Detail" />
          </div>
        </div>
      )}
    </div>
  )
}