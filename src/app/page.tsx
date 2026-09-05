import Ticker from "@/components/Ticker";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full bg-[color:var(--ink)] text-[color:var(--paper)]">
      <Ticker />

      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-[color:var(--hairline)]">
        <span className="font-display text-xl tracking-tight">Vantiq</span>
        <div className="hidden md:flex items-center gap-8 text-sm text-[color:var(--slate)]">
          <a href="#what-it-does" className="hover:text-paper transition-colors">What it does</a>
          <a href="#pricing" className="hover:text-paper transition-colors">Pricing</a>
        </div>
        <a
          href="#pricing"
          className="text-sm px-4 py-2 border border-[color:var(--brass)] text-[color:var(--brass)] rounded-sm hover:bg-[color:var(--brass)] hover:text-[color:var(--ink)] transition-colors"
        >
          Get started
        </a>
      </nav>

      <section className="grid md:grid-cols-[1.2fr_1fr] gap-12 px-6 md:px-12 py-20 md:py-28 max-w-6xl mx-auto w-full">
        <div>
          <p className="text-[color:var(--brass)] text-sm mb-4">For students who&apos;d rather not open ten tabs</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.1] mb-6">
            Your money, and the market, read clearly.
          </h1>
          <p className="text-[color:var(--slate)] text-lg max-w-md mb-8 leading-relaxed">
            Vantiq tracks what you spend and shows you what moved in the markets today —
            in one place, written in plain language. Nothing here tells you what to buy.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="px-6 py-3 bg-[color:var(--brass)] text-[color:var(--ink)] font-medium rounded-sm hover:bg-[color:var(--brass-dim)] transition-colors"
            >
              Start free
            </a>
            <a href="#what-it-does" className="text-[color:var(--paper)] underline decoration-[color:var(--hairline)] underline-offset-4 hover:decoration-[color:var(--brass)]">
              See how it works
            </a>
          </div>
        </div>

        <div className="bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm p-6">
          <p className="text-xs text-[color:var(--slate)] mb-1">Today&apos;s briefing · 7:00 AM</p>
          <h3 className="font-display text-xl mb-4">What moved this morning</h3>
          <ul className="space-y-3 text-sm text-[color:var(--slate)]">
            <li className="flex justify-between border-b border-[color:var(--hairline)] pb-3">
              <span>Your food spending</span>
              <span className="text-[color:var(--loss)]">↑ 12% this week</span>
            </li>
            <li className="flex justify-between border-b border-[color:var(--hairline)] pb-3">
              <span>IT sector</span>
              <span className="text-[color:var(--gain)]">↑ 1.4% on strong earnings</span>
            </li>
            <li className="flex justify-between">
              <span>Your watchlist</span>
              <span className="text-[color:var(--paper)]">2 stocks in the news</span>
            </li>
          </ul>
        </div>
      </section>

      <section id="what-it-does" className="px-6 md:px-12 py-20 border-t border-[color:var(--hairline)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl mb-12 max-w-xl">
            Two things, kept separate on purpose.
          </h2>
          <div className="grid md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
            <div className="bg-[color:var(--ink)] p-8">
              <h3 className="font-display text-2xl mb-3">Your money</h3>
              <p className="text-[color:var(--slate)] leading-relaxed">
                Log what you spend and earn. See it sorted into categories automatically.
                Set a monthly budget and get told, plainly, when you&apos;re close to it.
              </p>
            </div>
            <div className="bg-[color:var(--ink)] p-8">
              <h3 className="font-display text-2xl mb-3">The market</h3>
              <p className="text-[color:var(--slate)] leading-relaxed">
                A short daily briefing on what moved and why. Live prices for the
                stocks you&apos;re watching. Written for someone reading it before class,
                not a trading desk.
              </p>
            </div>
          </div>
          <p className="text-sm text-[color:var(--slate)] mt-8 max-w-2xl">
            Vantiq provides information and tracking tools only. Nothing on this
            platform is investment advice or a recommendation to buy or sell any
            security. Speak to a SEBI-registered adviser before making investment
            decisions.
          </p>
        </div>
      </section>

      <section id="pricing" className="px-6 md:px-12 py-20 border-t border-[color:var(--hairline)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl mb-12">Start free. Pay for depth, not for outcomes.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-[color:var(--hairline)] rounded-sm p-8">
              <p className="text-sm text-[color:var(--slate)] mb-1">Free</p>
              <p className="font-display text-3xl mb-6">₹0</p>
              <ul className="space-y-2 text-sm text-[color:var(--slate)]">
                <li>Expense tracking, unlimited entries</li>
                <li>Daily market briefing preview</li>
                <li>Watchlist up to 5 stocks</li>
              </ul>
            </div>
            <div className="border border-[color:var(--brass)] rounded-sm p-8 relative">
              <span className="absolute -top-3 left-8 bg-[color:var(--ink)] px-2 text-xs text-[color:var(--brass)]">Most chosen</span>
              <p className="text-sm text-[color:var(--brass)] mb-1">Pro</p>
              <p className="font-display text-3xl mb-6">₹99<span className="text-base text-[color:var(--slate)]"> /month</span></p>
              <ul className="space-y-2 text-sm text-[color:var(--slate)]">
                <li>Everything in Free</li>
                <li>Full daily briefing</li>
                <li>Watchlist up to 25 stocks</li>
                <li>Budget alerts</li>
              </ul>
            </div>
            <div className="border border-[color:var(--hairline)] rounded-sm p-8">
              <p className="text-sm text-[color:var(--slate)] mb-1">Advanced</p>
              <p className="font-display text-3xl mb-6">₹399<span className="text-base text-[color:var(--slate)]"> /month</span></p>
              <ul className="space-y-2 text-sm text-[color:var(--slate)]">
                <li>Everything in Pro</li>
                <li>Unlimited watchlist</li>
                <li>Unlimited AI research queries</li>
                <li>Deeper stock fundamentals</li>
                <li>Priority data refresh</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t border-[color:var(--hairline)] text-sm text-[color:var(--slate)] flex justify-between">
        <span>Vantiq</span>
        <span>Built by a student, for students.</span>
      </footer>
    </div>
  );
}
