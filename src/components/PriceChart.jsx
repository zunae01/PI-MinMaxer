import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function PriceChart({ points = [], labels: customLabels = [], label = "Price", color = "#2de2e6" }) {
  if (!points.length) return null;
  const prices = points.map((p) => (typeof p === "object" ? p.price : p));
  const labels = customLabels.length
    ? customLabels
    : points.map((p, idx) => {
        if (typeof p === "object" && p.ts) return new Date(p.ts).toLocaleDateString();
        return `${idx + 1}`;
      });
  const data = {
    labels,
    datasets: [
      {
        label,
        data: prices,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: "Older → Latest (relative samples)", color: "rgba(230, 237, 247, 0.6)" },
        ticks: { color: "rgba(230, 237, 247, 0.6)", maxTicksLimit: 6 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "Price (ISK)", color: "rgba(230, 237, 247, 0.6)" },
        ticks: { color: "rgba(230, 237, 247, 0.6)", callback: (v) => abbreviate(v) },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y.toLocaleString()} ISK`,
        },
      },
    },
  };
  return <Line options={options} data={data} height={220} />;
}

function abbreviate(num) {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}m`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num;
}
