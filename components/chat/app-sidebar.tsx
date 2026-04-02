"use client";

import {
  Leaf,
  LogIn,
  PanelLeftIcon,
  PenSquareIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { AuthModal } from "@/components/chat/auth-modal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import { ChatItem } from "@/components/chat/sidebar-history-item";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

const guestRegex = /^guest-/;

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuest = !user || guestRegex.test(user.email ?? "");
  const activeChatId = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetcher(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/search?q=${encodeURIComponent(query.trim())}`
        );
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
              <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/40" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar conversas..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="h-8 w-full rounded-lg bg-sidebar-accent/30 pl-8 pr-8 text-[13px] text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:bg-sidebar-accent/50 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setIsSearching(false);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {searchQuery.trim().length >= 2 ? (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                Resultados
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isSearching ? (
                    <div className="flex flex-col gap-0.5 px-1">
                      {[44, 32, 28].map((item) => (
                        <div
                          className="flex h-8 items-center gap-2 rounded-lg px-2"
                          key={item}
                        >
                          <div
                            className="h-3 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                            style={{ "--skeleton-width": `${item}%` } as React.CSSProperties}
                          />
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={chat.id === activeChatId}
                        onDelete={() => {}}
                        setOpenMobile={setOpenMobile}
                      />
                    ))
                  ) : (
                    <div className="px-2 py-3 text-[13px] text-sidebar-foreground/50">
                      Nenhuma conversa encontrada
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            !isGuest && <SidebarHistory user={user} />
          )}
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

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
