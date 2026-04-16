import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const { email, role, project_id, invited_by, origin } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── 1. Generate a project invite token (reliable, no email required) ──
  const appUrl    = origin || process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from('invite_tokens')
    .insert({ project_id, role, created_by: invited_by, expires_at: expiresAt })
    .select('token')
    .single()

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: tokenErr?.message ?? 'Failed to create invite token' }, { status: 500 })
  }

  const inviteUrl = `${appUrl}/join/project/${tokenRow.token}`

  // ── 2. Fetch project name + role label (needed for both notification and email) ──
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('name, key')
    .eq('id', project_id)
    .single()

  const projectName = project?.name ?? 'a project'
  const roleLabel   = role === 'admin' ? 'Admin' : 'Member'

  // ── 3. If user already exists, send them an in-app invite notification ──
  //    Do NOT add to project_members yet — they must accept first.
  //    Use the GoTrue admin REST endpoint with email filter (more reliable than listUsers).
  let userId: string | null = null
  let emailSent = false
  let notificationSent = false

  try {
    // listUsers fetches up to 1000 users per page; filter client-side by email
    const { data: page1 } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingUser = page1?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    ) ?? null

    if (existingUser) {
      userId = existingUser.id

      // Ensure profile exists
      await supabaseAdmin.from('profiles').upsert(
        { id: userId, name: email.split('@')[0], role: 'member' },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      // Get inviter name
      const { data: inviterProfile } = invited_by
        ? await supabaseAdmin.from('profiles').select('name').eq('id', invited_by).single()
        : { data: null }

      // Send in-app notification
      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        user_id:    userId,
        type:       'invite_received',
        title:      `You've been invited to ${projectName}`,
        body:       `${inviterProfile?.name ?? 'Someone'} invited you to join as ${roleLabel}.`,
        read:       false,
        data: {
          token:           tokenRow.token,
          project_id,
          project_name:    projectName,
          role,
          invited_by_name: inviterProfile?.name ?? null,
        },
      })

      if (notifErr) {
        console.error('[invite] notification insert failed:', notifErr.message)
      } else {
        notificationSent = true
      }
    }
  } catch (err) {
    console.error('[invite] user lookup failed:', err)
  }

  // ── 4. Send invite email ──────────────────────────────────────────────────

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#F4F5F7; margin:0; padding:40px 20px;">
  <div style="max-width:480px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; border:1px solid #DFE1E6; box-shadow:0 4px 12px rgba(9,30,66,0.1);">
    <div style="background:#0052CC; padding:24px 32px;">
      <span style="color:white; font-size:20px; font-weight:900; letter-spacing:-0.5px;">sethu</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px; font-size:20px; font-weight:800; color:#172B4D;">You're invited to join ${projectName}</h2>
      <p style="margin:0 0 24px; color:#5E6C84; font-size:14px; line-height:1.6;">
        You've been invited to collaborate on <strong>${projectName}</strong> as a <strong>${roleLabel}</strong>.
        Click the button below to accept and get access.
      </p>
      <a href="${inviteUrl}"
        style="display:inline-block; background:#0052CC; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px;">
        Accept invite →
      </a>
      <p style="margin:24px 0 0; font-size:12px; color:#97A0AF; line-height:1.6;">
        Or copy this link:<br/>
        <a href="${inviteUrl}" style="color:#0052CC; word-break:break-all;">${inviteUrl}</a>
      </p>
      <p style="margin:16px 0 0; font-size:11px; color:#B3BAC5;">
        This invite expires in 7 days. If you didn't expect this email, you can ignore it.
      </p>
    </div>
  </div>
</body>
</html>`

  // Try Resend first (reliable)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error: sendErr } = await resend.emails.send({
        from:    'sethu <onboarding@resend.dev>',
        to:      [email],
        subject: `You've been invited to join ${projectName} on sethu`,
        html:    emailHtml,
      })
      if (!sendErr) emailSent = true
    } catch { /* fall through */ }
  }

  // Fall back to Supabase invite (works if Resend not configured or fails)
  if (!emailSent) {
    try {
      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data:       { role: 'member', invite_role: role, project_id },
        redirectTo: `${appUrl}/api/auth/callback?next=/dashboard`,
      })
      if (!inviteErr || inviteErr.message.includes('already')) emailSent = true
    } catch { /* not fatal */ }
  }

  return NextResponse.json({ inviteUrl, emailSent, userId, notificationSent })
}
