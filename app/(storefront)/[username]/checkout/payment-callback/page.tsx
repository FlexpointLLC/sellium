"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle, XCircle, ArrowsClockwise } from "phosphor-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { CartProvider } from "@/lib/cart-context"

function PaymentCallbackContent({ 
  params 
}: { 
  params: { username: string } 
}) {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    processPaymentCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processPaymentCallback() {
    const supabase = createClient()
    
    // Get parameters from URL
    const paymentID = searchParams.get("paymentID")
    const paymentStatus = searchParams.get("status")
    const paymentMethod = searchParams.get("method") || "bkash"
    const storedOrderId = searchParams.get("orderId")
    const storeId = searchParams.get("storeId")
    const paymentReferenceId = searchParams.get("payment_ref_id")

    if (paymentStatus === "cancel" || paymentStatus === "failure") {
      setStatus("failed")
      setError("Payment was cancelled or failed")
      
      // Update order status to failed
      if (storedOrderId) {
        await supabase
          .from("orders")
          .update({ 
            payment_status: "failed",
            status: "cancelled"
          })
          .eq("id", storedOrderId)
      }
      return
    }

    try {
      if (paymentMethod === "bkash" && paymentID && storeId) {
        // Execute bKash payment
        const executeResponse = await fetch("/api/payments/bkash/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: storeId,
            paymentID: paymentID,
          }),
        })

        const executeData = await executeResponse.json()

        if (executeData.success) {
          // Update order with payment details
          if (storedOrderId) {
            const { data: orderData } = await supabase
              .from("orders")
              .update({
                payment_status: "paid",
                payment_details: {
                  method: "bkash",
                  transactionId: executeData.transactionId,
                  paymentID: executeData.paymentID,
                  amount: executeData.amount,
                  paidAt: new Date().toISOString(),
                },
              })
              .eq("id", storedOrderId)
              .select("order_number")
              .single()
            
            if (orderData) {
              setOrderNumber(orderData.order_number)
            }
          }

          // Clear the cart
          clearCart()
          setOrderId(storedOrderId)
          setStatus("success")
        } else {
          throw new Error(executeData.error || "Payment execution failed")
        }
      } else if (paymentMethod === "nagad" && paymentReferenceId && storeId) {
        // Verify Nagad payment
        const verifyResponse = await fetch("/api/payments/nagad/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: storeId,
            paymentReferenceId: paymentReferenceId,
          }),
        })

        const verifyData = await verifyResponse.json()

        if (verifyData.success) {
          // Update order with payment details
          if (storedOrderId) {
            const { data: orderData } = await supabase
              .from("orders")
              .update({
                payment_status: "paid",
                payment_details: {
                  method: "nagad",
                  transactionId: verifyData.transactionId,
                  paymentReferenceId: verifyData.paymentReferenceId,
                  amount: verifyData.amount,
                  paidAt: new Date().toISOString(),
                },
              })
              .eq("id", storedOrderId)
              .select("order_number")
              .single()
            
            if (orderData) {
              setOrderNumber(orderData.order_number)
            }
          }

          // Clear the cart
          clearCart()
          setOrderId(storedOrderId)
          setStatus("success")
        } else {
          throw new Error(verifyData.error || "Payment verification failed")
        }
      } else {
        throw new Error("Invalid payment callback parameters")
      }
    } catch (err) {
      console.error("Payment callback error:", err)
      setStatus("failed")
      setError(err instanceof Error ? err.message : "Payment processing failed")
      
      // Update order status to failed
      if (storedOrderId) {
        await supabase
          .from("orders")
          .update({ 
            payment_status: "failed",
          })
          .eq("id", storedOrderId)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === "processing" && (
          <>
            <ArrowsClockwise className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your order has been placed successfully.
              {orderNumber && <span className="block mt-2">Order Number: <strong>{orderNumber}</strong></span>}
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/${params.username}`}>
                <Button className="w-full">Continue Shopping</Button>
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-2">
              {error || "Something went wrong with your payment."}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please try again or choose a different payment method.
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/${params.username}/checkout`}>
                <Button className="w-full">Try Again</Button>
              </Link>
              <Link href={`/${params.username}`}>
                <Button variant="outline" className="w-full">Continue Shopping</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentCallbackPage({ 
  params 
}: { 
  params: { username: string } 
}) {
  return (
    <CartProvider storeUsername={params.username}>
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <ArrowsClockwise className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <PaymentCallbackContent params={params} />
      </Suspense>
    </CartProvider>
  )
}

