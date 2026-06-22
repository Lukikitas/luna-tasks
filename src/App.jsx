import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlus,
  ClipboardList,
  Clock3,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { DEFAULT_STATUSES, PRIORITIES, VIEW_OPTIONS } from './lib/constants'
import { byPosition, formatDate, initials, isOverdue, priorityMeta } from './lib/utils'
import { useAuth } from './hooks/useAuth'

function App() {
  const auth = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('luna-theme') || 'system')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme === 'system' ? '' : theme
    localStorage.setItem('luna-theme', theme)
  }, [theme])

  if (!isSupabaseConfigured) return <SetupMissing />
  if (auth.loading) return <FullPageStatus text="Cargando sesión..." />
  if (!auth.session) return <AuthView />
  return <TasksApp auth={auth} theme={theme} setTheme={setTheme} />
}

function SetupMissing() {
  return (
    <main className="setup-screen">
      <section className="setup-panel">
        <div className="brand-mark">LT</div>
        <h1>Luna Tasks</h1>
        <p>Falta configurar Supabase. Creá un archivo `.env` con las variables públicas del proyecto.</p>
        <pre>{'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY='}</pre>
      </section>
    </main>
  )
}

function FullPageStatus({ text }) {
  return (
    <main className="setup-screen">
      <RefreshCw className="spin" size={28} />
      <p>{text}</p>
    </main>
  )
}

