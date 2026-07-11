"use client"

export default function StoreError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <span className="text-gray-300 text-4xl font-daciana">M</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-6">We hit a snag loading this page. Try refreshing.</p>
            <button
                onClick={() => reset()}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
                Try Again
            </button>
        </div>
    )
}
