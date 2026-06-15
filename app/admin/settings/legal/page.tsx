import { createClient } from "@/utils/supabase/server"
import { LegalForm } from "./legal-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, FileText, RotateCcw } from "lucide-react"

export default async function AdminLegalPage() {
    const supabase = await createClient()

    const { data: settings } = await supabase
        .from("site_settings")
        .select("key, content")
        .in("key", ["terms_and_conditions", "privacy_policy", "return_policy"])

    const getContent = (key: string) => settings?.find(s => s.key === key)?.content || ""

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Store Policies</h1>
                <p className="text-sm text-slate-500">Legal management</p>
            </div>

            <Tabs defaultValue="terms" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap md:inline-flex">
                    <TabsTrigger value="terms" className="rounded-lg px-6 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4 mr-2" /> Terms
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="rounded-lg px-6 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ShieldCheck className="w-4 h-4 mr-2" /> Privacy
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="rounded-lg px-6 py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <RotateCcw className="w-4 h-4 mr-2" /> Returns
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="terms">
                    <LegalForm settingKey="terms_and_conditions" title="Terms & Conditions" initialContent={getContent("terms_and_conditions")} />
                </TabsContent>

                <TabsContent value="privacy">
                    <LegalForm settingKey="privacy_policy" title="Privacy Policy" initialContent={getContent("privacy_policy")} />
                </TabsContent>

                <TabsContent value="returns">
                    <LegalForm settingKey="return_policy" title="Return & Refund Policy" initialContent={getContent("return_policy")} />
                </TabsContent>
            </Tabs>
        </div>
    )
}