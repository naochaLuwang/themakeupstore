// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'MakeUpStore',
        short_name: 'MakeUpStore',
        description: 'One Stop Destination For All Your Makeup Needs.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [

            {
                src: '/icon-192x192-v2.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512x512-v2.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}