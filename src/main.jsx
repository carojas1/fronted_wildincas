import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgeDollarSign,
  BedDouble,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  Grid2X2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "https://backend-wildincas.onrender.com/api";

const nav = [
  { id: "dashboard", label: "Dashboard", hint: "Vista general", icon: Grid2X2, group: "PRINCIPAL" },
  { id: "rooms", label: "Habitaciones", hint: "Estado y control", icon: BedDouble, group: "OPERACION" },
  { id: "guests", label: "Huespedes", hint: "Registro y perfiles", icon: Users, group: "OPERACION" },
  { id: "cleaning", label: "Limpieza", hint: "Tareas y mantencion", icon: Sparkles, group: "OPERACION" },
  { id: "logbook", label: "Bitacora", hint: "Novedades del turno", icon: ClipboardList, group: "OPERACION" },
  { id: "cash", label: "Caja", hint: "Apertura y cierre", icon: WalletCards, group: "FINANZAS" },
  { id: "income", label: "Ingresos", hint: "Control financiero", icon: BadgeDollarSign, group: "FINANZAS" },
  { id: "employees", label: "Empleados", hint: "Personal y accesos", icon: BriefcaseBusiness, group: "ADMINISTRACION" },
  { id: "users", label: "Usuarios", hint: "Roles y permisos", icon: UserCog, group: "ADMINISTRACION" }
];

const statusLabels = {
  all: "Todos",
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  reserved: "Reservada",
  active: "Activo",
  checkout: "Check-out",
  open: "Abierta",
  resolved: "Resuelta",
  income: "Ingreso",
  expense: "Gasto",
  sent: "Enviado",
  sent_api: "Enviado",
  logged: "Registrado",
  email_error: "Error correo"
};

const initialData = {
  rooms: [],
  guests: [],
  movements: [],
  incidents: [],
  checklist: [],
  employees: [],
  agenda: {},
  summary: {},
  daily: {},
  shifts: {},
  receipts: [],
  users: [],
  roles: [],
  currentShift: null
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || "Error de API");
  return payload.data;
}

