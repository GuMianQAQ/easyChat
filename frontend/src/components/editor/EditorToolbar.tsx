import type { EditorTool } from "./ScreenEditor";

interface EditorToolbarProps {
  activeTool: EditorTool;
  brushSize: number;
  color: string;
  canUndo: boolean;
  canRedo: boolean;
  brushSizes: number[];
  colors: string[];
  onToolChange: (tool: EditorTool) => void;
  onBrushSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EditorToolbar({
  activeTool,
  brushSize,
  color,
  canUndo,
  canRedo,
  brushSizes,
  colors,
  onToolChange,
  onBrushSizeChange,
  onColorChange,
  onUndo,
  onRedo,
  onConfirm,
  onCancel,
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-tools">
        <button
          type="button"
          className={activeTool === "brush" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "brush" ? null : "brush")}
          title="画笔"
        >
          画笔
        </button>
        <button
          type="button"
          className={activeTool === "text" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "text" ? null : "text")}
          title="文字"
        >
          文字
        </button>
        <button
          type="button"
          className={activeTool === "arrow" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "arrow" ? null : "arrow")}
          title="箭头"
        >
          箭头
        </button>
        <button
          type="button"
          className={activeTool === "rect" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "rect" ? null : "rect")}
          title="矩形"
        >
          矩形
        </button>
        <button
          type="button"
          className={activeTool === "circle" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "circle" ? null : "circle")}
          title="圆形"
        >
          圆形
        </button>
        <button
          type="button"
          className={activeTool === "mosaic" ? "active" : ""}
          onClick={() => onToolChange(activeTool === "mosaic" ? null : "mosaic")}
          title="马赛克"
        >
          马赛克
        </button>
      </div>
      <div className="editor-toolbar-options">
        {(activeTool === "brush" || activeTool === "arrow" || activeTool === "rect" || activeTool === "circle" || activeTool === "mosaic") && (
          <div className="editor-brush-sizes">
            {brushSizes.map((size) => (
              <button
                key={size}
                type="button"
                className={brushSize === size ? "active" : ""}
                onClick={() => onBrushSizeChange(size)}
              >
                {size}
              </button>
            ))}
          </div>
        )}
        {(activeTool === "brush" || activeTool === "text" || activeTool === "arrow" || activeTool === "rect" || activeTool === "circle") && (
          <div className="editor-colors">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={color === c ? "active" : ""}
                style={{ backgroundColor: c }}
                onClick={() => onColorChange(c)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="editor-toolbar-actions">
        <button type="button" onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
          撤销
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Y)">
          重做
        </button>
        <button type="button" onClick={onCancel} title="取消 (Esc)">
          取消
        </button>
        <button type="button" className="editor-confirm" onClick={onConfirm} title="确认">
          确认
        </button>
      </div>
    </div>
  );
}
