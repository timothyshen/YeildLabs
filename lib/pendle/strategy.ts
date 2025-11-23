// pendleStrategy.ts
// Production-Ready PT/YT Allocation Strategy

export interface YieldData {
    ptPrice: number;             // PT 当前价格 (0.92 等)
    apy7d: number;               // 7-day APY (decimal)
    apy30d: number;              // 30-day APY (decimal)
    maturityDays: number;        // 距离到期天数
    sensitivity: number;         // YT 对 APY 变化的敏感度 (delta)
  }
  
  export interface StrategyResult {
    ptPercentage: number; // 0 ~ 1
    ytPercentage: number; // 0 ~ 1
    comment: string;
  }
  
  export function calculatePTYTAllocation(data: YieldData): StrategyResult {
    const { ptPrice, apy7d, apy30d, maturityDays, sensitivity } = data;
  
    // -------- 1. PT Score --------
    const discount = 1 - ptPrice;
    const PT_score =
      discount * Math.sqrt(Math.max(maturityDays, 1) / 365);
  
    // -------- 2. YT Score --------
    const apyTrend =
      apy30d > 0 ? (apy7d - apy30d) / apy30d : 0;
  
    let YT_score = apyTrend * sensitivity;
  
    if (YT_score < 0) {
      YT_score = 0; // APY 下跌不买 YT
    }
  
    // Avoid division by zero
    if (PT_score + YT_score === 0) {
      return {
        ptPercentage: 1,
        ytPercentage: 0,
        comment: "No valid YT signal; allocate fully to PT"
      };
    }
  
    // -------- 3. Final Ratio --------
    const ptPercentage = PT_score / (PT_score + YT_score);
    const ytPercentage = YT_score / (PT_score + YT_score);
  
    // -------- 4. Strategy Comment --------
    let comment = "";
    if (ytPercentage > 0.7) comment = "Strong YT signal (APY trending up)";
    else if (ytPercentage > 0.4) comment = "Moderate YT allocation";
    else if (ytPercentage < 0.1) comment = "Market weak; focus PT";
    else comment = "Balanced PT/YT positioning";
  
    return {
      ptPercentage,
      ytPercentage,
      comment
    };
  }


  export interface RiskParams {
    maxDrawdown: number;   // YT 过去30天最大回撤 (0.0 ~ 1.0)
    volatility: number;    // APY 波动 (std of returns)
    riskProfile: "conservative" | "moderate" | "aggressive";
  }
  
  export interface YieldPoolData {
    ptPrice: number;
    apy7d: number;
    apy30d: number;
    maturityDays: number;
    sensitivity: number;
  }
  
  export interface StrategyResult {
    ptPercentage: number;
    ytPercentage: number;
    comment: string;
    riskFactor: number;
  }
  
  export function calculatePTYTWithRisk(
    data: YieldPoolData,
    risk: RiskParams
  ): StrategyResult {
  
    const { ptPrice, apy7d, apy30d, maturityDays, sensitivity } = data;
    const { maxDrawdown, volatility, riskProfile } = risk;
  
    // ---------------- PT Score ----------------
    const discount = 1 - ptPrice;
    const PT_score =
      discount * Math.sqrt(Math.max(maturityDays, 1) / 365);
  
    // ---------------- YT Base Score ----------------
    const apyTrend =
      apy30d > 0 ? (apy7d - apy30d) / apy30d : 0;
  
    let YT_score = apyTrend * sensitivity;
    if (YT_score < 0) YT_score = 0;
  
    // ---------------- Risk Adjustment ----------------
    const MDD_norm = Math.min(maxDrawdown / 0.3, 1);      // normalize by 30%
    const vol_norm = Math.min(volatility / 0.25, 1);      // normalize by 25%
  
    const profileFactor = 
      riskProfile === "conservative" ? 0.4 :
      riskProfile === "moderate" ? 0.7 : 1.0;
  
    const riskFactor =
      (1 - MDD_norm) *
      (1 - vol_norm) *
      profileFactor;
  
    const YT_adjusted = YT_score * riskFactor;
  
    // avoid division by zero
    if (PT_score + YT_adjusted === 0) {
      return {
        ptPercentage: 1,
        ytPercentage: 0,
        comment: "YT suppressed by risk model",
        riskFactor
      };
    }
  
    const ptPercentage = PT_score / (PT_score + YT_adjusted);
    const ytPercentage = YT_adjusted / (PT_score + YT_adjusted);
  
    // ---------------- Comment ----------------
    let comment = "";
    if (ytPercentage > 0.7) comment = "Aggressive YT (trend strong + low risk)";
    else if (ytPercentage > 0.4) comment = "Balanced allocation";
    else if (ytPercentage < 0.1) comment = "Prefer PT (risk model suppresses YT)";
    else comment = "Mild YT positioning";
  
    return {
      ptPercentage,
      ytPercentage,
      comment,
      riskFactor
    };
  }


  export interface PoolInfo {
    ptPrice: number;
    apy7d: number;
    apy30d: number;
    maturityDays: number;
    tvl: number;
    sensitivity: number;
    maxDrawdown: number;
    volatility: number;
    riskProfile: "conservative" | "moderate" | "aggressive";
  }
  
  export function scoreStablecoinPool(pool: PoolInfo): number {
    // Reuse strategy engine for riskFactor
    const { riskFactor } = calculatePTYTWithRisk(
      {
        ptPrice: pool.ptPrice,
        apy7d: pool.apy7d,
        apy30d: pool.apy30d,
        maturityDays: pool.maturityDays,
        sensitivity: pool.sensitivity
      },
      {
        maxDrawdown: pool.maxDrawdown,
        volatility: pool.volatility,
        riskProfile: pool.riskProfile
      }
    );
  
    const discount = 1 - pool.ptPrice;
    const ptScore = Math.min(discount / 0.15, 1);
  
    const trend = pool.apy30d > 0 ? (pool.apy7d - pool.apy30d) / pool.apy30d : 0;
    const trendScore = Math.min(Math.max(trend / 0.1, 0), 1);
  
    const maturityScore = Math.min(
      Math.max(1 - Math.abs((pool.maturityDays - 120) / 120), 0),
      1
    );
  
    const tvlScore = Math.min(Math.log(pool.tvl) / Math.log(50_000_000), 1);
  
    const finalScore =
      30 * ptScore +
      25 * trendScore +
      20 * riskFactor +
      15 * maturityScore +
      10 * tvlScore;
  
    return Math.round(finalScore); // 0–100
  }