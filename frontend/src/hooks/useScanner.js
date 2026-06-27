import { useCallback, useEffect, useRef, useState } from 'react'

export function useScanner({ onResult, readerId = 'scanner-video' } = {}) {
  const controlsRef = useRef(null)
  const readerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState('')

  const handleResult = useCallback((barcode) => {
    setLastResult(barcode)
    onResult?.(barcode)
  }, [onResult])

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
  }, [])

  const start = useCallback(async () => {
    setError('')

    const videoElement = document.getElementById(readerId)

    if (!videoElement) {
      setError('Preview kamera belum siap.')
      return
    }

    try {
      stop()

      if (!readerRef.current) {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
        ])
        readerRef.current = new BrowserMultiFormatReader(hints)
      }

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, decodeError) => {
          if (result) {
            handleResult(result.getText())
            stop()
            return
          }

          if (decodeError && decodeError.name !== 'NotFoundException') {
            setError(decodeError.message ?? 'Barcode belum dapat dibaca.')
          }
        },
      )
      setIsScanning(true)
    } catch (error) {
      setError(error.message ?? 'Kamera tidak dapat diakses.')
      setIsScanning(false)
    }
  }, [handleResult, readerId, stop])

  const submitManualResult = useCallback(
    (barcode) => {
      if (!barcode) return
      handleResult(barcode)
    },
    [handleResult],
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    error,
    isScanning,
    lastResult,
    start,
    stop,
    submitManualResult,
  }
}
