import { execSync } from 'child_process';

// Generate Prisma client before build (required for deployment)
try {
    execSync('pnpm prisma generate', { stdio: 'inherit' });
} catch (error) {
    console.log('Prisma generate skipped or already generated');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ycwdsecikgpojdpzffpf.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.openfoodfacts.org',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'static.openfoodfacts.org',
                port: '',
                pathname: '/**',
            },
        ]
    },
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
            {
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/manifest+json',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
