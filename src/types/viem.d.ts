declare module 'viem' {
  export type Address = `0x${string}`;
  export type Hash = `0x${string}`;

  export const defineChain: any;

  export function isAddress(address: string): boolean;
  export function toHex(value: string): Hash;
  export function recoverMessageAddress(params: {
    message: { raw: Hash };
    signature: Hash;
  }): Promise<Address>;

  export const createPublicClient: any;
  export const createWalletClient: any;
  export const custom: any;

  export const http: any;
  export const fallback: any;

  export function parseEventLogs(params: any): any[];

  export function formatEther(value: bigint): string;
  export function parseEther(value: string): bigint;

  export function keccak256(value: any): Hash;
  export function encodeFunctionData(params: any): Hash;
}
