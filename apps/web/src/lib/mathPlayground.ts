import Fraction from 'fraction.js'

export type ExpressionSource = {
  kind: 'expression'
  node: AstNode
  steps: RewriteStep[]
  numeric?: Fraction
  symbolic: boolean
}

export type EquationSource = {
  kind: 'equation'
  left: ExpressionSource
  right: ExpressionSource
  balanced?: boolean
}

export type PlaygroundAnalysis = ExpressionSource | EquationSource

export type RewriteStep = {
  before: string
  after: string
  note: string
}

type Token =
  | { type: 'number'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }

export type AstNode =
  | { type: 'number'; value: Fraction }
  | { type: 'symbol'; name: string }
  | { type: 'unary'; op: '+' | '-' | '%'; arg: AstNode }
  | { type: 'factorial'; arg: AstNode }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: AstNode; right: AstNode }
  | { type: 'call'; name: string; args: AstNode[] }

export type BindingMap = Map<string, Fraction>

const precedence: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3,
}

const constants: Record<string, Fraction> = {
  pi: new Fraction(Math.PI),
  tau: new Fraction(Math.PI * 2),
  e: new Fraction(Math.E),
  phi: new Fraction((1 + Math.sqrt(5)) / 2),
}

export function parseBindings(source: string): BindingMap {
  const env = new Map<string, Fraction>()
  const items = source
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  for (const item of items) {
    const [rawName, ...rest] = item.split('=')
    if (!rawName || rest.length === 0) continue
    const name = rawName.trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue
    const valueSource = rest.join('=').trim()
    const parsed = analyzeExpression(valueSource, new Map())
    if (parsed.kind === 'expression' && parsed.numeric) {
      env.set(name, parsed.numeric.clone())
    }
  }

  return env
}

export function analyzeExpression(source: string, bindings: BindingMap): PlaygroundAnalysis {
  const normalized = normalizeSource(source)
  const equation = splitEquation(normalized)

  if (equation) {
    const left = reduce(parseExpression(equation.left), bindings)
    const right = reduce(parseExpression(equation.right), bindings)
    const balanced =
      left.numeric && right.numeric ? left.numeric.equals(right.numeric) : undefined

    return {
      kind: 'equation',
      left: toExpressionSource(left),
      right: toExpressionSource(right),
      balanced,
    }
  }

  const result = reduce(parseExpression(normalized), bindings)
  return toExpressionSource(result)
}

type Reduced = {
  node: AstNode
  numeric?: Fraction
  symbolic: boolean
  steps: RewriteStep[]
}

function toExpressionSource(result: Reduced): ExpressionSource {
  return {
    kind: 'expression',
    node: result.node,
    steps: result.steps,
    numeric: result.numeric,
    symbolic: result.symbolic,
  }
}

function normalizeSource(source: string): string {
  return source
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/τ/g, 'tau')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/∜/g, 'root4')
}

function splitEquation(source: string): { left: string; right: string } | null {
  let depth = 0
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === '=' && depth === 0) {
      return {
        left: source.slice(0, i).trim(),
        right: source.slice(i + 1).trim(),
      }
    }
  }
  return null
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const ch = source[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let j = i + 1
      while (j < source.length && /[0-9.]/.test(source[j])) j++
      tokens.push({ type: 'number', value: source.slice(i, j) })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j])) j++
      tokens.push({ type: 'ident', value: source.slice(i, j) })
      i = j
      continue
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }

    if ('+-*/^!%='.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    i++
  }

  return injectImplicitMultiplication(tokens)
}

function injectImplicitMultiplication(tokens: Token[]): Token[] {
  const output: Token[] = []

  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i]
    const previous = output[output.length - 1]

    if (previous && needsImplicitMultiplication(previous, current)) {
      output.push({ type: 'op', value: '*' })
    }

    output.push(current)
  }

  return output
}

