"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
    loading: boolean;
    text?: string;
}

export function SignatureLoader({ loading, text = "The Makeup Store" }: Props) {
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
                    <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-black mb-4">
                        {text}
                    </h2>
                    <div className="w-24 overflow-hidden">
                        <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="h-[1.5px] bg-black w-full"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
