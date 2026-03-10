export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Voice Loan Assistant Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Monitor live calls, customer journeys, and model performance.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Live Calls</h2>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Conversion Rate</h2>
          <p className="mt-2 text-3xl font-semibold">—</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Avg. Quality Score</h2>
          <p className="mt-2 text-3xl font-semibold">—</p>
        </div>
      </div>
    </section>
  );
}

