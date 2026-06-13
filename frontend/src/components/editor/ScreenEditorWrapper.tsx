import { useCallback, useEffect, useState } from "react";
import ScreenEditor from "./ScreenEditor";

export default function ScreenEditorWrapper() {
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  useEffect(() => {
    if (!window.myChatEditor) return;
    const cleanup = window.myChatEditor.onScreenshotData((dataUrl) => {
      setScreenshotData(dataUrl);
    });
    return cleanup;
  }, []);

  const handleConfirm = useCallback(async (editedDataUrl: string) => {
    if (!window.myChatEditor) return;
    await window.myChatEditor.confirmEdit(editedDataUrl);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!window.myChatEditor) return;
    await window.myChatEditor.cancelEdit();
  }, []);

  if (!screenshotData) {
    return <div className="editor-loading">等待截图数据...</div>;
  }

  return (
    <ScreenEditor
      imageDataUrl={screenshotData}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
