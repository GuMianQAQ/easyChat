export interface DesktopAttentionPreview {
  title: string;
  content: string;
  count: number;
  avatar?: string;
  conversationId: string;
  messageScope: "private" | "group" | "system";
}

export function upsertDesktopAttentionPreview(
  previous: Map<string, DesktopAttentionPreview>,
  next: DesktopAttentionPreview,
): Map<string, DesktopAttentionPreview> {
  const updated = new Map(previous);
  updated.delete(next.conversationId);
  updated.set(next.conversationId, next);
  return updated;
}

export function deleteDesktopAttentionPreview(
  previous: Map<string, DesktopAttentionPreview>,
  conversationId: string,
): Map<string, DesktopAttentionPreview> {
  const updated = new Map(previous);
  updated.delete(conversationId);
  return updated;
}

export function latestDesktopAttentionPreview(
  previews: Map<string, DesktopAttentionPreview>,
): DesktopAttentionPreview | null {
  let latest: DesktopAttentionPreview | null = null;
  for (const preview of previews.values()) {
    latest = preview;
  }
  return latest;
}

export function nextDesktopAttentionCount(
  counts: Map<string, number>,
  conversationId: string,
): number {
  return Math.max(1, (counts.get(conversationId) ?? 0) + 1);
}
