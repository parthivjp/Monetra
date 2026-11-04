import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  LayoutDashboard,
  LogOut,
  Moon,
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import { API_URL, apiRequest } from './api.js'

const STORAGE = {
  session: 'finance-session',
  token: 'finance-token',
  theme: 'finance-theme',
}

const categories = {
  expense: ['Housing', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Bills'],
  income: ['Salary', 'Freelance', 'Investments', 'Gift'],
}

const colors = ['#f97316', '#fbbf24', '#7c9a68', '#5b7c99', '#b779a4', '#9a8b7a', '#67a6a0', '#d08370']
const defaultBudgets = {
  Housing: 0,
  Food: 0,
  Transport: 0,
  Entertainment: 0,
  Shopping: 0,
  Health: 0,
  Education: 0,
  Bills: 0,
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.'
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

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
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
        <div className="brand-mark"><WalletCards size={22} /></div>
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
          <label>Password<input type="password" value={password} onChange={(e) => { const next = e.target.value; setPassword(next); setFieldErrors((current) => ({ ...current, password: mode === 'signup' ? validateSignupPassword(next) : '' })) }} onBlur={() => setFieldErrors((current) => ({ ...current, password: mode === 'signup' ? validateSignupPassword(password) || (password ? '' : 'Password is required.') : (!password ? 'Password is required.' : '') }))} placeholder={mode === 'signup' ? '8+ chars, upper, lower, number' : 'Your password'} maxLength={72} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined} />{fieldErrors.password && <small className="field-error" id="auth-password-error">{fieldErrors.password}</small>}</label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary auth-submit" type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')}</button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'New to Monetra?' : 'Already have an account?'}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
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
        <div className="brand-mark"><WalletCards size={20} /></div>
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

function Dashboard({ transactions, user, setPage, setModal }) {
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

  const monthlyData = useMemo(() => {
    const values = {}
    transactions.forEach((item) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) return
      const [year, monthNumber] = item.date.slice(0, 7).split('-')
      const monthKey = item.date.slice(0, 7)
      const month = new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
      values[monthKey] ||= { month, income: 0, expense: 0 }
      values[monthKey][item.type] += Number(item.amount)
    })
    return Object.keys(values).sort().slice(-6).map((key) => values[key])
  }, [transactions])

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
          <div className="panel-head"><div><span>CASH FLOW</span><h2>Monthly overview</h2></div><button>Last 6 months <ChevronDown size={15} /></button></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value}`} />
                <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
                <Bar dataKey="income" fill="#7c9a68" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill="#efb35f" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
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

function TransactionList({ transactions, compact = false, onDelete }) {
  if (!transactions.length) return <div className="empty-state">No transactions match your filters.</div>
  return (
    <div className={`transaction-list ${compact ? 'compact' : ''}`}>
      {transactions.map((item) => (
        <div className={`transaction-row ${compact ? 'compact-row' : ''}`} key={item._id || item.id}>
          <div className={`transaction-icon ${item.type}`}><ReceiptText size={18} /></div>
          <div className="transaction-main"><strong>{item.note || item.category}</strong><span>{item.category}</span></div>
          <div className="transaction-date">{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <strong className={`amount ${item.type}`}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</strong>
          {!compact && <button className="delete-button" aria-label={`Delete ${item.note}`} onClick={() => onDelete(item._id || item.id)}><Trash2 size={17} /></button>}
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
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (type !== 'all') params.set('type', type)
    if (category !== 'all') params.set('category', category)
    if (startDate) params.set('startDate', startDate)
    try {
      const token = localStorage.getItem(STORAGE.token)
      const response = await fetch(`${API_URL}/transactions/export/${format}?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error(`${format.toUpperCase()} export failed.`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ledgerly-transactions.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast(`${format.toUpperCase()} exported`)
    } catch (error) {
      toast(error.message || `${format.toUpperCase()} export failed.`)
    }
  }

  const allCategories = [...new Set(transactions.map((item) => item.category))]
  return (
    <div className="page">
      <header className="page-header"><div><p>LEDGER</p><h1>Transactions</h1></div><div className="header-actions"><button className="secondary" onClick={() => exportFile('csv')}><Download size={17} />CSV</button><button className="secondary" onClick={() => exportFile('pdf')}><Download size={17} />PDF</button><button className="primary" onClick={() => setModal(true)}><Plus size={18} />Add transaction</button></div></header>
      <section className="filters panel">
        <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{allCategories.map((item) => <option key={item}>{item}</option>)}</select>
        <input aria-label="From date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </section>
      <section className="panel transaction-panel"><TransactionList transactions={filtered} onDelete={deleteTransaction} /></section>
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
        data.budgets.forEach((item) => { mapped[item.category] = item.limit })
        setBudgets(mapped)
      })
      .catch((error) => toast(error.message || 'Could not load budgets.'))
  }, [toast])
  const setBudget = (category, value) => {
    const next = { ...budgets, [category]: Number(value) }
    setBudgets(next)
  }
  const saveBudgets = async () => {
    const invalid = Object.entries(budgets).find(([, limit]) =>
      limit === '' || !Number.isFinite(Number(limit)) || Number(limit) < 0 || Number(limit) > 1000000000,
    )
    if (invalid) {
      toast('Budget limits must be between 0 and 1,000,000,000.')
      return
    }
    try {
      await apiRequest('/budgets', {
        method: 'PUT',
        body: JSON.stringify({ budgets: Object.entries(budgets).map(([category, limit]) => ({ category, limit })) }),
      })
      toast('Budgets saved')
    } catch (error) {
      toast(error.message || 'Could not save budgets.')
    }
  }
  return (
    <div className="page">
      <header className="page-header"><div><p>PLANNING</p><h1>Monthly budgets</h1></div><button className="primary" onClick={saveBudgets}>Save budgets</button></header>
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
              <label>Monthly limit<div className="money-input"><span>₹</span><input type="number" min="0" max="1000000000" step="0.01" value={limit} onChange={(e) => setBudget(category, e.target.value)} /></div></label>
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

  return (
    <div className="page">
      <header className="page-header"><div><p>PREFERENCES</p><h1>Settings</h1></div></header>
      <section className="panel settings-panel">
        <div><span>Profile</span><div className="profile-edit"><input value={name} onChange={(e) => { const entered = e.target.value; const filtered = entered.replace(/[^\p{L} ]/gu, ''); setName(filtered); setProfileError(validateNameInput(entered)) }} onBlur={() => setProfileError(validateName(name) || '')} aria-label="Full name" maxLength={80} autoComplete="name" aria-invalid={Boolean(profileError)} /> <button className="theme-toggle" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button></div>{profileError && <small className="field-error">{profileError}</small>}<p>{user.email}</p></div>
        <div className="setting-row"><div><strong>Appearance</strong><span>Choose how Monetra looks on this device.</span></div><button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}{theme === 'light' ? 'Dark mode' : 'Light mode'}</button></div>
        <div className="setting-row"><div><strong>Cloud data</strong><span>Transactions and budgets are stored securely in MongoDB.</span></div><span className="status-pill">Connected</span></div>
      </section>
    </div>
  )
}

