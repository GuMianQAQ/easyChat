"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const desktopAttention_1 = require("./desktopAttention");
(0, node_test_1.default)("nextDesktopAttentionCount increments per conversation independently", () => {
    const counts = new Map();
    strict_1.default.equal((0, desktopAttention_1.nextDesktopAttentionCount)(counts, "c1"), 1);
    counts.set("c1", 1);
    strict_1.default.equal((0, desktopAttention_1.nextDesktopAttentionCount)(counts, "c1"), 2);
    strict_1.default.equal((0, desktopAttention_1.nextDesktopAttentionCount)(counts, "c2"), 1);
});
(0, node_test_1.default)("latestDesktopAttentionPreview returns the most recently upserted conversation preview", () => {
    let previews = new Map();
    previews = (0, desktopAttention_1.upsertDesktopAttentionPreview)(previews, {
        title: "A",
        content: "first",
        count: 1,
        conversationId: "c1",
        messageScope: "private",
    });
    previews = (0, desktopAttention_1.upsertDesktopAttentionPreview)(previews, {
        title: "B",
        content: "second",
        count: 1,
        conversationId: "c2",
        messageScope: "private",
    });
    strict_1.default.equal((0, desktopAttention_1.latestDesktopAttentionPreview)(previews)?.conversationId, "c2");
});
(0, node_test_1.default)("deleteDesktopAttentionPreview removes the cleared conversation preview", () => {
    let previews = new Map();
    previews = (0, desktopAttention_1.upsertDesktopAttentionPreview)(previews, {
        title: "A",
        content: "first",
        count: 1,
        conversationId: "c1",
        messageScope: "private",
    });
    previews = (0, desktopAttention_1.deleteDesktopAttentionPreview)(previews, "c1");
    strict_1.default.equal(previews.has("c1"), false);
    strict_1.default.equal((0, desktopAttention_1.latestDesktopAttentionPreview)(previews), null);
});