function needsImplicitMultiplication(previous: Token, current: Token): boolean {
  const prevCanMultiply =
    previous.type === 'number' ||
    previous.type === 'ident' ||
    previous.type === 'rparen' ||
    (previous.type === 'op' && (previous.value === '!' || previous.value === '%'))

  const currentCanStart =
    current.type === 'number' || current.type === 'ident' || current.type === 'lparen'

  return prevCanMultiply && currentCanStart
}

class Parser {
  private index = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode {
    const node = this.parseAdditive()
    return node
  }

  private peek(): Token | undefined {
    return this.tokens[this.index]
  }

  private consume(): Token {
    const token = this.tokens[this.index]
    this.index++
    return token
  }

  private matchOp(...ops: string[]): string | null {
    const token = this.peek()
    if (token?.type === 'op' && ops.includes(token.value)) {
      this.consume()
      return token.value
    }
    return null
  }

  private parseAdditive(): AstNode {
    let node = this.parseMultiplicative()
    while (true) {
      const op = this.matchOp('+', '-')
      if (!op) break
      const right = this.parseMultiplicative()
      node = { type: 'binary', op, left: node, right }
    }
    return node
  }

  private parseMultiplicative(): AstNode {
    let node = this.parsePower()
    while (true) {
      const op = this.matchOp('*', '/')
      if (!op) break
      const right = this.parsePower()
      node = { type: 'binary', op, left: node, right }
    }
    return node
  }

  private parsePower(): AstNode {
    let node = this.parseUnary()
    if (this.matchOp('^')) {
      const right = this.parsePower()
      node = { type: 'binary', op: '^', left: node, right }
    }
    return node
  }

  private parseUnary(): AstNode {
    const op = this.matchOp('+', '-', '%')
    if (op) {
      const arg = this.parseUnary()
      return { type: 'unary', op: op as '+' | '-' | '%', arg }
    }

    let node = this.parsePrimary()
    while (this.matchOp('!')) {
      node = { type: 'factorial', arg: node }
    }
    return node
  }

  private parsePrimary(): AstNode {
    const token = this.peek()
    if (!token) return { type: 'symbol', name: '∅' }

    if (token.type === 'number') {
      this.consume()
      return { type: 'number', value: new Fraction(token.value) }
    }

    if (token.type === 'ident') {
      const name = token.value
      this.consume()
      if (this.peek()?.type === 'lparen') {
        this.consume()
        const args: AstNode[] = []
        if (this.peek()?.type !== 'rparen') {
          while (true) {
            args.push(this.parseAdditive())
            if (this.peek()?.type === 'comma') {
              this.consume()
              continue
            }
            break
          }
        }
        if (this.peek()?.type === 'rparen') this.consume()
        return { type: 'call', name, args }
      }
      return { type: 'symbol', name }
    }

    if (token.type === 'lparen') {
      this.consume()
      const node = this.parseAdditive()
      if (this.peek()?.type === 'rparen') this.consume()
      return node
    }

    this.consume()
    return { type: 'symbol', name: '?' }
  }
}

function parseExpression(source: string): AstNode {
  const tokens = tokenize(source)
  const parser = new Parser(tokens)
  return parser.parse()
}

