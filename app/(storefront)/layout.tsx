import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      {children}
    </div>
  )
}

