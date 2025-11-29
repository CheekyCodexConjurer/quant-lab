import React, { useEffect, useState } from 'react';
import { MainContent } from '../components/layout/MainContent';
import { AlertTriangle, Copy, Info, XCircle } from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'outputs', label: 'Outputs & Overlay' },
  { id: 'execution', label: 'Execution' },
  { id: 'errors', label: 'Errors & Debug' },
  { id: 'examples', label: 'Examples' },
  { id: 'best-practices', label: 'Best Practices' },
];

type CodeBlockProps = {
  language: string;
  code: string;
};

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-3 mb-4 rounded border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <span className="text-[11px] font-medium uppercase tracking-widest text-slate-500">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Copy size={12} />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="bg-white text-[13px] text-slate-800 font-mono px-3 py-2 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
};

type CalloutVariant = 'info' | 'warning' | 'error';

type CalloutProps = {
  variant: CalloutVariant;
  title?: string;
  children: React.ReactNode;
};

const Callout: React.FC<CalloutProps> = ({ variant, title, children }) => {
  const styles: Record<CalloutVariant, { border: string; bg: string; icon: JSX.Element }> = {
    info: {
      border: 'border-sky-100',
      bg: 'bg-slate-50',
      icon: <Info size={12} className="text-sky-400 mt-[1px]" />,
    },
    warning: {
      border: 'border-amber-100',
      bg: 'bg-slate-50',
      icon: <AlertTriangle size={12} className="text-amber-400 mt-[1px]" />,
    },
    error: {
      border: 'border-rose-100',
      bg: 'bg-slate-50',
      icon: <XCircle size={12} className="text-rose-400 mt-[1px]" />,
    },
  };

  const style = styles[variant];

  return (
    <div className={`mt-3 mb-4 rounded border ${style.border} ${style.bg} px-3 py-2.5 text-xs text-slate-700 flex gap-2`}>
      <div className="shrink-0">{style.icon}</div>
      <div>
        {title ? <div className="font-semibold mb-0.5">{title}</div> : null}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export const ApiDocsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-40% 0px -50% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <MainContent className="bg-slate-50 border border-slate-200 px-0 py-8 shadow-sm min-h-[600px] h-auto min-h-full">
      <div className="max-w-3xl mx-auto px-6 pb-16">
        {/* Sticky header + tabs */}
        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200">
          <div className="flex items-start justify-between gap-4 pt-4 pb-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-light text-slate-900 mb-1">Indicator API</h1>
              <p className="text-sm text-slate-500">
                Local Python indicator engine for building custom overlays on The Lab chart.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Canonical document: <span className="font-mono">docs/indicators/indicator-api.md</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="inline-flex items-center rounded-full bg-slate-900 text-slate-50 px-2.5 py-0.5 text-[11px] font-medium">
                v1.0
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[11px] font-medium">
                Python
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[11px] font-medium border border-emerald-200">
                Stable
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pb-4 pt-2 text-[11px] font-semibold text-slate-600 min-h-[40px]">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-1.5 uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-slate-900 text-slate-900 bg-slate-100'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content cards */}
        <div className="mt-8 space-y-6">
          {/* Overview */}
          <section id="overview" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">1. Overview</h3>
            <p className="text-sm text-slate-600 mb-2">
              Indicators in The Lab are written in Python and executed locally by the Indicator Execution Engine. The engine receives a
              window of OHLCV candles from the frontend, calls your <span className="font-mono">calculate(inputs)</span> function, and
              renders the returned data as lines, markers and horizontal levels on the chart.
            </p>
            <p className="text-sm text-slate-600">
              This page is a condensed reference. For the full specification, see{' '}
              <span className="font-mono">docs/indicators/indicator-api.md</span> in the repository.
            </p>
            <Callout variant="info" title="Python environment & dependencies">
              The indicator runner uses the Python interpreter configured via{' '}
              <span className="font-mono">THELAB_PYTHON_PATH</span> (or the default <span className="font-mono">python</span> on your PATH).
              For a quick setup, create a virtualenv and install{' '}
              <span className="font-mono">server/indicator_runner/requirements.txt</span> (NumPy, TA-Lib, etc.), then point{' '}
              <span className="font-mono">THELAB_PYTHON_PATH</span> to that interpreter. Indicators like{' '}
              <span className="font-mono">ema_100.py</span> will prefer TA-Lib when available and gracefully fall back to a NumPy-based
              implementation otherwise.
            </Callout>
          </section>

          {/* Inputs */}
          <section id="inputs" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">2. Inputs</h3>
            <p className="text-sm text-slate-600 mb-2">
              The engine calls your entry point with a single parameter <span className="font-mono">inputs</span>, a dictionary containing
              NumPy arrays of market data:
            </p>
            <CodeBlock
              language="Python"
              code={`def calculate(inputs):
    # inputs is a dict[str, np.ndarray]
    # Keys always available:
    #   'open', 'high', 'low', 'close'
    # Optional:
    #   'volume'
    opens = inputs['open']
    highs = inputs['high']
    lows = inputs['low']
    closes = inputs['close']`}
            />
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
              <li>All arrays share the same length and are ordered chronologically (index 0 is the oldest candle).</li>
              <li>If volume is not available it is filled with zeros.</li>
              <li>Typical libraries: numpy, pandas, talib, math.</li>
            </ul>
          </section>

          {/* Outputs */}
          <section id="outputs" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">3. Outputs & Overlay</h3>
            <p className="text-sm text-slate-600 mb-2">
              <span className="font-mono">calculate</span> can return a simple series (NumPy array or list) or a structured overlay with
              series, markers and levels:
            </p>
            <CodeBlock
              language="Python"
              code={`def calculate(inputs):
    closes = inputs['close']
    ...
    return {
        "series": {
            "main": closes,
            "signal": signal_array,
        },
        "markers": [
            {"index": 10, "kind": "buy", "value": closes[10]},
        ],
        "levels": [
            {"from": 30, "to": 80, "price": 75.0, "kind": "protected-high"},
        ],
    }`}
            />
            <p className="text-sm text-slate-600">
              The frontend renders series as lines, markers as icons above/below bars, and levels as dashed horizontal lines between the
              given indices.
            </p>
          </section>

          {/* Execution */}
          <section id="execution" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">4. Execution Model</h3>
            <p className="text-sm text-slate-600 mb-2">
              Indicators are executed locally whenever the chart window or code changes. For each active indicator:
            </p>
            <ul className="list-decimal list-inside text-sm text-slate-600 space-y-1">
              <li>The frontend collects the current window of candles.</li>
              <li>It calls <span className="font-mono">POST /api/indicator-exec/:id/run</span> with that window.</li>
              <li>The backend resolves the indicator file and spawns the Python runner.</li>
              <li>
                The runner imports the module, builds <span className="font-mono">inputs</span> and calls{' '}
                <span className="font-mono">calculate(inputs)</span>.
              </li>
              <li>The result is normalized to JSON and returned as an overlay.</li>
            </ul>
            <Callout variant="info" title="Execution environment">
              Each run happens in a dedicated Python process using the interpreter configured for The Lab. Heavy indicators should rely on
              NumPy vectorization and avoid unnecessary work.
            </Callout>
          </section>

          {/* Errors */}
          <section id="errors" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">5. Errors & Debug</h3>
            <p className="text-sm text-slate-600 mb-2">
              When something goes wrong, the runner returns a structured error. Common types include:
            </p>
            <Callout variant="error" title="Common error types">
              <ul className="list-disc list-inside space-y-1">
                <li>ImportError – failed to import the indicator module (missing dependency, syntax error in imports).</li>
                <li>MissingEntryPoint – module does not define calculate(inputs).</li>
                <li>ExecutionError – exception raised inside calculate.</li>
                <li>ResultError / SerializationError – returned value cannot be converted to JSON.</li>
                <li>Timeout – the script exceeded the execution time limit.</li>
              </ul>
            </Callout>
            <Callout variant="warning" title="Debug in the UI">
              The editor surface should display the error type and message next to the indicator code. You can also inspect browser console
              logs from the hook:
              <span className="block font-mono text-[11px] bg-slate-100 border border-slate-200 rounded px-2 py-1 mt-1">
                [useIndicators] runIndicator failed my_indicator Error: &lt;message&gt;
              </span>
            </Callout>
          </section>

          {/* Examples */}
          <section id="examples" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">6. Examples</h3>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">6.1 Simple Moving Average</h4>
                <CodeBlock
                  language="Python"
                  code={`import numpy as np

def calculate(inputs):
    closes = np.array(inputs['close'], dtype=float)
    window = 20
    if closes.size < window:
        return np.array([])

    weights = np.repeat(1.0, window) / window
    smas = np.convolve(closes, weights, 'valid')
    return smas`}
                />
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section id="best-practices" className="scroll-mt-24 bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">7. Best Practices</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
              <li>Favor NumPy vectorization over Python loops whenever possible.</li>
              <li>Guard against short windows (return an empty array or dict if there is not enough data).</li>
              <li>Keep indicator scripts compact, extracting helpers instead of creating “god functions”.</li>
              <li>Use clear and consistent kind values for markers and levels.</li>
              <li>Avoid network calls or heavy disk I/O inside calculate; indicators should be pure transforms over OHLCV.</li>
            </ul>
          </section>
        </div>
      </div>
    </MainContent>
  );
};