function reduce(node: AstNode, bindings: BindingMap): Reduced {
  switch (node.type) {
    case 'number':
      return { node, numeric: node.value.clone(), symbolic: false, steps: [] }

    case 'symbol': {
      const binding = bindings.get(node.name) || constants[node.name]
      if (binding) {
        const valueNode: AstNode = { type: 'number', value: binding.clone() }
        return {
          node: valueNode,
          numeric: binding.clone(),
          symbolic: false,
          steps: [],
        }
      }
      return { node, symbolic: true, steps: [] }
    }

    case 'unary': {
      const arg = reduce(node.arg, bindings)
      const simplified: AstNode = { ...node, arg: arg.node }

      if (!arg.numeric) {
        return {
          node: simplified,
          symbolic: true,
          steps: [...arg.steps],
        }
      }

      const numeric = evaluateUnary(node.op, arg.numeric)
      if (!numeric) {
        return {
          node: simplified,
          symbolic: true,
          steps: [...arg.steps],
        }
      }

      const valueNode: AstNode = { type: 'number', value: numeric.clone() }
      const steps = [...arg.steps]
      if (arg.node.type !== 'number') {
        steps.push({
          before: formatPlain(simplified),
          after: formatPlain(valueNode),
          note: unaryNote(node.op),
        })
      }

      return {
        node: valueNode,
        numeric,
        symbolic: false,
        steps,
      }
    }

    case 'factorial': {
      const arg = reduce(node.arg, bindings)
      const simplified: AstNode = { ...node, arg: arg.node }

      if (!arg.numeric) {
        return { node: simplified, symbolic: true, steps: [...arg.steps] }
      }

      const numeric = factorialFraction(arg.numeric)
      if (!numeric) return { node: simplified, symbolic: true, steps: [...arg.steps] }

      const valueNode: AstNode = { type: 'number', value: numeric.clone() }
      const steps = [...arg.steps]
      if (arg.node.type !== 'number') {
        steps.push({
          before: formatPlain(simplified),
          after: formatPlain(valueNode),
          note: 'Factorial expands to repeated multiplication.',
        })
      }

      return { node: valueNode, numeric, symbolic: false, steps }
    }

    case 'binary': {
      const left = reduce(node.left, bindings)
      const right = reduce(node.right, bindings)
      const simplified: AstNode = {
        ...node,
        left: left.node,
        right: right.node,
      }

      if (!left.numeric || !right.numeric) {
        return {
          node: simplified,
          symbolic: true,
          steps: [...left.steps, ...right.steps],
        }
      }

      const numeric = evaluateBinary(node.op, left.numeric, right.numeric)
      if (!numeric) {
        return {
          node: simplified,
          symbolic: true,
          steps: [...left.steps, ...right.steps],
        }
      }

      const valueNode: AstNode = { type: 'number', value: numeric.clone() }
      const steps = [...left.steps, ...right.steps]
      if (left.node.type !== 'number' || right.node.type !== 'number') {
        steps.push({
          before: formatPlain(simplified),
          after: formatPlain(valueNode),
          note: binaryNote(node.op),
        })
      }

      return { node: valueNode, numeric, symbolic: false, steps }
    }

    case 'call': {
      const args = node.args.map((arg) => reduce(arg, bindings))
      const simplified: AstNode = {
        ...node,
        args: args.map((arg) => arg.node),
      }
      const steps = args.flatMap((arg) => arg.steps)
      const allNumeric = args.every((arg) => arg.numeric)

      if (!allNumeric) {
        return {
          node: simplified,
          symbolic: true,
          steps,
        }
      }

      const numeric = evaluateCall(
        node.name,
        args.map((arg) => arg.numeric as Fraction),
      )
      if (!numeric) {
        return {
          node: simplified,
          symbolic: true,
          steps,
        }
      }

      const valueNode: AstNode = { type: 'number', value: numeric.clone() }
      if (simplified.type !== 'number') {
        steps.push({
          before: formatPlain(simplified),
          after: formatPlain(valueNode),
          note: callNote(node.name),
        })
      }

      return {
        node: valueNode,
        numeric,
        symbolic: false,
        steps,
      }
    }
  }
}

function unaryNote(op: '+' | '-' | '%'): string {
  switch (op) {
    case '+':
      return 'Unary plus keeps the value unchanged.'
    case '-':
      return 'Unary minus flips the sign.'
    case '%':
      return 'Percent divides the value by 100.'
  }
}

function binaryNote(op: '+' | '-' | '*' | '/' | '^'): string {
  switch (op) {
    case '+':
      return 'Add the simplified terms.'
    case '-':
      return 'Subtract the simplified term.'
    case '*':
      return 'Multiply the factors.'
    case '/':
      return 'Turn division into a fraction.'
    case '^':
      return 'Evaluate the power first.'
  }
}

