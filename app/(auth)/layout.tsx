import { ArrowLeftIcon, Leaf } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground mb-8"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Voltar
        </Link>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10">
              <Leaf className="size-7 text-green-500" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Canna<span className="text-green-500">Guia</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
