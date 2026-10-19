import { assertPublicHttpUrl, fetchHtml } from "@/lib/server/site-metadata";
import { findSiteTitle } from "@/lib/site-title";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url")?.trim();
  if (!target) return Response.json({ error: "Missing url" }, { status: 400 });
  try {
    const { html } = await fetchHtml(await assertPublicHttpUrl(target));
    return Response.json({ title: findSiteTitle(html) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ title: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
