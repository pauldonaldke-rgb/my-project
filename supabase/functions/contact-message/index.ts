import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(
  status: number,
  payload: Record<string, string>,
  origin: string,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Content-Type": "application/json; charset=utf-8",
      "Vary": "Origin",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Vary": "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse(415, { error: "Expected a JSON request." }, origin);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 8_192) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON." }, origin);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse(400, { error: "Invalid form data." }, origin);
  }

  const input = payload as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const allowedSubjects = ["artist", "media", "partnership", "other"];
  const subject = typeof input.subject === "string" ? input.subject : "";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (name.length < 1 || name.length > 100) {
    return jsonResponse(400, { error: "Enter a name of up to 100 characters." }, origin);
  }

  if (email.length > 254 || !validEmail) {
    return jsonResponse(400, { error: "Enter a valid email address." }, origin);
  }

  if (message.length < 10 || message.length > 5000) {
    return jsonResponse(400, { error: "Message must be 10 to 5000 characters." }, origin);
  }

  if (!allowedSubjects.includes(subject)) {
    return jsonResponse(400, { error: "Choose a valid enquiry type." }, origin);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Contact function is missing its Supabase server configuration.");
    return jsonResponse(500, { error: "Message service is not configured." }, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    message,
    subject,
  });

  if (error) {
    console.error("Contact message insert failed:", error.message);
    return jsonResponse(500, { error: "The message could not be saved." }, origin);
  }

  return jsonResponse(201, { message: "Message received." }, origin);
});
