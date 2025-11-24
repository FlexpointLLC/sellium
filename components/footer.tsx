import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
        <p>© {currentYear} Sellium. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Notice
          </Link>
          <Link
            href="/refund"
            className="hover:text-foreground transition-colors"
          >
            Refund Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}

