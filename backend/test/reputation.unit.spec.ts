import { describe, it, expect } from 'vitest';
import {
  calculateOtd,
  calculateFillRate,
  calculateCancelRate,
  calculateReturnRate,
  calculateReputationScore,
  assignLevel,
} from '../src/reputation/reputation.service';
import { ReputationLevel } from '@prisma/client';

describe('Reputation KPI Calculations (Unit)', () => {
  // ── calculateOtd ────────────────────────────────────────
  describe('calculateOtd', () => {
    it('returns 100 when there are no orders', () => {
      expect(calculateOtd(0, 0)).toBe(100);
    });

    it('returns 80 when 8 of 10 orders were delivered', () => {
      expect(calculateOtd(8, 10)).toBe(80);
    });

    it('returns 100 when all orders delivered', () => {
      expect(calculateOtd(10, 10)).toBe(100);
    });

    it('returns 0 when no orders were delivered', () => {
      expect(calculateOtd(0, 10)).toBe(0);
    });
  });

  // ── calculateFillRate ───────────────────────────────────
  describe('calculateFillRate', () => {
    it('returns 100 when there are no orders', () => {
      expect(calculateFillRate(0, 0)).toBe(100);
    });

    it('returns 90 when 9 of 10 not cancelled', () => {
      expect(calculateFillRate(9, 10)).toBe(90);
    });
  });

  // ── calculateCancelRate ─────────────────────────────────
  describe('calculateCancelRate', () => {
    it('returns 0 when there are no orders', () => {
      expect(calculateCancelRate(0, 0)).toBe(0);
    });

    it('returns 20 when 2 of 10 cancelled', () => {
      expect(calculateCancelRate(2, 10)).toBe(20);
    });
  });

  // ── calculateReturnRate ─────────────────────────────────
  describe('calculateReturnRate', () => {
    it('returns 0 when there are no orders', () => {
      expect(calculateReturnRate(0, 0)).toBe(0);
    });

    it('returns 10 when 1 of 10 returned', () => {
      expect(calculateReturnRate(1, 10)).toBe(10);
    });
  });

  // ── calculateReputationScore ────────────────────────────
  describe('calculateReputationScore', () => {
    it('returns 100 for a perfect supplier', () => {
      // otd=100, fill=100, cancel=0, return=0
      // 0.4*100 + 0.2*100 + 0.2*(100-0) + 0.2*(100-0) = 40+20+20+20 = 100
      expect(calculateReputationScore(100, 100, 0, 0)).toBe(100);
    });

    it('returns 0 for a worst-case supplier', () => {
      // otd=0, fill=0, cancel=100, return=100
      // 0.4*0 + 0.2*0 + 0.2*(100-100) + 0.2*(100-100) = 0
      expect(calculateReputationScore(0, 0, 100, 100)).toBe(0);
    });

    it('computes mixed score correctly', () => {
      // otd=80, fill=90, cancel=10, return=5
      // 0.4*80 + 0.2*90 + 0.2*90 + 0.2*95 = 32+18+18+19 = 87
      expect(calculateReputationScore(80, 90, 10, 5)).toBe(87);
    });
  });

  // ── assignLevel ─────────────────────────────────────────
  describe('assignLevel', () => {
    it('assigns STANDARD when orders below threshold (< 3)', () => {
      expect(assignLevel(99, 2)).toBe(ReputationLevel.STANDARD);
    });

    it('assigns PREMIUM when score >= 90 and orders >= 3', () => {
      expect(assignLevel(95, 10)).toBe(ReputationLevel.PREMIUM);
    });

    it('assigns VERIFIED when score is 75–89', () => {
      expect(assignLevel(80, 10)).toBe(ReputationLevel.VERIFIED);
    });

    it('assigns STANDARD when score < 75', () => {
      expect(assignLevel(60, 10)).toBe(ReputationLevel.STANDARD);
    });

    it('assigns PREMIUM at boundary score = 90', () => {
      expect(assignLevel(90, 5)).toBe(ReputationLevel.PREMIUM);
    });

    it('assigns VERIFIED at boundary score = 75', () => {
      expect(assignLevel(75, 5)).toBe(ReputationLevel.VERIFIED);
    });
  });
});
