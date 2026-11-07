import { NextResponse } from "next/server";
import { authenticateRequest, getAdminSupabase } from "@/lib/server";

export const runtime = "nodejs";

const allowedActions = new Set(["deploy", "start", "stop", "restart"]);

export async function POST(request: Request, context: { params: Promise<{ botId: string }> }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { botId } = await context.params;
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";
    if (!allowedActions.has(action)) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const { data: bot, error: botError } = await admin
      .from("bots").select("id").eq("id", botId).eq("owner_id", user.id).maybeSingle();
    if (botError) throw botError;
    if (!bot) return NextResponse.json({ error: "bot_not_found" }, { status: 404 });

    if (action === "deploy" || action === "start" || action === "restart") {
      const { data: secret, error: secretError } = await admin
        .from("bot_secrets").select("bot_id").eq("bot_id", botId).maybeSingle();
      if (secretError) throw secretError;
      if (!secret) return NextResponse.json({ error: "telegram_token_not_configured" }, { status: 409 });
    }

    const { data: job, error } = await admin.from("runner_jobs").insert({
      bot_id: botId,
      owner_id: user.id,
      action
    }).select("id,status,requested_at").single();
    if (error) throw error;

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    console.error("runner_job_request_failed", error);
    return NextResponse.json({ error: "runner_job_request_failed" }, { status: 500 });
  }
}