function AuthView() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    const redirectTo = window.location.origin
    const request =
      mode === 'register'
        ? supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName }, emailRedirectTo: redirectTo },
          })
        : mode === 'reset'
          ? supabase.auth.resetPasswordForEmail(email, { redirectTo })
          : supabase.auth.signInWithPassword({ email, password })

    const { error } = await request
    setBusy(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      mode === 'reset'
        ? 'Te enviamos un enlace para recuperar la contraseña.'
        : mode === 'register'
          ? 'Cuenta creada. Revisá tu correo si Supabase pide confirmación.'
          : 'Sesión iniciada.',
    )
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <div className="brand-row">
          <div className="brand-mark">LT</div>
          <span>Luna Tasks</span>
        </div>
        <h1>Dashboard colaborativo para mover tareas sin perder el hilo.</h1>
        <p>Kanban, vistas operativas, actividad, miembros y sincronización en tiempo real con Supabase.</p>
      </section>
      <section className="auth-card">
        <div className="segmented">
          <button className={clsx(mode === 'login' && 'active')} onClick={() => setMode('login')}>
            Ingresar
          </button>
          <button className={clsx(mode === 'register' && 'active')} onClick={() => setMode('register')}>
            Registro
          </button>
        </div>
        <form onSubmit={submit} className="stack">
          <h2>{mode === 'reset' ? 'Recuperar contraseña' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
          {mode === 'register' && (
            <label>
              Nombre visible
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {mode !== 'reset' && (
            <label>
              Contraseña
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          )}
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button" disabled={busy}>
            {busy ? 'Procesando...' : mode === 'reset' ? 'Enviar enlace' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          </button>
          <button type="button" className="link-button" onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}>
            {mode === 'reset' ? 'Volver al inicio' : 'Olvidé mi contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}

function TasksApp({ auth, theme, setTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [members, setMembers] = useState([])
  const [statuses, setStatuses] = useState([])
  const [tasks, setTasks] = useState([])
  const [labels, setLabels] = useState([])
  const [comments, setComments] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activity, setActivity] = useState([])
  const [view, setView] = useState('board')
  const [selectedTask, setSelectedTask] = useState(null)
  const [editingStatus, setEditingStatus] = useState(null)
  const [filters, setFilters] = useState({
    text: '',
    status: 'all',
    assignee: 'all',
    priority: 'all',
    label: 'all',
    creator: 'all',
    overdue: false,
    unassigned: false,
  })
  const [connection, setConnection] = useState('sincronizando')
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function loadWorkspaces() {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role, workspace:workspaces(*)')
      .eq('user_id', auth.session.user.id)
      .order('created_at', { ascending: true })

    if (!error) {
      const next = data.map((item) => ({ ...item.workspace, role: item.role })).filter(Boolean)
      setWorkspaces(next)
      setWorkspaceId((current) => current || next[0]?.id || '')
    }
  }

  async function loadWorkspaceData(id = workspaceId) {
    if (!id) return
    const [memberRes, statusRes, taskRes, labelRes, commentRes, subtaskRes, notificationRes, activityRes] =
      await Promise.all([
        supabase.from('workspace_members').select('*, profile:profiles(*)').eq('workspace_id', id),
        supabase.from('task_statuses').select('*').eq('workspace_id', id).order('position'),
        supabase
          .from('tasks')
          .select('*, creator:profiles!tasks_creator_id_fkey(*), assignees:task_assignees(profile:profiles(*)), task_labels(label:labels(*))')
          .eq('workspace_id', id)
          .order('position'),
        supabase.from('labels').select('*').eq('workspace_id', id).order('name'),
        supabase.from('comments').select('*, author:profiles(*)').eq('workspace_id', id).order('created_at', { ascending: false }),
        supabase.from('subtasks').select('*').eq('workspace_id', id).order('created_at'),
        supabase.from('notifications').select('*').eq('user_id', auth.session.user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('activity_log').select('*, actor:profiles(*)').eq('workspace_id', id).order('created_at', { ascending: false }).limit(40),
      ])

    if (!memberRes.error) setMembers(memberRes.data)
    if (!statusRes.error) setStatuses(statusRes.data)
    if (!taskRes.error) setTasks(taskRes.data)
    if (!labelRes.error) setLabels(labelRes.data)
    if (!commentRes.error) setComments(commentRes.data)
    if (!subtaskRes.error) setSubtasks(subtaskRes.data)
    if (!notificationRes.error) setNotifications(notificationRes.data)
    if (!activityRes.error) setActivity(activityRes.data)
    setConnection('conectado')
  }

  async function acceptInviteFromUrl() {
    const token = new URLSearchParams(window.location.search).get('invite')
    if (!token) return

    const { error } = await supabase.rpc('accept_workspace_invitation', { invite_token: token })
    if (error) {
      alert(`No se pudo aceptar la invitación: ${error.message}`)
      return
    }

    window.history.replaceState({}, document.title, window.location.pathname)
  }

  useEffect(() => {
    async function boot() {
      await acceptInviteFromUrl()
      await loadWorkspaces()
    }

    boot()
  }, [])

  useEffect(() => {
    if (workspaceId) loadWorkspaceData(workspaceId)
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return undefined
    setConnection('conectado')
    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` }, () =>
        loadWorkspaceData(workspaceId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `workspace_id=eq.${workspaceId}` }, () =>
        loadWorkspaceData(workspaceId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => loadWorkspaceData(workspaceId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks', filter: `workspace_id=eq.${workspaceId}` }, () =>
        loadWorkspaceData(workspaceId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${auth.session.user.id}` }, () =>
        loadWorkspaceData(workspaceId),
      )
      .subscribe((status) => setConnection(status === 'SUBSCRIBED' ? 'conectado' : 'sincronizando'))

    return () => supabase.removeChannel(channel)
  }, [workspaceId])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((status) => [status.id, status])), [statuses])
  const doneStatus = statuses.find((status) => status.name === 'Finalizadas')

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const assigneeIds = task.assignees?.map((item) => item.profile?.id).filter(Boolean) ?? []
      const taskLabelIds = task.task_labels?.map((item) => item.label?.id).filter(Boolean) ?? []
      const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()
      const overdue = isOverdue(task, statusById[task.status_id])
      if (view === 'mine' && !assigneeIds.includes(auth.session.user.id)) return false
      if (view === 'overdue' && !overdue) return false
      if (view === 'done' && task.status_id !== doneStatus?.id) return false
      if (filters.text && !haystack.includes(filters.text.toLowerCase())) return false
      if (filters.status !== 'all' && task.status_id !== filters.status) return false
      if (filters.assignee !== 'all' && !assigneeIds.includes(filters.assignee)) return false
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false
      if (filters.label !== 'all' && !taskLabelIds.includes(filters.label)) return false
      if (filters.creator !== 'all' && task.creator_id !== filters.creator) return false
      if (filters.overdue && !overdue) return false
      if (filters.unassigned && assigneeIds.length > 0) return false
      return true
    })
  }, [tasks, filters, view, statusById, doneStatus, auth.session.user.id])

  const metrics = useMemo(() => {
    const overdue = tasks.filter((task) => isOverdue(task, statusById[task.status_id])).length
    const done = tasks.filter((task) => task.status_id === doneStatus?.id).length
    return {
      total: tasks.length,
      pending: tasks.filter((task) => statusById[task.status_id]?.name === 'Pendientes').length,
      active: tasks.filter((task) => statusById[task.status_id]?.name === 'En curso').length,
      done,
      overdue,
      progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    }
  }, [tasks, statusById, doneStatus])

  async function createWorkspace(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name')
    if (!name) return

    const workspaceId = crypto.randomUUID()
    const { error } = await supabase.from('workspaces').insert({ id: workspaceId, name, owner_id: auth.session.user.id })
    if (error) return alert(error.message)

    await supabase.from('workspace_members').insert({ workspace_id: workspaceId, user_id: auth.session.user.id, role: 'owner' })
    await Promise.all(
      DEFAULT_STATUSES.map((status, index) =>
        supabase.from('task_statuses').insert({
          workspace_id: workspaceId,
          name: status.name,
          color: status.color,
          position: index,
          is_default: true,
        }),
      ),
    )
    await supabase.from('labels').insert([
      { workspace_id: workspaceId, name: 'Operaciones', color: '#2563eb' },
      { workspace_id: workspaceId, name: 'Urgente', color: '#dc2626' },
    ])
    await loadWorkspaces()
    setWorkspaceId(workspaceId)
  }

  async function createInvite() {
    const email = prompt('Email del invitado')
    if (!email || !workspaceId) return
    const token = crypto.randomUUID()
    const { error } = await supabase.from('invitations').insert({
      workspace_id: workspaceId,
      email,
      token,
      invited_by: auth.session.user.id,
      status: 'pending',
    })
    if (error) return alert(error.message)
    await navigator.clipboard?.writeText(`${window.location.origin}?invite=${token}`)
    alert('Invitación creada. El enlace quedó copiado al portapapeles.')
  }

  async function createTask(statusId) {
    const title = prompt('Título de la tarea')
    if (!title || !workspaceId) return
    const position = tasks.filter((task) => task.status_id === statusId).length
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        status_id: statusId,
        title,
        priority: 'medium',
        creator_id: auth.session.user.id,
        position,
      })
      .select()
      .single()
    if (error) return alert(error.message)
    setSelectedTask({ ...data, assignees: [], task_labels: [] })
  }

  async function updateTask(taskId, patch) {
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId)
    if (error) alert(error.message)
  }

  async function deleteTask(taskId) {
    if (!confirm('¿Eliminar esta tarea?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) return alert(error.message)
    setSelectedTask(null)
  }

  async function createStatus() {
    const name = prompt('Nombre del nuevo estado')
    if (!name) return
    const { error } = await supabase.from('task_statuses').insert({
      workspace_id: workspaceId,
      name,
      color: '#0f766e',
      position: statuses.length,
    })
    if (error) alert(error.message)
  }

  async function deleteStatus(status) {
    if (status.is_default) return alert('Los estados base no se eliminan.')
    if (!confirm(`¿Eliminar el estado "${status.name}"?`)) return
    const { error } = await supabase.from('task_statuses').delete().eq('id', status.id)
    if (error) alert(error.message)
  }

  function findStatusFromOver(over) {
    if (!over) return null
    if (statuses.some((status) => status.id === over.id)) return over.id
    return tasks.find((task) => task.id === over.id)?.status_id ?? null
  }

  async function handleDragStart(event) {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const task = tasks.find((item) => item.id === active.id)
    const nextStatusId = findStatusFromOver(over)
    if (!task || !nextStatusId) return

    const sameColumnTasks = tasks.filter((item) => item.status_id === nextStatusId).sort(byPosition)
    const oldIndex = sameColumnTasks.findIndex((item) => item.id === active.id)
    const newIndex = sameColumnTasks.findIndex((item) => item.id === over.id)
    const reordered =
      oldIndex >= 0 && newIndex >= 0 ? arrayMove(sameColumnTasks, oldIndex, newIndex) : [...sameColumnTasks, { ...task, status_id: nextStatusId }]

    await updateTask(task.id, { status_id: nextStatusId, position: Math.max(newIndex, 0) })
    await Promise.all(reordered.map((item, index) => supabase.from('tasks').update({ position: index }).eq('id', item.id)))
  }

  if (!workspaceId) return <EmptyWorkspace onCreate={createWorkspace} auth={auth} />

  return (
    <div className="app-shell">
      <aside className={clsx('sidebar', sidebarOpen && 'open')}>
        <div className="brand-row">
          <div className="brand-mark">LT</div>
          <span>Luna Tasks</span>
        </div>
        <label className="select-label">
          Espacio
          <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
        <nav>
          {VIEW_OPTIONS.map((option) => (
            <button key={option.id} className={clsx(view === option.id && 'active')} onClick={() => setView(option.id)}>
              <LayoutDashboard size={17} />
              {option.label}
            </button>
          ))}
        </nav>
        <button onClick={createInvite}>
          <UserPlus size={17} />
          Invitar
        </button>
        <form onSubmit={createWorkspace} className="mini-form">
          <input name="name" placeholder="Nuevo espacio" />
          <button title="Crear espacio">
            <Plus size={16} />
          </button>
        </form>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}>
            <Menu />
          </button>
          <div>
            <p className="eyebrow">Dashboard colaborativo</p>
            <h1>{workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? 'Luna Tasks'}</h1>
          </div>
          <div className="top-actions">
            <span className={clsx('sync-pill', connection === 'conectado' && 'online')}>
              <RefreshCw size={14} className={connection !== 'conectado' ? 'spin' : ''} />
              {connection}
            </span>
            <ThemeButton theme={theme} setTheme={setTheme} />
            <ProfileButton auth={auth} />
          </div>
        </header>

        <Dashboard metrics={metrics} tasks={tasks} members={members} statusById={statusById} />
        <Filters filters={filters} setFilters={setFilters} statuses={statuses} members={members} labels={labels} />

        <section className="content-grid">
          <div className="workspace-panel">
            <div className="section-title">
              <Users size={18} />
              Miembros
            </div>
            <div className="member-list">
              {members.map((member) => (
                <span key={member.id} className="member-chip">
                  <Avatar profile={member.profile} />
                  {member.profile?.display_name || member.profile?.email}
                </span>
              ))}
            </div>
          </div>
          <NotificationsPanel notifications={notifications} />
        </section>

        {view === 'board' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="kanban">
              {statuses.map((status) => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={visibleTasks.filter((task) => task.status_id === status.id).sort(byPosition)}
                  onCreateTask={createTask}
                  onOpenTask={setSelectedTask}
                  onEditStatus={setEditingStatus}
                  onDeleteStatus={deleteStatus}
                  statusById={statusById}
                />
              ))}
              <button className="add-column" onClick={createStatus}>
                <CirclePlus size={18} />
                Nuevo estado
              </button>
            </section>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} statusById={statusById} /> : null}</DragOverlay>
          </DndContext>
        ) : (
          <AlternateView view={view} tasks={visibleTasks} statuses={statuses} statusById={statusById} onOpenTask={setSelectedTask} />
        )}

        <ActivityPanel activity={activity} />
      </main>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} />}
      {selectedTask && (
        <TaskDrawer
          task={tasks.find((task) => task.id === selectedTask.id) ?? selectedTask}
          statuses={statuses}
          members={members}
          labels={labels}
          comments={comments.filter((comment) => comment.task_id === selectedTask.id)}
          subtasks={subtasks.filter((subtask) => subtask.task_id === selectedTask.id)}
          auth={auth}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onReload={() => loadWorkspaceData(workspaceId)}
          workspaceId={workspaceId}
        />
      )}
      {editingStatus && (
        <StatusModal status={editingStatus} onClose={() => setEditingStatus(null)} onReload={() => loadWorkspaceData(workspaceId)} />
      )}
    </div>
  )
}

