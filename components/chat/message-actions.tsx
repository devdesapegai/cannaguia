"use client";

import equal from "fast-deep-equal";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const REPORT_REASONS = [
  { value: "incorrect", label: "Informacao incorreta" },
  { value: "dangerous", label: "Resposta perigosa" },
  { value: "off_topic", label: "Fora do tema" },
  { value: "other", label: "Outro" },
] as const;

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [reportOpen, setReportOpen] = useState(false);

  if (isLoading) {
    return null;
  }

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  const handleVote = (type: "up" | "down", reason?: string) => {
    const votePromise = fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
      {
        method: "PATCH",
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type,
          ...(reason ? { reason } : {}),
        }),
      }
    );

    toast.promise(votePromise, {
      loading: type === "up" ? "Upvoting..." : "Downvoting...",
      success: () => {
        mutate<Vote[]>(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`,
          (currentVotes) => {
            if (!currentVotes) return [];
            const votesWithoutCurrent = currentVotes.filter(
              (v) => v.messageId !== message.id
            );
            return [
              ...votesWithoutCurrent,
              {
                chatId,
                messageId: message.id,
                isUpvoted: type === "up",
                reason: reason ?? null,
              },
            ];
          },
          { revalidate: false }
        );
        return type === "up" ? "Upvoted!" : "Feedback enviado!";
      },
      error: "Erro ao votar.",
    });
  };

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        <div className="flex items-center gap-0.5">
          {onEdit && (
            <Action
              className="size-7 text-muted-foreground/50 hover:text-foreground"
              data-testid="message-edit-button"
              onClick={onEdit}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          )}
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            onClick={handleCopy}
            tooltip="Copiar"
          >
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={handleCopy}
        tooltip="Copiar"
      >
        <CopyIcon />
      </Action>

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        data-testid="message-upvote"
        disabled={vote?.isUpvoted}
        onClick={() => handleVote("up")}
        tooltip="Upvote Response"
      >
        <ThumbUpIcon />
      </Action>

      <Popover open={reportOpen} onOpenChange={setReportOpen}>
        <PopoverTrigger asChild>
          <Action
            className="text-muted-foreground/50 hover:text-foreground"
            data-testid="message-downvote"
            disabled={vote && !vote.isUpvoted}
            onClick={() => setReportOpen(true)}
            tooltip="Downvote Response"
          >
            <ThumbDownIcon />
          </Action>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Qual o problema?
          </p>
          {REPORT_REASONS.map(({ value, label }) => (
            <button
              key={value}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                handleVote("down", value);
                setReportOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);
