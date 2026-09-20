"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useWallet } from "@/features/wallet/provider";
import { IntentFeedback } from "./intent-feedback";
import { IntentsController } from "./controller";

const IntentsContext = createContext<IntentsController | null>(null);

export function IntentsProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new IntentsController());
  const { state: wallet } = useWallet();
  const previousAddress = useRef(wallet.address);
  useEffect(() => {
    if (previousAddress.current !== wallet.address) {
      previousAddress.current = wallet.address;
      controller.reset();
      if (wallet.address) void controller.refresh(wallet.address);
    }
  }, [wallet.address, controller]);
  return <IntentsContext value={controller}>{children}<IntentFeedback /></IntentsContext>;
}

export function useIntents() {
  const controller = useContext(IntentsContext);
  if (!controller) throw new Error("IntentsProvider is required.");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  return { state, controller };
}
