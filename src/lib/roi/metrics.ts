export interface GameOutcome {
  stake: number;
  cashOutPosition: number; // 0 si perdió antes de retirar
  hitBone: boolean;
  multiplier: number; // 0 si perdió
}

export interface ProfitabilityMetrics {
  games: number;
  wins: number;
  losses: number;
  winRate: number; // 0-1
  profit: number; // neto (ganado - perdido)
  roi: number; // (profit / totalStaked)
  avgProfitPerGame: number;
  avgProfitPerWin: number;
  avgLossPerLoss: number;
}

export function calculateProfitabilityMetrics(outcomes: GameOutcome[]): ProfitabilityMetrics {
  const games = outcomes.length;
  const wins = outcomes.filter((g) => !g.hitBone && g.cashOutPosition > 0).length;
  const losses = games - wins;

  let totalStaked = 0;
  let profit = 0;
  let totalWinProfit = 0;
  let totalLoss = 0;

  for (const outcome of outcomes) {
    totalStaked += outcome.stake;

    if (!outcome.hitBone && outcome.cashOutPosition > 0) {
      const net = outcome.stake * (outcome.multiplier - 1);
      profit += net;
      totalWinProfit += net;
    } else {
      profit -= outcome.stake;
      totalLoss += outcome.stake;
    }
  }

  return {
    games,
    wins,
    losses,
    winRate: games > 0 ? wins / games : 0,
    profit,
    roi: totalStaked > 0 ? profit / totalStaked : 0,
    avgProfitPerGame: games > 0 ? profit / games : 0,
    avgProfitPerWin: wins > 0 ? totalWinProfit / wins : 0,
    avgLossPerLoss: losses > 0 ? totalLoss / losses : 0,
  };
}

