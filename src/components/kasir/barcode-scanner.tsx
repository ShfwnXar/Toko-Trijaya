"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void
  autoStart?: boolean
}

export function BarcodeScanner({ onBarcodeDetected, autoStart = false }: BarcodeScannerProps) {
  const [isActive, setIsActive] = useState(autoStart)
  const [error, setError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const lastScanTimeRef = useRef<number>(0)
  const lastBarcodeRef = useRef<string>("")

  const startHintTimer = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    setShowHint(false)
    hintTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setShowHint(true)
    }, 10000)
  }, [])

  // Play beep sound on successful scan
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(1800, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.15)
    } catch {
      // Audio not available, ignore
    }
  }, [])

  const stopScanner = useCallback(async () => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
    setShowHint(false)

    const scanner = html5QrCodeRef.current
    html5QrCodeRef.current = null

    if (scanner) {
      try {
        // Try to check state, but don't fail if it errors
        let isScanning = false
        try {
          const state = scanner.getState()
          isScanning = state === 2 // SCANNING
        } catch {
          // getState might fail if not started yet
          isScanning = true // try to stop anyway
        }

        if (isScanning) {
          await scanner.stop()
        }
        scanner.clear()
      } catch {
        // Force clear the DOM element
        try { scanner.clear() } catch { /* ignore */ }
      }
    }

    // Also clear the scanner region DOM element
    const el = document.getElementById("barcode-scanner-region")
    if (el) el.remove()
  }, [])

  const startScanner = useCallback(async () => {
    setError(null)
    setShowHint(false)

    try {
      const { Html5Qrcode } = await import("html5-qrcode")

      if (!scannerRef.current || !isMountedRef.current) return

      const scannerId = "barcode-scanner-region"

      // Remove old element if exists
      const oldEl = document.getElementById(scannerId)
      if (oldEl) oldEl.remove()

      // Create fresh element
      const el = document.createElement("div")
      el.id = scannerId
      el.style.width = "100%"
      el.style.minHeight = "200px"
      scannerRef.current.appendChild(el)

      const html5QrCode = new Html5Qrcode(scannerId)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: undefined, // Scan full frame — better for small barcodes
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          const now = Date.now()
          // Debounce: ignore same barcode within 2 seconds
          if (decodedText === lastBarcodeRef.current && now - lastScanTimeRef.current < 2000) {
            return
          }
          lastBarcodeRef.current = decodedText
          lastScanTimeRef.current = now
          
          // Play beep sound
          playBeep()
          
          // Show last scanned barcode briefly
          if (isMountedRef.current) setLastScanned(decodedText)
          setTimeout(() => { if (isMountedRef.current) setLastScanned(null) }, 2000)
          
          onBarcodeDetected(decodedText)
          startHintTimer()
        },
        () => { /* no code detected this frame */ }
      )

      startHintTimer()
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
        setError("Akses kamera ditolak. Gunakan pencarian manual atau USB scanner.")
      } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
        setError("Kamera tidak ditemukan. Gunakan pencarian manual atau USB scanner.")
      } else {
        setError("Gagal mengaktifkan kamera. Coba refresh halaman.")
      }
      if (isMountedRef.current) setIsActive(false)
    }
  }, [onBarcodeDetected, startHintTimer])

  const toggleScanner = useCallback(async () => {
    if (isActive) {
      await stopScanner()
      setIsActive(false)
    } else {
      setIsActive(true)
    }
  }, [isActive, stopScanner])

  // Start scanner when isActive becomes true
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) startScanner()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isActive, startScanner])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="w-full space-y-3">
      <Button
        type="button"
        variant={isActive ? "destructive" : "default"}
        onClick={toggleScanner}
        className={`w-full min-h-[44px] ${!isActive ? "bg-primary hover:bg-primary/90" : ""}`}
      >
        {isActive ? "⏹ Matikan Kamera" : "📷 Scan Barcode"}
      </Button>

      {isActive && (
        <div className="w-full">
          <div
            ref={scannerRef}
            className="w-full rounded-lg overflow-hidden border border-border bg-black min-h-[200px]"
          />

          {lastScanned && (
            <div className="mt-2 text-center bg-green-50 border border-green-200 rounded-md py-2 px-3 animate-pulse">
              <p className="text-sm font-medium text-green-700">✓ Terdeteksi: {lastScanned}</p>
            </div>
          )}

          {showHint && !lastScanned && (
            <p className="text-sm text-amber-600 mt-2 text-center animate-pulse">
              💡 Tidak terdeteksi. Posisikan ulang barcode atau gunakan pencarian manual.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md text-center">
          {error}
        </div>
      )}
    </div>
  )
}