function EmptyWorkspace({ onCreate, auth }) {
  return (
    <main className="setup-screen">
      <section className="setup-panel">
        <Avatar profile={auth.profile} />
        <h1>Creá tu primer espacio</h1>
        <p>Separá tareas personales de tableros compartidos con miembros, estados y actividad propia.</p>
        <form onSubmit={onCreate} className="stack">
          <input name="name" placeholder="Ej: Operaciones KFC" required />
          <button className="primary-button">Crear espacio</button>
        </form>
      </section>
    </main>
  )
}

function ThemeButton({ theme, setTheme }) {
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  return (
    <button className="icon-button" onClick={() => setTheme(next)} title="Cambiar tema">
      {theme === 'dark' ? <Moon /> : theme === 'light' ? <Sun /> : <ChevronDown />}
    </button>
  )
}

function ProfileButton({ auth }) {
  return (
    <button className="profile-button" onClick={() => supabase.auth.signOut()}>
      <Avatar profile={auth.profile} />
      <span>{auth.profile?.display_name || auth.session.user.email}</span>
      <LogOut size={16} />
    </button>
  )
}

function Dashboard({ metrics, tasks, members, statusById }) {
  const upcoming = [...tasks]
    .filter((task) => task.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4)
  const priorityCounts = PRIORITIES.map((priority) => ({
    ...priority,
    count: tasks.filter((task) => task.priority === priority.value).length,
  }))

  return (
    <section className="dashboard">
      <Metric title="Total" value={metrics.total} icon={<ClipboardList />} />
      <Metric title="Pendientes" value={metrics.pending} icon={<Clock3 />} />
      <Metric title="En curso" value={metrics.active} icon={<RefreshCw />} />
      <Metric title="Finalizadas" value={metrics.done} icon={<Check />} />
      <Metric title="Vencidas" value={metrics.overdue} icon={<AlertCircle />} tone="danger" />
      <div className="progress-panel">
        <div className="section-title">Progreso general</div>
        <div className="progress-bar">
          <span style={{ width: `${metrics.progress}%` }} />
        </div>
        <strong>{metrics.progress}%</strong>
      </div>
      <div className="insight-panel">
        <div className="section-title">Por prioridad</div>
        {priorityCounts.map((priority) => (
          <span key={priority.value}>
            <i style={{ background: priority.color }} />
            {priority.label}: {priority.count}
          </span>
        ))}
      </div>
      <div className="insight-panel">
        <div className="section-title">Próximos vencimientos</div>
        {upcoming.length ? (
          upcoming.map((task) => (
            <span key={task.id}>
              {task.title} · {formatDate(task.due_date)} · {statusById[task.status_id]?.name}
            </span>
          ))
        ) : (
          <span>Sin vencimientos cargados</span>
        )}
      </div>
      <div className="insight-panel">
        <div className="section-title">Por responsable</div>
        {members.map((member) => (
          <span key={member.id}>
            {member.profile?.display_name || member.profile?.email}: {tasks.filter((task) => task.assignees?.some((a) => a.profile?.id === member.user_id)).length}
          </span>
        ))}
      </div>
    </section>
  )
}

