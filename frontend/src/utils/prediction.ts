import type { PredictionScope } from "../types/chat";

export function inScope(scope: PredictionScope, isAIAssistant: boolean): boolean {
  if (scope === "all") return true;
  if (scope === "ai") return isAIAssistant;
  if (scope === "normal") return !isAIAssistant;
  return false;
}
