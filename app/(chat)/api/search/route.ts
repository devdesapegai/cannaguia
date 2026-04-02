import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { searchChatsByTitle } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json([]);
  }

  const chats = await searchChatsByTitle({
    userId: session.user.id,
    query,
    limit: 20,
  });

  return Response.json(chats);
}
