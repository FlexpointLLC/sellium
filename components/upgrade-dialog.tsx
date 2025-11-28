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
import { Switch } from "@/components/ui/switch"
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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // Reset selected plan when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-select current plan if user is renewing (paid/pro), otherwise default to paid
      if (currentPlan === 'paid') {
        setSelectedPlan('paid')
      } else if (currentPlan === 'pro') {
        setSelectedPlan('pro')
      } else {
        setSelectedPlan('paid')
      }
      setTransactionId("")
      setBillingPeriod('monthly')
    }
  }, [open, currentPlan])

  // Use selected plan (always show both options)
  const targetPlan = selectedPlan
  
  // Calculate pricing based on plan and billing period
  const getPricing = () => {
    if (targetPlan === 'paid') {
      return billingPeriod === 'monthly' ? 500 : 5000 // 500/month or 5000/year (2 months free)
    } else {
      return billingPeriod === 'monthly' ? 1500 : 15000 // 1500/month or 15000/year (2 months free)
    }
  }
  
  const amount = getPricing().toString()
  const planName = targetPlan === 'paid' ? 'Paid' : 'Pro'
  const showPlanSelection = true // Always show plan selection

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
          billing_period: billingPeriod,
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
            {currentPlan === 'free' ? 'Choose Your Plan' : currentPlan === 'paid' ? 'Renew or Upgrade Plan' : 'Renew or Change Plan'}
          </DialogTitle>
          <DialogDescription>
            {currentPlan === 'free' 
              ? 'Complete your upgrade by sending the money via bKash and providing your transaction ID.'
              : 'Select a plan to renew or change your subscription. Complete payment via bKash and provide your transaction ID.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Selection - Always Show */}
          {showPlanSelection && (
            <div className="space-y-3">
              <Label>Select Plan:</Label>
              {currentPlan !== 'free' && (
                <p className="text-xs text-muted-foreground">
                  You can renew your current plan or switch to a different plan.
                </p>
              )}
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
                  <p className="text-lg font-bold text-orange-600">
                    {billingPeriod === 'monthly' ? '500' : '5,000'} BDT
                    {billingPeriod === 'yearly' && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">/year</span>
                    )}
                  </p>
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
                  <p className="text-lg font-bold text-purple-600">
                    {billingPeriod === 'monthly' ? '1,500' : '15,000'} BDT
                    {billingPeriod === 'yearly' && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">/year</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited traffic, 10k products
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Billing Period Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card">
            <div className="space-y-0.5">
              <Label htmlFor="billing-period" className="text-sm font-medium">
                Billing Period
              </Label>
              <p className="text-xs text-muted-foreground">
                {billingPeriod === 'yearly' ? 'Save 2 months with yearly billing' : 'Switch to yearly to save'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch
                id="billing-period"
                checked={billingPeriod === 'yearly'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
              />
              <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-950/20 dark:to-red-950/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <img src="/bkash.svg" alt="bKash" className="h-6 w-6" />
              <p className="text-sm font-semibold text-pink-900 dark:text-pink-100">Payment via bKash</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-md p-3 space-y-2">
              <p className="text-xs text-pink-800 dark:text-pink-200 font-medium">Send Money:</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-pink-900 dark:text-pink-100">
                    {parseInt(amount).toLocaleString()} BDT
                  </span>
                  <span className="text-xs text-pink-700 dark:text-pink-300">
                    {billingPeriod === 'monthly' ? 'per month' : 'per year'}
                  </span>
                </div>
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
                // Reset to current plan if renewing, otherwise paid
                if (currentPlan === 'paid') {
                  setSelectedPlan('paid')
                } else if (currentPlan === 'pro') {
                  setSelectedPlan('pro')
                } else {
                  setSelectedPlan('paid')
                }
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
              {submitting 
                ? "Submitting..." 
                : currentPlan === 'free' 
                  ? "Submit Upgrade" 
                  : currentPlan === targetPlan
                    ? "Submit Renewal"
                    : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

