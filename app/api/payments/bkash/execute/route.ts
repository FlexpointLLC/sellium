import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// bKash Token Cache (shared with create route in production, use Redis/DB for real apps)
let bkashToken: { token: string; expiresAt: number } | null = null

async function getBkashToken(credentials: {
  base_url: string
  key: string
  username: string
  password: string
  secret: string
}) {
  if (bkashToken && bkashToken.expiresAt > Date.now()) {
    return bkashToken.token
  }

  const response = await fetch(`${credentials.base_url}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "username": credentials.username,
      "password": credentials.password,
    },
    body: JSON.stringify({
      app_key: credentials.key,
      app_secret: credentials.secret,
    }),
  })

  const data = await response.json()

  if (data.statusCode === "0000" && data.id_token) {
    bkashToken = {
      token: data.id_token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    }
    return data.id_token
  }

  throw new Error(data.statusMessage || "Failed to get bKash token")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, paymentID } = body

    if (!storeId || !paymentID) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get store's bKash credentials from Supabase
    const supabase = await createClient()
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("payment_settings")
      .eq("id", storeId)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      )
    }

    const paymentSettings = typeof store.payment_settings === "string"
      ? JSON.parse(store.payment_settings)
      : store.payment_settings

    const bkashCredentials = paymentSettings.bkash

    // Get bKash token
    const token = await getBkashToken(bkashCredentials)

    // Execute bKash payment
    const executeResponse = await fetch(
      `${bkashCredentials.base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": token,
          "X-APP-Key": bkashCredentials.key,
        },
        body: JSON.stringify({
          paymentID: paymentID,
        }),
      }
    )

    const executeData = await executeResponse.json()

    if (executeData.statusCode === "0000" && executeData.transactionStatus === "Completed") {
      return NextResponse.json({
        success: true,
        transactionId: executeData.trxID,
        paymentID: executeData.paymentID,
        amount: executeData.amount,
        payerReference: executeData.payerReference,
      })
    }

    return NextResponse.json(
      { 
        success: false,
        error: executeData.statusMessage || "Payment execution failed" 
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("bKash execute payment error:", error)
    return NextResponse.json(
      { error: "Failed to execute bKash payment" },
      { status: 500 }
    )
  }
}

