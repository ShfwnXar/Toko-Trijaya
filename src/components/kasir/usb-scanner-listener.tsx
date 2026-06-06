"use client"

import { useUsbScanner } from "@/hooks/use-usb-scanner"

interface UsbScannerListenerProps {
  onBarcodeDetected: (barcode: string) => void
}

/**
 * UsbScannerListener - Invisible component that listens for USB barcode scanner input.
 *
 * Mount this component anywhere in the kasir page to enable USB scanner detection.
 * It uses keyboard event listeners to detect rapid keystrokes (< 50ms between characters)
 * terminated by Enter key, characteristic of USB barcode scanners.
 */
export function UsbScannerListener({ onBarcodeDetected }: UsbScannerListenerProps) {
  useUsbScanner(onBarcodeDetected)

  // This component renders nothing — it only provides the USB scanner behavior
  return null
}
