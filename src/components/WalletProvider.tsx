"use client";
import algosdk from "algosdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAlgodClient } from "@/lib/algod";
import {
  deriveAlgorandAccount,
  getPrivateKeyHex,
  getWeb3Auth,
} from "@/lib/web3auth";

interface WalletState {
  ready: boolean; // Web3Auth finished init (avoid SSR/hydration flashes)
  connecting: boolean;
  address: string | null;
  account: algosdk.Account | null;
  balanceAlgo: number | null;
  userEmail: string | null;
  topUp: { funded: boolean; amount: number } | null;
  error: string | null;
  connect: () => Promise<void>;
  logout: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<algosdk.Account | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balanceAlgo, setBalanceAlgo] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [topUp, setTopUp] = useState<{ funded: boolean; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep latest address available to callbacks without re-creating them.
  const addressRef = useRef<string | null>(null);
  addressRef.current = address;

  const refreshBalance = useCallback(async () => {
    const addr = addressRef.current;
    if (!addr) return;
    try {
      const info = await getAlgodClient().accountInformation(addr).do();
      setBalanceAlgo(Number(info.amount) / 1_000_000);
    } catch {
      /* ignore transient read errors */
    }
  }, []);

  // Restore an existing session on mount if the user is already logged in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const web3auth = await getWeb3Auth();
        if (!cancelled && web3auth.connected && web3auth.provider) {
          const pk = await getPrivateKeyHex(web3auth);
          const acct = deriveAlgorandAccount(pk);
          const addr = acct.addr.toString();
          setAccount(acct);
          setAddress(addr);
          addressRef.current = addr;
          await refreshBalance();
        }
      } catch {
        /* not logged in / not configured yet */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const web3auth = await getWeb3Auth();
      if (!web3auth.connected) {
        await web3auth.connect();
      }

      const pk = await getPrivateKeyHex(web3auth);
      const acct = deriveAlgorandAccount(pk);
      const addr = acct.addr.toString();
      setAccount(acct);
      setAddress(addr);
      addressRef.current = addr;

      try {
        const info = await web3auth.getUserInfo();
        setUserEmail(info?.email ?? info?.name ?? null);
      } catch {
        /* user info is optional */
      }

      // Automatic top-up so the new account can cover MBR + opt-in costs.
      try {
        const res = await fetch("/api/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: addr }),
        });
        const data = await res.json();
        if (res.ok) setTopUp({ funded: data.funded, amount: data.amountFunded });
      } catch {
        /* top-up failure is non-fatal; surfaced via balance */
      }

      await refreshBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const logout = useCallback(async () => {
    try {
      const web3auth = await getWeb3Auth();
      if (web3auth.connected) await web3auth.logout();
    } catch {
      /* ignore */
    }
    setAccount(null);
    setAddress(null);
    addressRef.current = null;
    setBalanceAlgo(null);
    setUserEmail(null);
    setTopUp(null);
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      ready,
      connecting,
      address,
      account,
      balanceAlgo,
      userEmail,
      topUp,
      error,
      connect,
      logout,
      refreshBalance,
    }),
    [
      ready,
      connecting,
      address,
      account,
      balanceAlgo,
      userEmail,
      topUp,
      error,
      connect,
      logout,
      refreshBalance,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
