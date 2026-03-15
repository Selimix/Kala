export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskCategory {
  id: string;
  calendar_id: string;
  name: string;
  color: string;
  icon: string;
  is_private_by_default: boolean;
  position: number;
  created_at: string;
}

export interface CreateTaskCategoryInput {
  calendar_id: string;
  name: string;
  color?: string;
  icon?: string;
  is_private_by_default?: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  calendar_id: string | null;
  created_by: string | null;
  creator?: { display_name: string } | null; // via join profiles!created_by
  category_id: string | null;
  is_private: boolean;
  category?: TaskCategory | null; // via join task_categories
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;       // ISO 8601 timestamptz
  completed_at: string | null;   // ISO 8601 timestamptz
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  calendar_id?: string;
  category_id?: string;
  is_private?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  category_id?: string | null;
  is_private?: boolean;
}
