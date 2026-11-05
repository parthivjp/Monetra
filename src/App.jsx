import { useEffect, useMemo, useState } from 'react'
import eyeIcon from './assets/eye.svg'
import eyeOffIcon from './assets/eye-off.svg'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import './App.css'
import { API_URL, apiRequest } from './api.js'

const STORAGE = {
  session: 'finance-session',
  token: 'finance-token',
  theme: 'finance-theme',
  cashFlowRange: 'finance-cash-flow-range',
}

function BrandMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#657C5C" />
      <path d="M12 32.5V20.8C12 17 14.4 14.5 17.8 14.5H30.2C33.6 14.5 36 17 36 20.8V32.5" stroke="#F8F5EA" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 26.5L19 21L24 26.5L31.7 18.5H36" stroke="#D8C69A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="18.5" r="2.8" fill="#D8C69A" />
    </svg>
  )
}

const categories = {
  expense: ['Housing', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Bills', 'Other'],
  income: ['Salary', 'Freelance', 'Investments', 'Gift'],
}

const colors = ['#f97316', '#fbbf24', '#7c9a68', '#5b7c99', '#b779a4', '#9a8b7a', '#67a6a0', '#d08370']
const defaultBudgets = {
  Housing: '',
  Food: '',
  Transport: '',
  Entertainment: '',
  Shopping: '',
  Health: '',
  Education: '',
  Bills: '',
}

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0)

const todayIso = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
})()

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const namePattern = /^[\p{L} ]+$/u

function validateName(value) {
  const trimmed = value.trim()
  if (!trimmed) return 'Full name is required.'
  if (trimmed.length < 2) return 'Name must be at least 2 characters.'
  if (trimmed.length > 80) return 'Name must be at most 80 characters.'
  if (!namePattern.test(trimmed)) return 'Name can contain only letters and spaces.'
  if (trimmed.replaceAll(' ', '').length < 2) return 'Name must contain at least 2 letters.'
  return ''
}

function validateEmail(value) {
  const trimmed = value.trim()
  if (!trimmed) return 'Email address is required.'
  if (trimmed.length > 254) return 'Email address must be at most 254 characters.'
  const email = trimmed.toLowerCase()
  if ((email.match(/@/g) || []).length !== 1) return 'Enter a valid email address.'
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'Enter a valid email address.'
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return 'Check the part before @ in your email address.'
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return 'Email address contains an unsupported character.'
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return 'Enter a complete email address with a valid domain.'
  const typoDomains = {
    'gmail.co': 'Did you mean gmail.com?',
    'gmail.com.co': 'Did you mean gmail.com?',
    'gmail.cmo': 'Did you mean gmail.com?',
    'gmail.con': 'Did you mean gmail.com?',
    'gmail.om': 'Did you mean gmail.com?',
    'hotmail.con': 'Did you mean hotmail.com?',
    'outlook.con': 'Did you mean outlook.com?',
    'yahoo.con': 'Did you mean yahoo.com?',
  }
  if (typoDomains[domain]) return typoDomains[domain]
  return ''
}

function validateNameInput(value) {
  if (/\d/u.test(value)) return 'Numbers are not allowed in a name.'
  if ([...value].some((character) => character !== ' ' && !/\p{L}/u.test(character))) return 'Special characters are not allowed in a name.'
  return ''
}

