"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Crown, Check } from "phosphor-react"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: 'free' | 'paid' | 'pro'
  storeId: string
}

export function UpgradeDialog({ open, onOpenChange, currentPlan, storeId }: UpgradeDialogProps) {
  const [transactionId, setTransactionId] = useState("")
  const [selectedPlan, setSelectedPlan] = useState<'paid' | 'pro'>('paid')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // Reset selected plan when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlan(currentPlan === 'free' ? 'paid' : 'pro')
      setTransactionId("")
    }
  }, [open, currentPlan])

  // Determine which plan to upgrade to
  const targetPlan = currentPlan === 'free' ? selectedPlan : 'pro'
  const amount = targetPlan === 'paid' ? '500' : '1500'
  const planName = targetPlan === 'paid' ? 'Paid' : 'Pro'
  const showPlanSelection = currentPlan === 'free'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!transactionId.trim()) {
      toast.error("Please enter a transaction ID")
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from("upgrade_requests")
        .insert({
          store_id: storeId,
          current_plan: currentPlan,
          requested_plan: targetPlan,
          transaction_id: transactionId.trim(),
          status: 'pending'
        })

      if (error) {
        console.error("Upgrade request error:", error)
        toast.error("Failed to submit upgrade request. Please try again.")
        setSubmitting(false)
        return
      }

      // Show success message
      toast.success(
        "We are reviewing your request. It will take 1 to 24 hours to verify your request. Thank you for your patience.",
        { duration: 8000 }
      )

      // Reset form and close dialog
      setTransactionId("")
      onOpenChange(false)
    } catch (err) {
      console.error("Upgrade request error:", err)
      toast.error("Something went wrong. Please try again.")
    }

    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-orange-600" weight="fill" />
            {showPlanSelection ? 'Choose Your Plan' : `Upgrade to ${planName} Plan`}
          </DialogTitle>
          <DialogDescription>
            Complete your upgrade by sending the money via bKash and providing your transaction ID.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Selection for Free Users */}
          {showPlanSelection && (
            <div className="space-y-3">
              <Label>Select Plan:</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Paid Plan Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('paid')}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlan === 'paid'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/20'
                      : 'border-border hover:border-orange-300'
                  }`}
                >
                  {selectedPlan === 'paid' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-orange-600" weight="fill" />
                    <span className="font-semibold text-sm">Paid Plan</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">500 BDT</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Custom domain, 50k traffic, 1000 products
                  </p>
                </button>

                {/* Pro Plan Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('pro')}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlan === 'pro'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  {selectedPlan === 'pro' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-purple-600" weight="fill" />
                    <span className="font-semibold text-sm">Pro Plan</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">1500 BDT</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited traffic, 10k products
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-950/20 dark:to-red-950/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <img src="/bkash.svg" alt="bKash" className="h-6 w-6" />
              <p className="text-sm font-semibold text-pink-900 dark:text-pink-100">Payment via bKash</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-md p-3 space-y-2">
              <p className="text-xs text-pink-800 dark:text-pink-200 font-medium">Send Money:</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-pink-900 dark:text-pink-100">{amount} BDT</span>
                <span className="text-sm font-semibold text-pink-900 dark:text-pink-100">01834911911</span>
              </div>
            </div>
            <p className="text-xs text-pink-700 dark:text-pink-300">
              After sending the money via bKash, enter your transaction ID below to complete the upgrade request.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID *</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter your transaction ID"
              required
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTransactionId("")
                setSelectedPlan(currentPlan === 'free' ? 'paid' : 'pro')
                onOpenChange(false)
              }}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !transactionId.trim()}
              className={`flex-1 text-white ${
                targetPlan === 'paid'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {submitting ? "Submitting..." : "Submit Upgrade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

