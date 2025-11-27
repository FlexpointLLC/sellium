import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, paymentReferenceId } = body

    if (!storeId || !paymentReferenceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get store's Nagad credentials from Supabase
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

    const nagadCredentials = paymentSettings.nagad

    // Verify payment status
    const verifyResponse = await fetch(
      `${nagadCredentials.base_url}/api/dfs/verify/payment/${paymentReferenceId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-KM-Api-Version": nagadCredentials.api_version,
          "X-KM-IP-V4": "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
      }
    )

    const verifyData = await verifyResponse.json()

    if (verifyData.status === "Success") {
      return NextResponse.json({
        success: true,
        transactionId: verifyData.issuerPaymentRefNo,
        paymentReferenceId: verifyData.paymentRefId,
        amount: verifyData.amount,
        orderId: verifyData.orderId,
      })
    }

    return NextResponse.json(
      { 
        success: false,
        error: verifyData.message || "Payment verification failed" 
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("Nagad verify payment error:", error)
    return NextResponse.json(
      { error: "Failed to verify Nagad payment" },
      { status: 500 }
    )
  }
}