async function safeRequest(path, fallback) {
  try {
    return await request(path);
  } catch (error) {
    console.warn(`${path}: ${error.message}`);
    return fallback;
  }
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("simot-session") || "null"));
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [rooms, guests, movements, incidents, checklist, employees, agenda, summary, daily, shifts, currentShift, receipts, users, roles] = await Promise.all([
        safeRequest("/rooms", []),
        safeRequest("/guests", []),
        safeRequest("/finance/movements", []),
        safeRequest("/operations/incidents", []),
        safeRequest("/operations/checklist", []),
        safeRequest("/employees", []),
        safeRequest("/operations/agenda", {}),
        safeRequest("/finance/summary", {}),
        safeRequest("/finance/daily", {}),
        safeRequest("/finance/shifts", {}),
        safeRequest("/employees/current-shift", null),
        safeRequest("/notifications/receipts", []),
        safeRequest("/auth/users", []),
        safeRequest("/auth/roles", [])
      ]);
      setData({ rooms, guests, movements, incidents, checklist, employees, agenda, summary, daily, shifts, currentShift, receipts, users, roles });
    } catch (error) {
      setToast(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    loadAll();
    const timer = setInterval(loadAll, 15000);
    return () => clearInterval(timer);
  }, [session]);

  if (!session) return <Login onLogin={setSession} />;

  const allowedModules = session.user.modules || [];
  const canSeeAll = allowedModules.includes("all");
  const visibleNav = canSeeAll ? nav : nav.filter((item) => allowedModules.includes(item.id));
  const activeView = visibleNav.some((item) => item.id === view) ? view : visibleNav[0]?.id || "dashboard";
  const title = nav.find((item) => item.id === activeView)?.label || "Dashboard";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <button className="icon-button" title="Nuevo registro"><Plus size={19} /></button>
          <div><strong>Wild Incas</strong><span>BACKPACKERS HOSTAL</span></div>
        </div>
        <div className="system-pill"><span /> SIMOT - SISTEMA ACTIVO</div>
        <nav>
          {[...new Set(visibleNav.map((item) => item.group))].map((group) => (
            <div key={group} className="nav-group">
              <p>{group}</p>
              {visibleNav.filter((item) => item.group === group).map((item) => (
                <button key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => setView(item.id)}>
                  <item.icon size={18} />
                  <span><b>{item.label}</b><small>{item.hint}</small></span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="manual"><ShieldCheck size={15} /> Manual de usuario</button>
        <div className="profile">
          <span>{session.user.name.slice(0, 1)}</span>
          <div><b>{session.user.name}</b><small>{session.user.role}</small></div>
          <button title="Salir" onClick={() => { localStorage.removeItem("simot-session"); setSession(null); }}><LogOut size={16} /></button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div><p>{activeView === "cash" || activeView === "income" ? "FINANZAS" : activeView === "dashboard" ? "PRINCIPAL" : "GESTION"}</p><h1>{title}</h1></div>
          <button className="ghost" onClick={loadAll} disabled={loading}><RefreshCw size={16} /> Actualizar</button>
        </header>
        {activeView === "dashboard" && <Dashboard data={data} setView={setView} />}
        {activeView === "rooms" && <Rooms rooms={data.rooms} guests={data.guests} reload={loadAll} onToast={setToast} />}
        {activeView === "guests" && <Guests rooms={data.rooms} guests={data.guests} reload={loadAll} onToast={setToast} />}
        {activeView === "cleaning" && <Cleaning rooms={data.rooms} incidents={data.incidents} reload={loadAll} onToast={setToast} />}
        {activeView === "logbook" && <Logbook incidents={data.incidents} reload={loadAll} onToast={setToast} />}
        {activeView === "cash" && <Cash data={data} reload={loadAll} onToast={setToast} />}
        {activeView === "income" && <Income movements={data.movements} summary={data.summary} receipts={data.receipts} reload={loadAll} onToast={setToast} />}
        {activeView === "employees" && <Employees employees={data.employees} roles={data.roles} currentShift={data.currentShift} reload={loadAll} onToast={setToast} />}
        {activeView === "users" && <UsersAdmin users={data.users} roles={data.roles} reload={loadAll} onToast={setToast} />}
      </main>
      {toast && <button className="toast" onClick={() => setToast("")}>{toast}</button>}
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("apolo");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    try {
      const session = await request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      localStorage.setItem("simot-session", JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login">
      <section className="login-brand">
        <div className="login-brand-head">
          <span>WI</span>
          <p>Cuenca, Ecuador</p>
        </div>
        <div className="login-brand-main">
          <small>Plataforma hotelera</small>
          <h1>Wild Incas</h1>
          <h2>Control operativo y financiero</h2>
        </div>
        <div className="login-metrics">
          <span><b>24/7</b><small>Recepcion</small></span>
          <span><b>ERP</b><small>Microservicios</small></span>
          <span><b>SSL</b><small>Acceso seguro</small></span>
        </div>
      </section>
      <form onSubmit={submit} className="login-form">
        <div className="login-kicker"><ShieldCheck size={18} /> Verificacion de usuarios</div>
        <h2>Acceso administrativo</h2>
        <span>Ingresa con una cuenta autorizada para operar recepcion, habitaciones, caja y reportes.</span>
        <label>USUARIO<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>CONTRASENA<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button>Ingresar al sistema</button>
        {error && <small className="error">{error}</small>}
        <div className="login-trust">
          <span><Check size={15} /> Roles por modulo</span>
          <span><Mail size={15} /> Correos transaccionales</span>
          <span><Receipt size={15} /> Comprobantes y caja</span>
        </div>
      </form>
    </div>
  );
}

function Dashboard({ data, setView }) {
  const byGuest = useMemo(() => Object.fromEntries(data.guests.map((guest) => [guest.id, guest])), [data.guests]);
  return (
    <div className="grid dashboard-grid">
      <section className="panel span-2">
        <PanelTitle title="Estado de habitaciones" action="Ver todas" onClick={() => setView("rooms")} />
        <div className="room-map">{data.rooms.map((room) => <RoomTile key={room.id} room={room} guest={byGuest[room.guestId]} compact />)}</div>
        <Legend />
      </section>
      <section className="panel"><h3>Agenda de hoy</h3><Agenda data={data.agenda} /></section>
      <section className="panel span-3 movements">
        <PanelTitle title="Ultimos movimientos" action="Ver todos" onClick={() => setView("income")} />
        <MovementList movements={data.movements} />
      </section>
    </div>
  );
}

function Rooms({ rooms, guests, reload, onToast }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const byGuest = Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  const filtered = filter === "all" ? rooms : rooms.filter((room) => room.status === filter);
  const floors = [...new Set(filtered.map((room) => room.floor))].sort((a, b) => a - b);

  async function createRoom(values) {
    await request("/rooms", { method: "POST", body: JSON.stringify(values) });
    onToast("Habitacion registrada");
    setOpen(false);
    reload();
  }

  async function updateRoom(values) {
    await request(`/rooms/${values.id}`, { method: "PATCH", body: JSON.stringify(values) });
    onToast("Habitacion actualizada");
    setEditing(null);
    reload();
  }

  return (
    <>
      <div className="toolbar"><Filters values={["all", "available", "occupied", "cleaning", "reserved"]} active={filter} onChange={setFilter} /><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nueva habitacion</button></div>
      {floors.map((floor) => (
        <section className="floor" key={floor}>
          <div className="section-line"><span>PISO {floor}</span><small>{filtered.filter((room) => room.floor === floor).length} hab.</small></div>
          <div className="room-grid">{filtered.filter((room) => room.floor === floor).map((room) => <RoomTile key={room.id} room={room} guest={byGuest[room.guestId]} onEdit={() => setEditing(room)} />)}</div>
        </section>
      ))}
      {open && <RoomModal onClose={() => setOpen(false)} onSubmit={createRoom} />}
      {editing && <RoomModal room={editing} onClose={() => setEditing(null)} onSubmit={updateRoom} />}
    </>
  );
}

function Guests({ rooms, guests, onToast, reload }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = guests.filter((guest) => (status === "all" || guest.status === status) && [guest.name, guest.documentNumber, guest.email].some((value) => String(value || "").toLowerCase().includes(q.toLowerCase())));

  async function sendReceipt(guest) {
    await request("/notifications/receipts", { method: "POST", body: JSON.stringify({ to: guest.email, guestName: guest.name, amount: guest.paid, concept: `Hospedaje Hab. ${guest.roomId || "-"}` }) });
    onToast(`Comprobante preparado para ${guest.email}`);
    reload();
  }

  async function createGuest(values) {
    const room = rooms.find((item) => item.id === values.roomId);
    const total = Number(values.total || 0);
    const paid = Number(values.paid || 0);
    await request("/guests", { method: "POST", body: JSON.stringify({ ...values, roomType: room?.type || "", total, paid, status: "active" }) });
    if (values.roomId) await request(`/rooms/${values.roomId}/status`, { method: "PATCH", body: JSON.stringify({ status: "occupied" }) });
    if (paid > 0) await request("/finance/movements", { method: "POST", body: JSON.stringify({ type: "income", category: "Hospedaje", concept: `Check-in Hab. ${values.roomId} - ${values.name}`, method: values.method || "Efectivo", reference: values.documentNumber, amount: paid, notes: `Entrada ${values.checkIn}, salida ${values.checkOut}` }) });
    if (paid > 0 && values.email) {
      try {
        await request("/notifications/receipts", { method: "POST", body: JSON.stringify({ to: values.email, guestName: values.name, documentNumber: values.documentNumber, amount: paid, concept: `Hospedaje Hab. ${values.roomId} - ${values.checkIn} a ${values.checkOut}` }) });
      } catch (error) {
        onToast(`Huesped registrado. Correo pendiente: ${error.message}`);
      }
    }
    onToast("Huesped registrado y comprobante procesado");
    setOpen(false);
    reload();
  }

  return (
    <section>
      <div className="toolbar">
        <div className="search"><Search size={17} /><input placeholder="Nombre, documento o email..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Filters values={["all", "active", "reserved", "checkout"]} active={status} onChange={setStatus} />
        <button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo huesped</button>
      </div>
      <div className="table">
        <div className="tr head"><span>HUESPED</span><span>DOCUMENTO</span><span>HABITACION</span><span>ESTANCIA</span><span>SALIDA</span><span>PAGO</span><span>ESTADO</span><span></span></div>
        {filtered.map((guest) => (
          <div className="tr" key={guest.id}>
            <span><Avatar name={guest.name} /> <b>{guest.name}</b><small>{guest.country}</small></span>
            <span>{guest.documentType}<small>{guest.documentNumber}</small></span>
            <span><b>{guest.roomId ? `Hab. ${guest.roomId}` : "-"}</b><small>{guest.roomType}</small></span>
            <span>{guest.checkIn}<small>{"->"} {guest.checkOut}</small></span>
            <span>{guest.exitTime}</span>
            <span><b className="green">{money(guest.paid)}</b> / {money(guest.total)}<small>{guest.paid < guest.total ? "Pendiente" : "Pagado"}</small></span>
            <span><Badge status={guest.status} /></span>
            <span className="actions"><button title="Ver"><Eye size={15} /></button><button title="Enviar comprobante" onClick={() => sendReceipt(guest)}><Mail size={15} /></button></span>
          </div>
        ))}
      </div>
      {open && <GuestModal rooms={rooms.filter((room) => room.status === "available")} onClose={() => setOpen(false)} onSubmit={createGuest} />}
    </section>
  );
}

function Cleaning({ rooms, incidents, reload, onToast }) {
  const [open, setOpen] = useState(false);
  const cleaningRooms = rooms.filter((room) => room.status === "cleaning");
  async function createCleaning(values) {
    await request(`/rooms/${values.roomId}/cleaning`, { method: "POST", body: JSON.stringify({ notes: values.notes }) });
    onToast("Tarea de limpieza creada");
    setOpen(false);
    reload();
  }
  async function completeCleaning(room) {
    await request(`/rooms/${room.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "available" }) });
    onToast(`Hab. ${room.id} limpia y disponible`);
    reload();
  }
  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-title"><h3>Tareas de limpieza</h3><button onClick={() => setOpen(true)}>Nueva tarea</button></div>
        {cleaningRooms.length === 0 ? <div className="empty"><Sparkles /><span>No hay habitaciones en limpieza</span></div> : cleaningRooms.map((room) => <article className="incident-card" key={room.id}>
          <Sparkles size={18} />
          <div>
            <div className="incident-head"><b>Hab. {room.id}</b><Badge status="cleaning" /></div>
            <p>{room.notes || "Limpieza pendiente"}</p>
            <small>{room.type} - Piso {room.floor} - ultima limpieza {room.lastCleaned}</small>
          </div>
          <button className="primary" onClick={() => completeCleaning(room)}><Check size={16} /> Lista</button>
        </article>)}
      </section>
      <section className="panel"><h3>Mantenimiento</h3>{incidents.filter((item) => item.category === "mantenimiento").map((item) => <Task key={item.id} icon={ClipboardList} title={item.title} detail={item.description} status={item.status} />)}</section>
      {open && <CleaningModal rooms={rooms} onClose={() => setOpen(false)} onSubmit={createCleaning} />}
    </div>
  );
}

function Logbook({ incidents, reload, onToast }) {
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const filtered = incidents.filter((item) => (status === "all" || item.status === status) && (category === "all" || item.category === category));
  async function createIncident(values) {
    await request("/operations/incidents", { method: "POST", body: JSON.stringify(values) });
    onToast("Novedad registrada");
    setOpen(false);
    reload();
  }
  async function completeIncident(item) {
    await request(`/operations/incidents/${item.id}/resolve`, { method: "PATCH", body: JSON.stringify({ resolution: "Completado desde bitacora", resolvedBy: "Apolo Administrador" }) });
    onToast("Novedad completada");
    reload();
  }
  return (
    <>
      <div className="split-toolbar"><Filters values={["open", "resolved", "all"]} active={status} onChange={setStatus} /><Filters values={["all", "incidencia", "mantenimiento", "huesped", "seguridad", "general"]} active={category} onChange={setCategory} /><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nueva novedad</button></div>
      <section className="panel emptyish">{filtered.length === 0 ? <div className="empty"><ClipboardList /><span>No hay novedades con estos filtros</span></div> : filtered.map((item) => <IncidentCard key={item.id} item={item} onComplete={() => completeIncident(item)} />)}</section>
      {open && <IncidentModal onClose={() => setOpen(false)} onSubmit={createIncident} />}
    </>
  );
}

function Cash({ data, reload, onToast }) {
  const [checked, setChecked] = useState({});
  const [initial, setInitial] = useState("");
  const [closed, setClosed] = useState("");
  const [shift, setShift] = useState("Tarde");
  const [notes, setNotes] = useState("");
  const [openMovement, setOpenMovement] = useState(false);
  const allDone = data.checklist.length && data.checklist.every((item) => checked[item.id]);
  const today = data.daily || {};

  async function openCash() {
    await request("/finance/shifts/open", { method: "POST", body: JSON.stringify({ responsible: "Apolo Administrador", shift, initial: Number(initial || 0), notes }) });
    onToast("Caja abierta");
    reload();
  }

  async function closeCash() {
    await request("/finance/shifts/close", { method: "POST", body: JSON.stringify({ closed: Number(closed || 0), notes }) });
    onToast("Caja cerrada");
    setClosed("");
    reload();
  }

  async function createMovement(values) {
    await request("/finance/movements", { method: "POST", body: JSON.stringify(values) });
    onToast("Movimiento de caja registrado");
    setOpenMovement(false);
    reload();
  }

  return (
    <div className="cash-layout">
      <section className="panel">
        <div className="feature-title"><WalletCards /><span><b>{data.shifts.openShift ? "Caja abierta" : "Abrir caja"}</b><small>Turno de recepcion</small></span></div>
        <label>RESPONSABLE<input value={data.shifts.openShift?.responsible || "Apolo Administrador"} readOnly /></label>
        <label>TURNO<div className="segmented">{["Manana", "Tarde", "Noche"].map((item) => <button type="button" key={item} className={(data.shifts.openShift?.shift || shift) === item ? "selected" : ""} onClick={() => setShift(item)}>{item}</button>)}</div></label>
        {!data.shifts.openShift && <label>MONTO INICIAL EN CAJA (USD)<input placeholder="0.00" value={initial} onChange={(e) => setInitial(e.target.value)} /></label>}
        {data.shifts.openShift && <label>MONTO DE CIERRE REAL (USD)<input placeholder="0.00" value={closed} onChange={(e) => setClosed(e.target.value)} /></label>}
        <label>OBSERVACIONES DEL TURNO<input placeholder="Novedades, faltantes, responsable de entrega..." value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {data.shifts.openShift && <button className="primary" onClick={() => setOpenMovement(true)}><Plus size={16} /> Registrar ingreso/gasto</button>}
        {data.shifts.openShift && <button className="primary" onClick={closeCash}><Save size={16} /> Cerrar caja</button>}
      </section>
      <section className="panel">
        <div className="feature-title"><CalendarCheck /><span><b>Checklist de inicio de turno</b><small>Verifica antes de empezar</small></span></div>
        {data.checklist.map((item) => <button className="check-row" key={item.id} onClick={() => setChecked({ ...checked, [item.id]: !checked[item.id] })}><span className={checked[item.id] ? "done" : ""}>{checked[item.id] && <Check size={14} />}</span>{item.title}</button>)}
        <div className="check-footer"><small>{Object.values(checked).filter(Boolean).length} de {data.checklist.length} verificados</small><button className="primary" disabled={!allDone || data.shifts.openShift} onClick={openCash}><WalletCards size={16} /> Abrir caja</button></div>
      </section>
      <section className="panel span-2">
        <div className="section-line"><span>RESUMEN DEL DIA</span><small>{today.date}</small></div>
        <div className="stats method-stats">
          <div><small>Ingresos del dia</small><b>{money(today.income)}</b></div>
          <div><small>Gastos del dia</small><b>{money(today.expense)}</b></div>
          <div><small>Balance del dia</small><b>{money(today.balance)}</b></div>
          {(today.methods || []).map((item) => <div key={item.method}><small>{item.method}</small><b>{money(item.balance)}</b><span>In {money(item.income)} / Out {money(item.expense)}</span></div>)}
        </div>
      </section>
      <section className="panel span-2">
        <div className="section-line"><span>HISTORIAL DE TURNOS</span><small>{data.shifts.history?.length || 0} cerrados</small></div>
        <ShiftTable shifts={data.shifts.history || []} />
      </section>
      {openMovement && <MovementModal onClose={() => setOpenMovement(false)} onSubmit={createMovement} />}
    </div>
  );
}

function Income({ movements, summary, receipts, reload, onToast }) {
  const [open, setOpen] = useState(false);
  async function createMovement(values) {
    await request("/finance/movements", { method: "POST", body: JSON.stringify(values) });
    onToast("Movimiento registrado");
    setOpen(false);
    reload();
  }
  return (
    <>
      <div className="toolbar">
        <section className="panel stats inline-stats"><div><small>Ingresos</small><b>{money(summary.income)}</b></div><div><small>Gastos</small><b>{money(summary.expense)}</b></div><div><small>Balance</small><b>{money(summary.balance)}</b></div></section>
        <div className="button-row"><a className="primary" href={`${API}/finance/export.xls`}><FileSpreadsheet size={16} /> Exportar Excel</a><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Movimiento</button></div>
      </div>
      <div className="grid two">
        <section className="panel"><h3>Movimientos</h3><MovementList movements={movements} /></section>
        <section className="panel"><h3>Comprobantes</h3>{receipts.length === 0 ? <div className="empty"><Receipt /><span>Sin comprobantes enviados todavia</span></div> : receipts.map((item) => <Task key={item.id} icon={Receipt} title={item.guestName} detail={`${item.to} - ${money(item.amount)} - ${statusLabels[item.status] || item.status}${item.error ? ` - ${item.error}` : ""}`} status={["sent", "sent_api"].includes(item.status) ? "active" : "open"} />)}</section>
      </div>
      {open && <MovementModal onClose={() => setOpen(false)} onSubmit={createMovement} />}
    </>
  );
}

function Employees({ employees, roles, currentShift, reload, onToast }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function createEmployee(values) {
    const username = values.username || values.email.split("@")[0];
    const password = values.password || `${username}123`;
    const role = roles.find((item) => item.id === values.roleId);
    await request("/employees", { method: "POST", body: JSON.stringify({ ...values, username, role: role?.name || values.role, modules: values.modules?.length ? values.modules : role?.modules || [] }) });
    await request("/auth/users", { method: "POST", body: JSON.stringify({ name: values.name, username, email: values.email, password, roleId: values.roleId }) });
    await request("/notifications/employees/welcome", { method: "POST", body: JSON.stringify({ to: values.email, name: values.name, username, password, role: role?.name }) });
    onToast("Empleado, usuario y correo de bienvenida creados");
    setOpen(false);
    reload();
  }

  async function updateEmployee(values) {
    await request(`/employees/${values.id}`, { method: "PATCH", body: JSON.stringify(values) });
    onToast("Empleado actualizado");
    setEditing(null);
    reload();
  }

  return (
    <>
      <div className="toolbar"><div className="shift-banner grow"><CalendarCheck size={18} /><span><small>TURNO {currentShift?.shift?.toUpperCase()} - ACTIVO AHORA</small><b>{currentShift?.name}</b></span></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo empleado</button></div>
      <div className="employee-grid">{employees.map((employee) => <article className="employee-card" key={employee.id}><div><Avatar name={employee.name} /><span><b>{employee.name}</b><small>{employee.role}</small></span><button className="mini-button" onClick={() => setEditing(employee)} title="Editar empleado"><Pencil size={14} /></button></div><p>{employee.shift} - {employee.hours}</p><p>{employee.phone}</p><p>{employee.email}</p><p>{employee.username} - {(employee.modules || []).join(", ")}</p>{employee.note && <em>{employee.note}</em>}<footer><small>Desde {employee.since}</small><Badge status={employee.status} /></footer></article>)}</div>
      {open && <EmployeeModal roles={roles} onClose={() => setOpen(false)} onSubmit={createEmployee} />}
      {editing && <EmployeeModal employee={editing} roles={roles} onClose={() => setEditing(null)} onSubmit={updateEmployee} />}
    </>
  );
}

function UsersAdmin({ users, roles, reload, onToast }) {
  const [open, setOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  async function createUser(values) {
    await request("/auth/users", { method: "POST", body: JSON.stringify(values) });
    onToast("Usuario creado con rol asignado");
    setOpen(false);
    reload();
  }
  async function updateRole(user, roleId) {
    await request(`/auth/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ roleId }) });
    onToast("Rol actualizado");
    reload();
  }
  async function sendTestEmail() {
    await request("/notifications/test", { method: "POST", body: JSON.stringify({ to: testEmail }) });
    onToast("Correo de prueba procesado");
    setTestEmail("");
    reload();
  }
  return (
    <>
      <div className="toolbar"><div className="panel slim"><b>Roles operativos</b><small>Administra acceso por modulo como en un ERP real.</small></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo usuario</button></div>
      <div className="grid two">
        <section className="panel"><h3>Usuarios del sistema</h3>{users.map((user) => <div className="user-row" key={user.id}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.username} - {user.email || "sin correo"}</small></span><select value={user.roleId} onChange={(event) => updateRole(user, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><Badge status={user.status} /></div>)}</section>
        <section className="panel"><h3>Permisos por rol</h3>{roles.map((role) => <div className="role-card" key={role.id}><b>{role.name}</b><small>{role.description}</small><p>{role.modules.join(", ")}</p></div>)}<div className="email-test"><label>PROBAR BREVO<input placeholder="correo@ejemplo.com" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} /></label><button className="primary" onClick={sendTestEmail} disabled={!testEmail}><Mail size={16} /> Enviar prueba</button></div></section>
      </div>
      {open && <UserModal roles={roles} onClose={() => setOpen(false)} onSubmit={createUser} />}
    </>
  );
}

function RoomModal({ room, onClose, onSubmit }) {
  const [values, setValues] = useState(room || { id: "", floor: 1, type: "Habitacion Privada", capacity: 2, rate: 35, status: "available", notes: "" });
  return <Modal title={room ? "Editar habitacion" : "Nueva habitacion"} onClose={onClose}>
    <FormGrid values={values} setValues={setValues} fields={[["id", "Numero"], ["floor", "Piso", "number"], ["type", "Tipo"], ["capacity", "Capacidad", "number"], ["rate", "Tarifa por noche", "number"], ["lastCleaned", "Ultima limpieza", "date"], ["notes", "Notas / observaciones"]]} />
    <label>ESTADO<select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })}><option value="available">Disponible</option><option value="occupied">Ocupada</option><option value="cleaning">Limpieza</option><option value="reserved">Reservada</option></select></label>
    <button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Guardar habitacion</button>
  </Modal>;
}

