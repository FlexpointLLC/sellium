"use client"

import { Headset, ChatCircle, Envelope, Question, Book, Plus } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const supportTickets = [
  { id: "TKT-001", subject: "Payment not received", status: "Open", priority: "High", updated: "2 hours ago" },
  { id: "TKT-002", subject: "Product listing issue", status: "In Progress", priority: "Medium", updated: "1 day ago" },
  { id: "TKT-003", subject: "Account verification", status: "Resolved", priority: "Low", updated: "3 days ago" },
]

const faqItems = [
  { question: "How do I add a new product?", answer: "Go to Products > Add Product and fill in the required details." },
  { question: "When do I receive payouts?", answer: "Payouts are processed weekly on Fridays for all completed orders." },
  { question: "How can I update my store information?", answer: "Navigate to Settings > Store to update your store details." },
]

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal">Support</h1>
          <p className="text-sm font-normal text-muted-foreground">Get help and contact our support team</p>
        </div>
        <Button size="sm">
          <Plus />
          New Ticket
        </Button>
      </div>

      {/* Contact Options */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ChatCircle className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Live Chat</h3>
          <p className="mt-1 text-sm text-muted-foreground">Chat with our support team</p>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            Start Chat
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Envelope className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Email Support</h3>
          <p className="mt-1 text-sm text-muted-foreground">support@sellium.com</p>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            Send Email
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Book className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Documentation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Browse our help articles</p>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            View Docs
          </Button>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Your Tickets</h2>
        </div>
        <div className="grid grid-cols-5 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Ticket ID</div>
          <div>Subject</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Last Updated</div>
        </div>
        {supportTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="grid grid-cols-5 gap-4 border-b px-6 py-4 last:border-0 cursor-pointer hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Headset className="h-4 w-4" />
              </div>
              <span className="font-medium">{ticket.id}</span>
            </div>
            <div className="flex items-center">{ticket.subject}</div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  ticket.status === "Open"
                    ? "bg-blue-500/10 text-blue-500"
                    : ticket.status === "In Progress"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-green-500/10 text-green-500"
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  ticket.priority === "High"
                    ? "bg-red-500/10 text-red-500"
                    : ticket.priority === "Medium"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-gray-500/10 text-gray-500"
                }`}
              >
                {ticket.priority}
              </span>
            </div>
            <div className="flex items-center text-muted-foreground">{ticket.updated}</div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y">
          {faqItems.map((item, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex items-start gap-3">
                <Question className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{item.question}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

