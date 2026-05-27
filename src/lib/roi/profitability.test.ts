import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfitabilityMetrics } from './metrics';
import { runSimulation } from './simulator';

describe('Rentabilidad - ROI / Win Rate / Profit', () => {
  it('rentable_2 debe mejorar ROI, win rate y profit vs baseline_5 (simulación determinista)', () => {
    const games = 2000;
    const stake = 1;
    const seed = 123456;

    const rentable = calculateProfitabilityMetrics(
      runSimulation({ games, stake, seed, strategy: 'rentable_2' })
    );
    const baseline = calculateProfitabilityMetrics(
      runSimulation({ games, stake, seed, strategy: 'baseline_5' })
    );

    // Sanidad
    assert.equal(rentable.games, games);
    assert.equal(baseline.games, games);
    assert.ok(Number.isFinite(rentable.roi));
    assert.ok(Number.isFinite(baseline.roi));

    // Comprobación de mejora relativa
    assert.ok(rentable.winRate > baseline.winRate, `winRate rentable=${rentable.winRate} baseline=${baseline.winRate}`);
    assert.ok(rentable.roi > baseline.roi, `roi rentable=${rentable.roi} baseline=${baseline.roi}`);
    assert.ok(rentable.profit > baseline.profit, `profit rentable=${rentable.profit} baseline=${baseline.profit}`);
  });

  it('rentable_3 debe ser >= rentable_2 en profit por victoria (tradeoff riesgo)', () => {
    const games = 2000;
    const stake = 1;
    const seed = 424242;

    const rentable2 = calculateProfitabilityMetrics(
      runSimulation({ games, stake, seed, strategy: 'rentable_2' })
    );
    const rentable3 = calculateProfitabilityMetrics(
      runSimulation({ games, stake, seed, strategy: 'rentable_3' })
    );

    assert.ok(rentable3.avgProfitPerWin >= rentable2.avgProfitPerWin);
  });
});

