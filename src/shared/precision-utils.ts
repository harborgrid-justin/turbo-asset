/**
 * Precision Utilities for High-Precision Financial Calculations
 * Provides utilities for handling floating-point precision issues in financial and business calculations
 */

export class PrecisionUtils {
  // Default precision for financial calculations (2 decimal places)
  private static readonly DEFAULT_FINANCIAL_PRECISION = 2;
  
  // Maximum safe integer for JavaScript calculations
  private static readonly MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
  
  // Precision multipliers for different decimal places
  private static readonly PRECISION_MULTIPLIERS = {
    0: 1,
    1: 10,
    2: 100,
    3: 1000,
    4: 10000,
    5: 100000,
    6: 1000000,
    7: 10000000,
    8: 100000000
  };

  /**
   * Round a number to specified decimal places using proper rounding
   */
  static roundToPrecision(value: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(value)) {
      return value;
    }
    
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Add two numbers with high precision
   */
  static add(a: number, b: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return NaN;
    }
    
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    const aScaled = Math.round(a * multiplier);
    const bScaled = Math.round(b * multiplier);
    
    return (aScaled + bScaled) / multiplier;
  }

  /**
   * Subtract two numbers with high precision
   */
  static subtract(a: number, b: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return NaN;
    }
    
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    const aScaled = Math.round(a * multiplier);
    const bScaled = Math.round(b * multiplier);
    
    return (aScaled - bScaled) / multiplier;
  }

  /**
   * Multiply two numbers with high precision
   */
  static multiply(a: number, b: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return NaN;
    }
    
    // For multiplication, we need to be careful about overflow
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    const result = a * b;
    
    return this.roundToPrecision(result, precision);
  }

  /**
   * Divide two numbers with high precision
   */
  static divide(a: number, b: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
      return b === 0 ? (a === 0 ? NaN : (a > 0 ? Infinity : -Infinity)) : NaN;
    }
    
    const result = a / b;
    return this.roundToPrecision(result, precision);
  }

  /**
   * Calculate percentage with high precision
   */
  static percentage(value: number, total: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) {
      return 0;
    }
    
    const result = (value / total) * 100;
    return this.roundToPrecision(result, precision);
  }

  /**
   * Calculate compound interest with high precision
   */
  static compoundInterest(
    principal: number,
    rate: number,
    periodsPerYear: number,
    years: number,
    precision: number = this.DEFAULT_FINANCIAL_PRECISION
  ): number {
    if (!Number.isFinite(principal) || !Number.isFinite(rate) || 
        !Number.isFinite(periodsPerYear) || !Number.isFinite(years)) {
      return NaN;
    }
    
    const ratePerPeriod = rate / periodsPerYear;
    const totalPeriods = periodsPerYear * years;
    
    const result = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
    return this.roundToPrecision(result, precision);
  }

  /**
   * Calculate present value with high precision
   */
  static presentValue(
    futureValue: number,
    rate: number,
    periods: number,
    precision: number = this.DEFAULT_FINANCIAL_PRECISION
  ): number {
    if (!Number.isFinite(futureValue) || !Number.isFinite(rate) || !Number.isFinite(periods)) {
      return NaN;
    }
    
    const result = futureValue / Math.pow(1 + rate, periods);
    return this.roundToPrecision(result, precision);
  }

  /**
   * Sum an array of numbers with high precision
   */
  static sum(values: number[], precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
    
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    let sum = 0;
    
    for (const value of values) {
      if (Number.isFinite(value)) {
        sum += Math.round(value * multiplier);
      }
    }
    
    return sum / multiplier;
  }

  /**
   * Calculate average with high precision
   */
  static average(values: number[], precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
    
    const finiteValues = values.filter(v => Number.isFinite(v));
    if (finiteValues.length === 0) {
      return 0;
    }
    
    const sum = this.sum(finiteValues, precision + 2); // Extra precision for intermediate calculation
    return this.roundToPrecision(sum / finiteValues.length, precision);
  }

  /**
   * Validate if a number is within safe precision limits
   */
  static isSafePrecision(value: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): boolean {
    if (!Number.isFinite(value)) {
      return false;
    }
    
    const multiplier = this.PRECISION_MULTIPLIERS[precision] || Math.pow(10, precision);
    const scaledValue = Math.abs(value * multiplier);
    
    return scaledValue <= this.MAX_SAFE_INTEGER;
  }

  /**
   * Convert a number to a safe precision string representation
   */
  static toFixedSafe(value: number, precision: number = this.DEFAULT_FINANCIAL_PRECISION): string {
    if (!Number.isFinite(value)) {
      return value.toString();
    }
    
    const rounded = this.roundToPrecision(value, precision);
    return rounded.toFixed(precision);
  }

  /**
   * Parse a string to number with precision validation
   */
  static parseNumber(value: string, precision: number = this.DEFAULT_FINANCIAL_PRECISION): number {
    if (typeof value !== 'string') {
      return NaN;
    }
    
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[,$\s€£¥]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    
    return this.roundToPrecision(parsed, precision);
  }

  /**
   * Calculate depreciation with high precision using straight-line method
   */
  static calculateStraightLineDepreciation(
    cost: number,
    salvageValue: number,
    usefulLife: number,
    currentYear: number,
    precision: number = this.DEFAULT_FINANCIAL_PRECISION
  ): {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    bookValue: number;
  } {
    if (!Number.isFinite(cost) || !Number.isFinite(salvageValue) || 
        !Number.isFinite(usefulLife) || !Number.isFinite(currentYear) || usefulLife <= 0) {
      return {
        annualDepreciation: 0,
        accumulatedDepreciation: 0,
        bookValue: cost
      };
    }
    
    const depreciableAmount = this.subtract(cost, salvageValue, precision);
    const annualDepreciation = this.divide(depreciableAmount, usefulLife, precision);
    const yearsToDepreciate = Math.min(currentYear, usefulLife);
    const accumulatedDepreciation = this.multiply(annualDepreciation, yearsToDepreciate, precision);
    const bookValue = Math.max(this.subtract(cost, accumulatedDepreciation, precision), salvageValue);
    
    return {
      annualDepreciation,
      accumulatedDepreciation,
      bookValue
    };
  }

  /**
   * Calculate declining balance depreciation with high precision
   */
  static calculateDecliningBalanceDepreciation(
    cost: number,
    rate: number,
    currentYear: number,
    precision: number = this.DEFAULT_FINANCIAL_PRECISION
  ): {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    bookValue: number;
  } {
    if (!Number.isFinite(cost) || !Number.isFinite(rate) || !Number.isFinite(currentYear) || 
        rate <= 0 || rate > 1 || currentYear < 0) {
      return {
        annualDepreciation: 0,
        accumulatedDepreciation: 0,
        bookValue: cost
      };
    }
    
    let bookValue = cost;
    let totalDepreciation = 0;
    
    for (let year = 1; year <= currentYear; year++) {
      const yearDepreciation = this.multiply(bookValue, rate, precision);
      bookValue = this.subtract(bookValue, yearDepreciation, precision);
      totalDepreciation = this.add(totalDepreciation, yearDepreciation, precision);
    }
    
    const annualDepreciation = currentYear > 0 ? this.multiply(bookValue, rate, precision) : 0;
    
    return {
      annualDepreciation,
      accumulatedDepreciation: totalDepreciation,
      bookValue
    };
  }

  /**
   * Calculate loan payment with high precision using PMT formula
   */
  static calculateLoanPayment(
    principal: number,
    annualRate: number,
    periodsPerYear: number,
    totalYears: number,
    precision: number = this.DEFAULT_FINANCIAL_PRECISION
  ): number {
    if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || 
        !Number.isFinite(periodsPerYear) || !Number.isFinite(totalYears) || 
        principal <= 0 || periodsPerYear <= 0 || totalYears <= 0) {
      return 0;
    }
    
    if (annualRate === 0) {
      return this.divide(principal, periodsPerYear * totalYears, precision);
    }
    
    const periodRate = annualRate / periodsPerYear;
    const totalPeriods = periodsPerYear * totalYears;
    
    const numerator = principal * periodRate;
    const denominator = 1 - Math.pow(1 + periodRate, -totalPeriods);
    
    const payment = numerator / denominator;
    return this.roundToPrecision(payment, precision);
  }

  /**
   * Validate precision configuration
   */
  static validatePrecision(precision: number): boolean {
    return Number.isInteger(precision) && precision >= 0 && precision <= 8;
  }

  /**
   * Get optimal precision for a given calculation type
   */
  static getOptimalPrecision(calculationType: 'currency' | 'percentage' | 'rate' | 'unit' | 'ratio'): number {
    switch (calculationType) {
      case 'currency':
        return 2;
      case 'percentage':
        return 2;
      case 'rate':
        return 4;
      case 'unit':
        return 3;
      case 'ratio':
        return 4;
      default:
        return this.DEFAULT_FINANCIAL_PRECISION;
    }
  }
}

