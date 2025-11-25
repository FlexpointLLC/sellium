"use client"

import { Gear, User, Bell, Shield, CreditCard, Storefront } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-normal">Settings</h1>
        <p className="text-sm font-normal text-muted-foreground">Manage your account and store settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Profile
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <Storefront className="h-4 w-4" />
              Store
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <CreditCard className="h-4 w-4" />
              Payments
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <Shield className="h-4 w-4" />
              Security
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    Upload Photo
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 2MB
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input placeholder="John" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input placeholder="Doe" defaultValue="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="john@example.com" defaultValue="john@example.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input type="tel" placeholder="+1 (555) 000-0000" defaultValue="+1 (555) 123-4567" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Tell us about yourself..."
                  defaultValue="Passionate seller with 5+ years of experience in electronics and gadgets."
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

