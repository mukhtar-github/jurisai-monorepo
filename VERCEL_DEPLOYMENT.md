# JurisAI Vercel Deployment Guide

This guide provides instructions for deploying the JurisAI frontend to Vercel with the custom domain "jurisai.live".

## Prerequisites

1. [Vercel Account](https://vercel.com/signup) - Sign up or log in
2. [Vercel CLI](https://vercel.com/docs/cli) - Install with `npm i -g vercel`
3. Domain ownership for jurisai.live
4. Git repository for your JurisAI project

## Deployment Steps

### Step 1: Connect Your Repository to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Select the JurisAI repository

### Step 2: Configure Project Settings

Configure the following settings for your project:

1. **Framework Preset**: Next.js
2. **Root Directory**: apps/frontend
3. **Build Command**: next build
4. **Output Directory**: .next
5. **Install Command**: npm install

### Step 3: Environment Variables

Add the following environment variables:

```
NEXT_PUBLIC_API_URL=https://jurisai-backend.up.railway.app
```

Replace the API URL with the actual URL of your Railway-deployed backend.

### Step 4: Deploy the Project

Click "Deploy" to start the deployment process.

### Step 5: Set Up Custom Domain

After successful deployment:

1. Go to the project settings in Vercel Dashboard
2. Click on "Domains"
3. Add your custom domain: "jurisai.live"
4. Vercel will provide DNS configuration instructions

#### Option A: Using Vercel as your DNS provider

1. In your domain registrar, update nameservers to Vercel's nameservers:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com

#### Option B: Keep your current DNS provider

1. Add the following DNS records to your domain:
   - A Record: Point @ to the Vercel IP provided
   - CNAME Record: Point www to cname.vercel-dns.com

### Step 6: SSL Configuration

Vercel automatically provides and renews SSL certificates for your domain through Let's Encrypt.

### Step 7: Verify Deployment

1. Visit your custom domain: https://jurisai.live
2. Verify that the site loads correctly
3. Test basic functionality like:
   - User authentication
   - Document listing
   - Search functionality

## Continuous Deployment

Vercel automatically deploys when you push to your connected repository. To enable branch-specific deployments:

1. Go to your project settings in Vercel
2. Under "Git" tab, configure which branches trigger deployments

## Custom Domain Best Practices

1. **SSL Renewal**: Vercel handles this automatically
2. **Domain Security**: Consider enabling:
   - DNSSEC for added security
   - Domain privacy protection

3. **Domain Monitoring**: Set up monitoring for your domain to alert you if it goes down

## Troubleshooting

### Domain Configuration Issues

If your domain doesn't point to your Vercel deployment:

1. Verify DNS propagation using a tool like [whatsmydns.net](https://www.whatsmydns.net/)
2. Check your DNS records in your domain registrar
3. Ensure no conflicting DNS records exist

### Build Failures

If your deployment builds fail:

1. Check the build logs in Vercel dashboard
2. Verify your Next.js configuration
3. Test the build locally with `npm run build`

### API Connection Issues

If the frontend can't connect to the backend:

1. Verify the `NEXT_PUBLIC_API_URL` environment variable
2. Check CORS configuration on your backend
3. Test API endpoints directly

---

For more information, refer to [Vercel Documentation](https://vercel.com/docs)