function callNote(name: string): string {
  switch (name) {
    case 'sqrt':
      return 'Square root finds the value whose square matches.'
    case 'cbrt':
      return 'Cube root finds the value whose cube matches.'
    case 'root':
      return 'Root evaluates the nth root of the value.'
    case 'sin':
    case 'cos':
    case 'tan':
      return 'Trig functions are evaluated numerically.'
    case 'ln':
    case 'log':
      return 'Logarithms are evaluated numerically.'
    default:
      return 'Evaluate the function.'
  }
}

function evaluateUnary(op: '+' | '-' | '%', value: Fraction): Fraction | null {
  switch (op) {
    case '+':
      return value.clone()
    case '-':
      return value.neg()
    case '%':
      return value.div(new Fraction(100))
  }
}

function evaluateBinary(
  op: '+' | '-' | '*' | '/' | '^',
  left: Fraction,
  right: Fraction,
): Fraction | null {
  switch (op) {
    case '+':
      return left.add(right)
    case '-':
      return left.sub(right)
    case '*':
      return left.mul(right)
    case '/':
      return left.div(right)
    case '^':
      if (!isIntegerFraction(right)) return new Fraction(left.valueOf() ** right.valueOf())
      return left.pow(right)
  }
}

function evaluateCall(name: string, args: Fraction[]): Fraction | null {
  const first = args[0]
  if (!first) return null

  switch (name) {
    case 'sqrt':
      return nthRootFraction(first, 2)
    case 'cbrt':
      return nthRootFraction(first, 3)
    case 'root': {
      if (args.length < 2) return null
      const degree = args[0]
      const radicand = args[1]
      if (!isIntegerFraction(degree)) return new Fraction(Math.pow(radicand.valueOf(), 1 / degree.valueOf()))
      return nthRootFraction(radicand, Number(degree.valueOf()))
    }
    case 'sin':
      return new Fraction(Math.sin(first.valueOf()))
    case 'cos':
      return new Fraction(Math.cos(first.valueOf()))
    case 'tan':
      return new Fraction(Math.tan(first.valueOf()))
    case 'asin':
      return new Fraction(Math.asin(first.valueOf()))
    case 'acos':
      return new Fraction(Math.acos(first.valueOf()))
    case 'atan':
      return new Fraction(Math.atan(first.valueOf()))
    case 'ln':
      return new Fraction(Math.log(first.valueOf()))
    case 'log':
      return args.length > 1
        ? new Fraction(Math.log(args[1].valueOf()) / Math.log(first.valueOf()))
        : new Fraction(Math.log10(first.valueOf()))
    case 'abs':
      return first.abs()
    case 'floor':
      return first.floor()
    case 'ceil':
      return first.ceil()
    case 'round':
      return first.round()
    case 'exp':
      return new Fraction(Math.exp(first.valueOf()))
    case 'min':
      return new Fraction(Math.min(...args.map((arg) => arg.valueOf())))
    case 'max':
      return new Fraction(Math.max(...args.map((arg) => arg.valueOf())))
    default:
      return null
  }
}

function nthRootFraction(value: Fraction, degree: number): Fraction | null {
  if (degree <= 0) return null
  if (!isIntegerFraction(value)) {
    return new Fraction(Math.sign(value.valueOf()) * Math.abs(value.valueOf()) ** (1 / degree))
  }

  const sign = value.s < 0n ? -1n : 1n
  if (sign < 0n && degree % 2 === 0) return null

  const numeratorRoot = integerNthRoot(value.n, degree)
  const denominatorRoot = integerNthRoot(value.d, degree)
  if (numeratorRoot && denominatorRoot) {
    const combined = new Fraction(sign * numeratorRoot, denominatorRoot)
    return combined
  }

  const approx = Math.sign(value.valueOf()) * Math.abs(value.valueOf()) ** (1 / degree)
  return new Fraction(approx)
}

