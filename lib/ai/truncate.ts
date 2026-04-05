import "server-only";

import { summarizeChat } from "./summarize";

const MAX_RECENT_MESSAGES = 10;
const REFRESH_THRESHOLD = 6;

export async function truncateConversation(
  uiMessages: Array<{ role: string; parts: any }>,
  cachedSummary: string | null,
  cachedSummaryAt: number | null,
): Promise<{
  messages: typeof uiMessages;
  inlineSummary: string | null;
  inlineSummaryAt: number | null;
  summaryUpdated: boolean;
}> {
  const totalCount = uiMessages.length;

  if (totalCount <= MAX_RECENT_MESSAGES) {
    return {
      messages: uiMessages,
      inlineSummary: cachedSummary,
      inlineSummaryAt: cachedSummaryAt,
      summaryUpdated: false,
    };
  }

  const recentMessages = uiMessages.slice(-MAX_RECENT_MESSAGES);

  const needsNewSummary =
    !cachedSummary ||
    !cachedSummaryAt ||
    totalCount - cachedSummaryAt >= REFRESH_THRESHOLD;

  if (needsNewSummary) {
    try {
      const olderMessages = uiMessages.slice(0, -MAX_RECENT_MESSAGES);
      const summary = await summarizeChat(olderMessages);
      return {
        messages: recentMessages,
        inlineSummary: summary,
        inlineSummaryAt: totalCount,
        summaryUpdated: true,
      };
    } catch {
      return {
        messages: recentMessages,
        inlineSummary: cachedSummary,
        inlineSummaryAt: cachedSummaryAt,
        summaryUpdated: false,
      };
    }
  }

  return {
    messages: recentMessages,
    inlineSummary: cachedSummary,
    inlineSummaryAt: cachedSummaryAt,
    summaryUpdated: false,
  };
}
