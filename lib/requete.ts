import "server-only";
import { headers } from "next/headers";

export function ipClient(): string | null {
  const h = headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function agentClient(): string | null {
  return headers().get("user-agent");
}
