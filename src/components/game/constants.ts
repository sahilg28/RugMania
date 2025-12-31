// Calculate multipliers based on contract formula
// Formula: multiplier = (doors / (doors - 1))^level
// House edge (5%) is applied at payout time, not in multiplier display
export function calculateMultipliers(doors: number, maxLevels: number = 15): number[] {
  const multipliers: number[] = [];
  const perLevelMultiplier = doors / (doors - 1);
  
  for (let level = 1; level <= maxLevels; level++) {
    // Level 0 = 1x (just placed bet), Level 1+ = compounded
    const multiplier = Math.pow(perLevelMultiplier, level);
    multipliers.push(parseFloat(multiplier.toFixed(2)));
  }
  
  return multipliers;
}

// Pre-calculated multipliers for demo mode and idle preview
// These match the contract's calculation: (doors / (doors - 1))^level
export const MULTIPLIERS: Record<number, number[]> = {
  5: calculateMultipliers(5, 15),
  4: calculateMultipliers(4, 15),
  3: calculateMultipliers(3, 15),
};

export const GAME_MESSAGES = {
  idle: [
    "The more doors you pass, the more you win!",
    "Pick a door and test your luck!",
    "Ready to win big? Let's go!",
    "One door away from glory ",
    "Your next win is waiting...",
    "Feeling lucky? Prove it!",
  ],
  playing: [
    "You're on fire! Keep going! ",
    "One more door, one more win!",
    "Trust your gut! Pick wisely!",
    "Good going! Don't stop now!",
    "Fortune favors the bold!",
    "More doors = More rewards!",
    "You got this! Keep pushing!",
    "Almost there! Go for glory!",
    "The next door could be gold!",
    "Winners don't quit here! ",
    "So close to the big payout!",
    "Your streak is legendary!",
    "Cash out or double down? ",
    "The rug fears you! Keep going!",
    "One more and you're a legend!",
  ],
};
