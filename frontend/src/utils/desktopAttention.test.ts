import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteDesktopAttentionPreview,
  latestDesktopAttentionPreview,
  nextDesktopAttentionCount,
  upsertDesktopAttentionPreview,
  type DesktopAttentionPreview,
} from "./desktopAttention";

test("nextDesktopAttentionCount increments per conversation independently", () => {
  const counts = new Map<string, number>();
  assert.equal(nextDesktopAttentionCount(counts, "c1"), 1);
  counts.set("c1", 1);
  assert.equal(nextDesktopAttentionCount(counts, "c1"), 2);
  assert.equal(nextDesktopAttentionCount(counts, "c2"), 1);
});

test("latestDesktopAttentionPreview returns the most recently upserted conversation preview", () => {
  let previews = new Map<string, DesktopAttentionPreview>();

  previews = upsertDesktopAttentionPreview(previews, {
    title: "A",
    content: "first",
    count: 1,
    conversationId: "c1",
    messageScope: "private",
  });
  previews = upsertDesktopAttentionPreview(previews, {
    title: "B",
    content: "second",
    count: 1,
    conversationId: "c2",
    messageScope: "private",
  });

  assert.equal(latestDesktopAttentionPreview(previews)?.conversationId, "c2");
});

test("deleteDesktopAttentionPreview removes the cleared conversation preview", () => {
  let previews = new Map<string, DesktopAttentionPreview>();

  previews = upsertDesktopAttentionPreview(previews, {
    title: "A",
    content: "first",
    count: 1,
    conversationId: "c1",
    messageScope: "private",
  });
  previews = deleteDesktopAttentionPreview(previews, "c1");

  assert.equal(previews.has("c1"), false);
  assert.equal(latestDesktopAttentionPreview(previews), null);
});
