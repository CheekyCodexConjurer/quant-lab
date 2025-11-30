import { useEffect, useRef, useState } from 'react';
import { StrategyLabError } from '../../types';

type UseStrategyLogsParams = {
  leanLogs: string[];
  leanErrorMeta: StrategyLabError | null | undefined;
  indicatorErrorDetails: Record<string, StrategyLabError | null>;
  activeIndicatorId: string | null;
};

export const useStrategyLogs = ({
  leanLogs,
  leanErrorMeta,
  indicatorErrorDetails,
  activeIndicatorId,
}: UseStrategyLogsParams) => {
  const [strategyLogEvents, setStrategyLogEvents] = useState<StrategyLabError[]>([]);
  const [editorErrorLines, setEditorErrorLines] = useState<number[]>([]);
  const leanLogIndexRef = useRef(0);

  const appendStrategyLogEvent = (event: StrategyLabError) => {
    setStrategyLogEvents((prev) => {
      const next = [...prev, event];
      if (next.length > 300) {
        return next.slice(next.length - 300);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!activeIndicatorId) return;
    const detail = indicatorErrorDetails[activeIndicatorId];
    if (!detail) return;
    appendStrategyLogEvent(detail);
    if (typeof detail.line === 'number') {
      setEditorErrorLines([detail.line]);
    }
  }, [activeIndicatorId, indicatorErrorDetails]);

  useEffect(() => {
    if (!leanErrorMeta) return;
    appendStrategyLogEvent(leanErrorMeta);
    if (typeof leanErrorMeta.line === 'number') {
      setEditorErrorLines([leanErrorMeta.line]);
    }
  }, [leanErrorMeta]);

  useEffect(() => {
    if (!Array.isArray(leanLogs) || leanLogs.length === 0) {
      leanLogIndexRef.current = 0;
      return;
    }
    let start = leanLogIndexRef.current;
    if (start > leanLogs.length) {
      start = 0;
    }
    for (let i = start; i < leanLogs.length; i += 1) {
      const line = leanLogs[i];
      if (!line) continue;
      appendStrategyLogEvent({
        source: 'lean',
        type: 'LeanLog',
        message: String(line),
        createdAt: Date.now(),
      });
    }
    leanLogIndexRef.current = leanLogs.length;
  }, [leanLogs]);

  return {
    strategyLogEvents,
    editorErrorLines,
    setEditorErrorLines,
    appendStrategyLogEvent,
  };
};

