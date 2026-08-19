"use client"

export function Bone({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-md bg-slate-100 ${className}`}
            {...props}
        />
    )
}