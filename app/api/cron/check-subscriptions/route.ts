import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
// It checks for expired subscriptions and converts them to free plans

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date().toISOString()

    // Find all stores with expired subscriptions (paid or pro plans)
    const { data: expiredStores, error: fetchError } = await supabase
      .from("stores")
      .select("id, plan, subscription_expires_at")
      .in("plan", ["paid", "pro"])
      .not("subscription_expires_at", "is", null)
      .lte("subscription_expires_at", now)

    if (fetchError) {
      console.error("Error fetching expired stores:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch expired stores", details: fetchError.message },
        { status: 500 }
      )
    }

    if (!expiredStores || expiredStores.length === 0) {
      return NextResponse.json({
        message: "No expired subscriptions found",
        count: 0,
      })
    }

    // Define free plan limits
    const freeLimits = { traffic: 2000, products: 100, orders: 500 }

    // Update all expired stores to free plan
    const storeIds = expiredStores.map((store) => store.id)
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        plan: "free",
        traffic_limit: freeLimits.traffic,
        product_limit: freeLimits.products,
        order_limit: freeLimits.orders,
        subscription_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", storeIds)

    if (updateError) {
      console.error("Error updating expired stores:", updateError)
      return NextResponse.json(
        { error: "Failed to update expired stores", details: updateError.message },
        { status: 500 }
      )
    }

    // Create cancellation records for tracking
    const cancellationRecords = expiredStores.map((store) => ({
      store_id: store.id,
      current_plan: store.plan,
      requested_plan: store.plan === "paid" ? "paid" : "pro",
      transaction_id: "EXPIRED",
      billing_period: "monthly",
      status: "canceled",
      notes: "Subscription expired automatically",
    }))

    if (cancellationRecords.length > 0) {
      await supabase.from("upgrade_requests").insert(cancellationRecords)
    }

    return NextResponse.json({
      message: "Successfully processed expired subscriptions",
      count: expiredStores.length,
      stores: expiredStores.map((store) => ({
        id: store.id,
        previous_plan: store.plan,
        expired_at: store.subscription_expires_at,
      })),
    })
  } catch (error) {
    console.error("Unexpected error in check-subscriptions:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request)
}

