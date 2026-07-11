export default function SearchLoading() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
            <div className="w-8 h-8 border-2 border-[#fc2779] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-4">Loading search...</p>
        </div>
    )
}
