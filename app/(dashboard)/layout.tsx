"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="overflow-auto scrollbar-hide">
      <DashboardSidebar />
      <SidebarInset className="overflow-auto scrollbar-hide">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 bg-muted/20 dark:bg-muted/3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 bg-muted/20 dark:bg-muted/3 overflow-auto scrollbar-hide">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

