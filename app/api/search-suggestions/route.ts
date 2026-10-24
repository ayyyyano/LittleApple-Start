import { buildBuiltInSuggestionUrl, fetchSuggestionJson, normalizeSuggestionResponse } from "@/lib/search-suggestions";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== url.origin)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403, headers });
  }
  const query = url.searchParams.get("q")?.trim() ?? "";
  const target = buildBuiltInSuggestionUrl(url.searchParams.get("provider") ?? "", query);
  if (!target || !query || query.length > 160 || url.searchParams.has("url")) {
    return Response.json({ error: "Invalid suggestion request" }, { status: 400, headers });
  }
  try {
    const payload = await fetchSuggestionJson(target, request.signal, 4000, "error");
    return Response.json({ suggestions: normalizeSuggestionResponse(payload, query) }, { headers });
  } catch (error) {
    const timeout = error instanceof Error && error.message === "SUGGESTION_TIMEOUT";
    return Response.json({ error: timeout ? "timeout" : "unavailable" }, { status: timeout ? 504 : 502, headers });
  }
}
