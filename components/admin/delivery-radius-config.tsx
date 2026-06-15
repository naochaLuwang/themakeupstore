"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { MapPin, Radius, Loader2, Save, Plus, Trash2, IndianRupee } from "lucide-react"

const icon = L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;background:#1e293b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:translate(-50%,-50%)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
})

const defaultCenter: [number, number] = [24.817, 93.9368]

interface Tier {
    from_km: number
    to_km: number
    charge: number
}

interface RadiusConfig {
    enabled: boolean
    latitude: number
    longitude: number
    center_label: string
    tiers: Tier[]
}

const defaults: RadiusConfig = {
    enabled: false,
    latitude: defaultCenter[0],
    longitude: defaultCenter[1],
    center_label: "Main Store",
    tiers: [
        { from_km: 0, to_km: 5, charge: 20 },
        { from_km: 5, to_km: 10, charge: 40 },
        { from_km: 10, to_km: 15, charge: 60 },
    ],
}

const tierColors = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"]

function DraggableMarker({ position, onMove }: {
    position: [number, number]
    onMove: (lat: number, lng: number) => void
}) {
    useMapEvents({
        click(e) { onMove(e.latlng.lat, e.latlng.lng) },
    })
    return (
        <Marker
            position={position}
            icon={icon}
            draggable
            eventHandlers={{
                dragend: (e) => {
                    const m = e.target
                    onMove(m.getLatLng().lat, m.getLatLng().lng)
                },
            }}
        />
    )
}

export default function DeliveryRadiusConfig() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<RadiusConfig>(defaults)

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("site_settings").select("content").eq("key", "delivery_radius_config").single()
            if (data?.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setConfig({ ...defaults, ...parsed })
                } catch { /* ignore */ }
            }
            setLoading(false)
        }
        load()
    }, [])

    async function handleSave() {
        setSaving(true)
        const payload = {
            key: "delivery_radius_config",
            content: JSON.stringify(config),
        }
        const { data: existing } = await supabase
            .from("site_settings").select("id").eq("key", "delivery_radius_config").maybeSingle()
        const { error } = existing
            ? await supabase.from("site_settings").update({ content: payload.content }).eq("key", "delivery_radius_config")
            : await supabase.from("site_settings").insert([{ key: payload.key, content: payload.content }])
        setSaving(false)
        if (error) return toast.error(error.message)
        toast.success("Delivery radius settings saved")
    }

    const maxRadius = config.tiers.length > 0
        ? Math.max(...config.tiers.map(t => t.to_km))
        : 10

    function addTier() {
        const last = config.tiers[config.tiers.length - 1]
        const from = last ? last.to_km : 0
        setConfig({
            ...config,
            tiers: [...config.tiers, { from_km: from, to_km: from + 5, charge: Math.round((from + 5) * 4) }],
        })
    }

    function updateTier(i: number, patch: Partial<Tier>) {
        const tiers = config.tiers.map((t, j) => j === i ? { ...t, ...patch } : t)
        setConfig({ ...config, tiers })
    }

    function removeTier(i: number) {
        setConfig({ ...config, tiers: config.tiers.filter((_, j) => j !== i) })
    }

    if (loading) {
        return (
            <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
        )
    }

    return (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            {/* Toggle header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${config.enabled ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <MapPin className={`w-5 h-5 ${config.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Map-Based Delivery</h3>
                        <p className="text-xs text-slate-400">Restrict deliveries to a radius around your store</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                        checked={config.enabled}
                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    />
                    <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all" />
                </label>
            </div>

            {config.enabled && (
                <div className="p-4 md:p-6 space-y-5">
                    {/* Center point inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Label</label>
                            <Input className="h-10 text-sm border-slate-200 bg-slate-50 rounded-xl"
                                value={config.center_label}
                                onChange={(e) => setConfig({ ...config, center_label: e.target.value })}
                                placeholder="Main Store" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Latitude</label>
                            <Input className="h-10 text-sm font-mono border-slate-200 bg-slate-50 rounded-xl"
                                type="number" step="any"
                                value={config.latitude}
                                onChange={(e) => setConfig({ ...config, latitude: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Longitude</label>
                            <Input className="h-10 text-sm font-mono border-slate-200 bg-slate-50 rounded-xl"
                                type="number" step="any"
                                value={config.longitude}
                                onChange={(e) => setConfig({ ...config, longitude: parseFloat(e.target.value) || 0 })} />
                        </div>
                    </div>

                    {/* Map with concentric circles */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-[300px]">
                        <MapContainer
                            center={[config.latitude, config.longitude]}
                            zoom={12}
                            className="h-full w-full"
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <DraggableMarker
                                position={[config.latitude, config.longitude]}
                                onMove={(lat, lng) => setConfig({ ...config, latitude: lat, longitude: lng })}
                            />
                            {config.tiers.map((tier, i) => (
                                <Circle
                                    key={i}
                                    center={[config.latitude, config.longitude]}
                                    radius={tier.to_km * 1000}
                                    pathOptions={{
                                        color: tierColors[i % tierColors.length],
                                        fillColor: tierColors[i % tierColors.length],
                                        fillOpacity: 0.05,
                                        weight: 2,
                                        dashArray: "6 4",
                                    }}
                                />
                            ))}
                        </MapContainer>
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Radius className="w-3 h-3" />
                        Click the map or drag the marker to set center. Max radius: {maxRadius} km
                    </p>

                    {/* Tiers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Delivery Charge Tiers</span>
                            </div>
                            <Button onClick={addTier} variant="outline" size="sm"
                                className="h-7 px-2.5 text-[10px] font-semibold border-slate-200 rounded-lg"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Tier
                            </Button>
                        </div>
                        <div className="space-y-1.5">
                            {config.tiers.map((tier, i) => (
                                <div key={i}
                                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                    <span className="text-xs font-bold text-slate-300 w-5">{i + 1}</span>
                                    <div className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: tierColors[i % tierColors.length] }} />
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <Input type="number" step="0.5" min="0"
                                            className="h-8 w-16 text-xs font-mono border-slate-200 bg-white rounded-lg px-2"
                                            value={tier.from_km}
                                            onChange={(e) => updateTier(i, { from_km: parseFloat(e.target.value) || 0 })} />
                                        <span className="text-xs text-slate-400">—</span>
                                        <Input type="number" step="0.5" min="0"
                                            className="h-8 w-16 text-xs font-mono border-slate-200 bg-white rounded-lg px-2"
                                            value={tier.to_km}
                                            onChange={(e) => updateTier(i, { to_km: parseFloat(e.target.value) || 0 })} />
                                        <span className="text-xs text-slate-400 font-mono">km</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">₹</span>
                                        <Input type="number" min="0"
                                            className="h-8 w-20 text-xs font-mono border-slate-200 bg-white rounded-lg px-2 font-bold"
                                            value={tier.charge}
                                            onChange={(e) => updateTier(i, { charge: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <button onClick={() => removeTier(i)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    {config.tiers.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pricing Summary</p>
                            <div className="space-y-0.5 text-xs text-slate-600">
                                {config.tiers.map((tier, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tierColors[i % tierColors.length] }} />
                                        <span>{tier.from_km}–{tier.to_km} km → <strong className="text-slate-900">₹{tier.charge}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}
                            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Settings
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