function Metric({ title, value, icon, tone }) {
  return (
    <div className={clsx('metric', tone)}>
      {icon}
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Filters({ filters, setFilters, statuses, members, labels }) {
  return (
    <section className="filters">
      <label className="search-box">
        <Search size={18} />
        <input
          placeholder="Buscar tareas"
          value={filters.text}
          onChange={(event) => setFilters({ ...filters, text: event.target.value })}
        />
      </label>
      <SelectFilter label="Estado" value={filters.status} onChange={(status) => setFilters({ ...filters, status })}>
        <option value="all">Todos</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </SelectFilter>
      <SelectFilter label="Responsable" value={filters.assignee} onChange={(assignee) => setFilters({ ...filters, assignee })}>
        <option value="all">Todos</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name || member.profile?.email}
          </option>
        ))}
      </SelectFilter>
      <SelectFilter label="Prioridad" value={filters.priority} onChange={(priority) => setFilters({ ...filters, priority })}>
        <option value="all">Todas</option>
        {PRIORITIES.map((priority) => (
          <option key={priority.value} value={priority.value}>
            {priority.label}
          </option>
        ))}
      </SelectFilter>
      <SelectFilter label="Etiqueta" value={filters.label} onChange={(label) => setFilters({ ...filters, label })}>
        <option value="all">Todas</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </SelectFilter>
      <button className={clsx(filters.overdue && 'active')} onClick={() => setFilters({ ...filters, overdue: !filters.overdue })}>
        <Filter size={16} />
        Vencidas
      </button>
      <button className={clsx(filters.unassigned && 'active')} onClick={() => setFilters({ ...filters, unassigned: !filters.unassigned })}>
        Sin asignar
      </button>
    </section>
  )
}

