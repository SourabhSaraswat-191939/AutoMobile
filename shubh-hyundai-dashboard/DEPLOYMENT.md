# Deployment Guide

## Frontend Deployment (Vercel)

### Environment Variables

When deploying the frontend to Vercel, you need to set the following environment variable:

```
NEXT_PUBLIC_API_URL=https://auto-mobile-mblq.vercel.app
```

### Steps to Deploy:

1. **Set Environment Variable in Vercel:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add `NEXT_PUBLIC_API_URL` with value `https://auto-mobile-mblq.vercel.app`
   - Make sure to select all environments (Production, Preview, Development)

2. **Auto-detection (Alternative):**
   - If you don't set `NEXT_PUBLIC_API_URL`, the app will automatically detect if it's running on localhost vs deployed
   - On deployed versions (non-localhost domains), it will automatically use the deployed backend
   - On localhost, it will use `http://localhost:5000`

### Verification:

After deployment, check the browser console logs. You should see:
- `🌐 API URL: https://auto-mobile-mblq.vercel.app/api/...` (not localhost)

If you see `localhost:5000` in deployed logs, the environment variable is not set correctly.

## Backend Deployment

The backend is already deployed at: `https://auto-mobile-mblq.vercel.app`

Ensure these environment variables are set in Vercel backend project:
- `MONGO_URI` - MongoDB connection string
- Any other required backend environment variables

