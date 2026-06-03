import { createMemo, createSignal, For, Show } from 'solid-js'
import {
  analyzeExpression,
  describeAnalysis,
  formatNumericSummary,
  formatPlain,
  parseBindings,
  type AstNode,
  type BindingMap,
  type EquationSource,
  type ExpressionSource,
  type PlaygroundAnalysis,
} from '../lib/mathPlayground'

type PaletteItem = {
  insert: string
  label: string
  title: string
}

const examples = [
  '2^6 - 1',
  '1 / (2 + 3)',
  '(1/2 + 3/4)^2',
  'sqrt(49/16)',
  '2x + 3y',
  'sin(pi/2) + 1',
  '1/2 + 3/8',
  'root(3, 27)',
]

const categories: Array<{ title: string; items: PaletteItem[] }> = [
  {
    title: 'Digits',
    items: [
      ...'0123456789'.split('').map((n) => ({ label: n, insert: n, title: `Insert ${n}` })),
      { label: '.', insert: '.', title: 'Decimal point' },
    ],
  },
  {
    title: 'Operators',
    items: [
      { label: '+', insert: ' + ', title: 'Add' },
      { label: '−', insert: ' - ', title: 'Subtract' },
      { label: '×', insert: ' * ', title: 'Multiply' },
      { label: '÷', insert: ' / ', title: 'Divide' },
      { label: '^', insert: '^', title: 'Power' },
      { label: '!', insert: '!', title: 'Factorial' },
      { label: '%', insert: '%', title: 'Percent' },
    ],
  },
  {
    title: 'Structure',
    items: [
      { label: '(', insert: '(', title: 'Open parenthesis' },
      { label: ')', insert: ')', title: 'Close parenthesis' },
      { label: '[', insert: '[', title: 'Open bracket' },
      { label: ']', insert: ']', title: 'Close bracket' },
      { label: '{', insert: '{', title: 'Open brace' },
      { label: '}', insert: '}', title: 'Close brace' },
      { label: ',', insert: ', ', title: 'Separator' },
      { label: '=', insert: ' = ', title: 'Equation' },
    ],
  },
  {
    title: 'Functions',
    items: [
      { label: '√', insert: 'sqrt(', title: 'Square root' },
      { label: '∛', insert: 'cbrt(', title: 'Cube root' },
      { label: 'root', insert: 'root(', title: 'Nth root' },
      { label: 'sin', insert: 'sin(', title: 'Sine' },
      { label: 'cos', insert: 'cos(', title: 'Cosine' },
      { label: 'tan', insert: 'tan(', title: 'Tangent' },
      { label: 'ln', insert: 'ln(', title: 'Natural logarithm' },
      { label: 'log', insert: 'log(', title: 'Logarithm' },
      { label: 'abs', insert: 'abs(', title: 'Absolute value' },
      { label: 'min', insert: 'min(', title: 'Minimum' },
      { label: 'max', insert: 'max(', title: 'Maximum' },
      { label: 'floor', insert: 'floor(', title: 'Floor' },
      { label: 'ceil', insert: 'ceil(', title: 'Ceiling' },
      { label: 'round', insert: 'round(', title: 'Round' },
    ],
  },
  {
    title: 'Constants',
    items: [
      { label: 'π', insert: 'pi', title: 'Pi' },
      { label: 'e', insert: 'e', title: 'Euler number' },
      { label: 'τ', insert: 'tau', title: 'Tau' },
      { label: 'φ', insert: 'phi', title: 'Golden ratio' },
      { label: 'x', insert: 'x', title: 'Variable x' },
      { label: 'y', insert: 'y', title: 'Variable y' },
      { label: 'z', insert: 'z', title: 'Variable z' },
    ],
  },
]

