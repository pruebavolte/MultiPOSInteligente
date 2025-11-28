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
        ]
    }
};

export default nextConfig;