function TransactionModal({ close, addTransaction }) {
  const [form, setForm] = useState({ type: 'expense', category: 'Food', amount: '', date: todayIso, note: '' })
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      setError('Enter an amount greater than 0 and no more than 1,000,000,000.')
      return
    }
    if (!isValidDate(form.date)) {
      setError('Enter a valid date.')
      return
    }
    setError('')
    addTransaction({ ...form, id: Date.now(), amount: Number(form.amount) })
  }
  const changeType = (type) => setForm((current) => ({ ...current, type, category: categories[type][0] }))
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><p>NEW ENTRY</p><h2>Add transaction</h2></div><button onClick={close}><X size={20} /></button></div>
        <form onSubmit={submit}>
          <div className="type-toggle"><button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => changeType('expense')}>Expense</button><button type="button" className={form.type === 'income' ? 'active income' : ''} onClick={() => changeType('income')}>Income</button></div>
          <label>Amount<div className="amount-input"><span>₹</span><input autoFocus type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div></label>
          <div className="form-grid"><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories[form.type].map((item) => <option key={item}>{item}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>
          <label>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value.slice(0, 500) })} placeholder="What was this for?" maxLength={500} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary modal-submit" type="submit">Add transaction</button>
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
    }
  }

  if (!session) return <><AuthScreen onLogin={login} /><Toast message={toast} onDone={() => setToast('')} /></>

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} user={session} onLogout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-content">
        <button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><WalletCards size={20} /></button>
        {page === 'dashboard' && <Dashboard transactions={transactions} user={session} setPage={setPage} setModal={setModal} />}
        {page === 'transactions' && <TransactionsPage transactions={transactions} setTransactions={setTransactions} setModal={setModal} toast={setToast} />}
        {page === 'budgets' && <BudgetsPage transactions={transactions} toast={setToast} />}
        {page === 'settings' && <SettingsPage user={session} setUser={updateSessionUser} theme={theme} setTheme={setTheme} toast={setToast} />}
      </main>
      {modal && <TransactionModal close={() => setModal(false)} addTransaction={addTransaction} />}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

export default App