/**
 * High-precision decimal class for critical financial calculations
 */
export class PrecisionDecimal {
  private value: number;
  private precision: number;

  constructor(value: number | string, precision: number = PrecisionUtils.getOptimalPrecision('currency')) {
    if (typeof value === 'string') {
      this.value = PrecisionUtils.parseNumber(value, precision);
    } else {
      this.value = PrecisionUtils.roundToPrecision(value, precision);
    }
    this.precision = precision;
  }

  add(other: PrecisionDecimal | number): PrecisionDecimal {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    const resultPrecision = Math.max(this.precision, other instanceof PrecisionDecimal ? other.precision : this.precision);
    const result = PrecisionUtils.add(this.value, otherValue, resultPrecision);
    return new PrecisionDecimal(result, resultPrecision);
  }

  subtract(other: PrecisionDecimal | number): PrecisionDecimal {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    const resultPrecision = Math.max(this.precision, other instanceof PrecisionDecimal ? other.precision : this.precision);
    const result = PrecisionUtils.subtract(this.value, otherValue, resultPrecision);
    return new PrecisionDecimal(result, resultPrecision);
  }

  multiply(other: PrecisionDecimal | number): PrecisionDecimal {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    const resultPrecision = Math.max(this.precision, other instanceof PrecisionDecimal ? other.precision : this.precision);
    const result = PrecisionUtils.multiply(this.value, otherValue, resultPrecision);
    return new PrecisionDecimal(result, resultPrecision);
  }

