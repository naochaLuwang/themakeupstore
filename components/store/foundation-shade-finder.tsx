"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Camera, Check, Sparkles, ChevronRight, ArrowLeft } from "lucide-react"

interface ShadeVariant {
    id: string
    title: string
    hex_code: string
}

interface MatchResult {
    variant: ShadeVariant
    distance: number
    matchPercent: number
}

interface Props {
    open: boolean
    onClose: () => void
    variants: ShadeVariant[]
}

const CHEEK_LANDMARKS = [50, 205, 425, 280, 430, 455]

type SkinTone = "fair" | "light" | "medium" | "tan" | "deep" | "dark"
type Undertone = "warm" | "cool" | "neutral" | "olive"
type Coverage = "sheer" | "medium" | "full"
type Finish = "dewy" | "natural" | "matte"

const SKIN_TONES: { value: SkinTone; label: string }[] = [
    { value: "fair", label: "Fair" },
    { value: "light", label: "Light" },
    { value: "medium", label: "Medium" },
    { value: "tan", label: "Tan" },
    { value: "deep", label: "Deep" },
    { value: "dark", label: "Dark" },
]

 const TONE_COLORS: Record<SkinTone, string> = {
    fair: "#F5E0C8",
    light: "#E8C8B8",
    medium: "#D4A38E",
    tan: "#C48470",
    deep: "#8B5848",
    dark: "#4A2C24",
}

const SKIN_HEX: Record<SkinTone, Record<Undertone, string>> = {
    fair:   { warm: "#F5E0C0", cool: "#F5D6D0", neutral: "#F5DBC8", olive: "#EDD8B8" },
    light:  { warm: "#E8CDB0", cool: "#E8C4C0", neutral: "#E8C8B8", olive: "#DEC4A8" },
    medium: { warm: "#D4A884", cool: "#D49E98", neutral: "#D4A38E", olive: "#C8A080" },
    tan:    { warm: "#C48A64", cool: "#C48078", neutral: "#C48470", olive: "#B87C68" },
    deep:   { warm: "#8B5E3C", cool: "#8B5450", neutral: "#8B5848", olive: "#7A5040" },
    dark:   { warm: "#4A3020", cool: "#4A2828", neutral: "#4A2C24", olive: "#3D2818" },
}

const UNDERTONES: { value: Undertone; label: string }[] = [
    { value: "warm", label: "Warm" },
    { value: "cool", label: "Cool" },
    { value: "neutral", label: "Neutral" },
    { value: "olive", label: "Olive" },
]

const COVERAGE_OPTIONS: { value: Coverage; label: string }[] = [
    { value: "sheer", label: "Sheer" },
    { value: "medium", label: "Medium" },
    { value: "full", label: "Full" },
]

const FINISH_OPTIONS: { value: Finish; label: string }[] = [
    { value: "dewy", label: "Dewy" },
    { value: "natural", label: "Natural" },
    { value: "matte", label: "Matte" },
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "")
    return {
        r: Number.parseInt(clean.substring(0, 2), 16),
        g: Number.parseInt(clean.substring(2, 4), 16),
        b: Number.parseInt(clean.substring(4, 6), 16),
    }
}

