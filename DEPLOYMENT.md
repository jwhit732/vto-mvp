# VTO App Deployment Guide - Vercel

## Prerequisites

1. **GitHub Account** - to connect with Vercel
2. **Vercel Account** - sign up at [vercel.com](https://vercel.com)
3. **Gemini API Key** - from Google AI Studio

## Step-by-Step Deployment

### 1. Push to GitHub (if not done yet)

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/vto-mvp.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"New Project"**
3. **Import your GitHub repository**
4. Select the `vto-mvp` repository

### 3. Configure Environment Variables

In Vercel dashboard:
1. Go to **Project Settings** → **Environment Variables**
2. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GEMINI_API_KEY` | `YOUR_ACTUAL_API_KEY` | Production, Preview, Development |

**⚠️ IMPORTANT**: Replace `YOUR_ACTUAL_API_KEY` with your real Gemini API key from Google AI Studio.

### 4. Deploy Settings

Vercel will auto-detect Next.js. Verify these settings:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 5. Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Get your live URL: `https://your-app-name.vercel.app`

## Testing Your Deployment

1. Visit your Vercel URL
2. Test the VTO functionality
3. Check browser console for any errors
4. Verify API key is working (test the `/api/test-api-key` endpoint)

## Custom Domain (Optional)

1. In Vercel dashboard → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Common Issues:

1. **"API key not configured"**
   - Check environment variables are set correctly
   - Ensure `GEMINI_API_KEY` is added to all environments

2. **Build failures**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in package.json

3. **API timeout errors**
   - Vercel free tier has 10s function timeout
   - Upgrade to Pro for longer timeouts if needed

## Production Checklist

- [ ] Environment variables configured
- [ ] Custom domain set up (optional)
- [ ] API key working in production
- [ ] All features tested on live site
- [ ] Performance optimized

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)