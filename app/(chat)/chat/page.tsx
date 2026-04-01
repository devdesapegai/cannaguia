import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export default function ChatPage() {
  redirect(`/chat/${randomUUID()}`);
}
