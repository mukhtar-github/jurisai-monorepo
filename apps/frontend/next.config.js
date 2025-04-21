/** @type {import('next').NextConfig} */
module.exports = {
  // This will allow the build to continue even if there are TypeScript errors.
  typescript: {
    ignoreBuildErrors: true,
  },
  // This will prevent ESLint errors from failing the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};
