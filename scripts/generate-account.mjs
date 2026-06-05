// Generates a fresh Algorand account and prints its address + 25-word mnemonic.
// Usage: npm run gen:account
import algosdk from "algosdk";

const account = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log("\nNew Algorand account");
console.log("--------------------");
console.log("Address :", account.addr.toString());
console.log("Mnemonic:", mnemonic);
console.log(
  "\nFund it on TestNet: https://bank.testnet.algorand.network (paste the address)\n" +
    "Then put the mnemonic in .env.local as ORGANIZER_MNEMONIC.\n",
);
