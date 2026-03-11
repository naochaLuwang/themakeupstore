import { Mail, Phone, MapPin, Clock } from "lucide-react"
import { ContactForm } from "./contact-form"

export const metadata = {
    title: "Contact Us | DACIANA",
    description: "Get in touch with the Daciana team for inquiries and support.",
}

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Elegant Header */}
            <header className="py-20 px-4 border-b border-slate-50">
                <div className="container mx-auto text-center max-w-2xl">
                    <span className="font-daciana text-primary tracking-[0.4em] uppercase text-[10px] mb-4 block">
                        Get In Touch
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-6 uppercase">
                        Contact Us
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">
                        Whether you have a question about our collections, an order, or just want to say hello, our team is here to assist you.
                    </p>
                </div>
            </header>

            <section className="container mx-auto px-4 py-8 md:py-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* Contact Information */}
                    <div className="lg:col-span-5 space-y-12">
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 mb-8">
                                Contact Details
                            </h2>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email Us</p>
                                        <p className="text-slate-900 font-bold">support@themakeupstorewangkhei.com</p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                        <Phone className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Call Us</p>
                                        <p className="text-slate-900 font-bold">+91 XXXXX XXXXX</p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Business Hours</p>
                                        <p className="text-slate-900 font-bold">10AM - 7:30 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3">Our Atelier</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                The Makeup Store, Michael Plaza 1st Floor.Wangkhei Angom Leikai Opposite Thangal Temple , 795005, Imphal East , Manipur
                            </p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-3xl border border-slate-100 p-8 md:p-12 shadow-sm">
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-8">
                                Send a Message
                            </h2>
                            <ContactForm />
                        </div>
                    </div>

                </div>
            </section>
        </main>
    )
}