import * as React from "react"
import { createPortal } from "react-dom"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Camera, Zap, ZapOff, RefreshCw, CheckCircle2, AlertCircle, X, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

// Web Audio API helper for synthesizer beeps on mobile
const playScannerBeep = (type: "success" | "error" | "info" = "success") => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === "success") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(950, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.stop(ctx.currentTime + 0.12)
    } else if (type === "error") {
      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(180, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.stop(ctx.currentTime + 0.25)
    } else {
      osc.type = "sine"
      osc.frequency.setValueAtTime(500, ctx.currentTime)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.stop(ctx.currentTime + 0.08)
    }
  } catch (err) {
    console.error("Failed to play synth audio beep", err)
  }
}

interface CameraScannerProps {
  onScan: (code: string, mode?: "masuk" | "keluar" | "cari") => Promise<any> | any
  buttonText?: string
  className?: string
  children?: React.ReactNode
  showModeTabs?: boolean
  defaultMode?: "masuk" | "keluar" | "cari"
}

export function CameraScanner({
  onScan,
  buttonText = "Scan via Kamera",
  className,
  children,
  showModeTabs = false,
  defaultMode = "cari",
}: CameraScannerProps) {
  const [open, setOpen] = React.useState(false)
  const [activeMode, setActiveMode] = React.useState<"masuk" | "keluar" | "cari">(defaultMode)
  const [scannedCodes, setScannedCodes] = React.useState<{ code: string; status: "success" | "error"; message?: string; timestamp: Date }[]>([])
  const [isTorchOn, setIsTorchOn] = React.useState(false)
  const [hasTorch, setHasTorch] = React.useState(false)
  const [cameraActive, setCameraActive] = React.useState(false)
  const [scanFlash, setScanFlash] = React.useState<"success" | "error" | null>(null)

  const onScanRef = React.useRef(onScan)
  React.useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const qrScannerRef = React.useRef<Html5Qrcode | null>(null)
  const lastScannedCodeRef = React.useRef<{ code: string; time: number } | null>(null)
  const readerId = "camera-scanner-viewfinder"

  // Start Scanner
  const startScanner = React.useCallback(async () => {
    if (!open) return

    try {
      const element = document.getElementById(readerId)
      if (!element) {
        // If element is not in DOM yet, retry in 100ms
        setTimeout(() => {
          startScanner()
        }, 100)
        return
      }

      if (qrScannerRef.current) return

      setCameraActive(true)
      const scanner = new Html5Qrcode(readerId, { formatsToSupport: SCAN_FORMATS, verbose: false })
      qrScannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30, // naikkan dari 25 → 30, lebih sering polling frame
          disableFlip: true, // skip pengecekan mirror/flip, kurangi beban decode per frame
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }, // pastikan browser kirim frame rate tinggi, bukan cuma diminta di fps decoder
          },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true, // ini sudah bagus — pakai native BarcodeDetector di Chrome Android, jauh lebih cepat dari JS decoder (ZXing)
          },
        } as any,
        async (decodedText) => {
          const now = Date.now()
          if (
            lastScannedCodeRef.current &&
            lastScannedCodeRef.current.code === decodedText &&
            now - lastScannedCodeRef.current.time < 2500
          ) {
            return
          }
          lastScannedCodeRef.current = { code: decodedText, time: now }

          try {
            const result = await onScanRef.current(decodedText, activeMode)
            if (result && result.success === false) {
              if (result.ignored) {
                lastScannedCodeRef.current = null
                return
              }
              throw new Error(result.message || "Ditolak oleh sistem")
            }
            if (navigator.vibrate) navigator.vibrate(150)
            playScannerBeep("success")
            setScanFlash("success")
            setScannedCodes((prev) => [
              { code: decodedText, status: "success", timestamp: new Date() },
              ...prev.slice(0, 19),
            ])
            toast.success(`SN Discan: ${decodedText}`)
          } catch (err: any) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100])
            playScannerBeep("error")
            setScanFlash("error")
            const errMsg = err.message || "Barang tidak valid"
            setScannedCodes((prev) => [
              { code: decodedText, status: "error", message: errMsg, timestamp: new Date() },
              ...prev.slice(0, 19),
            ])
            toast.error(errMsg, { description: decodedText })
          } finally {
            setTimeout(() => setScanFlash(null), 500)
          }
        },
        () => {
          // Silent frame scanning error callback
        }
      )

      // Check flashlight compatibility
      setTimeout(() => {
        try {
          if (scanner.isScanning) {
            const caps = scanner.getRunningTrackCapabilities()
            if ((caps as any).torch) {
              setHasTorch(true)
            }
          }
        } catch (e) {
          console.warn("Torch capability check failed", e)
        }
      }, 1200)

    } catch (err) {
      console.error("Failed to start HTML5 Scanner", err)
      toast.error("Gagal membuka kamera. Pastikan izin kamera telah diberikan.")
      setCameraActive(false)
    }
  }, [open])

  // Stop Scanner
  const stopScanner = React.useCallback(async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop()
      } catch (err) {
        console.error("Failed to stop scanner", err)
      }
    }
    qrScannerRef.current = null
    lastScannedCodeRef.current = null
    setIsTorchOn(false)
    setHasTorch(false)
    setCameraActive(false)
  }, [])

  // Handle open state changes
  React.useEffect(() => {
    if (open) {
      startScanner()
    } else {
      stopScanner()
    }
    return () => {
      stopScanner()
    }
  }, [open, startScanner, stopScanner])

  // Toggle Flashlight (Torch)
  const toggleTorch = async () => {
    if (!qrScannerRef.current) return
    try {
      const nextTorch = !isTorchOn
      await qrScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      })
      setIsTorchOn(nextTorch)
    } catch (err) {
      console.error("Flashlight control failed", err)
      toast.error("Gagal mengontrol lampu flash")
    }
  }

  // Handle barcode file upload scanning
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const wasCameraActive = cameraActive

    if (wasCameraActive) {
      await stopScanner()
    }

    try {
      let detectedTexts: string[] = []

      // 1. Try native BarcodeDetector for native multi-barcode scanning support
      if ("BarcodeDetector" in window) {
        try {
          const imageUrl = URL.createObjectURL(file)
          try {
            const img = new window.Image()
            img.src = imageUrl
            await img.decode()
            const detector = new (window as any).BarcodeDetector()
            const barcodes = await detector.detect(img)
            if (barcodes && barcodes.length > 0) {
              detectedTexts = barcodes.map((b: any) => b.rawValue)
            }
          } finally {
            URL.revokeObjectURL(imageUrl)
          }
        } catch (err) {
          console.warn("Native BarcodeDetector failed", err)
        }
      }

      // 2. Also run html5-qrcode's scanFile to capture any codes the native scanner might have missed
      try {
        let scanner = qrScannerRef.current
        if (!scanner) {
          scanner = new Html5Qrcode(readerId, { formatsToSupport: SCAN_FORMATS, verbose: false })
          qrScannerRef.current = scanner
        }
        const decodedText = await scanner.scanFile(file, false)
        if (decodedText && !detectedTexts.includes(decodedText)) {
          detectedTexts.push(decodedText)
        }
      } catch (err) {
        console.log("html5-qrcode scanFile did not decode additional codes", err)
      }

      if (detectedTexts.length === 0) {
        throw new Error("Tidak ada barcode yang terdeteksi.")
      }

      toast.success(`${detectedTexts.length} barcode terdeteksi di gambar. Memproses...`)

      // Process each detected code
      for (const decodedText of detectedTexts) {
        // Simple delay to prevent simultaneous toast collisions
        await new Promise((resolve) => setTimeout(resolve, 300))

        try {
          const result = await onScanRef.current(decodedText, activeMode)
          if (result && result.success === false) {
            if (result.ignored) {
              continue
            }
            throw new Error(result.message || "Ditolak oleh sistem")
          }
          if (navigator.vibrate) navigator.vibrate(100)
          playScannerBeep("success")
          setScanFlash("success")
          setScannedCodes((prev) => [
            { code: decodedText, status: "success", timestamp: new Date() },
            ...prev.slice(0, 19),
          ])
          toast.success(`SN Terdeteksi: ${decodedText}`)
        } catch (err: any) {
          playScannerBeep("error")
          setScanFlash("error")
          const errMsg = err.message || "Barang tidak valid"
          setScannedCodes((prev) => [
            { code: decodedText, status: "error", message: errMsg, timestamp: new Date() },
            ...prev.slice(0, 19),
          ])
          toast.error(errMsg, { description: decodedText })
        }
      }
    } catch (err) {
      console.error("Gagal mendeteksi barcode dari gambar", err)
      toast.error("Gagal membaca gambar. Pastikan gambar memiliki barcode/QR code yang jelas.")
    } finally {
      setTimeout(() => setScanFlash(null), 500)
      event.target.value = ""
      if (wasCameraActive) {
        await startScanner()
      }
    }
  }

  const scannerOverlay = open ? (
    <div className="fixed inset-0 h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden p-0 z-[9999] select-none">
      {/* Full-Screen Camera Viewfinder */}
      <div className="absolute inset-0 w-full h-full bg-zinc-950 z-0 flex items-center justify-center">
        <div
          id={readerId}
          className="w-full h-full [&_video]:object-cover [&_video]:w-full! [&_video]:h-full! [&_video]:min-h-full!"
        />
      </div>

      {/* Semi-transparent dark overlay overlayed with header/controls */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between pointer-events-none p-6">
        
        {/* Header Area */}
        <div className="w-full flex items-center justify-between pointer-events-auto pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-gradient-to-b from-black/85 via-black/50 to-transparent absolute top-0 left-0 right-0 px-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full size-10 bg-black/40 hover:bg-black/60 text-white border border-white/10 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </Button>
          
          <span className="text-zinc-100 font-semibold text-base select-none">
            {showModeTabs 
              ? (activeMode === "masuk" ? "Scan Barang Masuk" : activeMode === "keluar" ? "Scan Barang Keluar" : "Cari Info Barang")
              : (buttonText === "Scan via Kamera" ? "Scan Barang" : buttonText)
            }
          </span>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="file-scanner-input"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-zinc-800 text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 hover:text-white cursor-pointer px-3.5 rounded-full backdrop-blur-md gap-1.5"
              onClick={() => document.getElementById("file-scanner-input")?.click()}
            >
              <Image className="size-4 text-blue-400" />
              Upload Foto
            </Button>
          </div>
        </div>

        {/* Mode Selector Tabs (Top center overlay) */}
        {showModeTabs && (
          <div className="absolute top-[calc(5rem+env(safe-area-inset-top,0px))] left-6 right-6 flex justify-center pointer-events-auto z-20">
            <div className="flex bg-black/65 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg w-full max-w-[320px]">
              <button
                type="button"
                onClick={() => setActiveMode("masuk")}
                className={cn(
                  "flex-1 text-[11px] font-bold py-2 px-3 rounded-full transition-all text-center cursor-pointer select-none",
                  activeMode === "masuk" 
                    ? "bg-emerald-500 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Barang Masuk
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("keluar")}
                className={cn(
                  "flex-1 text-[11px] font-bold py-2 px-3 rounded-full transition-all text-center cursor-pointer select-none",
                  activeMode === "keluar" 
                    ? "bg-sky-500 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Barang Keluar
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("cari")}
                className={cn(
                  "flex-1 text-[11px] font-bold py-2 px-3 rounded-full transition-all text-center cursor-pointer select-none",
                  activeMode === "cari" 
                    ? "bg-violet-500 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Cari Detail
              </button>
            </div>
          </div>
        )}

        {/* Floating Instructions Banner (At the bottom, above scanned list) */}
        <div className="absolute bottom-[26%] left-0 right-0 flex justify-center pointer-events-none select-none px-6">
          <span className="text-xs font-semibold text-zinc-100 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-md text-center max-w-[85%]">
            Posisikan barcode di depan kamera untuk memindai otomatis
          </span>
        </div>

        {/* Flashlight and camera reload floating controls */}
        {cameraActive && (
          <div className="absolute bottom-[34%] right-6 flex flex-col gap-3 pointer-events-auto z-20">
            {hasTorch && (
              <Button
                onClick={toggleTorch}
                variant="secondary"
                size="icon"
                className="rounded-full size-11 bg-black/60 border border-zinc-800 text-white hover:bg-black/85 cursor-pointer backdrop-blur-md shadow-lg"
                title="Flashlight"
              >
                {isTorchOn ? <ZapOff className="size-5" /> : <Zap className="size-5 text-amber-400" />}
              </Button>
            )}
            <Button
              onClick={async () => {
                await stopScanner()
                await startScanner()
              }}
              variant="secondary"
              size="icon"
              className="rounded-full size-11 bg-black/60 border border-zinc-800 text-white hover:bg-black/85 cursor-pointer backdrop-blur-md shadow-lg"
              title="Restart Camera"
            >
              <RefreshCw className="size-5" />
            </Button>
          </div>
        )}

        {/* Scan Flash Feedback Screen Overlay */}
        {scanFlash && (
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-200 flex items-center justify-center backdrop-blur-xs z-30 ${
              scanFlash === "success" ? "bg-emerald-500/20" : "bg-rose-500/20"
            }`}
          >
            <div className={`p-4 rounded-full ${scanFlash === "success" ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"} shadow-2xl`}>
              {scanFlash === "success" ? (
                <CheckCircle2 className="size-12 animate-[ping_1.5s_infinite_ease-out]" />
              ) : (
                <AlertCircle className="size-12 animate-[bounce_0.5s_infinite_ease-in-out]" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recently Scanned List (Solid background at the bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-[calc(24vh+env(safe-area-inset-bottom,0px))] bg-zinc-950 border-t border-zinc-800/80 flex flex-col pointer-events-none pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="px-6 py-2 flex justify-between items-center border-b border-white/5 pointer-events-auto">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider select-none">Hasil Scan Sesi Ini</span>
          <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full select-none">
            {scannedCodes.filter(c => c.status === "success").length} Berhasil
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 px-6 flex flex-col gap-2 pointer-events-auto">
          {scannedCodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-4 text-center gap-1.5 select-none">
              <Camera className="size-5 opacity-40 animate-pulse" />
              <span className="text-xs">Pindai barcode untuk melihat hasil di sini</span>
            </div>
          ) : (
            scannedCodes.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start justify-between p-2.5 rounded-xl border text-xs backdrop-blur-md ${
                  item.status === "success"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-zinc-100 shadow-[0_2px_8px_rgba(16,185,129,0.1)]"
                    : "border-rose-500/25 bg-rose-500/10 text-zinc-100 shadow-[0_2px_8px_rgba(239,68,68,0.1)]"
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-mono font-semibold truncate text-[13px]">{item.code}</p>
                  {item.message && (
                    <p className="text-[10px] text-rose-400 font-medium mt-0.5">{item.message}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center h-full">
                  {item.status === "success" ? (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-md">Valid</span>
                  ) : (
                    <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.5 rounded-md">Gagal</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {children ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button className={className} variant="outline" onClick={() => setOpen(true)}>
          <Camera className="mr-2 size-4" />
          {buttonText}
        </Button>
      )}
      {open && typeof document !== "undefined" && createPortal(scannerOverlay, document.body)}
    </>
  )
}
