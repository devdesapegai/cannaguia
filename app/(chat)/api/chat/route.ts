import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { getUserPlan } from "@/lib/db/plan";
import { getUserBatchStatus } from "@/lib/db/batch";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatSummary,
  updateChatTitleById,
  updateMessage,
  getRecentChatSummaries,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { isValidOrigin } from "@/lib/origin";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";
import { searchAll, formatContextForLLM } from "@/lib/rag/search";
import { SYSTEM_PROMPT } from "@/lib/ai/cannaguia-prompt";
import { summarizeChat } from "@/lib/ai/summarize";
import { insertChatLog } from "@/lib/db/chat-log";
import {
  checkInputGuardrails,
  checkOutputGuardrails,
} from "@/lib/guardrails";
import { getLangfuse } from "@/lib/langfuse";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return new ChatbotError("bad_request:api", "Origin nao permitido").toResponse();
  }

  let requestBody: PostRequestBody;
  let rawJson: Record<string, unknown>;

  try {
    rawJson = await request.json();
    requestBody = postRequestBodySchema.parse(rawJson);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  // Turnstile verification
  const turnstileValid = await verifyTurnstile(rawJson?.turnstileToken as string);
  if (!turnstileValid) {
    return new ChatbotError("rate_limit:chat", "Verificacao de seguranca falhou. Recarregue a pagina.").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;
    const isGuestUser = userType === "guest" || (session.user.email ?? "").startsWith("guest-");

    // Guest: max 1 message total
    if (isGuestUser) {
      const guestMsgCount = await getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 8760,
      });
      if (guestMsgCount >= 1) {
        return Response.json(
          { code: "rate_limit:guest", message: "Crie uma conta gratuita para continuar conversando." },
          { status: 429 },
        );
      }
    }

    if (!isGuestUser) {
      const { effectivePlan } = await getUserPlan(session.user.id);
      if (effectivePlan === "free") {
        const batch = await getUserBatchStatus(session.user.id);
        if (!batch.allowed) {
          const isWeeklyExhausted = batch.weeklyUsed >= batch.weeklyLimit;
          return Response.json(
            {
              code: isWeeklyExhausted
                ? "rate_limit:weekly"
                : "rate_limit:batch",
              message: isWeeklyExhausted
                ? "Voce usou todas as mensagens da semana. Volta na segunda ou faca upgrade para o Premium."
                : "Suas mensagens voltam em breve. Faca upgrade para mensagens ilimitadas.",
              ...batch,
            },
            { status: 429 },
          );
        }
      }
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user" && !isGuestUser) {
      await saveChat({
        id,
        userId: session.user.id,
        title: "Nova Conversa",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user" && !isGuestUser) {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: (message as any).attachments ?? (message as any).parts?.filter((p: any) => p.type === "file") ?? [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    // Build system prompt before streaming
    const userText = uiMessages
      .filter((m: any) => m.role === "user")
      .map((m: any) =>
        m.parts
          ?.filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join(" ") ?? "",
      )
      .pop() ?? "";

    const startTime = Date.now();

    // Langfuse trace for this request
    const langfuse = getLangfuse();
    const lfTrace = langfuse.trace({
      name: "cannaguia-chat",
      userId: session.user.id,
      sessionId: id,
      metadata: { isGuest: isGuestUser, chatModel, userType },
      tags: isGuestUser ? ["guest"] : ["authenticated"],
      input: userText,
    });

    // Input guardrails: block prompt injection, flag off-topic
    const inputGuardrailSpan = lfTrace.span({
      name: "input-guardrails",
      input: { userText: userText.slice(0, 200) },
    });
    const inputCheck = checkInputGuardrails(userText);
    inputGuardrailSpan.end({
      output: { allowed: inputCheck.allowed, reason: inputCheck.reason, confidence: inputCheck.confidence },
    });
    if (!inputCheck.allowed) {
      const safeResponse =
        inputCheck.reason === "prompt_injection"
          ? "Hmm, nao entendi sua pergunta. Posso te ajudar com informacoes sobre cannabis medicinal, strains, cultivo, ou regulamentacao. O que gostaria de saber?"
          : "Sou especializada em cannabis medicinal. Posso ajudar com strains, dosagem, cultivo, regulamentacao brasileira e muito mais. Como posso te ajudar?";

      // Log blocked input
      lfTrace.update({ output: safeResponse, metadata: { blocked: true } });
      after(async () => {
        insertChatLog({
          chatId: id,
          userId: session.user.id!,
          userText,
          searchMode: "keyword",
          latencyMs: Date.now() - startTime,
          inputFlagged: true,
          inputFlagReason: inputCheck.reason ?? undefined,
          actionTaken: "blocked",
        });
        await langfuse.flushAsync();
      });

      return new Response(
        JSON.stringify({ error: safeResponse }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Skip RAG for greetings/casual messages
    const greetingPattern = /^(oi|ola|ol[aá]|eai|e ai|bom dia|boa tarde|boa noite|hey|hello|fala|salve|tudo bem|como vai|obrigad[oa]|valeu|brigad[oa]|flw|vlw|tchau|ate mais)[!?.,s]*$/i;
    const isGreeting = greetingPattern.test(userText.trim());

    const ragSpan = lfTrace.span({
      name: "rag-search",
      input: { query: userText, topK: 4, skipped: isGreeting },
    });
    const { results: localResults, searchMode } = isGreeting
      ? { results: [], searchMode: "keyword" as const }
      : await searchAll(userText, 4);
    ragSpan.end({
      output: {
        resultCount: localResults.length,
        topScore: localResults[0]?.score ?? 0,
        searchMode,
        titles: localResults.map((r) => r.document.title),
      },
    });
    const localContext = formatContextForLLM(localResults);

    let memoryContext = "";
    if (!isGuestUser) {
      try {
        const summaries = await getRecentChatSummaries({
          userId: session.user.id!,
          limit: 3,
          excludeChatId: id,
        });
        if (summaries.length > 0) {
          memoryContext =
            "\n\nContexto do usuario (conversas anteriores):\n" +
            summaries.map((s) => `- ${s.summary}`).join("\n");
        }
      } catch (_) {
        // summaries not available yet
      }
    }

    const fullSystemPrompt =
      SYSTEM_PROMPT +
      "\n\nBase de conhecimento relevante:\n" +
      localContext +
      memoryContext;

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(chatModel),
          system: fullSystemPrompt,
          maxOutputTokens: 700,
          temperature: 0.7,
          topP: 0.9,
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          experimental_activeTools: [],
          providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
          tools: {},
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
            metadata: { langfuseTraceId: lfTrace.id },
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isGuestUser) return;

        // Output guardrails: check assistant messages before saving
        const outputGuardrailSpan = lfTrace.span({
          name: "output-guardrails",
          input: { messageCount: finishedMessages.length },
        });
        let outputFlagged = false;
        let outputViolations: { type: string; matched: string; severity: string }[] = [];
        let outputAction: string | undefined;
        for (const msg of finishedMessages) {
          if (msg.role !== "assistant") continue;
          const textParts = (msg.parts ?? []).filter(
            (p: any) => p.type === "text",
          );
          const fullText = textParts
            .map((p: any) => p.text)
            .join("");
          if (!fullText) continue;

          const outputCheck = checkOutputGuardrails(fullText);
          if (!outputCheck.safe) {
            outputFlagged = true;
            outputViolations = outputCheck.violations;
            const hasCritical = outputCheck.violations.some((v) => v.severity === "critical");
            outputAction = hasCritical ? "replaced" : "disclaimer_appended";
            // Replace text parts with the processed (safe) version
            const safeParts = msg.parts.map((p: any) =>
              p.type === "text"
                ? { ...p, text: outputCheck.processedText }
                : p,
            );
            (msg as any).parts = safeParts;
          }
        }

        outputGuardrailSpan.end({
          output: { flagged: outputFlagged, violations: outputViolations, action: outputAction },
        });

        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: (finishedMsg as any).parts?.filter((p: any) => p.type === "file") ?? [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: (currentMessage as any).parts?.filter((p: any) => p.type === "file") ?? [],
              chatId: id,
            })),
          });
        }

        // Auto-summarize every 6 user messages
        const totalUserMessages = [...uiMessages, ...finishedMessages].filter(
          (m) => m.role === "user",
        ).length;
        if (totalUserMessages > 0 && totalUserMessages % 6 === 0) {
          const allMessages = [...uiMessages, ...finishedMessages];
          summarizeChat(allMessages as any)
            .then((summary) => {
              updateChatSummary({ chatId: id, summary });
            })
            .catch(() => {});
        }

        // Update Langfuse trace with final output
        const assistantText = finishedMessages
          .filter((m) => m.role === "assistant")
          .flatMap((m) =>
            (m.parts ?? [])
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text),
          )
          .join("");
        lfTrace.update({
          output: assistantText.slice(0, 500),
          metadata: { latencyMs: Date.now() - startTime, searchMode },
        });

        // Structured logging + Langfuse flush (fire-and-forget via after())
        after(async () => {
          insertChatLog({
            chatId: id,
            userId: session.user.id!,
            userText,
            ragDocsUsed: localResults.map((r) => ({
              title: r.document.title,
              type: r.document.type,
              score: r.score,
            })),
            ragTopScore: localResults[0]?.score ?? 0,
            searchMode,
            latencyMs: Date.now() - startTime,
            inputFlagged: inputCheck.reason !== null,
            inputFlagReason: inputCheck.reason ?? undefined,
            outputFlagged,
            outputViolations: outputViolations.length > 0 ? outputViolations : undefined,
            actionTaken: outputAction,
          });
          await langfuse.flushAsync();
        });
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
        }
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          /* non-critical */
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
