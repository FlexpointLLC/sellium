import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

function generateSignature(data: string, privateKey: string): string {
  const sign = crypto.createSign("SHA256")
  sign.update(data)
  sign.end()
  return sign.sign(privateKey, "base64")
}

function decryptData(encryptedData: string, privateKey: string): string {
  const buffer = Buffer.from(encryptedData, "base64")
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  )
  return decrypted.toString("utf8")
}

function encryptData(data: string, publicKey: string): string {
  const buffer = Buffer.from(data)
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  )
  return encrypted.toString("base64")
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

    if (!paymentSettings?.nagad || !paymentSettings.payment_methods?.nagad) {
      return NextResponse.json(
        { error: "Nagad is not configured for this store" },
        { status: 400 }
      )
    }

    const nagadCredentials = paymentSettings.nagad
    const dateTime = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]

    // Step 1: Initialize payment
    const sensitiveData = {
      merchantId: nagadCredentials.merchant_id,
      datetime: dateTime,
      orderId: orderId,
      challenge: crypto.randomBytes(16).toString("hex"),
    }

    const signature = generateSignature(
      JSON.stringify(sensitiveData),
      nagadCredentials.private_key
    )

    const initResponse = await fetch(
      `${nagadCredentials.base_url}/api/dfs/check-out/initialize/${nagadCredentials.merchant_id}/${orderId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KM-Api-Version": nagadCredentials.api_version,
          "X-KM-IP-V4": "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
        body: JSON.stringify({
          accountNumber: nagadCredentials.merchant_number,
          dateTime: dateTime,
          sensitiveData: encryptData(
            JSON.stringify(sensitiveData),
            nagadCredentials.public_key
          ),
          signature: signature,
        }),
      }
    )

    const initData = await initResponse.json()

    if (initData.sensitiveData && initData.signature) {
      // Decrypt the response
      const decryptedData = JSON.parse(
        decryptData(initData.sensitiveData, nagadCredentials.private_key)
      )

      // Step 2: Complete payment initialization
      const paymentData = {
        merchantId: nagadCredentials.merchant_id,
        orderId: orderId,
        currencyCode: "050",
        amount: amount.toString(),
        challenge: decryptedData.challenge,
      }

      const completeSignature = generateSignature(
        JSON.stringify(paymentData),
        nagadCredentials.private_key
      )

      const completeResponse = await fetch(
        `${nagadCredentials.base_url}/api/dfs/check-out/complete/${decryptedData.paymentReferenceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": nagadCredentials.api_version,
            "X-KM-IP-V4": "127.0.0.1",
            "X-KM-Client-Type": "PC_WEB",
          },
          body: JSON.stringify({
            sensitiveData: encryptData(
              JSON.stringify(paymentData),
              nagadCredentials.public_key
            ),
            signature: completeSignature,
            merchantCallbackURL: callbackURL,
          }),
        }
      )

      const completeData = await completeResponse.json()

      if (completeData.callBackUrl) {
        return NextResponse.json({
          success: true,
          paymentReferenceId: decryptedData.paymentReferenceId,
          nagadURL: completeData.callBackUrl,
        })
      }

      return NextResponse.json(
        { error: completeData.message || "Failed to complete Nagad payment initialization" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: initData.message || "Failed to initialize Nagad payment" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Nagad create payment error:", error)
    return NextResponse.json(
      { error: "Failed to create Nagad payment" },
      { status: 500 }
    )
  }
}

