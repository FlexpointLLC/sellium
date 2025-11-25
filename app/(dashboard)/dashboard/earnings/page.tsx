"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CurrencyDollar, TrendUp, TrendDown, Calendar, Receipt, ArrowRight } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

interface Transaction {
  id: string
  order_id: string | null
  type: string
  amount: number
  fee: number
  net_amount: number
  status: string
  description: string | null
  created_at: string
  order?: {
    order_number: string
  }[] | null
}

interface EarningsData {
  totalEarnings: number
  thisMonth: number
  lastMonth: number
  pending: number
}

interface Store {
  id: string
  name: string
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  cancelled: "bg-gray-500/10 text-gray-500",
}

const typeColors: Record<string, string> = {
  sale: "text-green-500",
  refund: "text-red-500",
  payout: "text-blue-500",
  fee: "text-orange-500",
  adjustment: "text-purple-500",
}

export default function EarningsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0,
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Calculate date ranges
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch transactions with order info
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select(`
        id,
        order_id,
        type,
        amount,
        fee,
        net_amount,
        status,
        description,
        created_at,
        order:orders(order_number)
      `)
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (transactionsData) {
      setTransactions(transactionsData as Transaction[])
    }

    // Calculate total earnings (completed sales)
    const { data: totalData } = await supabase
      .from("transactions")
      .select("net_amount")
      .eq("store_id", storeData.id)
      .eq("type", "sale")
      .eq("status", "completed")

    const totalEarnings = totalData?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    // Calculate this month earnings
    const { data: thisMonthData } = await supabase
      .from("transactions")
      .select("net_amount")
      .eq("store_id", storeData.id)
      .eq("type", "sale")
      .eq("status", "completed")
      .gte("created_at", thisMonthStart.toISOString())

    const thisMonth = thisMonthData?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    // Calculate last month earnings
    const { data: lastMonthData } = await supabase
      .from("transactions")
      .select("net_amount")
      .eq("store_id", storeData.id)
      .eq("type", "sale")
      .eq("status", "completed")
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString())

    const lastMonth = lastMonthData?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    // Calculate pending earnings
    const { data: pendingData } = await supabase
      .from("transactions")
      .select("net_amount")
      .eq("store_id", storeData.id)
      .eq("type", "sale")
      .eq("status", "pending")

    const pending = pendingData?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0

    setEarningsData({
      totalEarnings,
      thisMonth,
      lastMonth,
      pending,
    })

    setLoading(false)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const growthPercent = earningsData.lastMonth > 0
    ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1)
    : earningsData.thisMonth > 0 ? "100" : "0"
  const isPositiveGrowth = earningsData.thisMonth >= earningsData.lastMonth

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-normal">Earnings</h1>
        <p className="text-sm font-normal text-muted-foreground">Track your revenue and payouts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Total Earnings</h3>
            <CurrencyDollar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(earningsData.totalEarnings)}</div>
          <p className="text-xs text-muted-foreground">Lifetime earnings</p>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">This Month</h3>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(earningsData.thisMonth)}</div>
          <div className="flex items-center gap-1 text-xs">
            {isPositiveGrowth ? (
              <>
                <TrendUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+{growthPercent}%</span>
              </>
            ) : (
              <>
                <TrendDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500">{growthPercent}%</span>
              </>
            )}
            <span className="text-muted-foreground">from last month</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Last Month</h3>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(earningsData.lastMonth)}</div>
          <p className="text-xs text-muted-foreground">Previous month total</p>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Pending Payout</h3>
            <CurrencyDollar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(earningsData.pending)}</div>
          <p className="text-xs text-muted-foreground">Available for withdrawal</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No transactions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Transactions will appear here when you make sales.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
              <div>Type</div>
              <div>Order</div>
              <div>Amount</div>
              <div>Fee</div>
              <div>Net</div>
              <div>Date</div>
              <div>Status</div>
            </div>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid grid-cols-7 gap-4 border-b px-6 py-4 last:border-0"
              >
                <div className="flex items-center">
                  <span className={`font-medium capitalize ${typeColors[transaction.type] || "text-foreground"}`}>
                    {transaction.type}
                  </span>
                </div>
                <div className="flex items-center font-medium">
                  {transaction.order?.[0]?.order_number || transaction.description || "-"}
                </div>
                <div className="flex items-center">
                  {transaction.type === "refund" ? "-" : ""}
                  {formatCurrency(transaction.amount)}
                </div>
                <div className="flex items-center text-muted-foreground">
                  {transaction.fee > 0 ? `-${formatCurrency(transaction.fee)}` : "-"}
                </div>
                <div className={`flex items-center font-medium ${
                  transaction.type === "refund" ? "text-red-500" : "text-green-500"
                }`}>
                  {transaction.type === "refund" ? "-" : ""}
                  {formatCurrency(transaction.net_amount)}
                </div>
                <div className="flex items-center text-muted-foreground">
                  {formatDate(transaction.created_at)}
                </div>
                <div className="flex items-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      statusColors[transaction.status] || "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Quick Stats from Orders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Average Order Value</h3>
          <p className="text-2xl font-bold mt-1">
            {transactions.filter(t => t.type === "sale").length > 0
              ? formatCurrency(
                  transactions
                    .filter(t => t.type === "sale")
                    .reduce((sum, t) => sum + t.amount, 0) /
                  transactions.filter(t => t.type === "sale").length
                )
              : "$0.00"
            }
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Fees Paid</h3>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(transactions.reduce((sum, t) => sum + t.fee, 0))}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Transactions This Month</h3>
          <p className="text-2xl font-bold mt-1">
            {transactions.filter(t => {
              const transDate = new Date(t.created_at)
              const now = new Date()
              return transDate.getMonth() === now.getMonth() && 
                     transDate.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </div>
      </div>
    </div>
  )
}
