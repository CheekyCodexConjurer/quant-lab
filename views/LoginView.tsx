import React, { useState } from 'react';
import type { UserProfile } from '../types';

type LoginViewProps = {
  onLogin: (profile: UserProfile) => void;
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    try {
      onLogin({
        name: trimmedName,
        email: email.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-sm bg-slate-100" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-slate-50">The Lab</span>
              <span className="text-xs text-slate-400 tracking-tight">Quantitative Backtesting Workspace</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50 mb-1">Sign in to continue</h1>
          <p className="text-sm text-slate-400 max-w-xs">
            Create a local profile on this machine. Your information stays on your device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-lg p-5">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-slate-300 tracking-wide">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. trader.matthews"
              className="w-full h-9 px-3 rounded-md bg-slate-950/60 border border-slate-700 text-sm text-slate-50 outline-none focus:border-slate-400 placeholder:text-slate-500"
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-slate-300 tracking-wide">
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full h-9 px-3 rounded-md bg-slate-950/60 border border-slate-800 text-sm text-slate-50 outline-none focus:border-slate-400 placeholder:text-slate-500"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-full h-9 mt-2 inline-flex items-center justify-center rounded-md bg-slate-50 text-slate-950 text-sm font-semibold tracking-tight hover:bg-slate-200 disabled:opacity-60 disabled:hover:bg-slate-50 transition-colors"
          >
            Continue
          </button>
        </form>

        <p className="mt-4 text-[11px] text-slate-500 leading-snug max-w-sm">
          This is a local-only sign in. Future releases may add online accounts and licensing, but this prototype keeps
          everything on your machine.
        </p>
      </div>
    </div>
  );
};

