"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WalletController } from "./controller";

const WalletContext = createContext<WalletController | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new WalletController());
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible")
        void controller.checkConnection();
    };
    const timer = window.setInterval(check, 5_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [controller]);
  return <WalletContext value={controller}>{children}</WalletContext>;
}

export function useWallet() {
  const controller = useContext(WalletContext);
  if (!controller) throw new Error("WalletProvider is required.");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  return { state, controller };
}