function SelectFilter({ label, value, onChange, children }) {
  return (
    <label className="select-filter">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function KanbanColumn({ status, tasks, onCreateTask, onOpenTask, onEditStatus, onDeleteStatus, statusById }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  return (
    <section ref={setNodeRef} className={clsx('kanban-column', isOver && 'over')}>
      <header>
        <span style={{ '--status-color': status.color }}>{status.name}</span>
        <div>
          <button className="icon-button" onClick={() => onEditStatus(status)}>
            <ChevronDown size={16} />
          </button>
          <button className="icon-button" onClick={() => onCreateTask(status.id)}>
            <Plus size={16} />
          </button>
          {!status.is_default && (
            <button className="icon-button danger" onClick={() => onDeleteStatus(status)}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-stack">
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onOpenTask={onOpenTask} statusById={statusById} />
          ))}
          {!tasks.length && <div className="empty-state">Sin tareas en este estado</div>}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableTask({ task, onOpenTask, statusById }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx('task-card', isDragging && 'dragging')}
      onClick={() => onOpenTask(task)}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} statusById={statusById} />
    </article>
  )
}

function TaskCard({ task, statusById }) {
  const priority = priorityMeta(task.priority)
  const overdue = isOverdue(task, statusById[task.status_id])
  return (
    <>
      <div className="task-card-head">
        <span className="priority" style={{ '--priority': priority.color }}>
          {priority.label}
        </span>
        {overdue && <span className="overdue">Vencida</span>}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta">
        <span>
          <CalendarDays size={14} />
          {formatDate(task.due_date)}
        </span>
        <span className="avatar-group">
          {task.assignees?.length
            ? task.assignees.map((assignee) => <Avatar key={assignee.profile?.id} profile={assignee.profile} />)
            : 'Sin responsable'}
        </span>
      </div>
      <div className="label-row">
        {task.task_labels?.map((item) => (
          <span key={item.label?.id} style={{ '--label': item.label?.color }}>
            {item.label?.name}
          </span>
        ))}
      </div>
    </>
  )
}

