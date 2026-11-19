"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Validated categorical palette (dataviz skill, references/palette.md) - fixed
// order, never cycled/reassigned by filtering.
// Paleta de Triphy (celeste del logo, verde, naranja, azul, terracota, arena).
const BLUE = "#7386F5";
const ORANGE = "#F5A524";
const AQUA = "#7CBE66";
const CATEGORICAL = ["#7386F5", "#7CBE66", "#F5A524", "#143DA6", "#9E5941", "#C9B49A", "#e87ba4", "#4a3aa7"];
const OTHER_GRAY = "#898781";

const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#c3c2b7";
const MUTED_TEXT = "#898781";
const PRIMARY_TEXT = "#0b0b0b";

const tickStyle = { fontSize: 12, fill: MUTED_TEXT };

function ChartCard({ title, subtitle, children, legend }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
        </div>
        {legend}
      </div>
      <div className="h-64 w-full">{children}</div>
    </div>
  );
}

function TooltipBox({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg" style={{ color: PRIMARY_TEXT }}>
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} style={{ color: entry.color || PRIMARY_TEXT }}>
          {entry.name}: <span className="font-semibold">{formatter ? formatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TopPlacesChart({ data }) {
  return (
    <ChartCard title="Lugares más buscados" subtitle="Top 10 · últimos 30 días">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis type="number" allowDecimals={false} tick={tickStyle} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={tickStyle}
              axisLine={{ stroke: AXIS_COLOR }}
              tickLine={false}
            />
            <Tooltip content={<TooltipBox formatter={(v) => `${v} vistas`} />} cursor={{ fill: "rgba(42,120,214,0.06)" }} />
            <Bar dataKey="count" name="Vistas" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="Todavía no hay lugares vistos registrados." />
      )}
    </ChartCard>
  );
}

export function ActivityChart({ data }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <ChartCard title="Actividad de búsqueda" subtitle="Eventos por día · últimos 30 días">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="date"
              tick={tickStyle}
              axisLine={{ stroke: AXIS_COLOR }}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={tickStyle} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox formatter={(v) => `${v} eventos`} />} />
            <Area type="monotone" dataKey="count" name="Eventos" stroke={AQUA} strokeWidth={2} fill={AQUA} fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="Todavía no hay actividad registrada en los últimos 30 días." />
      )}
    </ChartCard>
  );
}

export function CategoriesChart({ data }) {
  // Los eventos sin categoria ya vienen agrupados como "Otros": se suman a la
  // porcion "Otros" del final en vez de repetirla (dos claves "Otros"
  // rompian el grafico y la leyenda).
  const named = data.filter((d) => d.category !== "Otros");
  const top = named.slice(0, 7);
  const rest =
    named.slice(7).reduce((sum, d) => sum + d.count, 0) +
    data.filter((d) => d.category === "Otros").reduce((sum, d) => sum + d.count, 0);
  const chartData = rest > 0 ? [...top, { category: "Otros", count: rest }] : top;

  return (
    <ChartCard
      title="Categorías más populares"
      subtitle="Por cantidad de eventos"
      legend={
        chartData.length ? (
          <ul className="flex max-w-[55%] flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-gray-500">
            {chartData.map((entry, index) => (
              <li key={entry.category} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.category === "Otros" ? OTHER_GRAY : CATEGORICAL[index % CATEGORICAL.length] }}
                />
                {entry.category}
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      {chartData.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<TooltipBox formatter={(v) => `${v} eventos`} />} />
            <Pie data={chartData} dataKey="count" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={entry.category === "Otros" ? OTHER_GRAY : CATEGORICAL[index % CATEGORICAL.length]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="Todavía no hay categorías con datos." />
      )}
    </ChartCard>
  );
}

export function TripsPerWeekChart({ data }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <ChartCard title="Viajes creados por semana" subtitle="Últimas 8 semanas">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="week"
              tick={tickStyle}
              axisLine={{ stroke: AXIS_COLOR }}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
            />
            <YAxis allowDecimals={false} tick={tickStyle} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox formatter={(v) => `${v} viajes`} />} cursor={{ fill: "rgba(235,104,52,0.06)" }} />
            <Bar dataKey="count" name="Viajes" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="Todavía no se crearon viajes en este rango." />
      )}
    </ChartCard>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <p className="max-w-xs text-sm text-gray-400">{text}</p>
    </div>
  );
}
