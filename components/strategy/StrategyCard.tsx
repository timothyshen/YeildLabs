import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, ArrowRight } from "lucide-react";

interface StrategyCardProps {
  poolName: string;
  maturity: string;
  ptPercentage: number;
  ytPercentage: number;
  score: number;
  riskFactor: number;
  comment: string;
  apy7d: number;
  apy30d: number;
  onBuyPT?: () => void;
  onBuyYT?: () => void;
  onDetails?: () => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  poolName,
  maturity,
  ptPercentage,
  ytPercentage,
  score,
  riskFactor,
  comment,
  apy7d,
  apy30d,
  onBuyPT,
  onBuyYT,
  onDetails,
}) => {
  return (
    <Card className="w-full border rounded-2xl shadow-sm p-4 bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{poolName}</h2>
            <p className="text-sm text-neutral-500">Maturity: {maturity}</p>
          </div>

          <div className="flex flex-col items-end">
            <span
              className="font-semibold text-lg"
              style={{
                color: score > 80 ? "#059669" : score > 60 ? "#d97706" : "#dc2626",
              }}
            >
              Score: {score}
            </span>
            <span className="text-neutral-500 text-sm">
              RiskFactor: {(riskFactor * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-2">
        <p className="text-sm text-neutral-600">{comment}</p>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span>PT {Math.round(ptPercentage * 100)}%</span>
            <span>YT {Math.round(ytPercentage * 100)}%</span>
          </div>
          <Progress value={ytPercentage * 100} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div className="bg-neutral-50 p-3 rounded-xl">
            <p className="text-neutral-500">APY (7D)</p>
            <p className="text-lg font-semibold">{(apy7d * 100).toFixed(2)}%</p>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl">
            <p className="text-neutral-500">APY (30D)</p>
            <p className="text-lg font-semibold">{(apy30d * 100).toFixed(2)}%</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center mt-4">
        <Button
          className="bg-green-600 text-white rounded-xl px-4"
          onClick={onBuyPT}
        >
          Buy PT
        </Button>
        <Button
          className="bg-blue-600 text-white rounded-xl px-4"
          onClick={onBuyYT}
        >
          Buy YT
        </Button>

        <Button
          className="text-neutral-700 border rounded-xl px-3"
          variant="outline"
          onClick={onDetails}
        >
          More <ArrowRight className="w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};