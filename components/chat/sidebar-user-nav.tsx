"use client";

import { Camera, ChevronUp, Crown, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

function emailToHue(email: string): number {
  let hash = 0;
  for (const char of email) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function ProfileModal({
  user,
  open,
  onClose,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [imageUrl, setImageUrl] = useState(user.image || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { update: updateSession } = useSession();

  // Sync state when modal opens with fresh user data
  useEffect(() => {
    if (open) {
      setName(user.name || "");
      setImageUrl(user.image || "");
    }
  }, [open, user.name, user.image]);

  if (!open) return null;

  const hue = emailToHue(user.email ?? "");
  const initials = getInitials(user.name, user.email);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          image: imageUrl || undefined,
        }),
      });
      if (res.ok) {
        // Refresh session to pick up new name/image
        await updateSession();
        onClose();
      }
    } catch {
      // save failed
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = name !== (user.name || "") || imageUrl !== (user.image || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-6">Editar perfil</h2>

        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="size-20 rounded-full ring-2 ring-border object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div
                className="size-20 rounded-full ring-2 ring-border flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, oklch(0.55 0.15 ${hue}), oklch(0.45 0.12 ${hue + 40}))`,
                }}
              >
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-muted border-2 border-card flex items-center justify-center hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <LoaderIcon />
              ) : (
                <Camera className="size-3.5 text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-lg border border-border px-4 py-2">
            <label className="text-[11px] text-muted-foreground">Nome de exibicao</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full bg-transparent text-sm outline-none mt-0.5"
              placeholder="Seu nome"
            />
          </div>
          <div className="rounded-lg border border-border px-4 py-3 opacity-60">
            <p className="text-[11px] text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-5 py-2 text-sm rounded-lg bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { data, status } = useSession();
  const [showProfile, setShowProfile] = useState(false);

  const sessionUser = data?.user;
  const isGuest = guestRegex.test(sessionUser?.email ?? "");
  const plan = (sessionUser as any)?.plan;
  const isPremium = plan === "premium";

  // Use session data (client-side, updates on save) over server prop
  const displayName = sessionUser?.name || user?.name;
  const displayImage = sessionUser?.image || user?.image;
  const displayEmail = sessionUser?.email || user?.email;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {status === "loading" ? (
                <SidebarMenuButton className="h-10 justify-between rounded-lg bg-transparent text-sidebar-foreground/50 transition-colors duration-150 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex flex-row items-center gap-2">
                    <div className="size-6 animate-pulse rounded-full bg-sidebar-foreground/10" />
                    <span className="animate-pulse rounded-md bg-sidebar-foreground/10 text-transparent text-[13px]">
                      Loading...
                    </span>
                  </div>
                  <div className="animate-spin text-sidebar-foreground/50">
                    <LoaderIcon />
                  </div>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  className="h-auto min-h-[40px] px-2 py-1.5 rounded-lg bg-transparent text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="user-nav-button"
                >
                  {displayImage ? (
                    <img src={displayImage} alt="" className="size-6 shrink-0 rounded-full ring-1 ring-sidebar-border/50" referrerPolicy="no-referrer" />
                  ) : (
                    <div
                      className="size-6 shrink-0 rounded-full ring-1 ring-sidebar-border/50 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.55 0.15 ${emailToHue(displayEmail ?? "")}), oklch(0.45 0.12 ${emailToHue(displayEmail ?? "") + 40}))`,
                      }}
                    >
                      {getInitials(displayName, displayEmail)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-[13px]" data-testid="user-email">
                      {isGuest ? "Visitante" : (displayName || displayEmail)}
                    </span>
                    {isPremium && (
                      <span className="text-[11px] text-green-500 font-medium">Plano Premium</span>
                    )}
                    {!isPremium && !isGuest && (
                      <span className="text-[11px] text-sidebar-foreground/40">Free</span>
                    )}
                  </div>
                  <ChevronUp className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-popper-anchor-width) rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)]"
              data-testid="user-nav-menu"
              side="top"
            >
              {!isPremium && !isGuest && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer text-[13px] gap-2"
                    onSelect={() => router.push("/planos")}
                  >
                    <Crown className="size-4 text-green-500" />
                    Fazer upgrade do plano
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer text-[13px] gap-2"
                onSelect={() => setShowProfile(true)}
              >
                <UserIcon className="size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild data-testid="user-nav-item-auth">
                <button
                  className="w-full cursor-pointer text-[13px] gap-2"
                  onClick={() => {
                    if (status === "loading") {
                      toast({
                        type: "error",
                        description: "Verificando autenticacao, tente novamente!",
                      });
                      return;
                    }
                    if (isGuest) {
                      router.push("/login");
                    } else {
                      signOut({ redirectTo: "/" });
                    }
                  }}
                  type="button"
                >
                  <LogOut className="size-4" />
                  {isGuest ? "Entrar na sua conta" : "Sair"}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ProfileModal user={{ ...user, name: displayName, image: displayImage, email: displayEmail }} open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
