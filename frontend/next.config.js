/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
    unoptimized: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;
