"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles } from "lucide-react"

interface LipVariant {
    id: string
    title: string
    hex_code: string
}

interface Props {
    open: boolean
    onClose: () => void
    variants: LipVariant[]
    initialHexCode: string
}

const LIP_LANDMARKS = [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
    375, 321, 405, 314, 17, 84, 181, 91, 146,
]

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace("#", "")
    const r = Number.parseInt(clean.substring(0, 2), 16)
    const g = Number.parseInt(clean.substring(2, 4), 16)
    const b = Number.parseInt(clean.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

export default function VirtualTryOn({ open, onClose, variants, initialHexCode }: Props) {
    const [selectedHex, setSelectedHex] = useState(initialHexCode)
    const [loaded, setLoaded] = useState(false)
    const [camReady, setCamReady] = useState(false)
    const [camError, setCamError] = useState<string | null>(null)
    const [currentIdx, setCurrentIdx] = useState(
        variants.findIndex((v) => v.hex_code === initialHexCode)
    )

    const videoRef = useRef<HTMLVideoElement>(null)
    const overlayRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const animRef = useRef<number>(0)
    const landmarksRef = useRef<any>(null)

    // Load MediaPipe
    useEffect(() => {
        if (!open) return
        let cancelled = false
        async function load() {
            try {
                const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
                if (cancelled) return
                const wasm = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                )
                if (cancelled) return
                window.__faceLandmarker = await FaceLandmarker.createFromOptions(wasm, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false,
                })
                if (!cancelled) setLoaded(true)
            } catch (e) {
                console.error("MediaPipe load error:", e)
            }
        }
        load()
        return () => { cancelled = true }
    }, [open])

    // Start camera
    useEffect(() => {
        if (!open || !loaded) return
        setCamError(null)
        let cancelled = false
        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                })
                if (cancelled) return
                const video = videoRef.current
                if (!video) return
                video.srcObject = stream
                streamRef.current = stream
                await video.play()
                setCamReady(true)
            } catch (e: any) {
                if (!cancelled) setCamError(e.message || "Camera access denied")
            }
        }
        start()
        return () => {
            cancelled = true
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop())
                streamRef.current = null
            }
        }
    }, [open, loaded])

    // Start detection loop when camera is ready
    useEffect(() => {
        if (!camReady) return

        let active = true

        const detect = () => {
            if (!active) return

            const video = videoRef.current
            const canvas = overlayRef.current
            if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
                animRef.current = requestAnimationFrame(detect)
                return
            }

            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
            }

            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)

                if (window.__faceLandmarker) {
                    try {
                        const result = window.__faceLandmarker.detectForVideo(video, performance.now())
                        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
                            landmarksRef.current = result.faceLandmarks[0]
                        }
                    } catch { }
                }

                const lm = landmarksRef.current
                if (lm) {
                    const w = canvas.width
                    const h = canvas.height

                    ctx.beginPath()
                    for (let i = 0; i < LIP_LANDMARKS.length; i++) {
                        const idx = LIP_LANDMARKS[i]
                        const x = lm[idx].x * w
                        const y = lm[idx].y * h
                        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
                    }
                    ctx.closePath()

                    ctx.fillStyle = hexToRgba(selectedHex, 0.45)
                    ctx.fill()
                    ctx.strokeStyle = hexToRgba(selectedHex, 0.2)
                    ctx.lineWidth = 0.5
                    ctx.stroke()
                }
            }

            animRef.current = requestAnimationFrame(detect)
        }

        animRef.current = requestAnimationFrame(detect)
        return () => {
            active = false
            cancelAnimationFrame(animRef.current)
        }
    }, [camReady, selectedHex])

    // Auto-select initial
    useEffect(() => {
        setSelectedHex(initialHexCode)
        const idx = variants.findIndex((v) => v.hex_code === initialHexCode)
        if (idx >= 0) setCurrentIdx(idx)
    }, [initialHexCode, variants])

    const selectShade = useCallback((idx: number) => {
        const v = variants[idx]
        if (v) {
            setSelectedHex(v.hex_code)
            setCurrentIdx(idx)
        }
    }, [variants])

    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black flex flex-col"
                >
                    {/* CAMERA VIEW — fills full screen, video behind */}
                    <div className="absolute inset-0 bg-black overflow-hidden">
                        {!loaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white/60 text-center space-y-4">
                                    <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" />
                                    <p className="text-[11px] font-medium tracking-wider text-white/40">LOADING AI MODEL</p>
                                </div>
                            </div>
                        )}

                        {loaded && camError && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white/80 text-center px-8 max-w-sm space-y-6">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                        <X className="w-6 h-6 text-white/40" />
                                    </div>
                                    <p className="text-base font-medium">Camera Access Needed</p>
                                    <p className="text-xs text-white/40 leading-relaxed">{camError}</p>
                                    <button onClick={onClose} className="px-10 h-12 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-widest">
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {loaded && !camError && (
                            <>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-full h-full max-w-full max-h-full">
                                        <video
                                            ref={videoRef}
                                            playsInline
                                            autoPlay
                                            muted
                                            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                                        />
                                        <canvas
                                            ref={overlayRef}
                                            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                                        />
                                        {!camReady && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="text-white/60 text-center space-y-3">
                                                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" />
                                                    <p className="text-[10px] font-medium tracking-wider text-white/40">STARTING CAMERA</p>
                                                </div>
                                            </div>
                                        )}
                                        {camReady && (
                                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/30 text-[9px] font-medium tracking-widest uppercase animate-pulse">
                                                Point at your lips
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* CLOSE BUTTON — floating top-left with large touch target */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4 sm:p-6 pointer-events-none">
                        <button
                            onClick={onClose}
                            className="pointer-events-auto w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <div className="pointer-events-auto bg-black/40 backdrop-blur-xl rounded-full px-4 h-10 flex items-center gap-2 border border-white/5">
                            <Sparkles className="w-3.5 h-3.5 text-white/60" />
                            <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest">Try-On</span>
                        </div>
                    </div>

                    {/* SHADE CAROUSEL — bottom of screen */}
                    {variants.length > 0 && camReady && (
                        <div className="absolute bottom-0 left-0 right-0 z-50 pb-6 pt-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                            <div className="overflow-x-auto no-scrollbar pointer-events-auto px-4">
                                <div className="flex items-center justify-center gap-3 min-w-max px-2">
                                    {variants.map((v, i) => {
                                        const isActive = i === currentIdx
                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => selectShade(i)}
                                                className={`flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 ${isActive ? "scale-110" : "opacity-40 hover:opacity-70"}`}
                                                style={{ width: isActive ? 72 : 56 }}
                                            >
                                                <div
                                                    className={`rounded-full transition-all duration-200 ${isActive ? "w-[72px] h-[72px] border-2 border-white shadow-xl shadow-white/10" : "w-14 h-14 border border-white/20"}`}
                                                    style={{ backgroundColor: v.hex_code }}
                                                />
                                                <span className={`text-[7px] font-bold uppercase tracking-tight text-center leading-tight mt-1 ${isActive ? "text-white" : "text-white/40"}`}>
                                                    {v.title}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
