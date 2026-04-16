import { supabase } from '@/lib/supabase/client'
import type { Project } from '@/types'

export const projectService = {
  /** Fetch all projects accessible to a user (owned + member) */
  async getMemberProjectIds(userId: string) {
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      supabase.from('project_members').select('project_id').eq('user_id', userId),
      supabase.from('projects').select('id').eq('created_by', userId),
    ])
    return Array.from(new Set([
      ...(memberships ?? []).map((m: any) => m.project_id as string),
      ...(owned       ?? []).map((p: any) => p.id          as string),
    ]))
  },

  async getByIds(ids: string[]) {
    return supabase
      .from('projects')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: true })
  },

  async create(payload: {
    name: string
    key: string
    description?: string | null
    avatar_color: string
    created_by: string
  }) {
    return supabase.from('projects').insert(payload).select().single()
  },

  async update(id: string, payload: Partial<Pick<Project, 'name' | 'description' | 'avatar_color'>>) {
    return supabase.from('projects').update(payload).eq('id', id).select().single()
  },

  async delete(id: string) {
    // Cascade: delete child records first (in case DB doesn't have ON DELETE CASCADE set)
    await supabase.from('bugs').delete().eq('project_id', id)
    await supabase.from('features').delete().eq('project_id', id)
    await supabase.from('sprints').delete().eq('project_id', id)
    await supabase.from('project_members').delete().eq('project_id', id)
    return supabase.from('projects').delete().eq('id', id)
  },

  // ── Project members ──────────────────────────────────────────
  async addMember(projectId: string, userId: string, role: 'admin' | 'member' = 'admin', invitedBy?: string | null) {
    return supabase
      .from('project_members')
      .upsert(
        { project_id: projectId, user_id: userId, role, invited_by: invitedBy ?? null },
        { onConflict: 'project_id,user_id' }
      )
  },

  async getMembers(projectId: string) {
    return supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
  },

  async removeMember(projectId: string, userId: string) {
    return supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
  },

  async updateMemberRole(projectId: string, userId: string, role: 'admin' | 'member') {
    return supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)
  },

  /** Admin-only: all members across all projects */
  async getAllMembers() {
    return supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: true })
  },

  /** Admin-only: all projects (id + name) */
  async getAllProjectNames() {
    return supabase.from('projects').select('id, name')
  },
}
