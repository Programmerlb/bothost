import { NextResponse } from "next/server";
import { authenticateRequest, encryptSecret, getAdminSupabase } from "@/lib/server";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ botId: string }> }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { botId } = await context.params;
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (token.length < 20 || token.length > 256 || !/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return NextResponse.json({ error: "invalid_telegram_token_format" }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const { data: bot, error: botError } = await admin
      .from("bots").select("id").eq("id", botId).eq("owner_id", user.id).maybeSingle();
    if (botError) throw botError;
    if (!bot) return NextResponse.json({ error: "bot_not_found" }, { status: 404 });

    const ciphertext = encryptSecret(token);
    const { error } = await admin.from("bot_secrets").upsert({
      bot_id: botId,
      telegram_token_ciphertext: ciphertext,
      encryption_key_version: 1,
      updated_at: new Date().toISOString()
    }, { onConflict: "bot_id" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("secret_save_failed", error);
    return NextResponse.json({ error: "secret_save_failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ botId: string }> }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { botId } = await context.params;
    const admin = getAdminSupabase();
    const { data: bot, error: botError } = await admin
      .from("bots").select("id").eq("id", botId).eq("owner_id", user.id).maybeSingle();
    if (botError) throw botError;
    if (!bot) return NextResponse.json({ error: "bot_not_found" }, { status: 404 });

    const { error } = await admin.from("bot_secrets").delete().eq("bot_id", botId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("secret_delete_failed", error);
    return NextResponse.json({ error: "secret_delete_failed" }, { status: 500 });
  }
}
