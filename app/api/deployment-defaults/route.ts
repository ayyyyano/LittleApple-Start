import { parseDeploymentDefaults } from "@/lib/deployment-defaults";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  const defaults = parseDeploymentDefaults(process.env, process.env.NODE_ENV === "development"
    ? (message) => console.warn(`[deployment-defaults] ${message}`)
    : undefined);
  return Response.json(defaults, {
    headers: { "Cache-Control": "no-store" },
  });
}
