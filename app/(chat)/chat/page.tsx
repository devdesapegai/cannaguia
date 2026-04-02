import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await cookies();
  const params = await searchParams;
  const id = crypto.randomUUID();
  const query = params?.upgrade ? `?upgrade=${params.upgrade}` : "";
  redirect(`/chat/${id}${query}`);
}