function AlternateView({ view, tasks, statuses, statusById, onOpenTask }) {
  if (view === 'calendar') {
    return (
      <section className="list-view calendar-view">
        {tasks
          .filter((task) => task.due_date)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .map((task) => (
            <button key={task.id} onClick={() => onOpenTask(task)}>
              <CalendarDays size={18} />
              <strong>{formatDate(task.due_date)}</strong>
              <span>{task.title}</span>
              <em>{statusById[task.status_id]?.name}</em>
            </button>
          ))}
      </section>
    )
  }

  return (
    <section className="list-view">
      {tasks.map((task) => (
        <button key={task.id} onClick={() => onOpenTask(task)}>
          <strong>{task.title}</strong>
          <span>{statuses.find((status) => status.id === task.status_id)?.name}</span>
          <span>{priorityMeta(task.priority).label}</span>
          <span>{formatDate(task.due_date)}</span>
        </button>
      ))}
      {!tasks.length && <div className="empty-state">No hay tareas para esta vista.</div>}
    </section>
  )
}

function NotificationsPanel({ notifications }) {
  return (
    <div className="workspace-panel">
      <div className="section-title">
        <Bell size={18} />
        Notificaciones
      </div>
      <div className="mini-list">
        {notifications.slice(0, 5).map((notification) => (
          <span key={notification.id}>{notification.message}</span>
        ))}
        {!notifications.length && <span>Sin notificaciones nuevas</span>}
      </div>
    </div>
  )
}

