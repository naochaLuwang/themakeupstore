import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, ArrowUpRight } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Careers",
    description: "Open roles at THE MAKEUP STORE WANGKHEI. Explore opportunities and apply with your resume.",
}

const TYPE_LABELS: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
}

export default async function CareersPage() {
    const supabase = await createClient()

    const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, location, employment_type, salary_range")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

    const count = jobs?.length ?? 0

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-5 sm:px-6 pb-20 sm:pb-28">

                {/* Hero */}
                <section className="pt-14 sm:pt-20 pb-10 sm:pb-14">
                    <h1 className="text-[32px] sm:text-5xl font-semibold tracking-[-0.02em] leading-[1.1] text-gray-900 max-w-[18ch]">
                        Work where beauty happens.
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed max-w-[52ch]">
                        Join the team behind Imphal&apos;s destination for authentic luxury makeup.
                    </p>
                </section>

                {/* Open positions */}
                <section>
                    <div className="flex items-baseline justify-between gap-4 mb-5">
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                            Open positions
                        </h2>
                        {count > 0 && (
                            <span className="text-sm font-medium text-gray-500 shrink-0">
                                {count} {count === 1 ? "opening" : "openings"}
                            </span>
                        )}
                    </div>

                    {count === 0 ? (
                        <p className="border-t border-gray-200 py-10 text-center text-sm text-gray-500">
                            No open positions right now. Check back soon.
                        </p>
                    ) : (
                        <ul className="border-t border-gray-200">
                            {jobs!.map((job) => (
                                <li key={job.id}>
                                    <Link
                                        href={`/careers/${job.id}`}
                                        className="group flex items-start gap-4 border-b border-gray-200 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC2779] focus-visible:ring-offset-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[15px] font-medium text-gray-900 group-hover:text-pink-700 transition-colors">
                                                {job.title}
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-500">
                                                {job.location && <span>{job.location}</span>}
                                                <span>{TYPE_LABELS[job.employment_type] || job.employment_type}</span>
                                                {job.salary_range && <span>{job.salary_range}</span>}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-all group-hover:text-[#FC2779] group-hover:translate-x-1" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Note */}
                <section className="mt-16 sm:mt-20 border-t border-gray-200 pt-8 sm:pt-10">
                    <h2 className="text-lg font-semibold text-gray-900">Don&apos;t see your role?</h2>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-[54ch]">
                        Openings are posted here as the team grows. Follow along on Instagram for
                        store news and new opportunities.
                    </p>
                    <a
                        href="https://www.instagram.com/the_makeup_store.wangkhei/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 underline-offset-4 hover:text-pink-700 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC2779] focus-visible:ring-offset-2"
                    >
                        Follow on Instagram <ArrowUpRight className="w-4 h-4" />
                    </a>
                </section>

            </div>
        </div>
    )
}
