import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}

