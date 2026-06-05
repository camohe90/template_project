import algosdk from "algosdk";

/**
 * Browser-side algod client (read + broadcast). Uses the free AlgoNode TestNet
 * endpoint by default. We deliberately use plain algosdk here rather than the
 * full AlgorandClient to keep the client bundle free of Node-only dependencies.
 */
export function getAlgodClient(): algosdk.Algodv2 {
  const server =
    process.env.NEXT_PUBLIC_ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  return new algosdk.Algodv2("", server, "");
}

export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_EXPLORER_BASE ?? "https://lora.algokit.io/testnet";

export function explorerTxUrl(txId: string): string {
  return `${EXPLORER_BASE}/tx/${txId}`;
}

export function explorerAssetUrl(assetId: number): string {
  return `${EXPLORER_BASE}/asset/${assetId}`;
}
