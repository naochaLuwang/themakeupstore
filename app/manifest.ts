// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'THE MAKEUP STORE WANGKHEI',
        short_name: 'THE MAKEUP STORE',
        description: 'One Stop Destination For All Your Makeup Needs.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [

            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/maskable-icon.png', 
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}