function ActivityPanel({ activity }) {
  return (
    <section className="activity-panel">
      <div className="section-title">
        <Clock3 size={18} />
        Actividad reciente
      </div>
      <div className="activity-list">
        {activity.map((item) => (
          <span key={item.id}>
            <strong>{item.actor?.display_name || item.actor?.email || 'Sistema'}</strong> {item.action} ·{' '}
            {formatDate(item.created_at)}
          </span>
        ))}
        {!activity.length && <span>La actividad aparecerá cuando el equipo trabaje en el tablero.</span>}
      </div>
    </section>
  )
}

function TaskDrawer({ task, statuses, members, labels, comments, subtasks, auth, onClose, onUpdate, onDelete, onReload, workspaceId }) {
  const [draft, setDraft] = useState(task)
  const assignedIds = task.assignees?.map((item) => item.profile?.id) ?? []
  const taskLabelIds = task.task_labels?.map((item) => item.label?.id) ?? []

  useEffect(() => setDraft(task), [task])

  async function saveTask(event) {
    event.preventDefault()
    await onUpdate(task.id, {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      due_date: draft.due_date || null,
      status_id: draft.status_id,
    })
    onReload()
  }

  async function toggleAssignee(userId) {
    if (assignedIds.includes(userId)) {
      await supabase.from('task_assignees').delete().eq('task_id', task.id).eq('user_id', userId)
    } else {
      await supabase.from('task_assignees').insert({ task_id: task.id, user_id: userId })
    }
    onReload()
  }

  async function toggleLabel(labelId) {
    if (taskLabelIds.includes(labelId)) {
      await supabase.from('task_labels').delete().eq('task_id', task.id).eq('label_id', labelId)
    } else {
      await supabase.from('task_labels').insert({ task_id: task.id, label_id: labelId })
    }
    onReload()
  }

  async function addComment(event) {
    event.preventDefault()
    const body = new FormData(event.currentTarget).get('comment')
    if (!body) return
    await supabase.from('comments').insert({ workspace_id: workspaceId, task_id: task.id, author_id: auth.session.user.id, body })
    event.currentTarget.reset()
    onReload()
  }

  async function addSubtask(event) {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('subtask')
    if (!title) return
    await supabase.from('subtasks').insert({ workspace_id: workspaceId, task_id: task.id, title })
    event.currentTarget.reset()
    onReload()
  }

  async function toggleSubtask(subtask) {
    await supabase.from('subtasks').update({ is_done: !subtask.is_done }).eq('id', subtask.id)
    onReload()
  }

  return (
    <aside className="drawer">
      <header>
        <div>
          <p className="eyebrow">Detalle de tarea</p>
          <h2>{task.title}</h2>
        </div>
        <button className="icon-button" onClick={onClose}>
          <X />
        </button>
      </header>
      <form className="stack" onSubmit={saveTask}>
        <label>
          Título
          <input value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        </label>
        <label>
          Descripción
          <textarea value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
        <div className="two-columns">
          <label>
            Estado
            <select value={draft.status_id || ''} onChange={(event) => setDraft({ ...draft, status_id: event.target.value })}>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select value={draft.priority || 'medium'} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Fecha límite
          <input type="date" value={draft.due_date || ''} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} />
        </label>
        <button className="primary-button">Guardar cambios</button>
      </form>

      <section className="drawer-section">
        <h3>Responsables</h3>
        <div className="chip-grid">
          {members.map((member) => (
            <button key={member.user_id} className={clsx(assignedIds.includes(member.user_id) && 'active')} onClick={() => toggleAssignee(member.user_id)}>
              <Avatar profile={member.profile} />
              {member.profile?.display_name || member.profile?.email}
            </button>
          ))}
        </div>
      </section>

      <section className="drawer-section">
        <h3>Etiquetas</h3>
        <div className="chip-grid">
          {labels.map((label) => (
            <button key={label.id} className={clsx(taskLabelIds.includes(label.id) && 'active')} onClick={() => toggleLabel(label.id)}>
              {label.name}
            </button>
          ))}
        </div>
      </section>

      <section className="drawer-section">
        <h3>Checklist</h3>
        <form onSubmit={addSubtask} className="inline-form">
          <input name="subtask" placeholder="Nueva subtarea" />
          <button>
            <Plus size={16} />
          </button>
        </form>
        {subtasks.map((subtask) => (
          <label key={subtask.id} className="check-row">
            <input type="checkbox" checked={subtask.is_done} onChange={() => toggleSubtask(subtask)} />
            {subtask.title}
          </label>
        ))}
      </section>

      <section className="drawer-section">
        <h3>Comentarios</h3>
        <form onSubmit={addComment} className="inline-form">
          <input name="comment" placeholder="Escribir comentario" />
          <button>
            <Plus size={16} />
          </button>
        </form>
        <div className="comments">
          {comments.map((comment) => (
            <article key={comment.id}>
              <strong>{comment.author?.display_name || comment.author?.email}</strong>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
      </section>

      <button className="danger-button" onClick={() => onDelete(task.id)}>
        <Trash2 size={16} />
        Eliminar tarea
      </button>
    </aside>
  )
}

function StatusModal({ status, onClose, onReload }) {
  const [draft, setDraft] = useState(status)
  async function submit(event) {
    event.preventDefault()
    await supabase.from('task_statuses').update({ name: draft.name, color: draft.color, position: draft.position }).eq('id', status.id)
    onReload()
    onClose()
  }
  return (
    <div className="modal">
      <form className="modal-panel stack" onSubmit={submit}>
        <h2>Editar estado</h2>
        <label>
          Nombre
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          Color
          <input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </label>
        <label>
          Orden
          <input type="number" value={draft.position} onChange={(event) => setDraft({ ...draft, position: Number(event.target.value) })} />
        </label>
        <button className="primary-button">Guardar</button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </form>
    </div>
  )
}

function Avatar({ profile }) {
  if (profile?.avatar_url) return <img className="avatar" src={profile.avatar_url} alt="" />
  return <span className="avatar">{initials(profile?.display_name || profile?.email)}</span>
}

export default App
