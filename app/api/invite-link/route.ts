import { NextResponse } from 'next/server'

// Simple invite link generator — encodes role + expiry into a base64 token.
// No DB storage needed. Expiry = 7 days from creation.

export async function POST(request: Request) {
  const { role } = await request.json()

  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const payload = {
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    v: 1,
  }

  const token = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link = `${appUrl}/invite?t=${token}`

  return NextResponse.json({ link, role, expiresIn: '7 days' })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
    if (payload.exp < Date.now()) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 })
    }
    return NextResponse.json({ role: payload.role, valid: true })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
}
