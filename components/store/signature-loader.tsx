"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
    loading: boolean;
    text?: string;
}

export function SignatureLoader({ loading }: Props) {
    return (
        <AnimatePresence mode="wait">
            {loading && (
                <motion.div
                    key="loader"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                    className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
                >
                    <span
                        className="text-[80px] font-daciana leading-none select-none bg-clip-text text-transparent"
                        style={{
                            backgroundImage: "linear-gradient(90deg, #000 0%, #000 30%, #888 50%, #000 70%, #000 100%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 2s ease-in-out infinite",
                        }}
                    >
                        M
                    </span>
                    <style>{`
                        @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
