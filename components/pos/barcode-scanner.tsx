"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { X, Scan, Camera, Loader2, RefreshCw, CheckCircle2 } from "lucide-react"

interface BarcodeScannerProps {
    onDetect: (value: string) => void
}

type Direction = "left" | "right" | "up" | "down" | "center"
type Proximity = "too-close" | "too-far" | "good"

interface Guidance {
    direction: Direction
    proximity: Proximity
    confidence: number
}

const SCAN_W = 280
const SCAN_H = 180

function analyzeVideoFrame(video: HTMLVideoElement): Guidance {
    const cw = video.videoWidth || 640
    const ch = video.videoHeight || 480
    if (cw < 10 || ch < 10) {
        return { direction: "center", proximity: "good", confidence: 0 }
    }

    const canvas = document.createElement("canvas")
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext("2d")
    if (!ctx) return { direction: "center", proximity: "good", confidence: 0 }

    ctx.drawImage(video, 0, 0, cw, ch)

    const cols = 5
    const rows = 5
    const cellW = Math.floor(cw / cols)
    const cellH = Math.floor(ch / rows)
    const contrastMap: number[][] = []

    let maxContrast = 0
    let maxR = 2
    let maxC = 2

    for (let r = 0; r < rows; r++) {
        contrastMap[r] = []
        for (let c = 0; c < cols; c++) {
            const x = c * cellW
            const y = r * cellH
            const data = ctx.getImageData(x, y, cellW, cellH).data
            let sum = 0
            let sumSq = 0
            const count = data.length / 4
            for (let i = 0; i < data.length; i += 4) {
                const val = (data[i] + data[i + 1] + data[i + 2]) / 3
                sum += val
                sumSq += val * val
            }
            const mean = sum / count
            const variance = sumSq / count - mean * mean
            const std = Math.sqrt(variance)
            contrastMap[r][c] = std
            if (std > maxContrast) {
                maxContrast = std
                maxR = r
                maxC = c
            }
        }
    }

    const centerR = 2
    const centerC = 2

    const dx = maxC - centerC
    const dy = maxR - centerR

    let direction: Direction = "center"
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -1) direction = "left"
        else if (dx > 1) direction = "right"
    } else {
        if (dy < -1) direction = "up"
        else if (dy > 1) direction = "down"
    }

    const overallBrightness = (() => {
        const data = ctx.getImageData(0, 0, cw, ch).data
        let sum = 0
        const count = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3
        }
        return sum / count
    })()

    const avgContrast = contrastMap.flat().reduce((a, b) => a + b, 0) / (cols * rows)

    let proximity: Proximity = "good"
    if (overallBrightness > 200 && avgContrast < 30) {
        proximity = "too-close"
    } else if (overallBrightness < 60 && avgContrast < 20) {
        proximity = "too-far"
    }

    const confidence = Math.min(1, (maxContrast - 15) / 60)

    return { direction, proximity, confidence }
}

