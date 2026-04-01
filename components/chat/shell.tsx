"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Clock, Crown, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthModal } from "./auth-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveChat } from "@/hooks/use-active-chat";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
// Artifact removed for performance
import { ChatHeader } from "./chat-header";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export function ChatShell() {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
    votes,
    currentModelId,
    setCurrentModelId,
    showCreditCardAlert,
    setShowCreditCardAlert,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isGuest = sessionStatus === "authenticated" && (!session?.user?.email || session.user.email.startsWith("guest-"));
  const isFreeUser = !isGuest && sessionStatus === "authenticated";

  const { data: limits, mutate: mutateLimits } = useSWR(
    isFreeUser ? "/api/chat/limits" : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 30000 },
  );

  // Refresh limits after each message
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && isFreeUser) {
      mutateLimits();
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, isFreeUser, mutateLimits]);

  // Handle upgrade success redirect
  const searchParams = useSearchParams();
  const upgradeHandled = useRef(false);
  useEffect(() => {
    if (searchParams.get("upgrade") === "success" && !upgradeHandled.current) {
      upgradeHandled.current = true;
      toast.success("Upgrade realizado com sucesso! Bem-vindo ao Premium.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const isArtifactVisible = false;
  const setArtifact = (_: any) => {};

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stopRef.current();
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  return (
    <>
      <div className="flex h-dvh w-full flex-row overflow-hidden">
        <div
          className={cn(
            "flex min-w-0 flex-col bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "w-full"
          )}
        >
          <ChatHeader
            chatId={chatId}
            isReadonly={isReadonly}
            selectedVisibilityType={visibilityType}
          />


          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
            <Messages
              addToolApprovalResponse={addToolApprovalResponse}
              chatId={chatId}
              isArtifactVisible={isArtifactVisible}
              isLoading={isLoading}
              isReadonly={isReadonly}
              messages={messages}
              onEditMessage={(msg) => {
                const text = msg.parts
                  ?.filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("");
                setInput(text ?? "");
                setEditingMessage(msg);
              }}
              regenerate={regenerate}
              selectedModelId={currentModelId}
              setMessages={setMessages}
              status={status}
              votes={votes}
            />

            <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 flex-col border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
              {/* Free user banners */}
              {(() => {
                if (!isFreeUser || !limits || limits.plan === "premium") return null;
                const { allowed, remaining, cooldownMs, weeklyUsed, weeklyLimit, nextBatchAt } = limits;

                if (!allowed && weeklyUsed >= weeklyLimit) {
                  // Weekly limit hit — block input
                  return (
                    <div className="w-full rounded-xl border border-border bg-card p-5 text-center">
                      <p className="text-sm font-semibold mb-1">Voce usou todas as mensagens da semana</p>
                      <p className="text-[13px] text-muted-foreground mb-4">Suas mensagens renovam na segunda-feira. Faca upgrade para mensagens ilimitadas.</p>
                      <button
                        onClick={() => window.location.href = "/planos"}
                        className="text-sm px-5 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-full font-medium hover:from-green-500 hover:to-green-400 transition-all inline-flex items-center gap-2"
                      >
                        <Crown className="size-4" />
                        Ver planos
                      </button>
                    </div>
                  );
                }

                if (!allowed && cooldownMs > 0) {
                  // Batch exhausted, waiting for next
                  const hours = Math.ceil(cooldownMs / 3600000);
                  const mins = Math.ceil((cooldownMs % 3600000) / 60000);
                  const timeText = hours >= 1
                    ? `${hours}h${mins > 0 ? ` ${mins}min` : ""}`
                    : `${mins}min`;
                  return (
                    <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="size-4 shrink-0 text-amber-500" />
                        <p className="text-[13px] text-muted-foreground">Suas mensagens voltam em <span className="font-medium text-foreground">{timeText}</span>. Nao quer esperar?</p>
                      </div>
                      <button
                        onClick={() => window.location.href = "/planos"}
                        className="shrink-0 text-[13px] px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-full font-medium hover:from-green-500 hover:to-green-400 transition-all inline-flex items-center gap-1.5"
                      >
                        <Crown className="size-3.5" />
                        Ver planos
                      </button>
                    </div>
                  );
                }

                if (allowed && remaining !== null && remaining <= 5 && remaining > 0) {
                  // Low messages warning
                  return (
                    <div className="w-full rounded-xl border border-border/40 bg-card/30 px-4 py-2.5 flex items-center justify-between gap-3">
                      <p className="text-[13px] text-muted-foreground">{remaining} {remaining === 1 ? "mensagem restante" : "mensagens restantes"}</p>
                    </div>
                  );
                }

                return null;
              })()}
              {/* Guest banners */}
              {(() => {
                if (!isGuest) return null;
                const userMsgCount = messages.filter((m) => m.role === "user").length;
                if (userMsgCount >= 10) {
                  return (
                    <div className="w-full rounded-xl border border-border bg-card p-5 text-center">
                      <p className="text-sm font-semibold mb-1">Você atingiu o limite de mensagens</p>
                      <p className="text-[13px] text-muted-foreground mb-4">Crie sua conta gratuita para continuar conversando com a CannaGuia, salvar seu histórico e receber recomendações personalizadas.</p>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setShowAuthModal(true)} className="text-sm px-4 py-2 border border-border rounded-full font-medium hover:bg-accent transition-colors">Entrar</button>
                        <button onClick={() => setShowAuthModal(true)} className="text-sm px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">Cadastre-se gratuitamente</button>
                      </div>
                    </div>
                  );
                }
                if (userMsgCount >= 7) {
                  return (
                    <div className="w-full rounded-xl border border-border/60 bg-card/50 px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-[13px] text-muted-foreground">Restam poucas mensagens. Crie sua conta para continuar sem limites.</p>
                      <button onClick={() => setShowAuthModal(true)} className="shrink-0 text-[13px] px-4 py-1.5 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">Criar conta</button>
                    </div>
                  );
                }
                if (userMsgCount >= 3) {
                  return (
                    <div className="w-full rounded-xl border border-border/40 bg-card/30 px-4 py-2.5 flex items-center justify-between gap-3">
                      <p className="text-[13px] text-muted-foreground">Gostando da CannaGuia? Crie uma conta para salvar suas conversas e ter acesso ilimitado.</p>
                      <button onClick={() => setShowAuthModal(true)} className="shrink-0 text-[13px] px-3 py-1 border border-border rounded-full font-medium hover:bg-accent transition-colors">Criar conta</button>
                    </div>
                  );
                }
                return null;
              })()}
              {!isReadonly && !(isGuest && messages.filter((m) => m.role === "user").length >= 10) && !(isFreeUser && limits && !limits.allowed) && (
                <MultimodalInput
                  attachments={attachments}
                  chatId={chatId}
                  editingMessage={editingMessage}
                  input={input}
                  isLoading={isLoading}
                  messages={messages}
                  onCancelEdit={() => {
                    setEditingMessage(null);
                    setInput("");
                  }}
                  onModelChange={setCurrentModelId}
                  selectedModelId={currentModelId}
                  selectedVisibilityType={visibilityType}
                  sendMessage={
                    editingMessage
                      ? async () => {
                          const msg = editingMessage;
                          setEditingMessage(null);
                          await submitEditedMessage({
                            message: msg,
                            text: input,
                            setMessages,
                            regenerate,
                          });
                          setInput("");
                        }
                      : sendMessage
                  }
                  setAttachments={setAttachments}
                  setInput={setInput}
                  setMessages={setMessages}
                  status={status}
                  stop={stop}
                />
              )}
            </div>
          </div>
        </div>

      </div>

      <DataStreamHandler />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