function GuestModal({ rooms, onClose, onSubmit }) {
  const [values, setValues] = useState({ name: "", country: "", documentType: "Cedula", documentNumber: "", email: "", roomId: rooms[0]?.id || "", checkIn: new Date().toISOString().slice(0, 10), checkOut: "", exitTime: "11:00", paid: 0, total: rooms[0]?.rate || 0, method: "Efectivo" });
  const selectedRoom = rooms.find((room) => room.id === values.roomId);
  const nights = Math.max(1, Math.ceil((new Date(values.checkOut || values.checkIn) - new Date(values.checkIn)) / 86400000) || 1);
  const calculatedTotal = Number(selectedRoom?.rate || 0) * nights;
  function update(next) {
    const room = rooms.find((item) => item.id === (next.roomId || values.roomId));
    const checkIn = next.checkIn || values.checkIn;
    const checkOut = next.checkOut || values.checkOut || checkIn;
    const stay = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000) || 1);
    setValues({ ...values, ...next, total: Number(room?.rate || 0) * stay });
  }
  return <Modal title="Nuevo ingreso / check-in" onClose={onClose}>
    {rooms.length === 0 && <div className="empty"><BedDouble /><span>No hay habitaciones disponibles. Libera o crea una habitacion primero.</span></div>}
    <FormGrid values={values} setValues={setValues} fields={[["name", "Nombre del cliente"], ["country", "Nacionalidad"], ["documentType", "Tipo documento"], ["documentNumber", "Cedula / pasaporte"], ["email", "Correo para factura"], ["checkIn", "Fecha entrada", "date"], ["checkOut", "Fecha salida", "date"], ["exitTime", "Hora salida"], ["paid", "Valor pagado", "number"]]} customSetValues={update} />
    <label>HABITACION DISPONIBLE<select value={values.roomId} onChange={(event) => update({ roomId: event.target.value })}>{rooms.map((room) => <option key={room.id} value={room.id}>Hab. {room.id} - {room.type} - {money(room.rate)}/noche</option>)}</select></label>
    <label>METODO DE PAGO<select value={values.method} onChange={(event) => setValues({ ...values, method: event.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Deposito</option></select></label>
    <div className="quote-box"><span>Noches: <b>{nights}</b></span><span>Tarifa: <b>{money(selectedRoom?.rate)}</b></span><span>Total calculado: <b>{money(calculatedTotal)}</b></span></div>
    <button className="primary" disabled={!rooms.length} onClick={() => onSubmit({ ...values, total: calculatedTotal })}><Save size={16} /> Registrar ingreso y emitir comprobante</button>
  </Modal>;
}

function MovementModal({ onClose, onSubmit }) {
  const [values, setValues] = useState({ type: "income", category: "Hospedaje", concept: "", method: "Efectivo", reference: "", amount: 0, notes: "" });
  return <Modal title="Movimiento contable" onClose={onClose}>
    <label>TIPO<select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="income">Ingreso</option><option value="expense">Gasto</option></select></label>
    <label>METODO<select value={values.method} onChange={(event) => setValues({ ...values, method: event.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Deposito</option></select></label>
    <FormGrid values={values} setValues={setValues} fields={[["category", "Categoria"], ["concept", "Concepto"], ["reference", "Referencia / comprobante"], ["amount", "Monto", "number"], ["notes", "Observaciones"]]} />
    <button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Guardar movimiento</button>
  </Modal>;
}

function IncidentModal({ onClose, onSubmit }) {
  const [values, setValues] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "media",
    roomId: "",
    createdBy: "Apolo Administrador",
    actionRequired: ""
  });
  return <Modal title="Nueva novedad de turno" onClose={onClose}>
    <FormGrid values={values} setValues={setValues} fields={[["title", "Que paso"], ["description", "Detalle de la novedad"], ["roomId", "Habitacion relacionada"], ["createdBy", "Reportado por"], ["actionRequired", "Que hay que hacer"]]} />
    <label>CATEGORIA<select value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })}><option value="general">General</option><option value="incidencia">Incidencia</option><option value="mantenimiento">Mantenimiento</option><option value="huesped">Huesped</option><option value="seguridad">Seguridad</option></select></label>
    <label>PRIORIDAD<select value={values.priority} onChange={(event) => setValues({ ...values, priority: event.target.value })}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label>
    <button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Registrar novedad</button>
  </Modal>;
}

