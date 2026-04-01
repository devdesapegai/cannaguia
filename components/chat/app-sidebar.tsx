"use client";

import {
  Leaf,
  LogIn,
  PanelLeftIcon,
  PenSquareIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { AuthModal } from "@/components/chat/auth-modal";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const guestRegex = /^guest-/;

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isGuest = !user || guestRegex.test(user.email ?? "");

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("Todas as conversas apagadas");
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group/logo relative flex items-center justify-center">
                <SidebarMenuButton
                  asChild
                  className="size-9 !px-0 items-center justify-center group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                  tooltip="CannaGuia"
                >
                  <Link href="/chat" onClick={() => setOpenMobile(false)}>
                    <Leaf className="size-6 text-green-500" />
                  </Link>
                </SidebarMenuButton>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className="pointer-events-none absolute inset-0 size-8 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                      onClick={() => toggleSidebar()}
                    >
                      <PanelLeftIcon className="size-4" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Abrir menu
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/chat");
                    }}
                    tooltip="Novo Chat"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">Novo chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {!isGuest && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteAllDialog(true)}
                      tooltip="Apagar Todas as Conversas"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">Apagar tudo</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {!isGuest && <SidebarHistory user={user} />}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {isGuest ? (
            <div className="px-3 py-4 group-data-[collapsible=icon]:hidden">
              <p className="text-[13px] font-semibold text-sidebar-foreground mb-1">
                Receba respostas personalizadas
              </p>
              <p className="text-[12px] text-sidebar-foreground/50 mb-4 leading-relaxed">
                Entre para salvar conversas, receber recomendações de strains e acessar o histórico completo.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full h-10 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="size-4" />
                Entrar
              </button>
            </div>
          ) : (
            user && <SidebarUserNav user={user} />
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todas as conversas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as suas conversas serão permanentemente deletadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
