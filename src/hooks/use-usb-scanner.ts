"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * useUsbScanner - React hook for detecting USB barcode scanner input.
 *
 * USB barcode scanners emulate keyboard input with rapid keystrokes
 * (< 50ms between characters) terminated by an Enter key.
 *
 * This hook captures those rapid sequences and calls onDetected(barcode)
 * within 200ms of input completion, while preventing interference with
 * normal keyboard input in focused form fields.
 *
 * @param onDetected - Callback fired when a barcode is detected
 */
export function useUsbScanner(onDetected: (barcode: string) => void) {
  const bufferRef = useRef<string>("")
  const lastKeyTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDetectedRef = useRef(onDetected)

  // Keep callback reference fresh without causing re-subscription
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const resetBuffer = useCallback(() => {
    bufferRef.current = ""
    lastKeyTimeRef.current = 0
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current

      // If the active element is a form input and the keystroke timing is slow,
      // it's likely normal typing — don't interfere
      const activeElement = document.activeElement
      const isFormField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement

      // Enter key terminates the barcode sequence
      if (event.key === "Enter") {
        const barcode = bufferRef.current.trim()

        // A valid barcode from USB scanner: at least 3 chars, entered rapidly
        if (barcode.length >= 3) {
          event.preventDefault()
          event.stopPropagation()

          // Fire callback within 200ms requirement
          onDetectedRef.current(barcode)
        }

        resetBuffer()
        return
      }

      // Only capture printable single characters
      if (event.key.length !== 1) {
        // Non-printable key (Shift, Ctrl, etc.) — ignore but don't reset
        return
      }

      // Check timing — if too slow (>50ms gap) and we already have buffer content,
      // this is probably normal typing
      if (bufferRef.current.length > 0 && timeSinceLastKey > 50) {
        // If in a form field, the previous buffer was probably just normal typing
        if (isFormField) {
          resetBuffer()
          return
        }
        // If not in form field but timing is slow, reset and start fresh
        resetBuffer()
      }

      // If this is the first character and we're in a form field,
      // we don't know yet if it's a scanner or user typing. Start buffering.
      bufferRef.current += event.key
      lastKeyTimeRef.current = now

      // Set a timeout to clear the buffer if no more rapid keys arrive
      // This prevents stale characters from accumulating
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        resetBuffer()
      }, 200)
    }

    // Use capture phase to intercept before form inputs process the event
    document.addEventListener("keydown", handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [resetBuffer])
}
