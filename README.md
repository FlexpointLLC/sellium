# Sellium

A modern multi-vendor ecommerce platform built with Next.js, TypeScript, and Supabase.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, Storage, RLS)

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and Supabase client setup
- `/supabase` - Database migrations and schema

## Subscription Expiration

The platform automatically converts expired subscriptions to free plans. To enable this:

1. **Run the migration**: Execute `supabase/migrations/add_subscription_expiration.sql` in your Supabase SQL Editor

2. **Set up cron job**: Choose one of the following options:

   **Option A: Vercel Cron (Recommended for Vercel deployments)**
   - Add to `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/check-subscriptions",
       "schedule": "0 * * * *"
     }]
   }
   ```
   - Set environment variable: `CRON_SECRET` (optional, for security)

   **Option B: External Cron Service**
   - Set up a cron job to call: `GET https://your-domain.com/api/cron/check-subscriptions`
   - Include header: `Authorization: Bearer YOUR_CRON_SECRET` (if CRON_SECRET is set)
   - Recommended schedule: Every hour (`0 * * * *`)

   **Option C: Supabase pg_cron (If enabled)**
   - Uncomment the pg_cron section in the migration file
   - The function will run automatically every hour

3. **Environment Variables**:
   - `CRON_SECRET` (optional): Secret token for securing the cron endpoint

