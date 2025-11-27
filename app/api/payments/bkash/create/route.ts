import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// bKash Token Cache
let bkashToken: { token: string; expiresAt: number } | null = null

async function getBkashToken(credentials: {
  base_url: string
  key: string
  username: string
  password: string
  secret: string
}) {
  // Check if we have a valid cached token
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
    // Cache the token (expires in 1 hour, but we refresh after 55 minutes to be safe)
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
    const { storeId, amount, orderId, callbackURL } = body

    if (!storeId || !amount || !orderId || !callbackURL) {
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

    if (!paymentSettings?.bkash || !paymentSettings.payment_methods?.bkash) {
      return NextResponse.json(
        { error: "bKash is not configured for this store" },
        { status: 400 }
      )
    }

    const bkashCredentials = paymentSettings.bkash

    // Get bKash token
    const token = await getBkashToken(bkashCredentials)

    // Create bKash payment
    const createPaymentResponse = await fetch(
      `${bkashCredentials.base_url}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": token,
          "X-APP-Key": bkashCredentials.key,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: orderId,
          callbackURL: callbackURL,
          amount: amount.toString(),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: orderId,
        }),
      }
    )

    const paymentData = await createPaymentResponse.json()

    if (paymentData.statusCode === "0000" && paymentData.bkashURL) {
      return NextResponse.json({
        success: true,
        paymentID: paymentData.paymentID,
        bkashURL: paymentData.bkashURL,
      })
    }

    return NextResponse.json(
      { error: paymentData.statusMessage || "Failed to create bKash payment" },
      { status: 400 }
    )
  } catch (error) {
    console.error("bKash create payment error:", error)
    return NextResponse.json(
      { error: "Failed to create bKash payment" },
      { status: 500 }
    )
  }
}

