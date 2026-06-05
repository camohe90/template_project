import "server-only";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

/** A signing account as returned by AlgorandClient's AccountManager. */
type SignerAccount = ReturnType<AlgorandClient["account"]["fromMnemonic"]>;

/**
 * Server-only Algorand helpers.
 *
 * Holds the privileged accounts (organizer + dispenser) loaded from env, and
 * exposes a configured AlgorandClient pointed at TestNet (free AlgoNode
 * endpoints). Never import this module from client components.
 */

let _algorand: AlgorandClient | undefined;
let _organizer: SignerAccount | undefined;
let _dispenser: SignerAccount | undefined;

export function getAlgorand(): AlgorandClient {
  if (_algorand) return _algorand;
  const network = (process.env.ALGORAND_NETWORK ?? "testnet").toLowerCase();
  _algorand =
    network === "mainnet"
      ? AlgorandClient.mainNet()
      : network === "localnet"
        ? AlgorandClient.defaultLocalNet()
        : AlgorandClient.testNet();
  return _algorand;
}

function requireMnemonic(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("...")) {
    throw new Error(
      `Missing ${name}. Run "npm run gen:account", fund the address on TestNet, ` +
        `then set ${name} in .env.local.`,
    );
  }
  return value.trim();
}

/** Organizer / treasury account: creates events, mints + holds ticket ASAs. */
export function getOrganizer(): SignerAccount {
  if (_organizer) return _organizer;
  const algorand = getAlgorand();
  _organizer = algorand.account.fromMnemonic(requireMnemonic("ORGANIZER_MNEMONIC"));
  return _organizer;
}

/** Dispenser used to top up brand-new user wallets. Defaults to the organizer. */
export function getDispenser(): SignerAccount {
  if (_dispenser) return _dispenser;
  const algorand = getAlgorand();
  const mnemonic = process.env.DISPENSER_MNEMONIC?.trim();
  _dispenser =
    mnemonic && !mnemonic.includes("...")
      ? algorand.account.fromMnemonic(mnemonic)
      : getOrganizer();
  return _dispenser;
}

export function userTopUpAlgo(): number {
  const raw = Number(process.env.NEXT_PUBLIC_USER_TOPUP_ALGO ?? "1");
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}
