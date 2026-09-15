import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Users, Trello, FileText } from 'lucide-react';
import { useAuth } from '../store/auth';

const features = [
  { icon: Trello, title: 'Boards that move with your team', body: 'Drag a card and everyone watching the board sees it land — no refresh, no stale columns.' },
  { icon: Zap, title: 'Changes appear as they happen', body: 'Comments, assignments and checklists sync over a live connection in under a second.' },
  { icon: Users, title: 'One workspace per team', body: 'Invite teammates, set roles, and keep each project walled off from the rest.' },
  { icon: FileText, title: 'Docs beside the work', body: 'Write specs and notes in the same place the tasks live, with autosave built in.' },
];

export default function Landing() {
  const token = useAuth((s) => s.token);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-iris-500 to-azure-500 text-sm font-extrabold text-white">S</span>
          <span className="text-[15px] font-extrabold tracking-tight text-white">SyncSpace</span>
        </span>
        <nav className="flex items-center gap-2">
          {token ? (
            <Link to="/workspaces" className="btn-primary !py-2">Open workspace</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !py-2">Sign in</Link>
              <Link to="/register" className="btn-primary !py-2">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="chip mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live collaboration
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your team's board,<br />in sync, right now.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed muted">
              SyncSpace keeps Kanban boards, tasks, comments and docs identical for everyone
              looking at them. Move a card in Lucknow and it moves in Lisbon at the same moment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={token ? '/workspaces' : '/register'} className="btn-primary">
                {token ? 'Go to your boards' : 'Create your workspace'} <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-ghost">I already have an account</Link>
            </div>
          </div>

          {/* A miniature board standing in for the product itself. */}
          <div className="surface p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-2 text-xs muted">Website relaunch</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'To Do', cards: ['Audit old pages', 'Collect brand assets'] },
                { name: 'In Progress', cards: ['Homepage layout', 'Pricing copy'] },
                { name: 'Done', cards: ['Kickoff call'] },
              ].map((col) => (
                <div key={col.name} className="rounded-xl bg-white/[0.04] p-2.5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{col.name}</p>
                  <div className="space-y-2">
                    {col.cards.map((c) => (
                      <div key={c} className="rounded-lg border border-white/10 bg-[#0d1120] p-2.5 text-[11px] font-medium text-slate-200">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-iris-500/25 to-azure-500/20 text-iris-400">
                <f.icon size={19} />
              </span>
              <h3 className="mt-4 text-sm font-bold text-white">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs muted">
        SyncSpace — built with React, Express, Socket.io, MongoDB and Redis.
      </footer>
    </div>
  );
}