export default function BarcodeScanner({ onDetect }: BarcodeScannerProps) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState("")
    const [initializing, setInitializing] = useState(false)
    const [detected, setDetected] = useState(false)
    const [guidance, setGuidance] = useState<Guidance | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const startCalledRef = useRef(false)
    const detectedTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
    const analysisTimerRef = useRef<ReturnType<typeof setInterval>>()

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try { scannerRef.current.stop() } catch {}
            }
        }
    }, [])

    const stopScanner = useCallback(async () => {
        startCalledRef.current = false
        if (analysisTimerRef.current) {
            clearInterval(analysisTimerRef.current)
            analysisTimerRef.current = undefined
        }
        if (scannerRef.current) {
            try { await scannerRef.current.stop() } catch {}
        }
    }, [])

    const flashDetected = useCallback(() => {
        setDetected(true)
        if (detectedTimeoutRef.current) clearTimeout(detectedTimeoutRef.current)
        detectedTimeoutRef.current = setTimeout(() => setDetected(false), 600)
    }, [])

    const startAnalysis = useCallback(() => {
        if (analysisTimerRef.current) clearInterval(analysisTimerRef.current)

        const findVideo = (): HTMLVideoElement | null => {
            const el = containerRef.current
            if (!el) return null
            return el.querySelector<HTMLVideoElement>("video")
        }

        let retries = 0
        const tryStart = () => {
            const vid = findVideo()
            if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
                analysisTimerRef.current = setInterval(() => {
                    const v = findVideo()
                    if (v && v.readyState >= 2) {
                        const g = analyzeVideoFrame(v)
                        setGuidance(g)
                    }
                }, 300)
            } else if (retries < 20) {
                retries++
                setTimeout(tryStart, 300)
            }
        }
        setTimeout(tryStart, 500)
    }, [])

    const startScanner = useCallback(async () => {
        if (startCalledRef.current) return
        startCalledRef.current = true

        setError("")
        setInitializing(true)

        try {
            if (scannerRef.current) {
                try { await scannerRef.current.stop() } catch {}
            }

            const el = containerRef.current
            if (!el) throw new Error("Container not found")

            el.innerHTML = ""
            const id = `qr-${Date.now()}`
            const readerEl = document.createElement("div")
            readerEl.id = id
            readerEl.style.width = "100%"
            readerEl.style.height = "100%"
            el.appendChild(readerEl)

            const scanner = new Html5Qrcode(id, {
                verbose: false,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.AZTEC,
                    Html5QrcodeSupportedFormats.PDF_417,
                ],
            })
            scannerRef.current = scanner

            await scanner.start(
                { facingMode: "user" },
                {
                    fps: 15,
                    qrbox: { width: SCAN_W, height: SCAN_H },
                },
                (decodedText: string) => {
                    flashDetected()
                    setTimeout(() => {
                        onDetect(decodedText)
                        stopScanner()
                        setOpen(false)
                    }, 400)
                },
                () => {},
            )

            setInitializing(false)
            startAnalysis()
        } catch (err: any) {
            console.error("Barcode scanner error:", err)
            setError(err?.message || "Camera access denied or not available")
            setInitializing(false)
            startCalledRef.current = false
        }
    }, [onDetect, stopScanner, flashDetected, startAnalysis])

    const handleOpen = () => {
        setOpen(true)
    }

    useEffect(() => {
        if (!open) return
        setGuidance(null)
        const t = setTimeout(() => startScanner(), 500)
        return () => {
            clearTimeout(t)
            stopScanner()
        }
    }, [open, startScanner, stopScanner])

    const handleClose = async () => {
        await stopScanner()
        setOpen(false)
        setError("")
        setInitializing(false)
        setDetected(false)
        setGuidance(null)
    }

    const handleRetry = () => {
        startScanner()
    }

    const directionArrow = (dir: Direction) => {
        if (dir === "center") return null
        const arrows: Record<Direction, string> = {
            left: "→",
            right: "←",
            up: "↓",
            down: "↑",
            center: "",
        }
        return arrows[dir]
    }

    const proximityLabel = (p: Proximity) => {
        if (p === "good") return null
        return p === "too-close" ? "Move away" : "Move closer"
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
                title="Scan barcode"
            >
                <Scan className="w-5 h-5 text-slate-600" />
            </button>

            {open && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col">
                    <style>{`
                        @keyframes scanLine {
                            0%, 100% { top: 8%; }
                            50% { top: 88%; }
                        }
                        @keyframes flashGreen {
                            0% { box-shadow: inset 0 0 80px rgba(34,197,94,0.5); }
                            100% { box-shadow: inset 0 0 0px rgba(34,197,94,0); }
                        }
                        @keyframes pulseArrow {
                            0%, 100% { opacity: 0.4; transform: translateX(0); }
                            50% { opacity: 1; transform: translateX(4px); }
                        }
                        @keyframes pulseArrowLeft {
                            0%, 100% { opacity: 0.4; transform: translateX(0); }
                            50% { opacity: 1; transform: translateX(-4px); }
                        }
                        @keyframes pulseArrowUp {
                            0%, 100% { opacity: 0.4; transform: translateY(0); }
                            50% { opacity: 1; transform: translateY(-4px); }
                        }
                        @keyframes pulseArrowDown {
                            0%, 100% { opacity: 0.4; transform: translateY(0); }
                            50% { opacity: 1; transform: translateY(4px); }
                        }
                        @keyframes confidenceBar {
                            0% { width: 0%; }
                        }
                    `}</style>

                    <div className="h-16 bg-black/90 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
                        <div className="flex items-center gap-3 text-white">
                            <Camera className="w-5 h-5" />
                            <span className="text-base font-bold">Scan Barcode</span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center bg-black p-8 relative">
                        <div className="w-full max-w-md aspect-square relative">
                            <div
                                ref={containerRef}
                                className="w-full h-full rounded-2xl overflow-hidden bg-black"
                            />

                            {initializing && (
                                <div className="absolute inset-0 rounded-2xl bg-slate-900/95 flex flex-col items-center justify-center text-white/60 gap-3 z-10">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="text-sm font-medium">Starting camera...</p>
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 rounded-2xl bg-slate-900/95 flex flex-col items-center justify-center text-white/60 gap-3 p-8 text-center z-10">
                                    <Camera className="w-10 h-10" />
                                    <p className="text-sm font-medium">Camera Error</p>
                                    <p className="text-xs opacity-70 max-w-xs">{error}</p>
                                    <button
                                        onClick={handleRetry}
                                        className="mt-2 h-10 px-6 bg-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/20 flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {!initializing && !error && (
                                <>
                                    {/* Dark overlay outside scan area */}
                                    <div className="absolute inset-0 rounded-2xl pointer-events-none z-10 overflow-hidden">
                                        <div className="absolute inset-0 bg-black/40" />
                                        <div
                                            className="absolute bg-transparent"
                                            style={{
                                                top: "50%",
                                                left: "50%",
                                                transform: "translate(-50%, -50%)",
                                                width: SCAN_W,
                                                height: SCAN_H,
                                                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                                            }}
                                        />
                                    </div>

                                    {/* Scanning line */}
                                    <div
                                        className="absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none"
                                        style={{
                                            width: SCAN_W - 20,
                                            height: 2,
                                            animation: "scanLine 2s ease-in-out infinite",
                                        }}
                                    >
                                        <div
                                            className="w-full h-full rounded-full"
                                            style={{
                                                background: "linear-gradient(90deg, transparent, #ef4444, #ef4444, transparent)",
                                                boxShadow: "0 0 12px #ef4444, 0 0 24px rgba(239,68,68,0.4)",
                                            }}
                                        />
                                    </div>

                                    {/* Red corner brackets */}
                                    <div className="absolute inset-0 rounded-2xl pointer-events-none z-20">
                                        <div className="absolute top-[calc(50%-90px-2px)] left-[calc(50%-140px-2px)] w-10 h-10 border-t-[4px] border-l-[4px] border-red-500 rounded-tl-lg" />
                                        <div className="absolute top-[calc(50%-90px-2px)] right-[calc(50%-140px-2px)] w-10 h-10 border-t-[4px] border-r-[4px] border-red-500 rounded-tr-lg" />
                                        <div className="absolute bottom-[calc(50%-90px-2px)] left-[calc(50%-140px-2px)] w-10 h-10 border-b-[4px] border-l-[4px] border-red-500 rounded-bl-lg" />
                                        <div className="absolute bottom-[calc(50%-90px-2px)] right-[calc(50%-140px-2px)] w-10 h-10 border-b-[4px] border-r-[4px] border-red-500 rounded-br-lg" />
                                    </div>

                                    {/* Guidance overlay */}
                                    {guidance && (
                                        <div className="absolute inset-0 pointer-events-none z-30">
                                            {/* Direction arrow */}
                                            <div
                                                className="absolute flex items-center justify-center"
                                                style={{
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                }}
                                            >
                                                {guidance.direction !== "center" && (
                                                    <span
                                                        className="text-5xl font-black text-white drop-shadow-lg"
                                                        style={{
                                                            opacity: 0.8,
                                                            textShadow: "0 0 30px rgba(239,68,68,0.6)",
                                                            animation:
                                                                guidance.direction === "left"
                                                                        ? "pulseArrow 1s ease-in-out infinite"
                                                                        : guidance.direction === "right"
                                                                        ? "pulseArrowLeft 1s ease-in-out infinite"
                                                                        : guidance.direction === "up"
                                                                        ? "pulseArrowDown 1s ease-in-out infinite"
                                                                        : "pulseArrowUp 1s ease-in-out infinite",
                                                        }}
                                                    >
                                                        {directionArrow(guidance.direction)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Proximity label */}
                                            {guidance.proximity !== "good" && (
                                                <div
                                                    className="absolute left-1/2 -translate-x-1/2"
                                                    style={{ bottom: 12 }}
                                                >
                                                    <span className="text-xs font-bold text-amber-400 bg-black/60 px-3 py-1.5 rounded-full whitespace-nowrap border border-amber-500/30">
                                                        {proximityLabel(guidance.proximity)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Confidence bar at bottom */}
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
                                                style={{ bottom: 40 }}
                                            >
                                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${Math.max(4, guidance.confidence * 100)}%`,
                                                            background:
                                                                guidance.confidence > 0.6
                                                                    ? "rgb(34,197,94)"
                                                                    : guidance.confidence > 0.3
                                                                    ? "rgb(251,191,36)"
                                                                    : "rgb(239,68,68)",
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    className="text-[10px] font-semibold min-w-[36px] text-right"
                                                    style={{
                                                        color:
                                                            guidance.confidence > 0.6
                                                                ? "rgb(34,197,94)"
                                                                : guidance.confidence > 0.3
                                                                ? "rgb(251,191,36)"
                                                                : "rgb(239,68,68)",
                                                    }}
                                                >
                                                    {Math.round(guidance.confidence * 100)}%
                                                </span>
                                            </div>

                                            {/* Direction text */}
                                            {guidance.direction !== "center" && (
                                                <div
                                                    className="absolute left-1/2 -translate-x-1/2"
                                                    style={{ bottom: 64 }}
                                                >
                                                    <span className="text-[11px] text-white/50 font-medium">
                                                        Move{" "}
                                                        {guidance.direction === "left"
                                                            ? "right"
                                                            : guidance.direction === "right"
                                                            ? "left"
                                                            : guidance.direction === "up"
                                                            ? "down"
                                                            : "up"}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Green indicators when all good */}
                                            {guidance.direction === "center" &&
                                                guidance.proximity === "good" &&
                                                guidance.confidence > 0.5 && (
                                                    <div
                                                        className="absolute left-1/2 -translate-x-1/2"
                                                        style={{ bottom: 8 }}
                                                    >
                                                        <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/30">
                                                            Hold steady ✓
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    )}

                                    {/* Green flash overlay on successful scan */}
                                    {detected && (
                                        <div
                                            className="absolute inset-0 rounded-2xl pointer-events-none z-40"
                                            style={{
                                                animation: "flashGreen 0.6s ease-out forwards",
                                                border: "3px solid rgb(34,197,94)",
                                            }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-green-500/20 rounded-full p-4">
                                                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="h-20 bg-black/90 flex items-center justify-center shrink-0 border-t border-white/5">
                        <div className="text-center">
                            <p className="text-xs text-white/60">
                                Position barcode inside the{" "}
                                <span className="text-red-400 font-semibold">red guide</span>
                            </p>
                            <p className="text-[11px] text-white/30 mt-0.5">
                                Hold steady — the scanner will auto-detect
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
