import type { GroupMemberItem } from "../types/chat";

/**
 * Parse @mentions from message content.
 * Returns array of { userId, displayName, startIndex, endIndex }.
 */
export interface MentionInfo {
  userId: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}

export function parseMentions(content: string, members: GroupMemberItem[]): MentionInfo[] {
  const results: MentionInfo[] = [];
  // Match @userId patterns (e.g., @user-abc123)
  const regex = /@([\w-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const userId = match[1];
    const member = members.find((m) => m.userId === userId);
    if (member) {
      results.push({
        userId,
        displayName: member.groupNickname || member.nickname,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return results;
}

/**
 * Replace @userId with @displayName in content for rendering.
 * Returns an array of segments: { text, isMention, userId? }
 */
export interface ContentSegment {
  text: string;
  isMention: boolean;
  userId?: string;
}

export function segmentsForDisplay(content: string, members: GroupMemberItem[]): ContentSegment[] {
  const mentions = parseMentions(content, members);
  if (mentions.length === 0) {
    return [{ text: content, isMention: false }];
  }

  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const mention of mentions) {
    // Text before mention
    if (mention.startIndex > lastIndex) {
      segments.push({ text: content.slice(lastIndex, mention.startIndex), isMention: false });
    }
    // Mention itself
    segments.push({ text: `@${mention.displayName}`, isMention: true, userId: mention.userId });
    lastIndex = mention.endIndex;
  }

  // Text after last mention
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), isMention: false });
  }

  return segments;
}

/**
 * Check if content contains @all or @所有人.
 */
export function hasAtAll(content: string): boolean {
  return /@all|@所有人/i.test(content);
}
