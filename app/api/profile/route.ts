import { auth } from "@/app/(auth)/auth";
import { getUser, updateUserProfile } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await getUser(session.user.email);
  const dbUser = users[0];
  if (!dbUser) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    plan: dbUser.plan,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, image } = body;

  // Validate
  if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
    return Response.json({ error: "Nome invalido" }, { status: 400 });
  }
  if (image !== undefined && typeof image !== "string") {
    return Response.json({ error: "Imagem invalida" }, { status: 400 });
  }

  const [updated] = await updateUserProfile({
    id: session.user.id,
    name: name?.trim(),
    image,
  });

  return Response.json(updated);
}
