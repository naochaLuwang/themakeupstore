import { BottomNav } from "@/components/layout/bottom-nav"
import { Footer } from "@/components/layout/footer"
import Navbar from "@/components/layout/navbar"
import { BottomNavWrapper } from "@/components/layout/bottom-nav-wrapper"
import { PromotionProvider } from "@/components/store/promotion-provider"
import { PromotionBadgeProvider } from "@/components/store/promotion-badge-context"

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <PromotionBadgeProvider>
                <PromotionProvider>
                    <Navbar />
                    <main className="flex-grow">
                        {children}
                    </main>
                    <BottomNavWrapper />
                    <div className="hidden md:block"><Footer /></div>
                </PromotionProvider>
            </PromotionBadgeProvider>
        </div>
    )
}