export default function MathPlayground() {
  const [expression, setExpression] = createSignal('2^6 - 1')
  const [bindingsText, setBindingsText] = createSignal('x=2, y=3, z=4')
  let inputRef: HTMLTextAreaElement | undefined

  const bindings = createMemo<BindingMap>(() => parseBindings(bindingsText()))
  const analysis = createMemo<PlaygroundAnalysis>(() =>
    analyzeExpression(expression(), bindings()),
  )

  const timeline = createMemo(() => {
    const current = analysis()
    if (current.kind === 'equation') {
      return [
        ...current.left.steps.map((step) => ({ ...step, label: 'Left side' })),
        ...current.right.steps.map((step) => ({ ...step, label: 'Right side' })),
      ]
    }
    return current.steps.map((step) => ({ ...step, label: 'Expression' }))
  })

  function insertText(insert: string) {
    const textarea = inputRef
    if (!textarea) {
      setExpression((prev) => prev + insert)
      return
    }

    const start = textarea.selectionStart ?? expression().length
    const end = textarea.selectionEnd ?? expression().length
    const next = `${expression().slice(0, start)}${insert}${expression().slice(end)}`
    setExpression(next)

    requestAnimationFrame(() => {
      textarea.focus()
      const caret = start + insert.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  return (
    <section class="pb-16 pt-4">
      <div class="max-w-7xl mx-auto px-4 md:px-6">
        <div class="mb-8 max-w-4xl">
          <p class="text-xs uppercase tracking-[0.32em] text-gray-400 mb-3">
            Interactive math lab
          </p>
          <h1 class="text-4xl md:text-6xl font-display leading-tight mb-4">
            Visual calculation playground
          </h1>
          <p class="text-gray-300 text-base md:text-lg leading-relaxed max-w-3xl">
            Build expressions with fractions, powers, roots, functions, and
            variables. The board shows the expression, the rendered math form,
            the final value, and the rewrite path.
          </p>
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <main class="space-y-6">
            <section class="rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6 shadow-2xl shadow-black/20">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                    Expression
                  </p>
                  <h2 class="text-xl font-semibold text-white mt-1">
                    Type, paste, or build a formula
                  </h2>
                </div>
                <span class="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                  Enter to test
                </span>
              </div>

              <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                <textarea
                  ref={inputRef}
                  class="min-h-[140px] w-full resize-y rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-lg md:text-xl text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20"
                  value={expression()}
                  onInput={(e) => setExpression(e.currentTarget.value)}
                  placeholder="2^6 - 1"
                  spellcheck={false}
                />

                <div class="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                  <p class="text-[11px] uppercase tracking-[0.24em] text-gray-400 mb-3">
                    Bindings
                  </p>
                  <textarea
                    class="min-h-[140px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-gray-100 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20"
                    value={bindingsText()}
                    onInput={(e) => setBindingsText(e.currentTarget.value)}
                    spellcheck={false}
                  />
                  <p class="mt-3 text-xs text-gray-400">
                    Example: <span class="text-gray-200 font-mono">x=2, y=3</span>
                  </p>
                </div>
              </div>
            </section>

            <section class="rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-500/10 to-black/35 p-5 md:p-6 backdrop-blur-xl">
              <div class="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                    Visual expression
                  </p>
                  <h2 class="text-xl font-semibold text-white mt-1">
                    How the math reads after parsing
                  </h2>
                </div>
                <button
                  class="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 transition hover:border-indigo-400/50 hover:text-white"
                  onClick={() => setExpression('2^6 - 1')}
                >
                  Reset demo
                </button>
              </div>

              <div class="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-5 md:p-6">
                <div class="overflow-x-auto text-3xl md:text-5xl leading-[1.8] text-white">
                  <MathDisplay analysis={analysis()} />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <span class="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-gray-300">
                    {describeAnalysis(analysis())}
                  </span>
                  <span class="text-sm text-gray-400">
                    Raw: <span class="font-mono text-gray-200">{expression()}</span>
                  </span>
                </div>
              </div>
            </section>

            <section class="grid gap-4 md:grid-cols-2">
              <div class="rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6">
                <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Result
                </p>
                <div class="mt-3 text-4xl md:text-5xl font-semibold text-white">
                  <ResultValue analysis={analysis()} />
                </div>
                <p class="mt-3 text-sm text-gray-300">
                  {analysis().kind === 'equation'
                    ? 'The equation is reduced on both sides.'
                    : 'The numeric parts are reduced from the inside out.'}
                </p>
              </div>

              <div class="rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6">
                <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Why it works
                </p>
                <p class="mt-3 text-lg text-white leading-relaxed">
                  Powers, roots, grouped fractions, and functions reduce before
                  the outer operators. That is why
                  <span class="font-mono text-indigo-200">2^6 - 1</span> becomes
                  <span class="font-mono text-indigo-200">64 - 1</span>, then
                  <span class="font-mono text-indigo-200">63</span>.
                </p>
              </div>
            </section>

            <section class="rounded-[2rem] border border-white/10 bg-black/25 p-5 md:p-6">
              <div class="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                    Reduction path
                  </p>
                  <h2 class="text-xl font-semibold text-white mt-1">
                    Step-by-step visual calculation
                  </h2>
                </div>
                <p class="text-sm text-gray-400">
                  {timeline().length} step{timeline().length === 1 ? '' : 's'}
                </p>
              </div>

              <div class="space-y-3">
                <For each={timeline()}>
                  {(step, index) => (
                    <article class="step-pop rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-4 md:p-5">
                      <div class="flex items-center justify-between gap-3 mb-3">
                        <span class="text-xs uppercase tracking-[0.22em] text-indigo-300">
                          {step.label}
                        </span>
                        <span class="text-xs text-gray-500">#{index() + 1}</span>
                      </div>
                      <div class="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <div class="rounded-xl border border-white/10 bg-black/35 px-3 py-3 font-mono text-sm text-gray-200 overflow-x-auto">
                          {step.before}
                        </div>
                        <div class="text-center text-indigo-300 text-xl md:text-2xl">
                          →
                        </div>
                        <div class="rounded-xl border border-white/10 bg-indigo-500/10 px-3 py-3 font-mono text-sm text-gray-100 overflow-x-auto">
                          {step.after}
                        </div>
                      </div>
                      <p class="mt-3 text-sm text-gray-400">{step.note}</p>
                    </article>
                  )}
                </For>

                <Show when={timeline().length === 0}>
                  <p class="text-sm text-gray-500">No numeric rewrite available yet.</p>
                </Show>
              </div>
            </section>
          </main>

          <aside class="space-y-6">
            <section class="rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6">
              <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                Quick examples
              </p>
              <div class="mt-4 grid gap-2">
                <For each={examples}>
                  {(item) => (
                    <button
                      class="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-left text-sm text-gray-200 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                      onClick={() => setExpression(item)}
                    >
                      {item}
                    </button>
                  )}
                </For>
              </div>
            </section>

            <section class="rounded-[2rem] border border-white/10 bg-black/30 p-5 md:p-6">
              <p class="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                Status
              </p>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span class="text-2xl font-semibold text-white">
                  {analysis().kind === 'equation'
                    ? analysis().balanced
                      ? 'Balanced'
                      : 'Not balanced'
                    : analysis().numeric
                      ? 'Numeric result'
                      : 'Symbolic expression'}
                </span>
                <span class="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                  Live
                </span>
              </div>
              <p class="mt-3 text-sm text-gray-400">
                This updates as you type or tap the palette below.
              </p>
            </section>
          </aside>
        </div>

        <section class="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 md:p-5 shadow-2xl shadow-black/20">
          <div class="flex items-center justify-between gap-4 mb-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                Symbol rail
              </p>
              <p class="text-sm text-gray-300">
                Tap tokens to build expressions. This lives in the flow, not over the content.
              </p>
            </div>
          </div>

          <div class="grid gap-3 xl:grid-cols-5">
            <For each={categories}>
              {(group) => (
                <div class="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p class="mb-2 text-[11px] uppercase tracking-[0.22em] text-gray-500">
                    {group.title}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <For each={group.items}>
                      {(item) => (
                        <button
                          class="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-gray-100 transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-indigo-500/10"
                          title={item.title}
                          onClick={() => insertText(item.insert)}
                        >
                          {item.label}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>
    </section>
  )
}

function MathDisplay(props: { analysis: PlaygroundAnalysis }) {
  const current = props.analysis
  if (current.kind === 'equation') {
    return (
      <span class="inline-flex items-center gap-3">
        <MathNode node={current.left.node} />
        <span class="text-indigo-300">=</span>
        <MathNode node={current.right.node} />
      </span>
    )
  }

  return <MathNode node={current.node} />
}

function ResultValue(props: { analysis: PlaygroundAnalysis }) {
  const current = props.analysis
  if (current.kind === 'equation') {
    if (current.left.numeric && current.right.numeric) {
      return current.balanced ? 'Balanced' : 'Not balanced'
    }
    return 'Equation'
  }
  return current.numeric ? formatNumericSummary(current.numeric) : formatPlain(current.node)
}

function MathNode(props: { node: AstNode }) {
  const node = props.node

  switch (node.type) {
    case 'number':
      return <NumberNode node={node} />
    case 'symbol':
      return <span class="font-mono">{prettySymbol(node.name)}</span>
    case 'unary':
      return (
        <span class="inline-flex items-center">
          <span class="mr-1">{node.op === '-' ? '−' : node.op === '%' ? '' : '+'}</span>
          <MathNode node={node.arg} />
          <Show when={node.op === '%'}>
            <span class="ml-1">%</span>
          </Show>
        </span>
      )
    case 'factorial':
      return (
        <span class="inline-flex items-center gap-1">
          <MathNode node={node.arg} />
          <sup class="text-[0.55em] align-top">!</sup>
        </span>
      )
    case 'binary':
      if (node.op === '/') {
        return (
          <span class="inline-flex flex-col items-center align-middle px-1 leading-none">
            <span class="px-2 pb-1 text-center">
              <MathNode node={node.left} />
            </span>
            <span class="w-full border-t border-white/35" />
            <span class="px-2 pt-1 text-center">
              <MathNode node={node.right} />
            </span>
          </span>
        )
      }

      return (
        <span class="inline-flex items-center gap-1">
          <Wrap node={node.left} />
          <span class="text-indigo-300">{displayOperator(node.op)}</span>
          {node.op === '^' ? (
            <sup class="text-[0.55em] align-top">
              <Wrap node={node.right} />
            </sup>
          ) : (
            <Wrap node={node.right} />
          )}
        </span>
      )
    case 'call':
      return (
        <span class="inline-flex items-center gap-1">
          <span class="font-medium text-indigo-200">{displayFunctionName(node.name)}</span>
          <span>(</span>
          <span class="inline-flex items-center gap-1">
            <For each={node.args}>
              {(arg, index) => (
                <>
                  {index() > 0 && <span>, </span>}
                  <MathNode node={arg} />
                </>
              )}
            </For>
          </span>
          <span>)</span>
        </span>
      )
  }
}

function Wrap(props: { node: AstNode }) {
  const node = props.node
  const shouldWrap = node.type === 'binary' || node.type === 'call' || node.type === 'unary' || node.type === 'factorial'
  return (
    <span class="inline-flex items-center">
      {shouldWrap ? <span>(</span> : null}
      <MathNode node={node} />
      {shouldWrap ? <span>)</span> : null}
    </span>
  )
}

function NumberNode(props: { node: Extract<AstNode, { type: 'number' }> }) {
  const value = props.node.value
  const negative = value.s < 0n
  const numerator = value.n < 0n ? -value.n : value.n

  if (value.d === 1n) {
    return <span class="font-mono">{`${negative ? '-' : ''}${numerator.toString()}`}</span>
  }

  return (
    <span class="inline-flex items-center gap-1 align-middle">
      {negative && <span>-</span>}
      <span class="inline-flex flex-col items-center leading-none align-middle">
        <span class="px-1 text-[0.9em]">{numerator.toString()}</span>
        <span class="w-full border-t border-white/40" />
        <span class="px-1 text-[0.9em]">{value.d.toString()}</span>
      </span>
    </span>
  )
}

function displayOperator(op: string): string {
  switch (op) {
    case '*':
      return '×'
    case '/':
      return '÷'
    default:
      return op
  }
}

function displayFunctionName(name: string): string {
  switch (name) {
    case 'sqrt':
      return '√'
    case 'cbrt':
      return '∛'
    case 'root':
      return 'root'
    default:
      return name
  }
}

function prettySymbol(name: string): string {
  switch (name) {
    case 'pi':
      return 'π'
    case 'tau':
      return 'τ'
    case 'phi':
      return 'φ'
    default:
      return name
  }
}