function integerNthRoot(value: bigint, degree: number): bigint | null {
  if (value < 0n) return null
  if (value === 0n || value === 1n) return value

  let low = 1n
  let high = value
  while (low <= high) {
    const mid = (low + high) >> 1n
    const pow = bigintPow(mid, degree)
    if (pow === value) return mid
    if (pow < value) low = mid + 1n
    else high = mid - 1n
  }
  return null
}

function bigintPow(base: bigint, exponent: number): bigint {
  let result = 1n
  for (let i = 0; i < exponent; i++) {
    result *= base
  }
  return result
}

function factorialFraction(value: Fraction): Fraction | null {
  if (!isIntegerFraction(value)) return null
  const n = value.valueOf()
  if (!Number.isInteger(n) || n < 0) return null
  let out = 1n
  for (let i = 2n; i <= BigInt(n); i++) {
    out *= i
  }
  return new Fraction(out, 1n)
}

function isIntegerFraction(value: Fraction): boolean {
  return value.d === 1n
}

export function formatPlain(node: AstNode): string {
  return formatNode(node, 0)
}

function formatNode(node: AstNode, parentPrec: number): string {
  switch (node.type) {
    case 'number':
      return formatFraction(node.value)
    case 'symbol':
      return prettySymbol(node.name)
    case 'unary': {
      if (node.op === '%') return `${formatNode(node.arg, 4)}%`
      const body = formatNode(node.arg, 4)
      return node.op === '-' ? `-${wrapIfNeeded(node.arg, 4, body)}` : `+${wrapIfNeeded(node.arg, 4, body)}`
    }
    case 'factorial':
      return `${wrapIfNeeded(node.arg, 4, formatNode(node.arg, 4))}!`
    case 'binary': {
      const prec = precedence[node.op]
      if (node.op === '/') {
        return `${wrapDivisionSide(node.left)} / ${wrapDivisionSide(node.right)}`
      }
      if (node.op === '^') {
        return `${wrapIfNeeded(node.left, prec, formatNode(node.left, prec))}^${wrapIfNeeded(node.right, prec, formatNode(node.right, prec))}`
      }
      const left = wrapIfNeeded(node.left, prec, formatNode(node.left, prec))
      const right = wrapIfNeeded(node.right, prec + 1, formatNode(node.right, prec + 1))
      const text = `${left} ${node.op} ${right}`
      return parentPrec > prec ? `(${text})` : text
    }
    case 'call':
      return `${prettyCallName(node.name)}(${node.args.map((arg) => formatNode(arg, 0)).join(', ')})`
  }
}

function wrapDivisionSide(node: AstNode): string {
  if (node.type === 'binary' || node.type === 'unary' || node.type === 'factorial' || node.type === 'call') {
    return `(${formatNode(node, 0)})`
  }
  return formatNode(node, 0)
}

function wrapIfNeeded(node: AstNode, precedenceLevel: number, text: string): string {
  if (needsParens(node, precedenceLevel)) return `(${text})`
  return text
}

function needsParens(node: AstNode, parentPrec: number): boolean {
  if (node.type !== 'binary') return false
  return precedence[node.op] < parentPrec
}

function formatFraction(value: Fraction): string {
  if (value.d === 1n) return value.n.toString()
  return value.toFraction()
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

function prettyCallName(name: string): string {
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

export function describeAnalysis(result: PlaygroundAnalysis): string {
  if (result.kind === 'equation') {
    if (result.left.numeric && result.right.numeric) {
      return result.balanced ? 'Balanced' : 'Not balanced'
    }
    return 'Symbolic equation'
  }
  if (result.numeric) return 'Numeric result'
  return 'Symbolic expression'
}

export function formatNumericSummary(value?: Fraction): string {
  if (!value) return '—'
  if (value.d === 1n) return value.n.toString()
  return `${value.toFraction()} ≈ ${value.valueOf().toFixed(6)}`
}

export function renderResultLabel(node: AstNode): string {
  return formatPlain(node)
}
