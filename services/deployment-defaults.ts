import { normalizeDeploymentDefaults, type DeploymentDefaults } from "@/lib/deployment-defaults";

export async function fetchDeploymentDefaults(): Promise<DeploymentDefaults> {
  try {
    const response = await fetch("/api/deployment-defaults", { cache: "no-store" });
    if (!response.ok) return {};
    return normalizeDeploymentDefaults(await response.json() as unknown);
  } catch {
    return {};
  }
}
