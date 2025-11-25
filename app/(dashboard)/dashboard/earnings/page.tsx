"use client"

import { CurrencyDollar, TrendUp, TrendDown, Calendar } from "phosphor-react"

const earningsData = {
  totalEarnings: 45231.89,
  thisMonth: 12450.00,
  lastMonth: 10890.50,
  pending: 2340.00,
}

const recentTransactions = [
  { id: 1, orderId: "ORD-001", amount: 299.99, fee: 8.99, net: 291.00, date: "2024-01-15", status: "Completed" },
  { id: 2, orderId: "ORD-002", amount: 129.99, fee: 3.89, net: 126.10, date: "2024-01-14", status: "Completed" },
  { id: 3, orderId: "ORD-003", amount: 549.95, fee: 16.49, net: 533.46, date: "2024-01-13", status: "Completed" },
  { id: 4, orderId: "ORD-004", amount: 189.98, fee: 5.69, net: 184.29, date: "2024-01-12", status: "Pending" },
  { id: 5, orderId: "ORD-005", amount: 79.99, fee: 2.39, net: 77.60, date: "2024-01-11", status: "Completed" },
]

export default function EarningsPage() {
  const growthPercent = ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1)
  const isPositiveGrowth = earningsData.thisMonth > earningsData.lastMonth

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
          <div className="mt-2 text-2xl font-bold">${earningsData.totalEarnings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Lifetime earnings</p>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">This Month</h3>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">${earningsData.thisMonth.toLocaleString()}</div>
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
          <div className="mt-2 text-2xl font-bold">${earningsData.lastMonth.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Previous month total</p>
        </div>

        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Pending Payout</h3>
            <CurrencyDollar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">${earningsData.pending.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Available for withdrawal</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        <div className="grid grid-cols-6 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Order</div>
          <div>Amount</div>
          <div>Fee</div>
          <div>Net</div>
          <div>Date</div>
          <div>Status</div>
        </div>
        {recentTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="grid grid-cols-6 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center font-medium">{transaction.orderId}</div>
            <div className="flex items-center">${transaction.amount.toFixed(2)}</div>
            <div className="flex items-center text-muted-foreground">-${transaction.fee.toFixed(2)}</div>
            <div className="flex items-center font-medium text-green-500">${transaction.net.toFixed(2)}</div>
            <div className="flex items-center text-muted-foreground">{transaction.date}</div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  transaction.status === "Completed"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {transaction.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

