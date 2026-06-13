import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import EditorToolbar from "./EditorToolbar";

export type EditorTool = "brush" | "text" | "arrow" | "rect" | "circle" | "mosaic" | null;

interface ScreenEditorProps {
  imageDataUrl: string;
  onConfirm: (editedDataUrl: string) => void;
  onCancel: () => void;
}

const BRUSH_SIZES = [2, 4, 6, 8, 12];
const COLORS = ["#000000", "#ff0000", "#00aa00", "#0066ff", "#ff6600", "#ffffff"];

export default function ScreenEditor({ imageDataUrl, onConfirm, onCancel }: ScreenEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [brushSize, setBrushSize] = useState(4);
  const [color, setColor] = useState("#ff0000");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isDrawingShape = useRef(false);
  const shapeStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentShapeRef = useRef<fabric.FabricObject | null>(null);

  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const index = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, index + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 51) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: "#1e1e1e",
      selection: false,
    });
    fabricRef.current = canvas;

    fabric.FabricImage.fromURL(imageDataUrl).then((img) => {
      canvas.backgroundImage = img;
      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      img.set({ selectable: false, evented: false });
      canvas.renderAll();
      saveHistory();
    });

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [imageDataUrl, onCancel, saveHistory, undo, redo]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "brush";
    if (activeTool === "brush") {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = color;
    }

    canvas.selection = false;
    canvas.getObjects().forEach((obj) => {
      if (obj !== canvas.backgroundImage) {
        obj.selectable = false;
        obj.evented = false;
      }
    });

    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    if (activeTool === "text") {
      canvas.on("mouse:down", (opt) => {
        if (opt.target) return;
        const pointer = canvas.getPointer(opt.e);
        const text = new fabric.IText("", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: color,
          fontFamily: "sans-serif",
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.on("editing:exited", () => {
          if (!text.text.trim()) {
            canvas.remove(text);
          }
          saveHistory();
        });
      });
    } else if (activeTool === "arrow" || activeTool === "rect" || activeTool === "circle") {
      canvas.on("mouse:down", (opt) => {
        if (opt.target) return;
        isDrawingShape.current = true;
        const pointer = canvas.getPointer(opt.e);
        shapeStartRef.current = { x: pointer.x, y: pointer.y };

        if (activeTool === "arrow") {
          const line = new fabric.Line(
            [pointer.x, pointer.y, pointer.x, pointer.y],
            { stroke: color, strokeWidth: brushSize, selectable: false, evented: false }
          );
          canvas.add(line);
          currentShapeRef.current = line;
        } else if (activeTool === "rect") {
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            stroke: color,
            strokeWidth: brushSize,
            fill: "transparent",
            selectable: false,
            evented: false,
          });
          canvas.add(rect);
          currentShapeRef.current = rect;
        } else if (activeTool === "circle") {
          const ellipse = new fabric.Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            stroke: color,
            strokeWidth: brushSize,
            fill: "transparent",
            selectable: false,
            evented: false,
          });
          canvas.add(ellipse);
          currentShapeRef.current = ellipse;
        }
      });

      canvas.on("mouse:move", (opt) => {
        if (!isDrawingShape.current || !currentShapeRef.current) return;
        const pointer = canvas.getPointer(opt.e);
        const start = shapeStartRef.current;

        if (activeTool === "arrow") {
          (currentShapeRef.current as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
        } else if (activeTool === "rect") {
          const left = Math.min(start.x, pointer.x);
          const top = Math.min(start.y, pointer.y);
          currentShapeRef.current.set({
            left,
            top,
            width: Math.abs(pointer.x - start.x),
            height: Math.abs(pointer.y - start.y),
          });
        } else if (activeTool === "circle") {
          const left = Math.min(start.x, pointer.x);
          const top = Math.min(start.y, pointer.y);
          currentShapeRef.current.set({
            left,
            top,
            rx: Math.abs(pointer.x - start.x) / 2,
            ry: Math.abs(pointer.y - start.y) / 2,
          });
        }
        canvas.renderAll();
      });

      canvas.on("mouse:up", () => {
        if (!isDrawingShape.current) return;
        isDrawingShape.current = false;
        currentShapeRef.current = null;
        saveHistory();
      });
    } else if (activeTool === "mosaic") {
      let isMosaicActive = false;
      canvas.on("mouse:down", () => {
        isMosaicActive = true;
      });
      canvas.on("mouse:move", (opt) => {
        if (!isMosaicActive) return;
        const pointer = canvas.getPointer(opt.e);
        applyMosaic(canvas, pointer.x, pointer.y, brushSize * 4);
      });
      canvas.on("mouse:up", () => {
        if (isMosaicActive) {
          isMosaicActive = false;
          saveHistory();
        }
      });
    }
  }, [activeTool, brushSize, color, saveHistory]);

  const applyMosaic = (canvas: fabric.Canvas, x: number, y: number, size: number) => {
    const ctx = canvas.getContext();
    const el = canvas.lowerCanvasEl;
    const dprX = el.width / el.clientWidth;
    const dprY = el.height / el.clientHeight;
    const px = x * dprX;
    const py = y * dprY;
    const half = size / 2;
    const imageData = ctx.getImageData(px - half, py - half, size, size);
    const data = imageData.data;
    const blockSize = 8;
    for (let by = 0; by < size; by += blockSize) {
      for (let bx = 0; bx < size; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = 0; dy < blockSize && by + dy < size; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < size; dx++) {
            const idx = ((by + dy) * size + (bx + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        for (let dy = 0; dy < blockSize && by + dy < size; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < size; dx++) {
            const idx = ((by + dy) * size + (bx + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(imageData, px - half, py - half);
  };

  const handleConfirm = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    onConfirm(dataUrl);
  }, [onConfirm]);

  return (
    <div className="editor-root">
      <EditorToolbar
        activeTool={activeTool}
        brushSize={brushSize}
        color={color}
        canUndo={canUndo}
        canRedo={canRedo}
        brushSizes={BRUSH_SIZES}
        colors={COLORS}
        onToolChange={setActiveTool}
        onBrushSizeChange={setBrushSize}
        onColorChange={setColor}
        onUndo={undo}
        onRedo={redo}
        onConfirm={handleConfirm}
        onCancel={onCancel}
      />
      <div className="editor-canvas-area">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
