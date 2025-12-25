import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { mantleSepolia } from '@/config/chains'
import { CONTRACT_ADDRESSES } from '@/config/chains'

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http('https://rpc.sepolia.mantle.xyz'),
})

const RUG_MANIA_ADDRESS = CONTRACT_ADDRESSES.doorRunner

// Event signatures
const GAME_WON_EVENT = parseAbiItem('event GameWon(address indexed player, uint256 payout, uint8 finalLevel)')
const GAME_RUGGED_EVENT = parseAbiItem('event GameRugged(address indexed player, uint256 betAmount, uint8 level)')

// Fetch logs in chunks to avoid RPC block range limits (max 10,000 blocks)
async function fetchLogsInChunks(
  event: ReturnType<typeof parseAbiItem>,
  playerAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
  chunkSize: bigint = 9000n
) {
  const allLogs: any[] = []
  let currentFrom = fromBlock

  while (currentFrom < toBlock) {
    const currentTo = currentFrom + chunkSize > toBlock ? toBlock : currentFrom + chunkSize
    
    try {
      const logs = await publicClient.getLogs({
        address: RUG_MANIA_ADDRESS,
        event,
        args: { player: playerAddress },
        fromBlock: currentFrom,
        toBlock: currentTo,
      })
      allLogs.push(...logs)
    } catch (error) {
      console.error(`Error fetching logs from ${currentFrom} to ${currentTo}:`, error)
    }
    
    currentFrom = currentTo + 1n
  }

  return allLogs
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  try {
    const currentBlock = await publicClient.getBlockNumber()
    // Only look back ~27,000 blocks (~7.5 hours at 1 block/sec) to stay within limits
    const fromBlock = currentBlock > 27000n ? currentBlock - 27000n : 0n

    // Fetch won and rugged events for this player in chunks
    const [wonLogs, ruggedLogs] = await Promise.all([
      fetchLogsInChunks(GAME_WON_EVENT, address as `0x${string}`, fromBlock, currentBlock),
      fetchLogsInChunks(GAME_RUGGED_EVENT, address as `0x${string}`, fromBlock, currentBlock),
    ])

    // Combine and format games
    const games = [
      ...wonLogs.map((log: any, i: number) => ({
        gameId: `#${log.blockNumber?.toString() || i}`,
        status: 'Win' as const,
        wagered: BigInt(0).toString(),
        winnings: (log.args.payout || BigInt(0)).toString(),
        blockNumber: log.blockNumber,
      })),
      ...ruggedLogs.map((log: any, i: number) => ({
        gameId: `#${log.blockNumber?.toString() || i}`,
        status: 'Loss' as const,
        wagered: (log.args.betAmount || BigInt(0)).toString(),
        winnings: `-${(log.args.betAmount || BigInt(0)).toString()}`,
        blockNumber: log.blockNumber,
      })),
    ]

    // Sort by block number descending
    games.sort((a, b) => Number((b.blockNumber || 0n) - (a.blockNumber || 0n)))

    return NextResponse.json({ games })
  } catch (error) {
    console.error('Failed to fetch game history:', error)
    return NextResponse.json({ games: [] })
  }
}
