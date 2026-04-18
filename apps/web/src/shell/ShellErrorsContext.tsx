import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AppErrorShape = {
  code: string;
  message: string;
  fixHint: string;
  context?: string | null;
};

type ShellErrorsContextValue = {
  transportMessage: string | null;
  payloadAppError: AppErrorShape | null;
  setTransportMessage: (message: string | null) => void;
  setPayloadAppError: (error: AppErrorShape | null) => void;
  clearShellMessages: () => void;
};

const ShellErrorsContext = createContext<ShellErrorsContextValue | null>(null);

export function ShellErrorsProvider({ children }: { children: ReactNode }) {
  const [transportMessage, setTransportMessageState] = useState<string | null>(null);
  const [payloadAppError, setPayloadAppErrorState] = useState<AppErrorShape | null>(null);

  const setTransportMessage = useCallback((message: string | null) => {
    queueMicrotask(() => {
      setTransportMessageState(message);
    });
  }, []);

  const setPayloadAppError = useCallback((error: AppErrorShape | null) => {
    queueMicrotask(() => {
      setPayloadAppErrorState(error);
    });
  }, []);

  const clearShellMessages = useCallback(() => {
    queueMicrotask(() => {
      setTransportMessageState(null);
      setPayloadAppErrorState(null);
    });
  }, []);

  const value = useMemo(
    () => ({
      transportMessage,
      payloadAppError,
      setTransportMessage,
      setPayloadAppError,
      clearShellMessages
    }),
    [transportMessage, payloadAppError, setTransportMessage, setPayloadAppError, clearShellMessages]
  );

  return <ShellErrorsContext.Provider value={value}>{children}</ShellErrorsContext.Provider>;
}

export function useShellErrors() {
  const ctx = useContext(ShellErrorsContext);
  if (!ctx) {
    throw new Error("useShellErrors must be used within ShellErrorsProvider");
  }
  return ctx;
}
