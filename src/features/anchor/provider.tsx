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
import { AnchorController } from "./controller";

const AnchorContext = createContext<AnchorController | null>(null);

export function AnchorProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new AnchorController());
  const { state: wallet, controller: walletController } = useWallet();
  const anchor = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const lastSettlement = useRef<string | null>(null);
  useEffect(() => {
    if (anchor.transaction?.status === "completed" && anchor.transaction.id !== lastSettlement.current) {
      lastSettlement.current = anchor.transaction.id; void walletController.refresh();
    }
  }, [anchor.transaction, walletController]);
  const previousAddress = useRef(wallet.address);
  useEffect(() => {
    // An anchor session is only valid for the wallet address that opened
    // it. Disconnecting or switching accounts must drop it immediately.
    if (previousAddress.current !== wallet.address) {
      previousAddress.current = wallet.address;
      controller.reset();
    }
  }, [wallet.address, controller]);
  return <AnchorContext value={controller}>{children}</AnchorContext>;
}

export function useAnchor() {
  const controller = useContext(AnchorContext);
  if (!controller) throw new Error("AnchorProvider is required.");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  return { state, controller };
}
