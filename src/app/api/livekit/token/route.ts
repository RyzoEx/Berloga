import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";
import { ROOMS, livekitRoomName } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return Response.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { room?: string } | null;
  const room = ROOMS.find((r) => r.id === body?.room);
  if (!room) return Response.json({ error: "bad_room" }, { status: 400 });

  // Запросы идут от имени пользователя, поэтому RLS остаётся в силе.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: u, error } = await sb.auth.getUser(jwt);
  if (error || !u.user) return Response.json({ error: "bad_auth" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("username").eq("id", u.user.id).single();
  if (!profile) return Response.json({ error: "no_profile" }, { status: 403 });

  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!key || !secret || !url) return Response.json({ error: "server_misconfigured" }, { status: 500 });

  const at = new AccessToken(key, secret, { identity: u.user.id, name: profile.username, ttl: "6h" });
  at.addGrant({
    room: livekitRoomName(room.id),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  return Response.json({ token: await at.toJwt(), url });
}
