"use client";
import { Web3Auth } from "@web3auth/modal";
import algosdk from "algosdk";

/**
 * Web3Auth v10 (MetaMask Embedded Wallets) helpers for Algorand.
 *
 * Web3Auth has no native Algorand provider, so we ask the embedded wallet for
 * the user's raw private key and reinterpret its 32-byte seed as an Ed25519
 * (Algorand) key — the canonical pattern from the official Algorand guide:
 *   key (hex) -> algosdk.secretKeyToMnemonic -> algosdk.mnemonicToSecretKey
 * The derivation is deterministic, so a given social login always maps to the
 * same Algorand address.
 */

type Web3AuthNetwork = "sapphire_devnet" | "sapphire_mainnet";

let instance: Web3Auth | null = null;
let initPromise: Promise<Web3Auth> | null = null;

function networkFromEnv(): Web3AuthNetwork {
  const n = (process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK ?? "sapphire_devnet").toLowerCase();
  return n === "sapphire_mainnet" ? "sapphire_mainnet" : "sapphire_devnet";
}

/** Lazily construct and initialise a single Web3Auth modal instance. */
export async function getWeb3Auth(): Promise<Web3Auth> {
  if (instance) return instance;
  if (initPromise) return initPromise;

  const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
  if (!clientId || clientId.startsWith("YOUR_")) {
    throw new Error(
      "NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not set. Create a project at " +
        "https://dashboard.web3auth.io and add the client id to .env.local.",
    );
  }

  initPromise = (async () => {
    const w3a = new Web3Auth({
      clientId,
      web3AuthNetwork: networkFromEnv(),
    });
    await w3a.init();
    instance = w3a;
    return w3a;
  })();

  return initPromise;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Read the logged-in user's private key from the embedded wallet provider. */
export async function getPrivateKeyHex(web3auth: Web3Auth): Promise<string> {
  const provider = web3auth.provider;
  if (!provider) throw new Error("Web3Auth provider unavailable — not connected.");
  const pk = (await provider.request({ method: "private_key" })) as string;
  if (!pk) throw new Error("Could not read private key from Web3Auth.");
  return pk;
}

/** Derive a deterministic Algorand account from the Web3Auth private key. */
export function deriveAlgorandAccount(privateKeyHex: string): algosdk.Account {
  const seed = hexToBytes(privateKeyHex).slice(0, 32);
  const mnemonic = algosdk.secretKeyToMnemonic(seed);
  return algosdk.mnemonicToSecretKey(mnemonic);
}
