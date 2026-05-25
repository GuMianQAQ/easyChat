"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertDesktopAttentionPreview = upsertDesktopAttentionPreview;
exports.deleteDesktopAttentionPreview = deleteDesktopAttentionPreview;
exports.latestDesktopAttentionPreview = latestDesktopAttentionPreview;
exports.nextDesktopAttentionCount = nextDesktopAttentionCount;
function upsertDesktopAttentionPreview(previous, next) {
    const updated = new Map(previous);
    updated.delete(next.conversationId);
    updated.set(next.conversationId, next);
    return updated;
}
function deleteDesktopAttentionPreview(previous, conversationId) {
    const updated = new Map(previous);
    updated.delete(conversationId);
    return updated;
}
function latestDesktopAttentionPreview(previews) {
    let latest = null;
    for (const preview of previews.values()) {
        latest = preview;
    }
    return latest;
}
function nextDesktopAttentionCount(counts, conversationId) {
    return Math.max(1, (counts.get(conversationId) ?? 0) + 1);
}
