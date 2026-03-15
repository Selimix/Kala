import { supabase } from './supabase';
import type {
  Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority,
  TaskCategory, CreateTaskCategoryInput,
} from '../types/tasks';

// Selection enrichie avec createur + categorie
const ENRICHED_SELECT = '*, creator:profiles!created_by(display_name), category:task_categories(*)';

/**
 * Masque les details d'une tache privee si le viewer n'est pas le createur.
 */
export function applyPrivacyMask(task: Task, currentUserId: string): Task {
  if (task.is_private && task.created_by !== currentUserId) {
    return { ...task, title: 'Tâche privée', description: null };
  }
  return task;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || '';
}

export async function getTasks(calendarId?: string, filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(ENRICHED_SELECT)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;
  if (error) throw error;
  const uid = await getCurrentUserId();
  return (data || []).map(t => applyPrivacyMask(t, uid));
}

export async function getTasksForDate(date: string, calendarId?: string): Promise<Task[]> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  let query = supabase
    .from('tasks')
    .select(ENRICHED_SELECT)
    .gte('due_date', startOfDay)
    .lte('due_date', endOfDay)
    .neq('status', 'completed')
    .order('priority', { ascending: false });

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const uid = await getCurrentUserId();
  return (data || []).map(t => applyPrivacyMask(t, uid));
}

export async function getPendingTasks(calendarId?: string): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(ENRICHED_SELECT)
    .in('status', ['pending', 'in_progress'])
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const uid = await getCurrentUserId();
  return (data || []).map(t => applyPrivacyMask(t, uid));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');

  // Si categorie fournie mais is_private non precise, heriter du default
  let isPrivate = input.is_private ?? false;
  if (input.category_id && input.is_private === undefined) {
    const { data: cat } = await supabase
      .from('task_categories')
      .select('is_private_by_default')
      .eq('id', input.category_id)
      .single();
    if (cat) isPrivate = cat.is_private_by_default;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      created_by: user.id,
      calendar_id: input.calendar_id || null,
      title: input.title,
      description: input.description || null,
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      category_id: input.category_id || null,
      is_private: isPrivate,
    })
    .select(ENRICHED_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Si on marque comme complete, ajouter completed_at
  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  // Si on decomplet, retirer completed_at
  if (updates.status && updates.status !== 'completed') {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select(ENRICHED_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ==================== Task Categories ====================

export async function getTaskCategories(calendarId: string): Promise<TaskCategory[]> {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('calendar_id', calendarId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTaskCategory(input: CreateTaskCategoryInput): Promise<TaskCategory> {
  const { data: existing } = await supabase
    .from('task_categories')
    .select('position')
    .eq('calendar_id', input.calendar_id)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('task_categories')
    .insert({
      calendar_id: input.calendar_id,
      name: input.name,
      color: input.color || '#636E72',
      icon: input.icon || 'pricetag',
      is_private_by_default: input.is_private_by_default || false,
      position: nextPosition,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createDefaultCategories(calendarId: string): Promise<TaskCategory[]> {
  const { data, error } = await supabase
    .rpc('create_default_categories', { p_calendar_id: calendarId });
  if (error) throw error;
  return data || [];
}
