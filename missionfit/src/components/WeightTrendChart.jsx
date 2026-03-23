import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

export default function WeightTrendChart({ weighIns, goalWeight }) {
  if (!weighIns || weighIns.length === 0) {
    return (
      <div className="chart-empty">
        Log your first weigh-in to see your trend.
      </div>
    );
  }

  const data = weighIns.map((w) => ({
    date: w.date,
    label: format(new Date(w.date + "T12:00:00"), "MMM d"),
    weight: w.weight,
  }));

  const weights = data.map((d) => d.weight);
  const allValues = goalWeight ? [...weights, goalWeight] : weights;
  const minW = Math.floor(Math.min(...allValues) - 2);
  const maxW = Math.ceil(Math.max(...allValues) + 2);

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e0e0e0" }}
          />
          <YAxis
            domain={[minW, maxW]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value} lbs`, "Weight"]}
            labelStyle={{ fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#1D406A"
            strokeWidth={2}
            dot={{ r: 4, fill: "#1D406A" }}
            activeDot={{ r: 6 }}
          />
          {goalWeight && (
            <ReferenceLine
              y={goalWeight}
              stroke="#06D6A0"
              strokeDasharray="6 4"
              label={{
                value: `Goal: ${goalWeight}`,
                position: "right",
                fill: "#06D6A0",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