function colorDistance(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number {
    return Math.sqrt((rgb1.r - rgb2.r) ** 2 + (rgb1.g - rgb2.g) ** 2 + (rgb1.b - rgb2.b) ** 2)
}

function findClosestShades(variants: ShadeVariant[], skinRgb: { r: number; g: number; b: number }): MatchResult[] {
    const maxDist = Math.sqrt(3 * 255 * 255)
    return variants
        .filter((v) => v.hex_code && v.hex_code !== "#cbd5e1")
        .map((v) => {
            const vRgb = hexToRgb(v.hex_code)
            const dist = colorDistance(skinRgb, vRgb)
            const matchPercent = Math.round((1 - dist / maxDist) * 100)
            return { variant: v, distance: dist, matchPercent }
        })
        .sort((a, b) => a.distance - b.distance)
}

export default function FoundationShadeFinder({ open, onClose, variants }: Props) {
    const [mounted, setMounted] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const [step, setStep] = useState<"quiz" | "capture" | "processing" | "result">("quiz")
    const [skinTone, setSkinTone] = useState<SkinTone | null>(null)
    const [undertone, setUndertone] = useState<Undertone | null>(null)
    const [coverage, setCoverage] = useState<Coverage | null>(null)
    const [finish, setFinish] = useState<Finish | null>(null)

    const [matches, setMatches] = useState<MatchResult[]>([])
    const [sampledColor, setSampledColor] = useState<string | null>(null)
    const [sourceImage, setSourceImage] = useState<string | null>(null)
    const [camReady, setCamReady] = useState(false)
    const [camError, setCamError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!open) return
        let cancelled = false
        async function load() {
            try {
                const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
                if (cancelled) return
                const wasm = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")
                if (cancelled) return
                window.__faceLandmarker = await FaceLandmarker.createFromOptions(wasm, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "IMAGE",
                    numFaces: 1,
                })
                if (!cancelled) setLoaded(true)
            } catch (e) { console.error("MediaPipe load error:", e) }
        }
        load()
        return () => { cancelled = true }
    }, [open])

    useEffect(() => {
        if (open) {
            setStep("quiz")
            setSkinTone(null); setUndertone(null); setCoverage(null); setFinish(null)
            setMatches([]); setSampledColor(null); setSourceImage(null); setCamReady(false); setCamError(null)
        }
    }, [open])

    useEffect(() => {
        return () => {
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        }
    }, [])

    const skinHex = (skinTone && undertone) ? SKIN_HEX[skinTone][undertone] : null

    const quizComplete = skinTone && undertone && coverage && finish

    const computeMatches = useCallback((hex: string) => {
        setSampledColor(hex)
        const results = findClosestShades(variants, hexToRgb(hex))
        setMatches(results)
        setStep("result")
    }, [variants])

    const processWithoutPhoto = useCallback(() => {
        if (skinHex) computeMatches(skinHex)
    }, [skinHex, computeMatches])

    const startCamera = useCallback(async () => {
        setCamError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
                await videoRef.current.play()
                setCamReady(true)
            }
        } catch (e: any) {
            setCamError(e.message || "Camera access denied")
        }
    }, [])

    const captureFromCamera = useCallback(() => {
        const video = videoRef.current
        const snap = snapshotCanvasRef.current
        if (!video || !snap) return
        snap.width = video.videoWidth
        snap.height = video.videoHeight
        const ctx = snap.getContext("2d")
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        snap.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob)
                setSourceImage(url)
                setStep("processing")
                if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
                setCamReady(false)
            }
        }, "image/png")
    }, [])

    const handleFileUpload = useCallback((file: File) => {
        setSourceImage(URL.createObjectURL(file))
        setStep("processing")
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        setCamReady(false)
    }, [])

    const handleImageLoaded = useCallback(async () => {
        const img = imgRef.current
        const canvas = canvasRef.current
        if (!img || !canvas || !window.__faceLandmarker) return

        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        try {
            const result = window.__faceLandmarker.detect(img)
            if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
                // Fallback to questionnaire-based match
                if (skinHex) { computeMatches(skinHex); return }
                setStep("quiz"); return
            }

            const landmarks = result.faceLandmarks[0]
            const w = canvas.width; const h = canvas.height
            let totalR = 0, totalG = 0, totalB = 0, sampleCount = 0
            const sampleSize = 3

            for (const idx of CHEEK_LANDMARKS) {
                const cx = Math.round(landmarks[idx].x * w); const cy = Math.round(landmarks[idx].y * h)
                for (let dx = -sampleSize; dx <= sampleSize; dx++) {
                    for (let dy = -sampleSize; dy <= sampleSize; dy++) {
                        const px = cx + dx; const py = cy + dy
                        if (px >= 0 && px < w && py >= 0 && py < h) {
                            const pixel = ctx.getImageData(px, py, 1, 1).data
                            totalR += pixel[0]; totalG += pixel[1]; totalB += pixel[2]; sampleCount++
                        }
                    }
                }
            }

            const avgR = Math.round(totalR / sampleCount); const avgG = Math.round(totalG / sampleCount); const avgB = Math.round(totalB / sampleCount)
            computeMatches("#" + [avgR, avgG, avgB].map(c => c.toString(16).padStart(2, "0")).join(""))
        } catch (e) {
            console.error("Detection error:", e)
            if (skinHex) { computeMatches(skinHex); return }
            setStep("quiz")
        }
    }, [variants, skinHex, computeMatches])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                {step !== "quiz" && step !== "result" ? (
                                    <button onClick={() => { setStep("quiz"); if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }; setCamReady(false) }} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <Sparkles className="w-4 h-4 text-stone-400" />
                                )}
                                <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                                    {step === "quiz" ? "Find Your Shade" : step === "result" ? "Your Matches" : "Capture Photo"}
                                </h3>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5">
                            {/* STEP 1: QUESTIONNAIRE */}
                            {step === "quiz" && (
                                <div className="space-y-6">
                                    {/* Progress indicator */}
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 flex-1 rounded-full bg-stone-900" />
                                        <div className="h-1 w-6 rounded-full bg-stone-200" />
                                        <div className="h-1 w-6 rounded-full bg-stone-200" />
                                        <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest ml-1">1/3</span>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-stone-800">Let&apos;s find your perfect shade</p>
                                        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">Answer a few quick questions so we can narrow down the best match for you.</p>
                                    </div>

                                    {/* Skin Tone */}
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">1. Your Skin Tone</p>
                                        <p className="text-[9px] text-stone-400 mb-3 leading-relaxed">Pick the range that&apos;s closest to your natural complexion.</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {SKIN_TONES.map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSkinTone(t.value)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                                                        skinTone === t.value
                                                            ? "border-stone-900 bg-stone-50"
                                                            : "border-stone-100 hover:border-stone-300"
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: TONE_COLORS[t.value] }} />
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${skinTone === t.value ? "text-stone-900" : "text-stone-500"}`}>{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Undertone */}
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">2. Your Undertone</p>
                                        <p className="text-[9px] text-stone-400 mb-3 leading-relaxed">
                                            The natural tone beneath your skin. <span className="text-stone-500">Warm</span> = golden/peach, <span className="text-stone-500">Cool</span> = pink/rosy, <span className="text-stone-500">Neutral</span> = balanced, <span className="text-stone-500">Olive</span> = slightly green.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {UNDERTONES.map(u => {
                                                const undertoneHex = u.value === "warm" ? "#E8C88A" : u.value === "cool" ? "#E8B8B8" : u.value === "neutral" ? "#D4C4B0" : "#C4B888"
                                                return (
                                                    <button
                                                        key={u.value}
                                                        onClick={() => setUndertone(u.value)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                                                            undertone === u.value
                                                                ? "border-stone-900 bg-stone-50"
                                                                : "border-stone-100 hover:border-stone-300"
                                                        }`}
                                                    >
                                                        <div className="w-6 h-6 rounded-full border border-white/50 shadow-sm shrink-0" style={{ backgroundColor: undertoneHex }} />
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${undertone === u.value ? "text-stone-900" : "text-stone-500"}`}>{u.label}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Coverage */}
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">3. Coverage Preference</p>
                                        <p className="text-[9px] text-stone-400 mb-3 leading-relaxaxed">How much coverage do you prefer?</p>
                                        <div className="flex flex-wrap gap-2">
                                            {COVERAGE_OPTIONS.map(c => {
                                                const desc = c.value === "sheer" ? "Light, natural" : c.value === "medium" ? "Buildable, everyday" : "Maximum, flawless"
                                                return (
                                                    <button
                                                        key={c.value}
                                                        onClick={() => setCoverage(c.value)}
                                                        className={`px-5 py-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                                            coverage === c.value
                                                                ? "border-stone-900 bg-stone-900 text-white"
                                                                : "border-stone-100 text-stone-500 hover:border-stone-300"
                                                        }`}
                                                    >
                                                        {c.label}
                                                        <span className={`block text-[7px] font-medium lowercase tracking-normal mt-0.5 ${coverage === c.value ? "text-white/60" : "text-stone-400"}`}>{desc}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Finish */}
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">4. Finish Preference</p>
                                        <p className="text-[9px] text-stone-400 mb-3 leading-relaxed">The final look you want.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {FINISH_OPTIONS.map(f => {
                                                const desc = f.value === "dewy" ? "Glowing, radiant" : f.value === "natural" ? "Skin-like, satin" : "Velvet, shine-free"
                                                return (
                                                    <button
                                                        key={f.value}
                                                        onClick={() => setFinish(f.value)}
                                                        className={`px-5 py-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                                            finish === f.value
                                                                ? "border-stone-900 bg-stone-900 text-white"
                                                                : "border-stone-100 text-stone-500 hover:border-stone-300"
                                                        }`}
                                                    >
                                                        {f.label}
                                                        <span className={`block text-[7px] font-medium lowercase tracking-normal mt-0.5 ${finish === f.value ? "text-white/60" : "text-stone-400"}`}>{desc}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Preview + Actions */}
                                    {skinHex && (
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                                            <div className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" style={{ backgroundColor: skinHex }} />
                                            <div>
                                                <p className="text-[9px] font-black text-stone-700 uppercase tracking-wider">Your Selection</p>
                                                <p className="text-[9px] text-stone-400">{SKIN_TONES.find(t => t.value === skinTone)?.label} · {UNDERTONES.find(u => u.value === undertone)?.label} · {COVERAGE_OPTIONS.find(c => c.value === coverage)?.label} · {FINISH_OPTIONS.find(f => f.value === finish)?.label}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 pt-2">
                                        <button
                                            disabled={!quizComplete}
                                            onClick={() => setStep("capture")}
                                            className="w-full h-12 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            Continue <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                        {skinHex && (
                                            <button
                                                onClick={processWithoutPhoto}
                                                className="w-full h-10 text-[9px] font-medium text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
                                            >
                                                Get results with questionnaire only
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CAPTURE */}
                            {step === "capture" && (
                                <div className="space-y-4">
                                    {!camReady && !camError && (
                                        <div className="space-y-3">
                                            <button
                                                onClick={startCamera}
                                                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-3 hover:border-stone-900 hover:bg-stone-100 transition-all active:scale-[0.99]"
                                            >
                                                <Camera className="w-10 h-10 text-stone-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Open Camera</span>
                                            </button>
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-100" /></div>
                                                <div className="relative flex justify-center"><span className="bg-white px-4 text-[9px] text-stone-300 uppercase tracking-wider">or</span></div>
                                            </div>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-12 rounded-2xl border border-stone-200 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-50 transition-all"
                                            >
                                                <Upload className="w-4 h-4" /> Upload a Photo
                                            </button>
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                                            {!loaded && <p className="text-center text-[10px] text-stone-400 animate-pulse">Loading AI model for skin tone analysis...</p>}
                                            {skinHex && (
                                                <button onClick={processWithoutPhoto} className="w-full text-center text-[9px] text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors">
                                                    Skip photo, use questionnaire match
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {camError && (
                                        <div className="text-center py-8 space-y-4">
                                            <p className="text-sm text-stone-500">Camera not available</p>
                                            <p className="text-[10px] text-stone-400">{camError}</p>
                                            <button onClick={() => fileInputRef.current?.click()} className="h-12 px-6 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider">
                                                Upload Instead
                                            </button>
                                        </div>
                                    )}

                                    {/* Video element always rendered (hidden when not ready) so the ref is available */}
                                        <div className={camReady ? "space-y-4" : "hidden"}>
                                            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                                                <video ref={videoRef} playsInline autoPlay muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                                            </div>
                                            {camReady && (
                                                <div className="flex gap-3">
                                                    <button onClick={captureFromCamera} className="flex-1 h-12 rounded-2xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 transition-all flex items-center justify-center gap-2">
                                                        <Camera className="w-4 h-4" /> Capture
                                                    </button>
                                                    <button onClick={() => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }; setCamReady(false) }} className="h-12 px-5 rounded-2xl border border-stone-200 text-[9px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-50 transition-all">
                                                        Close
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    <canvas ref={snapshotCanvasRef} className="hidden" />
                                </div>
                            )}

                            {/* STEP 3: PROCESSING */}
                            {step === "processing" && sourceImage && (
                                <div className="space-y-4">
                                    <div className="relative rounded-2xl overflow-hidden bg-stone-50">
                                        <img ref={imgRef} src={sourceImage} onLoad={handleImageLoaded} className="w-full object-contain max-h-[400px]" alt="Upload" />
                                        <canvas ref={canvasRef} className="hidden" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="text-white text-center space-y-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto" />
                                                <p className="text-[10px] font-black uppercase tracking-wider">Analyzing skin tone...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: RESULTS */}
                            {step === "result" && (
                                <div className="space-y-5">
                                    {sampledColor && (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                                            <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-md shrink-0" style={{ backgroundColor: sampledColor }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-wider text-stone-500">Matched Skin Tone</p>
                                                <p className="text-xs font-medium text-stone-800 mt-0.5">{sampledColor}</p>
                                                {skinTone && <p className="text-[9px] text-stone-400 mt-0.5">{SKIN_TONES.find(t => t.value === skinTone)?.label} · {undertone && UNDERTONES.find(u => u.value === undertone)?.label}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{matches.length} shades ranked by match</p>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                                        {matches.slice(0, 10).map((match, i) => (
                                            <div key={match.variant.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-[9px] font-black text-stone-500 shrink-0">{i + 1}</div>
                                                <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md shrink-0" style={{ backgroundColor: match.variant.hex_code }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-stone-800 truncate">{match.variant.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: match.matchPercent + "%", backgroundColor: match.matchPercent > 85 ? "#22c55e" : match.matchPercent > 70 ? "#eab308" : "#ef4444" }} />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-stone-500 shrink-0">{match.matchPercent}%</span>
                                                    </div>
                                                </div>
                                                {i === 0 && <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-white" /></div>}
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={() => { setStep("capture"); setSourceImage(null); }} className="w-full h-12 rounded-2xl border border-stone-200 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-50 transition-all">
                                        Try with a Photo
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
