import {
  Area,
  AreaChart,
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
import {
  Bike,
  CalendarDays,
  Clock3,
  Download,
  Fuel,
  Goal,
  Image,
  Plus,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'

type DailyLog = {
  id: number
  category: string
  date: string
  start: string
  end: string
  hours: number
  grabFood: number
  expressBike: number
  expressShop: number
  distance: number
  income: number
  rating?: number
  acceptance?: number
  note?: string
  proofName?: string
  proofUrl?: string
  proofStatus?: 'local' | 'uploaded'
}

type Expense = {
  date: string
  fuel: number
  food: number
  drinks: number
  repair: number
  phone: number
  depreciation: number
  insurance: number
  other: number
}

const initialLogs: DailyLog[] = [
  {
    id: 1,
    category: 'รายได้ Grab',
    date: '2026-06-14',
    start: '16:43',
    end: '22:53',
    hours: 6.2,
    grabFood: 0,
    expressBike: 11,
    expressShop: 0,
    distance: 0,
    income: 379,
    rating: 4.98,
    acceptance: 96,
    note: 'ข้อมูลตั้งต้นจาก Google Sheet',
  },
]

const initialExpenses: Expense[] = [
  {
    date: '2026-06-14',
    fuel: 0,
    food: 0,
    drinks: 0,
    repair: 0,
    phone: 0,
    depreciation: 50,
    insurance: 30,
    other: 0,
  },
]

const target = {
  income: 800,
  jobs: 22,
}

const categories = [
  'รายได้ Grab',
  'ค่าน้ำมัน',
  'ค่าอาหาร',
  'น้ำ/เครื่องดื่ม',
  'ค่าซ่อมรถ',
  'ค่าโทร/เน็ต',
  'อื่น ๆ',
]

const mobileTabs = [
  { id: 'entry', label: 'บันทึก' },
  { id: 'summary', label: 'สรุป' },
  { id: 'charts', label: 'กราฟ' },
  { id: 'logs', label: 'รายการ' },
  { id: 'settings', label: 'ตั้งค่า' },
] as const

type MobileTab = (typeof mobileTabs)[number]['id']

const defaultUploadEndpoint =
  (import.meta.env.VITE_UPLOAD_ENDPOINT as string | undefined) ||
  'https://script.google.com/macros/s/AKfycby9K_FlqAa84tP0v8HWVOJNcycJLAwPD7bkol3cq5m25xziky4qGfe97DL4AHvJENyn/exec'

const peakHours = [
  { name: 'เช้า', time: '06:00-10:00', value: 42, hint: 'ช่วงไปทำงาน' },
  { name: 'กลางวัน', time: '10:00-14:00', value: 28, hint: 'พักและเติมพลัง' },
  { name: 'เย็น', time: '14:00-18:00', value: 74, hint: 'เริ่มเร่งงาน' },
  { name: 'ค่ำ', time: '18:00-22:00', value: 92, hint: 'Prime Time' },
  { name: 'ดึก', time: '22:00-02:00', value: 51, hint: 'เลือกพื้นที่' },
]

const currency = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 0,
})

const decimal = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 2,
})

function formatBaht(value: number) {
  return `${currency.format(value)} ฿`
}

function expenseTotal(expense: Expense) {
  return (
    expense.fuel +
    expense.food +
    expense.drinks +
    expense.repair +
    expense.phone +
    expense.depreciation +
    expense.insurance +
    expense.other
  )
}

function jobsTotal(log: DailyLog) {
  return log.grabFood + log.expressBike + log.expressShop
}