function validateSignupPassword(value) {
  if (!value) return ''
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(value)) return 'Password must include a number.'
  return ''
}

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDone, 2600)
    return () => clearTimeout(timer)
  }, [message, onDone])
  return message ? <div className="toast">{message}</div> : null
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  maxLength = 72,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-control">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? `Hide ${ariaLabel || 'password'}` : `Show ${ariaLabel || 'password'}`}
        aria-pressed={visible}
      >
        <img src={visible ? eyeOffIcon : eyeIcon} alt="" aria-hidden="true" />
      </button>
    </div>
  )
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})
    const nextErrors = {}
    if (mode === 'signup') {
      const nameError = validateName(name)
      if (nameError) nextErrors.name = nameError
    }
    const emailError = validateEmail(email)
    if (emailError) nextErrors.email = emailError
    if (!password) nextErrors.password = 'Password is required.'
    if (password.length > 72) nextErrors.password = 'Password must be at most 72 characters.'
    if (mode === 'signup') {
      const passwordErrors = []
      if (password.length < 8) passwordErrors.push('Password must be at least 8 characters.')
      if (!/[a-z]/.test(password)) passwordErrors.push('Password must include a lowercase letter.')
      if (!/[A-Z]/.test(password)) passwordErrors.push('Password must include an uppercase letter.')
      if (!/\d/.test(password)) passwordErrors.push('Password must include a number.')
      if (passwordErrors.length) nextErrors.password = passwordErrors[0]
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Please correct the highlighted fields.')
      return
    }
    setLoading(true)
    try {
      const data = await apiRequest(`/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      if (mode === 'signup') {
        localStorage.removeItem(STORAGE.token)
        localStorage.removeItem(STORAGE.session)
        setMode('login')
        setPassword('')
        setName('')
        setSuccess(data.message || 'Account created successfully. Please sign in.')
        return
      }
      onLogin(data.user, data.token)
    } catch (err) {
      setError(err.message || 'The request could not be completed.')
      setFieldErrors(err.fieldErrors || {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="brand-mark"><BrandMark size={22} /></div>
        <span>Monetra</span>
      </section>
      <section className="auth-card">
        <div className="auth-heading">
          <p>PERSONAL FINANCE</p>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
          <span>{mode === 'login' ? 'Sign in to continue to your ledger.' : 'Start making every dollar count.'}</span>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <label>
              Full name
              <input
                value={name}
                onChange={(e) => {
                  const entered = e.target.value
                  const filtered = entered.replace(/[^\p{L} ]/gu, '')
                  setName(filtered)
                  setFieldErrors((current) => ({
                    ...current,
                    name: validateNameInput(entered) || '',
                  }))
                }}
                onBlur={() => {
                  setFieldErrors((current) => ({
                    ...current,
                    name: validateName(name) || '',
                  }))
                }}
                placeholder="Alex Morgan"
                maxLength={80}
                autoComplete="name"
                pattern="[\\p{L} ]+"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
              />
              {fieldErrors.name && <small className="field-error" id="signup-name-error">{fieldErrors.name}</small>}
            </label>
          )}
          <label>Email address<input type="email" value={email} onChange={(e) => { const next = e.target.value.replace(/\s/g, ''); setEmail(next); setFieldErrors((current) => ({ ...current, email: next && validateEmail(next) ? validateEmail(next) : '' })) }} onBlur={() => setFieldErrors((current) => ({ ...current, email: validateEmail(email) || '' }))} placeholder="you@example.com" maxLength={254} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined} />{fieldErrors.email && <small className="field-error" id="auth-email-error">{fieldErrors.email}</small>}</label>
          <label htmlFor="auth-password">Password<PasswordField id="auth-password" value={password} onChange={(e) => { const next = e.target.value; setPassword(next); setFieldErrors((current) => ({ ...current, password: mode === 'signup' ? validateSignupPassword(next) : '' })) }} placeholder={mode === 'signup' ? '8+ chars, upper, lower, number' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} ariaLabel="password" ariaInvalid={Boolean(fieldErrors.password)} ariaDescribedBy={fieldErrors.password ? 'auth-password-error' : undefined} />{fieldErrors.password && <small className="field-error" id="auth-password-error">{fieldErrors.password}</small>}</label>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
          <button className="primary auth-submit" type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')}</button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'New to Monetra?' : 'Already have an account?'}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}>
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  )
}

function Sidebar({ page, setPage, user, onLogout, mobileOpen, setMobileOpen }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Overview'],
    ['transactions', ReceiptText, 'Transactions'],
    ['budgets', PieChartIcon, 'Budgets'],
    ['settings', Settings, 'Settings'],
  ]
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="brand-mark"><BrandMark size={20} /></div>
        <span>Monetra</span>
        <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      </div>
      <nav>
        {items.map(([id, Icon, label]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setMobileOpen(false) }}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">{user.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'AM'}</div>
        <div><strong>{user.name}</strong><span>{user.email}</span></div>
        <button aria-label="Log out" onClick={onLogout}><LogOut size={18} /></button>
      </div>
    </aside>
  )
}

function StatCard({ label, value, icon: Icon, tone, trend }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {trend && <small>{trend}</small>}
      </div>
    </article>
  )
}

function CashFlowChart({ data, periodLabel, error }) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [Number(item.income) || 0, Number(item.expense) || 0]),
  )
  const hasData = data.some((item) => Number(item.income) > 0 || Number(item.expense) > 0)

  return (
    <div className="cash-flow-chart" role="img" aria-label={`Income and expenses for ${periodLabel}`}>
      <div className="cash-flow-y-axis" aria-hidden="true">
        {[1, .75, .5, .25, 0].map((part) => (
          <span key={part}>{money(maxValue * part)}</span>
        ))}
      </div>
      <div className="cash-flow-bars">
        <div className="cash-flow-gridlines" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((line) => <i key={line} />)}
        </div>
        {data.map((item, index) => {
          const income = Number(item.income) || 0
          const expense = Number(item.expense) || 0
          return (
            <div className="cash-flow-column" key={`${item.label}-${index}`}>
              <div className="cash-flow-bar-group">
                <div
                  className="cash-flow-bar income"
                  style={{ height: `${income ? Math.max(4, (income / maxValue) * 100) : 0}%` }}
                  title={`Income: ${money(income)}`}
                  aria-label={`Income ${money(income)}`}
                />
                <div
                  className="cash-flow-bar expense"
                  style={{ height: `${expense ? Math.max(4, (expense / maxValue) * 100) : 0}%` }}
                  title={`Expense: ${money(expense)}`}
                  aria-label={`Expense ${money(expense)}`}
                />
              </div>
              <span className="cash-flow-label">{item.label}</span>
            </div>
          )
        })}
      </div>
      {!hasData && !error && <div className="cash-flow-empty">No income or expenses in this period</div>}
      {error && <div className="chart-error" role="alert">{error}</div>}
    </div>
  )
}

function Dashboard({ transactions, user, setPage, setModal }) {
  const [cashFlowRange, setCashFlowRange] = useState(() => {
    const saved = localStorage.getItem(STORAGE.cashFlowRange)
    return ['week', 'month', '3', '6', '12'].includes(saved) ? saved : 'week'
  })
  const [cashFlowData, setCashFlowData] = useState([])
  const [cashFlowError, setCashFlowError] = useState('')
  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0)
    const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)
    return { income, expenses, balance: income - expenses }
  }, [transactions])

  const trends = useMemo(() => {
    const currentKey = todayIso.slice(0, 7)
    const [year, month] = currentKey.split('-').map(Number)
    const previousDate = month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, '0')}`
    const monthly = { income: { current: 0, previous: 0 }, expense: { current: 0, previous: 0 } }
    transactions.forEach((item) => {
      const key = item.date?.slice(0, 7)
      if (key === currentKey) monthly[item.type].current += Number(item.amount)
      if (key === previousDate) monthly[item.type].previous += Number(item.amount)
    })
    const percent = (current, previousValue) => {
      if (!previousValue) return current ? '+100%' : '0%'
      const change = ((current - previousValue) / previousValue) * 100
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
    }
    return {
      income: `${percent(monthly.income.current, monthly.income.previous)} this month`,
      expense: `${percent(monthly.expense.current, monthly.expense.previous)} this month`,
    }
  }, [transactions])

  const categoryData = useMemo(() => {
    const values = {}
    transactions.filter((item) => item.type === 'expense').forEach((item) => {
      values[item.category] = (values[item.category] || 0) + Number(item.amount)
    })
    return Object.entries(values).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const localCashFlowData = useMemo(() => {
    const valuesByDate = {}
    transactions.forEach((item) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) return
      const amount = Number(item.amount)
      if (!Number.isFinite(amount) || amount <= 0 || !['income', 'expense'].includes(item.type)) return
      valuesByDate[item.date] ||= { income: 0, expense: 0 }
      valuesByDate[item.date][item.type] += amount
    })

    const [currentYear, currentMonth, currentDay] = todayIso.split('-').map(Number)
    if (cashFlowRange === 'week' || cashFlowRange === 'month') {
      const length = cashFlowRange === 'week' ? 7 : 30
      const start = new Date(currentYear, currentMonth - 1, currentDay - (length - 1))
      return Array.from({ length }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const bucket = valuesByDate[key] || { income: 0, expense: 0 }
        return {
          label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          income: bucket.income,
          expense: bucket.expense,
        }
      })
    }

    const length = Number(cashFlowRange)
    const start = new Date(currentYear, currentMonth - 1 - (length - 1), 1)
    return Array.from({ length }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const bucket = { income: 0, expense: 0 }
      Object.entries(valuesByDate).forEach(([dateKey, value]) => {
        if (dateKey.slice(0, 7) === key) {
          bucket.income += value.income
          bucket.expense += value.expense
        }
      })
      return {
        label: date.toLocaleDateString('en-IN', {
          month: 'short',
          ...(length === 12 ? { year: '2-digit' } : {}),
        }),
        income: bucket.income,
        expense: bucket.expense,
      }
    })
  }, [transactions, cashFlowRange])

  const monthlyData = cashFlowData.length ? cashFlowData : localCashFlowData

  useEffect(() => {
    let active = true
    localStorage.setItem(STORAGE.cashFlowRange, cashFlowRange)
    apiRequest(`/transactions/summary?range=${encodeURIComponent(cashFlowRange)}`)
      .then((data) => {
        if (!active) return
        setCashFlowData(data.summary?.buckets || [])
      })
      .catch((error) => {
        if (!active) return
        setCashFlowError(error.message || 'Could not load cash-flow data.')
      })
    return () => { active = false }
  }, [cashFlowRange, transactions])

  const chartPeriodLabel = cashFlowRange === 'week'
    ? 'the last 7 days'
    : cashFlowRange === 'month'
      ? 'the last 30 days'
      : `the last ${cashFlowRange} months`

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="page">
      <header className="page-header">
        <div><p>OVERVIEW</p><h1>Good morning, {user.name?.split(' ')[0] || 'there'}.</h1></div>
        <button className="primary" onClick={() => setModal(true)}><Plus size={18} />Add transaction</button>
      </header>
      <section className="stats-grid">
        <StatCard label="Total balance" value={money(totals.balance)} icon={WalletCards} tone="dark" trend="Available across all accounts" />
        <StatCard label="Income" value={money(totals.income)} icon={ArrowDownLeft} tone="green" trend={`${trends.income} vs last month`} />
        <StatCard label="Expenses" value={money(totals.expenses)} icon={ArrowUpRight} tone="orange" trend={`${trends.expense} vs last month`} />
      </section>
      <section className="charts-grid">
        <article className="panel cash-flow">
          <div className="panel-head">
            <div><span>CASH FLOW</span><h2>{cashFlowRange === 'week' || cashFlowRange === 'month' ? 'Daily overview' : 'Monthly overview'}</h2></div>
            <label className="cash-flow-range">
              <span className="sr-only">Cash flow period</span>
              <select
                value={cashFlowRange}
                onChange={(event) => {
                  setCashFlowData([])
                  setCashFlowError('')
                  setCashFlowRange(event.target.value)
                }}
                aria-label="Cash flow period"
              >
                <option value="week">Last week</option>
                <option value="month">Last month</option>
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
          <div className="chart-wrap" role="img" aria-label={`Income and expenses for ${chartPeriodLabel}`}>
            <CashFlowChart
              data={monthlyData}
              periodLabel={chartPeriodLabel}
              error={cashFlowError}
            />
          </div>
        </article>
        <article className="panel spending">
          <div className="panel-head"><div><span>SPENDING</span><h2>By category</h2></div></div>
          <div className="pie-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3}>
                  {categoryData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="category-list">
            {categoryData.slice(0, 4).map((item, index) => (
              <div key={item.name}><span><i style={{ background: colors[index % colors.length] }} />{item.name}</span><strong>{money(item.value)}</strong></div>
            ))}
          </div>
        </article>
      </section>
      <section className="panel recent">
        <div className="panel-head"><div><span>ACTIVITY</span><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setPage('transactions')}>View all</button></div>
        <TransactionList transactions={recent} compact />
      </section>
    </div>
  )
}

