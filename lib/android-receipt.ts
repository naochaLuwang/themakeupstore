import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export async function shareAndroidReceipt(fileName: string, base64: string) {
  if (!/^Receipt-[a-zA-Z0-9-]+\.pdf$/.test(fileName)) throw new Error('Invalid receipt filename')
  const { uri } = await Filesystem.writeFile({
    path: `receipts/${fileName}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  })
  await Share.share({ title: fileName, files: [uri], dialogTitle: 'Save or share receipt' })
}
