import { BottomNav } from "@/components/layout/bottom-nav"
import { Footer } from "@/components/layout/footer"
import Navbar from "@/components/layout/navbar"



export default async function StoreLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">

                {children}
            </main>
            <BottomNav />
            <Footer />
        </div>
    )
}