function TransactionList({ transactions, compact = false, onDelete, onEdit }) {
  if (!transactions.length) return <div className="empty-state">No transactions match your filters.</div>
  return (
    <div className={`transaction-list ${compact ? 'compact' : ''}`}>
      {transactions.map((item) => (
        <div className={`transaction-row ${compact ? 'compact-row' : ''}`} key={item._id || item.id}>
          <div className={`transaction-icon ${item.type}`}><ReceiptText size={18} /></div>
          <div className="transaction-main"><strong>{item.note || item.category}</strong><span>{item.category}</span></div>
          <div className="transaction-date">{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <strong className={`amount ${item.type}`}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</strong>
          {!compact && <div className="transaction-actions"><button className="edit-button" aria-label={`Edit ${item.note || item.category}`} onClick={() => onEdit(item)}><Pencil size={16} /></button><button className="delete-button" aria-label={`Delete ${item.note || item.category}`} onClick={() => onDelete(item._id || item.id)}><Trash2 size={17} /></button></div>}
        </div>
      ))}
    </div>
  )
}

function TransactionsPage({ transactions, setTransactions, setModal, toast }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [exporting, setExporting] = useState('')

  const filtered = transactions.filter((item) => {
    const matchesSearch = `${item.note} ${item.category}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (type === 'all' || item.type === type) && (category === 'all' || item.category === category) && (!startDate || item.date >= startDate)
  }).sort((a, b) => b.date.localeCompare(a.date))

  const deleteTransaction = async (id) => {
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' })
      setTransactions((current) => current.filter((item) => (item._id || item.id) !== id))
      toast('Transaction deleted')
    } catch (error) {
      toast(error.message || 'Could not delete the transaction.')
    }
  }

  const exportFile = async (format) => {
    if (exporting) return
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (type !== 'all') params.set('type', type)
    if (category !== 'all') params.set('category', category)
    if (startDate) params.set('startDate', startDate)
    try {
      setExporting(format)
      const token = localStorage.getItem(STORAGE.token)
      const response = await fetch(`${API_URL}/transactions/export/${format}?${params}`, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      })
      if (!response.ok) throw new Error(`${format.toUpperCase()} export failed.`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `monetra-transactions.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast(`${format.toUpperCase()} exported`)
    } catch (error) {
      toast(error.message || `${format.toUpperCase()} export failed.`)
    } finally {
      setExporting('')
    }
  }

  const allCategories = [...new Set(transactions.map((item) => item.category))]
  return (
    <div className="page">
      <header className="page-header"><div><p>LEDGER</p><h1>Transactions</h1></div><div className="header-actions"><button className="secondary" disabled={Boolean(exporting)} onClick={() => exportFile('csv')}><Download size={17} />{exporting === 'csv' ? 'Preparing...' : 'CSV'}</button><button className="secondary" disabled={Boolean(exporting)} onClick={() => exportFile('pdf')}><Download size={17} />{exporting === 'pdf' ? 'Preparing...' : 'PDF'}</button><button className="primary" onClick={() => setModal(true)}><Plus size={18} />Add transaction</button></div></header>
      <section className="filters panel">
        <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{allCategories.map((item) => <option key={item}>{item}</option>)}</select>
        <input aria-label="From date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </section>
      <section className="panel transaction-panel"><TransactionList transactions={filtered} onDelete={deleteTransaction} onEdit={(transaction) => setModal(transaction)} /></section>
    </div>
  )
}

function BudgetsPage({ transactions, toast }) {
  const [budgets, setBudgets] = useState(defaultBudgets)
  const currentMonth = todayIso.slice(0, 7)
  useEffect(() => {
    apiRequest('/budgets')
      .then((data) => {
        if (!data.budgets?.length) return
        const mapped = { ...defaultBudgets }
        data.budgets.forEach((item) => {
          const limit = Number(item.limit)
          mapped[item.category] = limit > 0 ? String(limit) : ''
        })
        setBudgets(mapped)
      })
      .catch((error) => toast(error.message || 'Could not load budgets.'))
  }, [toast])
  const setBudget = (category, value) => {
    let cleaned = value.replace(/[^\d.]/g, '')
    const firstDecimal = cleaned.indexOf('.')
    if (firstDecimal >= 0) {
      cleaned = `${cleaned.slice(0, firstDecimal + 1)}${cleaned.slice(firstDecimal + 1).replace(/\./g, '').slice(0, 2)}`
    }
    if (cleaned.startsWith('.')) cleaned = `0${cleaned}`
    if (!cleaned.includes('.')) cleaned = cleaned.replace(/^0+(?=\d)/, '')
    if (cleaned.includes('.')) {
      const [integer, decimal = ''] = cleaned.split('.')
      cleaned = `${integer.replace(/^0+(?=\d)/, '')}.${decimal}`
    }
    if (cleaned !== '' && cleaned !== '0.' && Number(cleaned) > 1000000000) cleaned = '1000000000'
    const next = { ...budgets, [category]: cleaned }
    setBudgets(next)
  }
  const saveBudgets = async () => {
    const invalid = Object.entries(budgets).find(([, limit]) =>
      limit !== '' && (!Number.isFinite(Number(limit)) || Number(limit) < 0 || Number(limit) > 1000000000),
    )
    if (invalid) {
      toast('Budget limits must be between 0 and 1,000,000,000.')
      return
    }
    try {
      await apiRequest('/budgets', {
        method: 'PUT',
        body: JSON.stringify({ budgets: Object.entries(budgets).map(([category, limit]) => ({ category, limit: Number(limit || 0) })) }),
      })
      toast('Budgets saved')
    } catch (error) {
      toast(error.message || 'Could not save budgets.')
    }
  }
  return (
    <div className="page">
      <header className="page-header"><div><p>PLANNING</p><h1>Monthly budgets</h1></div><button className="primary budget-save-button" onClick={saveBudgets}>Save budgets</button></header>
      <section className="budget-grid">
        {Object.entries(budgets).map(([category, limit], index) => {
          const spent = transactions
            .filter((item) => item.type === 'expense' && item.category === category && item.date?.slice(0, 7) === currentMonth)
            .reduce((sum, item) => sum + Number(item.amount), 0)
          const numericLimit = Number(limit)
          const percent = numericLimit > 0 ? Math.min((spent / numericLimit) * 100, 100) : (spent > 0 ? 100 : 0)
          return (
            <article className="panel budget-card" key={category}>
              <div className="budget-title"><div className="budget-dot" style={{ background: colors[index % colors.length] }} /><h2>{category}</h2></div>
              <div className="budget-amount"><strong>{money(spent)}</strong><span>of {money(limit)}</span></div>
              <div className="progress"><span style={{ width: `${percent}%`, background: percent >= 90 ? '#d66b4f' : colors[index % colors.length] }} /></div>
              <label htmlFor={`budget-limit-${category}`}>Monthly limit<div className="money-input"><span>₹</span><input id={`budget-limit-${category}`} type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={limit} onFocus={(event) => event.currentTarget.select()} onChange={(e) => setBudget(category, e.target.value)} onBlur={(event) => { const value = event.target.value.trim(); if (value === '' || value === '0.' ) setBudget(category, ''); else setBudget(category, String(Number(value))) }} /></div></label>
            </article>
          )
        })}
      </section>
    </div>
  )
}

function SettingsPage({ user, setUser, theme, setTheme, toast }) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const saveProfile = async () => {
    const nameError = validateName(name)
    if (nameError) {
      setProfileError(nameError)
      toast(nameError)
      return
    }
    setSaving(true)
    try {
      const data = await apiRequest('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      })
      setUser(data.user)
      write(STORAGE.session, data.user)
      toast('Profile updated')
    } catch (error) {
      toast(error.message || 'Could not update the profile.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    setPasswordError('')
    if (!passwords.current) return setPasswordError('Enter your current password.')
    const nextError = validateSignupPassword(passwords.next)
    if (nextError) return setPasswordError(nextError)
    if (passwords.next !== passwords.confirm) return setPasswordError('New passwords do not match.')
    setChangingPassword(true)
    try {
      await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      })
      setPasswords({ current: '', next: '', confirm: '' })
      toast('Password updated')
    } catch (error) {
      setPasswordError(error.fieldErrors?.currentPassword || error.message || 'Could not update password.')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header"><div><p>PREFERENCES</p><h1>Settings</h1></div></header>
      <section className="panel settings-panel">
        <div className="profile-section">
          <span>Profile</span>
          <div className="profile-edit">
            <label>Full name<input value={name} onChange={(e) => { const entered = e.target.value; const filtered = entered.replace(/[^\p{L} ]/gu, ''); setName(filtered); setProfileError(validateNameInput(entered)) }} onBlur={() => setProfileError(validateName(name) || '')} aria-label="Full name" maxLength={80} autoComplete="name" aria-invalid={Boolean(profileError)} /></label>
            <button className="theme-toggle" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
          </div>
          {profileError && <small className="field-error">{profileError}</small>}
          <label className="profile-email">Email address<input value={user.email} readOnly aria-label="Email address" /></label>
        </div>
        <div className="setting-row password-settings">
          <div><strong>Change password</strong><span>Use a strong password with letters, numbers, and symbols.</span></div>
          <div className="password-fields">
            <PasswordField value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="Current password" autoComplete="current-password" ariaLabel="Current password" />
            <PasswordField value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} placeholder="New password" autoComplete="new-password" ariaLabel="New password" />
            <PasswordField value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Confirm new password" autoComplete="new-password" ariaLabel="Confirm new password" />
            {passwordError && <small className="field-error">{passwordError}</small>}
            <button className="theme-toggle" onClick={changePassword} disabled={changingPassword}>{changingPassword ? 'Updating...' : 'Update password'}</button>
          </div>
        </div>
        <div className="setting-row"><div><strong>Appearance</strong><span>Choose how Monetra looks on this device.</span></div><button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}{theme === 'light' ? 'Dark mode' : 'Light mode'}</button></div>
      </section>
    </div>
  )
}

