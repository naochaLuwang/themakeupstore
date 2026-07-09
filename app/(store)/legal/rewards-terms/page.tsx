import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RewardsTermsPage() {
    return (
        <main className="min-h-screen bg-white py-16 px-4">
            <article className="container mx-auto max-w-2xl">
                <Link
                    href="/rewards"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-800 transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Rewards
                </Link>

                <header className="mb-12">
                    <span className="font-daciana text-pink-600 tracking-[0.4em] uppercase text-[10px] mb-4 block">
                        THE MAKEUP STORE LEGAL
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
                        M Beauty Rewards Terms &amp; Conditions
                    </h1>
                    <p className="text-xs text-slate-400 mt-4">Last updated: July 6, 2026</p>
                </header>

                <div className="prose prose-slate max-w-none text-sm leading-relaxed">
                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">1. Program Overview</h2>
                        <p className="text-slate-600 mb-2">
                            M Beauty Rewards is a loyalty program operated by The Makeup Store Wangkhei ("we," "us," or "our") that allows
                            registered members to earn and redeem M Coins on purchases made through our website and physical stores.
                        </p>
                        <p className="text-slate-600">
                            By enrolling in M Beauty Rewards, you agree to these terms. We reserve the right to modify, suspend, or
                            terminate the program at any time with or without notice.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">2. Eligibility</h2>
                        <p className="text-slate-600 mb-2">Membership is open to individuals who:</p>
                        <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-2">
                            <li>Are at least 18 years of age</li>
                            <li>Have a valid account on themakeupstore.in</li>
                            <li>Provide accurate registration information</li>
                        </ul>
                        <p className="text-slate-600">
                            We reserve the right to deny or revoke membership for violation of these terms or fraudulent activity.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">3. Earning M Coins</h2>
                        <p className="text-slate-600 mb-2">
                            Members earn M Coins based on their tier status:
                        </p>
                        <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-2">
                            <li><strong>Bronze</strong> — 1 M Coin per ₹60 spent</li>
                            <li><strong>Silver</strong> — 1 M Coin per ₹60 spent</li>
                            <li><strong>Gold</strong> — 1 M Coin per ₹60 spent</li>
                        </ul>
                        <p className="text-slate-600 mb-2">
                            Coins are calculated on the pre-tax, pre-discount order value excluding shipping charges, gift card
                            payments, and promotional discounts exceeding 50%. Coins are credited as "pending" at the time of
                            purchase and become "available" 15 days after successful delivery.
                        </p>
                        <p className="text-slate-600">
                            Coins are not earned on gift card purchases, taxes, shipping fees, or returned items. If an order is
                            cancelled or returned, any pending or awarded coins associated with that order will be forfeited.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">4. Tier Progression</h2>
                        <p className="text-slate-600 mb-2">
                            Your tier is determined by your total spending across all orders placed on your account:
                        </p>
                        <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-2">
                            <li><strong>Bronze</strong> — ₹0 to ₹4,999</li>
                            <li><strong>Silver</strong> — ₹5,000 to ₹12,999</li>
                            <li><strong>Gold</strong> — ₹13,000 and above</li>
                        </ul>
                        <p className="text-slate-600">
                            Tier status is recalculated after each completed order. Returns and cancellations may reduce your
                            total spend and result in a tier downgrade at the next recalculation.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">5. Redeeming M Coins</h2>
                        <p className="text-slate-600 mb-2">
                            Available M Coins can be redeemed for products listed in the Rewards Catalog. The redemption value is
                            approximately 100 M Coins ≈ ₹100 in product value. All redemptions are final and non-refundable.
                        </p>
                        <p className="text-slate-600 mb-2">
                            To redeem:
                        </p>
                        <ol className="list-decimal pl-5 text-slate-600 space-y-1 mb-2">
                            <li>Browse the Rewards Catalog and select an item</li>
                            <li>Click "Redeem" and confirm your choice</li>
                            <li>The redeemed product will be shipped to your default address</li>
                        </ol>
                        <p className="text-slate-600">
                            Shipping timelines for redeemed products match our standard delivery estimates. Redemptions are
                            subject to product availability. If a reward item is out of stock, we reserve the right to offer
                            an equivalent substitute or refund the coins to your account.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">6. Coin Expiry</h2>
                        <p className="text-slate-600">
                            M Coins expire 365 days from the date they become "available." Expired coins are automatically
                            deducted from your balance and cannot be reinstated. We will attempt to notify you via email when
                            your coins are nearing expiry, but we are not liable for any failure to redeem coins before expiry.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">7. Bonus &amp; Promotional Coins</h2>
                        <p className="text-slate-600">
                            From time to time, we may award bonus coins through special promotions, birthday bonuses, or other
                            events. Bonus coins are subject to the same terms as earned coins unless otherwise stated in the
                            specific promotion terms. Bonus coins may have different expiry dates as specified in the offer.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">8. Account Termination</h2>
                        <p className="text-slate-600 mb-2">
                            We may terminate or suspend your M Beauty Rewards membership if:
                        </p>
                        <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-2">
                            <li>You violate these terms or any applicable laws</li>
                            <li>You engage in fraudulent or abusive activity</li>
                            <li>Your account remains inactive for 24 consecutive months</li>
                            <li>You request account deletion</li>
                        </ul>
                        <p className="text-slate-600">
                            Upon termination, all accumulated M Coins will be forfeited. No cash or other compensation will be
                            provided for forfeited coins.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">9. Limitation of Liability</h2>
                        <p className="text-slate-600">
                            M Coins have no cash value and are not transferable, assignable, or negotiable. They cannot be
                            sold, bartered, or exchanged for cash. We are not responsible for technical errors, system
                            failures, or data loss that may affect coin balances. Our maximum liability for any issue related
                            to the rewards program is limited to the equivalent value of the coins in question.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">10. Modifications</h2>
                        <p className="text-slate-600">
                            We reserve the right to modify, suspend, or discontinue the M Beauty Rewards program at any time
                            without prior notice. Changes to these terms will be posted on this page. Your continued
                            participation in the program after changes take effect constitutes acceptance of the modified
                            terms.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">11. Governing Law</h2>
                        <p className="text-slate-600">
                            These terms are governed by the laws of India. Any disputes arising from the M Beauty Rewards
                            program shall be subject to the exclusive jurisdiction of the courts in Imphal, Manipur.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mb-3">12. Contact</h2>
                        <p className="text-slate-600">
                            For questions about these terms or the M Beauty Rewards program, contact us at:
                        </p>
                        <p className="text-slate-600 mt-2">
                            The Makeup Store Wangkhei<br />
                            Wangkhei, Imphal<br />
                            Manipur, India<br />
                            Email: support@themakeupstore.in
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">
                        THE MAKEUP STORE WANGKHEI
                    </p>
                </div>
            </article>
        </main>
    )
}
