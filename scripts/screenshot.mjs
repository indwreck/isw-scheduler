// Dev-only: screenshots the app at phone + desktop widths with Supabase mocked.
// Usage: node scripts/screenshot.mjs <route> <name> [--admin|--manager|--loggedout]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const [route = '/settings', name = 'shot', who = '--admin'] = process.argv.slice(2)
const OUT = process.env.SHOT_DIR ?? 'screenshots'
mkdirSync(OUT, { recursive: true })

const REF = 'ewkjxqzzpqneyxwocnbc'
const USER_ID = '11111111-1111-1111-1111-111111111111'

function fakeJwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: USER_ID,
    email: 'chuck3@indwreck.com',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`
}

const profile = {
  id: USER_ID,
  full_name: 'Chuck Cacioppo III',
  role: who === '--manager' ? 'manager' : 'admin',
  is_active: true,
  created_at: '2026-09-15T00:00:00Z',
}

const MOCK = {
  profiles: [
    profile,
    { id: '2', full_name: 'Danny', role: 'manager', is_active: true, created_at: '2026-09-15T01:00:00Z' },
    { id: '3', full_name: 'Alan', role: 'manager', is_active: false, created_at: '2026-09-15T02:00:00Z' },
  ],
  company_settings: [{ id: 1, work_days: [1, 2, 3, 4, 5], default_start_time: '07:00:00', default_end_time: '15:30:00', updated_at: '' }],
  holidays: [
    { id: 1, holiday_date: '2026-11-26', name: 'Thanksgiving' },
    { id: 2, holiday_date: '2026-12-25', name: 'Christmas' },
    { id: 3, holiday_date: '2026-07-03', name: 'Independence Day (observed)' },
  ],
  equipment_categories: ['Excavator', 'Skid Steer', 'Dozer', 'Truck', 'Trailer', 'Attachment', 'Crusher', 'Support Equipment']
    .map((n, i) => ({ id: i + 1, name: n, sort_order: i + 1, is_active: true })),
  personnel_roles: ['Operator', 'Laborer', 'Foreman', 'Superintendent', 'Truck Driver']
    .map((n, i) => ({ id: i + 1, name: n, sort_order: i + 1, is_active: i !== 4 })),
  projects: [], personnel: [], equipment: [], assignments: [], project_contacts: [], personnel_entries: [],
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })

for (const [tag, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await ctx.route(`https://${REF}.supabase.co/**`, async (r) => {
    const url = new URL(r.request().url())
    if (url.pathname.includes('/auth/v1/user')) return r.fulfill({ json: { id: USER_ID, email: 'chuck3@indwreck.com' } })
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0]
    if (table && MOCK[table]) {
      const single = /object/.test(r.request().headers()['accept'] ?? '')
      let rows = MOCK[table]
      // honor simple `col=eq.value` filters like PostgREST would
      for (const [k, v] of url.searchParams) {
        if (v.startsWith('eq.')) rows = rows.filter((row) => String(row[k]) === v.slice(3))
      }
      return r.fulfill({ json: single ? rows[0] : rows })
    }
    return r.fulfill({ status: 200, json: [] })
  })
  const page = await ctx.newPage()
  if (who !== '--loggedout') {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      `sb-${REF}-auth-token`,
      JSON.stringify({
        access_token: fakeJwt(), refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: USER_ID, email: 'chuck3@indwreck.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
      }),
    ])
  }
  await page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}-${tag}.png`, fullPage: true })
  await ctx.close()
}
await browser.close()
console.log('screenshots written to', OUT)