function CleaningModal({ rooms, onClose, onSubmit }) {
  const [values, setValues] = useState({ roomId: rooms[0]?.id || "", notes: "Limpieza de salida / preparar para nuevo huesped" });
  return <Modal title="Nueva tarea de limpieza" onClose={onClose}>
    <label>HABITACION<select value={values.roomId} onChange={(event) => setValues({ ...values, roomId: event.target.value })}>{rooms.map((room) => <option key={room.id} value={room.id}>Hab. {room.id} - {room.type} - {statusLabels[room.status]}</option>)}</select></label>
    <label>OBSERVACION<input value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} placeholder="Ej. limpiar bano, cambiar sabanas, revisar control remoto" /></label>
    <button className="primary" onClick={() => onSubmit(values)}><Sparkles size={16} /> Crear tarea</button>
  </Modal>;
}

function UserModal({ roles, onClose, onSubmit }) {
  const [values, setValues] = useState({ name: "", username: "", email: "", password: "", roleId: roles[0]?.id || "recepcion" });
  return <Modal title="Nuevo usuario" onClose={onClose}><FormGrid values={values} setValues={setValues} fields={[["name", "Nombre"], ["username", "Usuario"], ["email", "Email"], ["password", "Contrasena", "password"]]} /><label>ROL<select value={values.roleId} onChange={(event) => setValues({ ...values, roleId: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button className="primary" onClick={() => onSubmit(values)}><UserCog size={16} /> Crear usuario</button></Modal>;
}

function EmployeeModal({ employee, roles, onClose, onSubmit }) {
  const moduleOptions = nav.map((item) => item.id);
  const [values, setValues] = useState(employee || { name: "", role: "Recepcionista", shift: "Tarde", hours: "14:00 - 22:00", phone: "", email: "", username: "", password: "", roleId: "recepcion", modules: ["dashboard", "rooms"] });
  function toggleModule(module) {
    const current = values.modules || [];
    setValues({ ...values, modules: current.includes(module) ? current.filter((item) => item !== module) : [...current, module] });
  }
  return <Modal title={employee ? "Editar empleado" : "Nuevo empleado"} onClose={onClose}>
    <FormGrid values={values} setValues={setValues} fields={[["name", "Nombre"], ["role", "Cargo"], ["shift", "Turno"], ["hours", "Horario"], ["phone", "Telefono"], ["email", "Email"], ["username", "Usuario"], ["password", "Contrasena temporal", "password"], ["note", "Nota interna"]]} />
    <label>ROL DE ACCESO<select value={values.roleId} onChange={(event) => setValues({ ...values, roleId: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    <div className="module-picker">{moduleOptions.map((module) => <button type="button" key={module} className={(values.modules || []).includes(module) ? "selected" : ""} onClick={() => toggleModule(module)}>{nav.find((item) => item.id === module)?.label}</button>)}</div>
    <button className="primary" onClick={() => onSubmit(values)}><UserCog size={16} /> {employee ? "Guardar empleado" : "Crear empleado y cuenta"}</button>
  </Modal>;
}

function FormGrid({ fields, values, setValues, customSetValues }) {
  const update = customSetValues || setValues;
  return <div className="form-grid">{fields.map(([key, label, type = "text"]) => <label key={key}>{label.toUpperCase()}<input type={type} value={values[key] ?? ""} onChange={(event) => update({ ...values, [key]: type === "number" ? Number(event.target.value) : event.target.value })} /></label>)}</div>;
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop"><section className="modal"><header><h3>{title}</h3><button onClick={onClose}><X size={18} /></button></header>{children}</section></div>;
}

function ShiftTable({ shifts }) {
  return <div className="table compact"><div className="tr head"><span>FECHA</span><span>TURNO</span><span>RESPONSABLE</span><span>INICIAL</span><span>CIERRE</span><span>ESPERADO</span><span>DIFERENCIA</span></div>{shifts.map((shift) => <div className="tr" key={shift.id}><span>{shift.date}</span><span><Badge status={shift.shift} /></span><span>{shift.responsible}</span><span>{money(shift.initial)}</span><span><b>{money(shift.closed)}</b></span><span>{money(shift.expected)}</span><span className={shift.difference < 0 ? "red" : "green"}>{money(shift.difference)}</span></div>)}</div>;
}

function RoomTile({ room, guest, compact = false, onEdit }) {
  return <article className={`room-card ${room.status} ${compact ? "compact-room" : ""}`}><div><h3>{room.id}</h3><span className="button-row"><Badge status={room.status} />{onEdit && <button className="mini-button" title="Editar habitacion" onClick={onEdit}><Pencil size={14} /></button>}</span></div>{!compact && <><small>PISO {room.floor}</small><p>{room.type}</p><dl><dt>Capacidad</dt><dd>{room.capacity} pers.</dd><dt>Tarifa</dt><dd>{money(room.rate)}/noche</dd><dt>Ultima limpieza</dt><dd>{room.lastCleaned}</dd></dl>{guest && <footer><b>{guest.name}</b><small>Salida: {guest.checkOut} - {guest.exitTime}</small><span>{guest.paid >= guest.total ? "Pagado" : "Parcial"}</span></footer>}{room.notes && <em>{room.notes}</em>}</>}</article>;
}

function Task({ icon: Icon, title, detail, status }) {
  return <div className="task"><Icon size={17} /><span><b>{title}</b><small>{detail}</small></span><Badge status={status} /></div>;
}

function IncidentCard({ item, onComplete }) {
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString("es-EC") : "";
  return <article className="incident-card">
    <ClipboardList size={18} />
    <div>
      <div className="incident-head"><b>{item.title}</b><Badge status={item.status} /></div>
      <p>{item.description}</p>
      <small>{created} - {item.createdBy || "Recepcion"}{item.roomId ? ` - Hab. ${item.roomId}` : ""}</small>
      {item.actionRequired && <em>Accion: {item.actionRequired}</em>}
      {item.resolution && <em>Resolucion: {item.resolution}</em>}
    </div>
    {item.status !== "resolved" && <button className="primary" onClick={onComplete}><Check size={16} /> Completar</button>}
  </article>;
}

function PanelTitle({ title, action, onClick }) {
  return <div className="panel-title"><h3>{title}</h3><button onClick={onClick}>{action} -&gt;</button></div>;
}

function Legend() {
  return <div className="legend">{["available", "occupied", "cleaning", "reserved"].map((status) => <span key={status}><i className={status} />{statusLabels[status]}</span>)}</div>;
}

function Filters({ values, active, onChange }) {
  return <div className="filters">{values.map((value) => <button key={value} className={active === value ? "active" : ""} onClick={() => onChange(value)}>{statusLabels[value] || value}</button>)}</div>;
}

function Agenda({ data }) {
  return <div className="agenda"><h4>Salidas</h4>{data.departures?.slice(0, 2).map((guest) => <p key={guest.id}><b>{guest.name}</b><small>Hab. {guest.roomId} - {guest.exitTime}</small><Badge status={guest.paid >= guest.total ? "Pagado" : "Parcial"} /></p>)}<h4>Llegadas</h4><small>Sin llegadas programadas</small><h4>Cobros pendientes</h4>{data.pendingCharges?.map((guest) => <p key={guest.id}><b>{guest.name}</b><strong>{money(guest.total - guest.paid)}</strong></p>)}</div>;
}

function MovementList({ movements }) {
  return <div>{movements.map((item) => <div className="movement" key={item.id}><span className={item.type}>{item.type === "income" ? "+" : "-"}</span><div><b>{item.concept}</b><small>{item.date} - {item.method}</small></div><strong className={item.type === "income" ? "green" : "red"}>{item.type === "income" ? "+" : "-"}{money(item.amount)}</strong></div>)}</div>;
}

function Badge({ status }) {
  return <small className={`badge ${String(status).toLowerCase()}`}>{statusLabels[status] || status}</small>;
}

function Avatar({ name }) {
  return <i className="avatar">{String(name || "?").slice(0, 1)}</i>;
}

createRoot(document.getElementById("root")).render(<App />);
