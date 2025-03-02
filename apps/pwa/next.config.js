// next.config.js
const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  });
  
  module.exports = withPWA({
    // Your Next.js configuration options here
  });
  