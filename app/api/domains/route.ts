import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID // Optional, for team projects

// Add a domain to Vercel project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { domain, storeId } = await request.json()

    if (!domain || !storeId) {
      return NextResponse.json({ error: "Domain and storeId are required" }, { status: 400 })
    }

    // Verify user owns this store
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Add domain to Vercel
    const vercelUrl = VERCEL_TEAM_ID 
      ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`

    const vercelResponse = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    })

    const vercelData = await vercelResponse.json()

    if (!vercelResponse.ok) {
      console.error("Vercel API error:", vercelData)
      
      // Handle specific Vercel errors
      if (vercelData.error?.code === "domain_already_in_use") {
        return NextResponse.json({ 
          error: "This domain is already in use by another project" 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: vercelData.error?.message || "Failed to add domain to Vercel" 
      }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = `sellium-verify-${storeId.slice(0, 8)}-${Date.now().toString(36)}`

    // Save domain to Supabase
    const { data: domainData, error: dbError } = await supabase
      .from("custom_domains")
      .upsert({
        store_id: storeId,
        domain: domain.toLowerCase(),
        status: vercelData.verified ? "verified" : "pending",
        ssl_status: vercelData.verified ? "active" : "pending",
        verification_token: verificationToken,
        dns_configured: vercelData.verified,
        verified_at: vercelData.verified ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
      }, {
        onConflict: "store_id"
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save domain" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      domain: domainData,
      vercel: {
        verified: vercelData.verified,
        verification: vercelData.verification,
      }
    })

  } catch (error) {
    console.error("Error adding domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Check domain verification status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get("domain")
    const storeId = searchParams.get("storeId")

    if (!domain || !storeId) {
      return NextResponse.json({ error: "Domain and storeId are required" }, { status: 400 })
    }

    // Verify user owns this store
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Check domain status on Vercel
    const vercelUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`

    const vercelResponse = await fetch(vercelUrl, {
      headers: {
        "Authorization": `Bearer ${VERCEL_API_TOKEN}`,
      },
    })

    if (!vercelResponse.ok) {
      const errorData = await vercelResponse.json()
      return NextResponse.json({ 
        error: errorData.error?.message || "Failed to check domain status" 
      }, { status: 400 })
    }

    const vercelData = await vercelResponse.json()

    // Update domain status in Supabase
    const newStatus = vercelData.verified ? "verified" : "pending"
    const newSslStatus = vercelData.verified ? "active" : "pending"

    await supabase
      .from("custom_domains")
      .update({
        status: newStatus,
        ssl_status: newSslStatus,
        dns_configured: vercelData.verified,
        verified_at: vercelData.verified ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)

    return NextResponse.json({
      verified: vercelData.verified,
      verification: vercelData.verification,
      status: newStatus,
      ssl_status: newSslStatus,
    })

  } catch (error) {
    console.error("Error checking domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Remove domain from Vercel project
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get("domain")
    const storeId = searchParams.get("storeId")

    if (!domain || !storeId) {
      return NextResponse.json({ error: "Domain and storeId are required" }, { status: 400 })
    }

    // Verify user owns this store
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Remove domain from Vercel
    const vercelUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`

    const vercelResponse = await fetch(vercelUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${VERCEL_API_TOKEN}`,
      },
    })

    if (!vercelResponse.ok) {
      const errorData = await vercelResponse.json()
      console.error("Vercel delete error:", errorData)
      // Continue to delete from DB even if Vercel fails
    }

    // Remove from Supabase
    await supabase
      .from("custom_domains")
      .delete()
      .eq("store_id", storeId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error removing domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

