import { ShieldCheck, Star, Store, Heart } from "lucide-react"

const FEATURES = [
    {
        icon: ShieldCheck,
        title: "Authentic Products",
        desc: "100% genuine products sourced directly from authorized distributors and brands.",
    },
    {
        icon: Star,
        title: "Premium Curation",
        desc: "Every product is handpicked to bring you the best in beauty, skincare, and makeup.",
    },
    {
        icon: Store,
        title: "Store in Imphal",
        desc: "Visit us at Michael Plaza, Wangkhei Angom Leikai — your local beauty destination.",
    },
    {
        icon: Heart,
        title: "Customer First",
        desc: "Your satisfaction is our priority. We strive to make every experience delightful.",
    },
]

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-lg mx-auto px-5 pt-10 pb-20">
                {/* Hero */}
                <div className="flex flex-col items-center pb-6">
                    <h1 className="text-2xl font-extrabold tracking-[0.12em] text-gray-900">
                        THE MAKEUP STORE
                    </h1>
                    <p className="text-[11px] font-medium tracking-[0.3em] text-[#FC2779] mt-1">
                        WANGKHEI
                    </p>
                    <div className="w-7 h-0.5 bg-[#FC2779] my-5 rounded-full" />
                    <p className="text-[15px] text-gray-500 text-center leading-relaxed tracking-wide">
                        One Stop Destination for All Your Makeup Needs.
                    </p>
                </div>

                {/* Intro */}
                <div className="bg-[#FAFAFA] rounded-2xl p-5 mb-8">
                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                        Welcome to The Makeup Store Wangkhei — your one-stop destination for
                        authentic makeup and beauty essentials in Imphal. We bring you a carefully
                        curated selection of premium beauty products from trusted brands.
                    </p>
                </div>

                {/* Features */}
                <div className="mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        Why Shop With Us
                    </p>
                    <div className="space-y-4">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon
                            return (
                                <div key={i} className="flex gap-3.5 items-start">
                                    <div className="w-10 h-10 rounded-xl bg-[#FCE4EC] flex items-center justify-center shrink-0">
                                        <Icon className="w-5.5 h-5.5 text-[#FC2779]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[15px] font-semibold text-gray-900">{f.title}</p>
                                        <p className="text-[13px] text-gray-400 leading-relaxed mt-0.5">{f.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-900 rounded-2xl p-5">
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed tracking-wide">
                        Authenticated Boutique Experience · SSL Secured Maison Premium Curation · Exclusive Selection
                    </p>
                </div>
            </div>
        </div>
    )
}
