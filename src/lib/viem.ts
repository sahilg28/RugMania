import { createPublicClient, fallback, http } from "viem";
import { mantleSepolia } from "@/config/chains";

export const publicTransport = fallback([
  http("https://rpc.sepolia.mantle.xyz", {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30_000,
  }),
  http("https://mantle-sepolia.blockpi.network/v1/rpc/public", {
    retryCount: 1,
    retryDelay: 5000,
    timeout: 10_000,
  }),
  http("https://rpc.ankr.com/mantle_sepolia", {
    retryCount: 1,
    retryDelay: 5000,
    timeout: 10_000,
  }),
]);

export const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: publicTransport,
});