  divide(other: PrecisionDecimal | number): PrecisionDecimal {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    const resultPrecision = Math.max(this.precision, other instanceof PrecisionDecimal ? other.precision : this.precision);
    const result = PrecisionUtils.divide(this.value, otherValue, resultPrecision);
    return new PrecisionDecimal(result, resultPrecision);
  }

  toNumber(): number {
    return this.value;
  }

  toString(): string {
    return PrecisionUtils.toFixedSafe(this.value, this.precision);
  }

  toFixed(precision?: number): string {
    return PrecisionUtils.toFixedSafe(this.value, precision || this.precision);
  }

  equals(other: PrecisionDecimal | number, tolerance: number = 0.001): boolean {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    return Math.abs(this.value - otherValue) < tolerance;
  }

  isGreaterThan(other: PrecisionDecimal | number): boolean {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    return this.value > otherValue;
  }

  isLessThan(other: PrecisionDecimal | number): boolean {
    const otherValue = other instanceof PrecisionDecimal ? other.value : other;
    return this.value < otherValue;
  }
}

// Export commonly used precision configurations
export const PrecisionConfig = {
  CURRENCY: PrecisionUtils.getOptimalPrecision('currency'),
  PERCENTAGE: PrecisionUtils.getOptimalPrecision('percentage'),
  INTEREST_RATE: PrecisionUtils.getOptimalPrecision('rate'),
  UNITS: PrecisionUtils.getOptimalPrecision('unit'),
  RATIOS: PrecisionUtils.getOptimalPrecision('ratio'),
} as const;