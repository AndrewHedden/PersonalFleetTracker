export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Personal · Portfolio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">PersonalFleetTracker</h1>
        <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          Multi-vehicle fuel and maintenance tracker. Log fill-ups, track service, and get reminders
          when routine maintenance is due. Web app today, SwiftUI iOS companion next.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Build status
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <Phase label="0" title="Monorepo skeleton, CI" status="done" />
          <Phase label="1" title="Drizzle schema + migrations" status="done" />
          <Phase label="2" title="SST stacks (VPC, RDS, Cognito, API, Next.js)" status="done" />
          <Phase label="3a" title="Next.js scaffold in workspace" status="current" />
          <Phase label="3b" title="shadcn/ui + Cognito sign-in" status="pending" />
          <Phase label="3c" title="Vehicles CRUD vertical slice" status="pending" />
          <Phase label="4" title="SwiftUI iOS app + Amplify Cognito" status="pending" />
        </ul>
      </section>

      <footer className="text-sm text-zinc-500">
        <a
          href="https://github.com/AndrewHedden/PersonalFleetTracker"
          className="underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/AndrewHedden/PersonalFleetTracker →
        </a>
      </footer>
    </main>
  );
}

type PhaseStatus = 'done' | 'current' | 'pending';

function Phase({ label, title, status }: { label: string; title: string; status: PhaseStatus }) {
  const dot =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'current'
        ? 'bg-amber-500'
        : 'bg-zinc-300 dark:bg-zinc-700';

  const titleClass =
    status === 'done' ? 'text-zinc-500' : status === 'current' ? 'font-medium' : 'text-zinc-500';

  const srLabel = status === 'done' ? 'done' : status === 'current' ? 'in progress' : 'pending';

  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="sr-only">{srLabel}</span>
      <span className="w-8 shrink-0 font-mono text-xs text-zinc-400">{label}</span>
      <span className={titleClass}>{title}</span>
    </li>
  );
}