function toThaiDate(date: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function isDateInRange(dateStr: string, range: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  const dateMs = date.getTime()
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  
  if (range === 'วันนี้') {
    return dateMs === today
  }
  
  if (range === 'สัปดาห์นี้') {
    const nowDay = now.getDay()
    const diff = now.getDate() - nowDay + (nowDay === 0 ? -6 : 1)
    const monday = new Date(now.getFullYear(), now.getMonth(), diff).getTime()
    return dateMs >= monday
  }
  
  if (range === 'เดือนนี้') {
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return dateMs >= firstDayOfMonth
  }
  
  return true
}

function getCurrentTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function App() {
  const [logs, setLogs] = useState(initialLogs)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [query, setQuery] = useState('')
  const [range, setRange] = useState('เดือนนี้')
  const [activeTab, setActiveTab] = useState<MobileTab>('entry')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofInputKey, setProofInputKey] = useState(0)
  const [proofPreview, setProofPreview] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadEndpoint, setUploadEndpoint] = useState(() => {
    return localStorage.getItem('grabUploadEndpoint') || defaultUploadEndpoint || ''
  })
  const [syncToken, setSyncToken] = useState(() => localStorage.getItem('grabSyncToken') || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [form, setForm] = useState({
    category: 'รายได้ Grab',
    date: '2026-06-15',
    start: '16:00',
    end: '22:00',
    grabFood: '0',
    expressBike: '8',
    expressShop: '0',
    income: '420',
    fuel: '120',
  })

  function adjustCounter(field: 'grabFood' | 'expressBike' | 'expressShop', amount: number) {
    setForm((current) => {
      const val = parseInt(current[field], 10) || 0
      const nextVal = Math.max(val + amount, 0)
      return {
        ...current,
        [field]: String(nextVal),
      }
    })
  }

  const expenseLabel = useMemo(() => {
    if (form.category === 'รายได้ Grab' || form.category === 'ค่าน้ำมัน') return 'ค่าน้ำมัน (บาท)'
    if (form.category === 'ค่าอาหาร') return 'ค่าอาหาร (บาท)'
    if (form.category === 'น้ำ/เครื่องดื่ม') return 'ค่าน้ำ/เครื่องดื่ม (บาท)'
    if (form.category === 'ค่าซ่อมรถ') return 'ค่าซ่อมรถ (บาท)'
    if (form.category === 'ค่าโทร/เน็ต') return 'ค่าโทร/ค่าเน็ต (บาท)'
    return 'ค่าใช้จ่ายอื่น ๆ (บาท)'
  }, [form.category])

  async function fetchSheetData() {
    if (!uploadEndpoint) return
    setIsSyncing(true)
    setUploadStatus('กำลังดึงข้อมูลจาก Google Sheets...')
    try {
      const url = `${uploadEndpoint}?token=${encodeURIComponent(syncToken)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('ดึงข้อมูลจาก Sheet ไม่สำเร็จ')
      
      const payload = (await response.json()) as {
        ok?: boolean
        logs?: DailyLog[]
        expenses?: Expense[]
        error?: string
      }
      
      if (payload.ok === false) {
        throw new Error(payload.error || 'ดึงข้อมูลไม่สำเร็จ')
      }
      
      if (payload.logs) {
        const mappedLogs = payload.logs.map((log: any) => ({
          ...log,
          grabFood: Number(log.grabFood || 0),
          expressBike: Number(log.expressBike || 0),
          expressShop: Number(log.expressShop || 0),
          hours: Number(log.hours || 0),
          income: Number(log.income || 0),
        }))
        setLogs(mappedLogs)
      }
      
      if (payload.expenses) {
        const mappedExpenses = payload.expenses.map((exp: any) => ({
          ...exp,
          fuel: Number(exp.fuel || 0),
          food: Number(exp.food || 0),
          drinks: Number(exp.drinks || 0),
          repair: Number(exp.repair || 0),
          phone: Number(exp.phone || 0),
          depreciation: Number(exp.depreciation || 0),
          insurance: Number(exp.insurance || 0),
          other: Number(exp.other || 0),
        }))
        setExpenses(mappedExpenses)
      }
      
      setUploadStatus('ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จ')
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'ซิงก์ข้อมูลผิดพลาด')
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (uploadEndpoint) {
      fetchSheetData()
    }
  }, [uploadEndpoint])

  const dateFilteredLogs = useMemo(() => {
    return logs.filter((log) => isDateInRange(log.date, range))
  }, [logs, range])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => isDateInRange(exp.date, range))
  }, [expenses, range])

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return dateFilteredLogs.filter((log) => {
      if (!normalized) return true
      return [toThaiDate(log.date), log.note ?? '', log.start, log.end]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [dateFilteredLogs, query])

  const summary = useMemo(() => {
    const income = dateFilteredLogs.reduce((sum, log) => sum + log.income, 0)
    const hours = dateFilteredLogs.reduce((sum, log) => sum + log.hours, 0)
    const jobs = dateFilteredLogs.reduce((sum, log) => sum + jobsTotal(log), 0)
    const expense = filteredExpenses.reduce((sum, item) => sum + expenseTotal(item), 0)
    return {
      income,
      hours,
      jobs,
      expense,
      profit: income - expense,
      incomePerHour: hours > 0 ? income / hours : 0,
      profitPerHour: hours > 0 ? (income - expense) / hours : 0,
      targetPercent: target.income > 0 ? Math.min((income / target.income) * 100, 100) : 0,
    }
  }, [filteredExpenses, dateFilteredLogs])

  const chartData = useMemo(() => {
    const dailyData: { [date: string]: { income: number; jobs: number; cost: number } } = {}
    
    dateFilteredLogs.forEach((log) => {
      if (!dailyData[log.date]) {
        dailyData[log.date] = { income: 0, jobs: 0, cost: 0 }
      }
      dailyData[log.date].income += log.income
      dailyData[log.date].jobs += jobsTotal(log)
    })
    
    filteredExpenses.forEach((exp) => {
      if (!dailyData[exp.date]) {
        dailyData[exp.date] = { income: 0, jobs: 0, cost: 0 }
      }
      dailyData[exp.date].cost += expenseTotal(exp)
    })
    
    return Object.keys(dailyData)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date: toThaiDate(date),
        income: dailyData[date].income,
        profit: dailyData[date].income - dailyData[date].cost,
        jobs: dailyData[date].jobs,
      }))
  }, [filteredExpenses, dateFilteredLogs])

  const jobBreakdown = useMemo(
    () => [
      {
        name: 'GrabFood',
        value: dateFilteredLogs.reduce((sum, log) => sum + log.grabFood, 0),
        color: '#16a34a',
      },
      {
        name: 'Express Bike',
        value: dateFilteredLogs.reduce((sum, log) => sum + log.expressBike, 0),
        color: '#2563eb',
      },
      {
        name: 'Express Shop',
        value: dateFilteredLogs.reduce((sum, log) => sum + log.expressShop, 0),
        color: '#f59e0b',
      },
    ],
    [dateFilteredLogs],
  )

  function selectProof(file: File | null) {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview)
    }

    if (!file) {
      setProofFile(null)
      setProofPreview('')
      setUploadStatus('')
      setProofInputKey((current) => current + 1)
      return
    }

    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
    setUploadStatus(uploadEndpoint ? 'พร้อมอัปโหลดขึ้น Drive ตอนบันทึก' : 'พร้อมแนบในรายการ รอตั้งค่า Google Drive sync')
  }

  async function syncEntryToSheet(file: File | null) {
    if (!uploadEndpoint) {
      return {
        url: proofPreview,
        status: 'local' as const,
      }
    }

    let imageBase64 = ''
    let fileName = ''
    let mimeType = ''

    if (file) {
      imageBase64 = await fileToBase64(file)
      fileName = file.name
      mimeType = file.type
    }

    const isGrab = form.category === 'รายได้ Grab'
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        fileName,
        mimeType,
        imageBase64,
        token: syncToken,
        category: form.category,
        date: form.date,
        start: isGrab ? form.start : '',
        end: isGrab ? form.end : '',
        grabFood: isGrab ? Number(form.grabFood) : 0,
        expressBike: isGrab ? Number(form.expressBike) : 0,
        expressShop: isGrab ? Number(form.expressShop) : 0,
        income: isGrab ? Number(form.income) : 0,
        fuel: Number(form.fuel),
      }),
    })

    if (!response.ok) {
      throw new Error(file ? 'อัปโหลดรูปและบันทึกไม่สำเร็จ' : 'บันทึกข้อมูลไม่สำเร็จ')
    }

    const payload = (await response.json()) as { ok?: boolean; fileUrl?: string; error?: string }
    if (payload.ok === false) {
      throw new Error(payload.error || 'บันทึกข้อมูลไม่สำเร็จ')
    }

    return {
      url: payload.fileUrl || (file ? proofPreview : ''),
      status: payload.fileUrl ? ('uploaded' as const) : ('local' as const),
    }
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setUploadStatus(uploadEndpoint ? 'กำลังส่งข้อมูล...' : 'กำลังบันทึกข้อมูลชั่วคราว...')
    
    const isGrab = form.category === 'รายได้ Grab'
    const startHour = Number(form.start.split(':')[0]) + Number(form.start.split(':')[1]) / 60
    const endHour = Number(form.end.split(':')[0]) + Number(form.end.split(':')[1]) / 60
    const hours = isGrab ? Math.max(endHour - startHour, 0) : 0
    let result: Awaited<ReturnType<typeof syncEntryToSheet>> | null = null

    try {
      result = await syncEntryToSheet(proofFile)
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ')
      setIsSaving(false)
      return
    }

    const nextLog: DailyLog = {
      id: Date.now(),
      category: form.category,
      date: form.date,
      start: isGrab ? form.start : '',
      end: isGrab ? form.end : '',
      hours: Number(hours.toFixed(1)),
      grabFood: isGrab ? Number(form.grabFood) : 0,
      expressBike: isGrab ? Number(form.expressBike) : 0,
      expressShop: isGrab ? Number(form.expressShop) : 0,
      distance: 0,
      income: isGrab ? Number(form.income) : 0,
      rating: isGrab ? 4.98 : undefined,
      acceptance: isGrab ? 96 : undefined,
      note: result?.url ? `${form.category} พร้อมหลักฐานรูป` : form.category,
      proofName: proofFile?.name,
      proofUrl: result?.url || undefined,
      proofStatus: result?.status || undefined,
    }

    const nextExpense: Expense = {
      date: form.date,
      fuel: Number(form.fuel),
      food: 0,
      drinks: 0,
      repair: 0,
      phone: 0,
      depreciation: 50,
      insurance: 30,
      other: 0,
    }

    // Set correct expense based on category
    if (form.category === 'ค่าอาหาร') {
      nextExpense.food = Number(form.fuel)
      nextExpense.fuel = 0
    } else if (form.category === 'น้ำ/เครื่องดื่ม') {
      nextExpense.drinks = Number(form.fuel)
      nextExpense.fuel = 0
    } else if (form.category === 'ค่าซ่อมรถ') {
      nextExpense.repair = Number(form.fuel)
      nextExpense.fuel = 0
    } else if (form.category === 'ค่าโทร/เน็ต') {
      nextExpense.phone = Number(form.fuel)
      nextExpense.fuel = 0
    } else if (form.category === 'อื่น ๆ') {
      nextExpense.other = Number(form.fuel)
      nextExpense.fuel = 0
    } else if (form.category === 'รายได้ Grab') {
      // Keep nextExpense.fuel as fuel
    } else {
      nextExpense.fuel = 0
    }

    setLogs((current) => [nextLog, ...current])
    
    if (Number(form.fuel) > 0) {
      setExpenses((current) => [nextExpense, ...current])
    }

    setUploadStatus(
      result?.status === 'uploaded'
        ? 'บันทึกสำเร็จและซิงก์เข้า Google Sheets เรียบร้อย'
        : uploadEndpoint
        ? 'บันทึกสำเร็จและซิงก์ข้อมูลแล้ว'
        : 'บันทึกแล้ว (แสดงผลชั่วคราว รอตั้งค่า URL ซิงก์)'
    )
    setProofFile(null)
    setProofPreview('')
    setProofInputKey((current) => current + 1)
    setIsSaving(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Bike size={23} strokeWidth={2.4} />
          </span>
          <div>
            <h1>ROMEO Grab Driver Tracker</h1>
            <p>ติดตามรายรับ รายจ่าย เป้าหมาย และประสิทธิภาพการขับ</p>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="select-control">
            <CalendarDays size={17} />
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option>วันนี้</option>
              <option>สัปดาห์นี้</option>
              <option>เดือนนี้</option>
              <option>ทั้งหมด</option>
            </select>
          </label>
          <button className="ghost-button" type="button" onClick={fetchSheetData} disabled={isSyncing}>
            <RefreshCw size={17} className={isSyncing ? 'spin-icon' : ''} />
            {isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ชีต'}
          </button>
          <button className="primary-button" type="button">
            <Plus size={18} />
            บันทึกวันนี้
          </button>
        </div>
      </header>

      <nav className="mobile-tabs" aria-label="เมนูหลักบนมือถือ">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={`metric-grid mobile-tab-panel ${activeTab === 'summary' ? 'is-active' : ''}`} aria-label="สรุปผลรวม">
        <MetricCard icon={<Wallet size={20} />} label="รายได้รวม" value={formatBaht(summary.income)} trend="+ จากชีตล่าสุด" />
        <MetricCard icon={<Bike size={20} />} label="งานทั้งหมด" value={currency.format(summary.jobs)} trend={`${decimal.format(summary.jobs / Math.max(logs.length, 1))} งาน/วัน`} />
        <MetricCard icon={<Clock3 size={20} />} label="ชั่วโมงออนไลน์" value={decimal.format(summary.hours)} trend={`${formatBaht(summary.incomePerHour)}/ชั่วโมง`} />
        <MetricCard icon={<TrendingUp size={20} />} label="กำไรสุทธิ" value={formatBaht(summary.profit)} trend={`${formatBaht(summary.profitPerHour)}/ชั่วโมง`} />
        <MetricCard icon={<Goal size={20} />} label="เป้ารายได้" value={`${Math.round(summary.targetPercent)}%`} trend={`เป้า ${formatBaht(target.income)}`} />
      </section>

      <section className="workspace">
        <div className="main-column">
          <section className={`panel revenue-panel mobile-tab-panel ${activeTab === 'charts' ? 'is-active' : ''}`}>
            <div className="panel-heading">
              <div>
                <h2>ภาพรวมรายได้และกำไร</h2>
                <p>ข้อมูลจากแท็บ Dashboard, บันทึกรายวัน และสรุปกำไร</p>
              </div>
              <button className="icon-button" type="button" aria-label="ดาวน์โหลดรายงาน">
                <Download size={18} />
              </button>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e8edf3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#667085', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#667085', fontSize: 12 }} width={42} />
                  <Tooltip formatter={(value) => formatBaht(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #d9e2ec' }} />
                  <Area type="monotone" dataKey="income" name="รายได้" stroke="#16a34a" strokeWidth={3} fill="url(#incomeFill)" />
                  <Area type="monotone" dataKey="profit" name="กำไร" stroke="#2563eb" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className={`split-grid mobile-tab-panel ${activeTab === 'charts' ? 'is-active' : ''}`}>
            <section className="panel">
              <div className="panel-heading compact">
                <div>
                  <h2>ประเภทงาน</h2>
                  <p>สัดส่วนงานทั้งหมด</p>
                </div>
              </div>
              <div className="donut-row">
                <ResponsiveContainer width="48%" height={190}>
                  <PieChart>
                    <Pie data={jobBreakdown} innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={4}>
                      {jobBreakdown.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend-list">
                  {jobBreakdown.map((item) => (
                    <div className="legend-item" key={item.name}>
                      <span style={{ background: item.color }} />
                      <p>{item.name}</p>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading compact">
                <div>
                  <h2>ช่วงเวลาน่าขับ</h2>
                  <p>จัดลำดับตามโอกาสทำรายได้</p>
                </div>
              </div>
              <div className="bar-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours} layout="vertical" margin={{ left: 4, right: 8, top: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#edf1f5" horizontal={false} />
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={72} tick={{ fill: '#344054', fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="peak-note">แนะนำ: เริ่มเก็บงานต่อเนื่องช่วง 18:00-22:00 และลดเวลาว่างช่วงกลางวัน</div>
            </section>
          </div>

          <section className={`panel table-panel mobile-tab-panel ${activeTab === 'logs' ? 'is-active' : ''}`}>
            <div className="panel-heading">
              <div>
                <h2>บันทึกรายวัน</h2>
                <p>เพิ่มข้อมูลแล้วตัวเลขด้านบนจะคำนวณใหม่ทันที</p>
              </div>
              <label className="search-box">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาวันหรือหมายเหตุ" />
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>เวลา</th>
                    <th>ชั่วโมง</th>
                    <th>งาน</th>
                    <th>รายได้</th>
                    <th>รายได้/ชม.</th>
                    <th>Rating</th>
                    <th>หลักฐาน</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{toThaiDate(log.date)}</td>
                      <td>{log.start}-{log.end}</td>
                      <td>{decimal.format(log.hours)}</td>
                      <td>{jobsTotal(log)}</td>
                      <td>{formatBaht(log.income)}</td>
                      <td>{formatBaht(log.income / Math.max(log.hours, 1))}</td>
                      <td>
                        <span className="rating">
                          <Star size={14} fill="currentColor" />
                          {log.rating ?? '-'}
                        </span>
                      </td>
                      <td>
                        {log.proofUrl ? (
                          <a className="proof-link" href={log.proofUrl} target="_blank" rel="noreferrer">
                            <Image size={14} />
                            {log.proofStatus === 'uploaded' ? 'Drive' : 'รูปแนบ'}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{log.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className={`panel quick-entry mobile-tab-panel ${activeTab === 'entry' ? 'is-active' : ''}`}>
            <div className="panel-heading compact">
              <div>
                <h2>บันทึกด่วน</h2>
                <p>เพิ่มรายการทดสอบในหน้าเว็บ</p>
              </div>
            </div>
            <form onSubmit={addEntry}>
              <label>
                ประเภทรายการ
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <span className="field-hint">ใช้แยกรูปหลักฐานและลงช่องรายจ่ายในชีตให้ถูกหมวด</span>
              </label>
              <label>
                วันที่
                <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </label>
              {form.category === 'รายได้ Grab' && (
                <>
                  <div className="field-pair">
                    <label>
                      เริ่มออนไลน์
                      <div className="time-input-wrap">
                        <input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} />
                        <button className="time-now-btn" type="button" onClick={() => setForm({ ...form, start: getCurrentTime() })}>ตอนนี้</button>
                      </div>
                    </label>
                    <label>
                      เลิกออนไลน์
                      <div className="time-input-wrap">
                        <input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} />
                        <button className="time-now-btn" type="button" onClick={() => setForm({ ...form, end: getCurrentTime() })}>ตอนนี้</button>
                      </div>
                    </label>
                  </div>
                  <div className="field-pair">
                    <label>
                      GrabFood
                      <div className="counter-input-wrap">
                        <button type="button" onClick={() => adjustCounter('grabFood', -1)}>-</button>
                        <input value={form.grabFood} onChange={(event) => setForm({ ...form, grabFood: event.target.value })} inputMode="numeric" />
                        <button type="button" onClick={() => adjustCounter('grabFood', 1)}>+</button>
                      </div>
                    </label>
                    <label>
                      Express Bike
                      <div className="counter-input-wrap">
                        <button type="button" onClick={() => adjustCounter('expressBike', -1)}>-</button>
                        <input value={form.expressBike} onChange={(event) => setForm({ ...form, expressBike: event.target.value })} inputMode="numeric" />
                        <button type="button" onClick={() => adjustCounter('expressBike', 1)}>+</button>
                      </div>
                    </label>
                  </div>
                  <label>
                    Express Shop
                    <div className="counter-input-wrap">
                      <button type="button" onClick={() => adjustCounter('expressShop', -1)}>-</button>
                      <input value={form.expressShop} onChange={(event) => setForm({ ...form, expressShop: event.target.value })} inputMode="numeric" />
                      <button type="button" onClick={() => adjustCounter('expressShop', 1)}>+</button>
                    </div>
                  </label>
                  <label>
                    รายได้รวม
                    <input value={form.income} onChange={(event) => setForm({ ...form, income: event.target.value })} inputMode="decimal" />
                  </label>
                </>
              )}
              <label>
                {expenseLabel}
                <input value={form.fuel} onChange={(event) => setForm({ ...form, fuel: event.target.value })} inputMode="decimal" />
              </label>
              <div className="proof-uploader">
                <div className="proof-heading">
                  <Upload size={18} />
                  <span>รูปหลักฐาน</span>
                </div>
                <input
                  key={proofInputKey}
                  className="proof-native-input"
                  type="file"
                  accept="image/*"
                  onClick={(event) => {
                    event.currentTarget.value = ''
                  }}
                  onChange={(event) => selectProof(event.target.files?.[0] ?? null)}
                />
                <span className="field-hint">
                  {proofFile ? `เลือกแล้ว: ${proofFile.name}` : 'แตะช่องเลือกไฟล์ แล้วเลือก ถ่ายรูป หรือ คลังรูปภาพ'}
                </span>
                {proofPreview ? (
                  <div className="proof-preview">
                    <img src={proofPreview} alt="ตัวอย่างรูปหลักฐาน" />
                    <button type="button" onClick={() => selectProof(null)} aria-label="ลบรูปหลักฐาน">
                      <X size={16} />
                    </button>
                  </div>
                ) : null}
                {uploadStatus ? <p className="upload-status">{uploadStatus}</p> : null}
              </div>
              <button className="primary-button full" type="submit" disabled={isSaving}>
                <Plus size={18} />
                {isSaving ? 'กำลังบันทึก...' : 'เพิ่มบันทึก'}
              </button>
            </form>
          </section>

          <section className={`panel target-panel mobile-tab-panel ${activeTab === 'summary' ? 'is-active' : ''}`}>
            <div className="target-ring" style={{ '--progress': `${summary.targetPercent}%` } as CSSProperties}>
              <span>{Math.round(summary.targetPercent)}%</span>
            </div>
            <div>
              <h2>สถานะเป้าหมาย</h2>
              <p>รายได้ {formatBaht(summary.income)} จากเป้า {formatBaht(target.income)}</p>
            </div>
            <div className="target-list">
              <div>
                <span>เป้างาน</span>
                <strong>{target.jobs} งาน</strong>
              </div>
              <div>
                <span>ทำแล้ว</span>
                <strong>{summary.jobs} งาน</strong>
              </div>
            </div>
          </section>

          <section className={`panel cost-panel mobile-tab-panel ${activeTab === 'settings' ? 'is-active' : ''}`}>
            <div className="panel-heading compact">
              <div>
                <h2>ตั้งค่าและรายจ่าย</h2>
                <p>ตั้งค่าการซิงก์และดูต้นทุนคงที่จากชีต</p>
              </div>
              <Fuel size={19} />
            </div>
            <div className="settings-form">
              <label>
                URL ซิงก์ Drive/Sheet
                <input
                  value={uploadEndpoint}
                  onChange={(event) => {
                    const value = event.target.value.trim()
                    setUploadEndpoint(value)
                    if (value) {
                      localStorage.setItem('grabUploadEndpoint', value)
                    } else {
                      localStorage.removeItem('grabUploadEndpoint')
                    }
                  }}
                  placeholder="วาง URL จาก Google Apps Script"
                />
              </label>
              <label>
                PIN ซิงก์
                <input
                  value={syncToken}
                  onChange={(event) => {
                    const value = event.target.value.trim()
                    setSyncToken(value)
                    if (value) {
                      localStorage.setItem('grabSyncToken', value)
                    } else {
                      localStorage.removeItem('grabSyncToken')
                    }
                  }}
                  placeholder="ตั้งเมื่อเปิดใช้ token ใน Apps Script"
                  inputMode="numeric"
                />
                <span className="field-hint">ไม่ต้องกรอก ถ้ายังไม่ได้ตั้ง WEBHOOK_TOKEN ใน Apps Script</span>
              </label>
            </div>
            <CostRow label="ค่าเสื่อมรถ/วัน" value={50} />
            <CostRow label="ประกัน/วัน" value={30} />
            <CostRow label="รายจ่ายรวม" value={summary.expense} strong />
          </section>
        </aside>
      </section>
    </main>
  )
}

function MetricCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend: string
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{trend}</span>
      </div>
    </article>
  )
}

function CostRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? 'cost-row strong' : 'cost-row'}>
      <span>{label}</span>
      <strong>{formatBaht(value)}</strong>
    </div>
  )
}

export default App