function TransactionModal({ close, transaction, addTransaction, updateTransaction }) {
  const existingExpenseCategory = transaction?.type === 'expense' &&
    !categories.expense.slice(0, -1).includes(transaction.category)
  const [form, setForm] = useState(transaction ? {
    type: transaction.type,
    category: existingExpenseCategory ? 'Other' : transaction.category,
    customCategory: existingExpenseCategory ? transaction.category : '',
    amount: String(transaction.amount),
    date: transaction.date,
    note: transaction.note || '',
  } : { type: 'expense', category: 'Food', customCategory: '', amount: '', date: todayIso, note: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [close])

  const submit = async (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    const nextErrors = {}
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      nextErrors.amount = 'Enter an amount greater than 0 and no more than 1,000,000,000.'
    }
    if (!isValidDate(form.date)) {
      nextErrors.date = 'Select a valid transaction date.'
    }
    const selectedCategory = form.type === 'expense' && form.category === 'Other'
      ? form.customCategory.trim()
      : form.category
    if (!selectedCategory || (form.type === 'expense' && form.category === 'Other' &&
      (selectedCategory.length < 2 || selectedCategory.length > 40 || !/^[\p{L}\p{N} &/'-]+$/u.test(selectedCategory)))) {
      nextErrors.category = 'Select a valid category.'
    } else if (!categories[form.type].includes(form.category) && form.category !== 'Other') {
      nextErrors.category = 'Select a valid category.'
    }
    if (form.type === 'expense' && form.category === 'Other') {
      if (!form.customCategory.trim()) nextErrors.customCategory = 'Enter a custom category name.'
      else if (form.customCategory.trim().length < 2) nextErrors.customCategory = 'Custom category must be at least 2 characters.'
      else if (form.customCategory.trim().length > 40) nextErrors.customCategory = 'Custom category must be at most 40 characters.'
      else if (!/^[\p{L}\p{N} &/'-]+$/u.test(form.customCategory.trim())) nextErrors.customCategory = 'Use letters, numbers, spaces, hyphens, apostrophes, or &.'
    }
    if (form.note.length > 500) {
      nextErrors.note = 'Note must be at most 500 characters.'
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('Please correct the highlighted fields.')
      return
    }
    setError('')
    const payload = {
      ...form,
      category: selectedCategory,
      customCategory: undefined,
      amount: Number(form.amount),
    }
    const result = transaction
      ? await updateTransaction(transaction._id || transaction.id, payload)
      : await addTransaction({ ...payload, id: Date.now() })
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors)
      setError(result.message || 'Please correct the highlighted fields.')
    }
  }
  const changeType = (type) => setForm((current) => ({ ...current, type, category: categories[type][0], customCategory: '' }))
  const clearFieldError = (field) => setFieldErrors((current) => ({ ...current, [field]: '' }))
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><p>{transaction ? 'UPDATE ENTRY' : 'NEW ENTRY'}</p><h2>{transaction ? 'Edit transaction' : 'Add transaction'}</h2></div><button type="button" aria-label="Close transaction form" onClick={close}><X size={20} /></button></div>
        <form onSubmit={submit}>
          <div className="type-toggle"><button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => changeType('expense')}>Expense</button><button type="button" className={form.type === 'income' ? 'active income' : ''} onClick={() => changeType('income')}>Income</button></div>
          <label htmlFor="transaction-amount">Amount<div className={`amount-input${fieldErrors.amount ? ' invalid' : ''}`}><span>₹</span><input id="transaction-amount" autoFocus type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" value={form.amount} onChange={(e) => { setForm({ ...form, amount: e.target.value }); clearFieldError('amount') }} placeholder="0.00" aria-invalid={Boolean(fieldErrors.amount)} aria-describedby={fieldErrors.amount ? 'transaction-amount-error' : undefined} /></div>{fieldErrors.amount && <small className="field-error" id="transaction-amount-error">{fieldErrors.amount}</small>}</label>
          <div className="form-grid">
            <label htmlFor="transaction-category">Category<select id="transaction-category" value={form.category} onChange={(e) => { const category = e.target.value; setForm((current) => ({ ...current, category, customCategory: category === 'Other' ? current.customCategory : '' })); clearFieldError('category'); clearFieldError('customCategory') }} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'transaction-category-error' : undefined}>{categories[form.type].map((item) => <option key={item}>{item}</option>)}</select>{fieldErrors.category && <small className="field-error" id="transaction-category-error">{fieldErrors.category}</small>}</label>
            <label htmlFor="transaction-date">Date<input id="transaction-date" type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); clearFieldError('date') }} aria-invalid={Boolean(fieldErrors.date)} aria-describedby={fieldErrors.date ? 'transaction-date-error' : undefined} />{fieldErrors.date && <small className="field-error" id="transaction-date-error">{fieldErrors.date}</small>}</label>
          </div>
          {form.type === 'expense' && form.category === 'Other' && (
            <label htmlFor="transaction-custom-category">Custom category<input id="transaction-custom-category" value={form.customCategory} onChange={(e) => { setForm({ ...form, customCategory: e.target.value.slice(0, 40) }); clearFieldError('customCategory') }} placeholder="e.g. Pet care" maxLength={40} autoComplete="off" aria-invalid={Boolean(fieldErrors.customCategory)} aria-describedby={fieldErrors.customCategory ? 'transaction-custom-category-error' : 'transaction-custom-category-count'} /><span className="note-count" id="transaction-custom-category-count">{form.customCategory.length}/40</span>{fieldErrors.customCategory && <small className="field-error" id="transaction-custom-category-error">{fieldErrors.customCategory}</small>}</label>
          )}
          <label htmlFor="transaction-note">Note<span className="optional-label">Optional</span><input id="transaction-note" value={form.note} onChange={(e) => { setForm({ ...form, note: e.target.value.slice(0, 500) }); clearFieldError('note') }} placeholder="What was this for?" maxLength={500} aria-invalid={Boolean(fieldErrors.note)} aria-describedby={fieldErrors.note ? 'transaction-note-error' : 'transaction-note-count'} /><span className="note-count" id="transaction-note-count">{form.note.length}/500</span>{fieldErrors.note && <small className="field-error" id="transaction-note-error">{fieldErrors.note}</small>}</label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary modal-submit" type="submit">{transaction ? 'Save changes' : 'Add transaction'}</button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(() =>
    localStorage.getItem(STORAGE.token) ? read(STORAGE.session, null) : null,
  )
  const [transactions, setTransactions] = useState([])
  const [page, setPage] = useState('dashboard')
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(() => read(STORAGE.theme, 'light'))

  useEffect(() => {
    if (!localStorage.getItem(STORAGE.token)) return
    Promise.all([
      apiRequest('/auth/me').catch(() => null),
      apiRequest('/transactions').catch(() => ({ transactions: [] })),
    ]).then(([me, transactionData]) => {
      if (me?.user) setSession(me.user)
      setTransactions(transactionData.transactions || [])
    })
  }, [session?.id])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    write(STORAGE.theme, theme)
  }, [theme])

  useEffect(() => {
    if (!mobileOpen) return
    document.body.classList.add('nav-open')
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.classList.remove('nav-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileOpen])

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(STORAGE.token)
      localStorage.removeItem(STORAGE.session)
      setSession(null)
      setTransactions([])
      setPage('dashboard')
      setToast('Your session has expired. Please sign in again.')
    }
    window.addEventListener('ledgerly:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('ledgerly:unauthorized', handleUnauthorized)
  }, [])

  const login = (user, token) => {
    localStorage.setItem(STORAGE.token, token)
    write(STORAGE.session, user)
    setSession(user)
  }

  const updateSessionUser = (user) => setSession(user)

  const logout = () => {
    localStorage.removeItem(STORAGE.session)
    localStorage.removeItem(STORAGE.token)
    localStorage.removeItem(STORAGE.session)
    setSession(null)
    setPage('dashboard')
  }

  const addTransaction = async (transaction) => {
    try {
      const data = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(transaction),
      })
      setTransactions((current) => [data.transaction, ...current])
      setModal(false)
      setToast('Transaction added')
    } catch (error) {
      setToast(error.message || 'Could not add the transaction.')
      return { message: error.message || 'Could not add the transaction.', fieldErrors: error.fieldErrors || {} }
    }
  }

  const updateTransaction = async (id, transaction) => {
    try {
      const data = await apiRequest(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(transaction),
      })
      setTransactions((current) => current.map((item) =>
        (item._id || item.id) === id ? data.transaction : item,
      ))
      setModal(false)
      setToast('Transaction updated')
    } catch (error) {
      setToast(error.message || 'Could not update the transaction.')
      return { message: error.message || 'Could not update the transaction.', fieldErrors: error.fieldErrors || {} }
    }
  }

  if (!session) return <><AuthScreen onLogin={login} /><Toast message={toast} onDone={() => setToast('')} /></>

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} user={session} onLogout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-content">
        <button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><BrandMark size={20} /></button>
        {page === 'dashboard' && <Dashboard transactions={transactions} user={session} setPage={setPage} setModal={setModal} />}
        {page === 'transactions' && <TransactionsPage transactions={transactions} setTransactions={setTransactions} setModal={setModal} toast={setToast} />}
        {page === 'budgets' && <BudgetsPage transactions={transactions} toast={setToast} />}
        {page === 'settings' && <SettingsPage user={session} setUser={updateSessionUser} theme={theme} setTheme={setTheme} toast={setToast} />}
      </main>
      {modal && <TransactionModal close={() => setModal(false)} transaction={modal === true ? null : modal} addTransaction={addTransaction} updateTransaction={updateTransaction} />}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

export default App
