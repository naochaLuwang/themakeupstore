import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/track/'],
        },
        sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstorewangkhei.com'}/sitemap.xml`,
    }
}
