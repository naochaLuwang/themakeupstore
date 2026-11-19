import { registerPlugin } from '@capacitor/core'

export const StoreShell = registerPlugin<{
  authenticate(options: { url: string }): Promise<{ cancelled?: boolean; url?: string }>
  setPushAutoInit(options: { enabled: boolean }): Promise<void>
}>('StoreShell')
