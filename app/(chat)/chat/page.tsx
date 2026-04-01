import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ChatPage() {
  await cookies();
  const id = crypto.randomUUID();
  redirect(`/chat/${id}`);
}
