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
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080/api";

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
  expense: "Gasto"
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

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("simot-session") || "null"));
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [rooms, guests, movements, incidents, checklist, employees, agenda, summary, shifts, currentShift, receipts, users, roles] = await Promise.all([
        request("/rooms"),
        request("/guests"),
        request("/finance/movements"),
        request("/operations/incidents"),
        request("/operations/checklist"),
        request("/employees"),
        request("/operations/agenda"),
        request("/finance/summary"),
        request("/finance/shifts"),
        request("/employees/current-shift"),
        request("/notifications/receipts"),
        request("/auth/users"),
        request("/auth/roles")
      ]);
      setData({ rooms, guests, movements, incidents, checklist, employees, agenda, summary, shifts, currentShift, receipts, users, roles });
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

  const title = nav.find((item) => item.id === view)?.label || "Dashboard";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <button className="icon-button" title="Nuevo registro"><Plus size={19} /></button>
          <div><strong>Wild Incas</strong><span>BACKPACKERS HOSTAL</span></div>
        </div>
        <div className="system-pill"><span /> SIMOT - SISTEMA ACTIVO</div>
        <nav>
          {[...new Set(nav.map((item) => item.group))].map((group) => (
            <div key={group} className="nav-group">
              <p>{group}</p>
              {nav.filter((item) => item.group === group).map((item) => (
                <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
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
          <div><p>{view === "cash" || view === "income" ? "FINANZAS" : view === "dashboard" ? "PRINCIPAL" : "GESTION"}</p><h1>{title}</h1></div>
          <button className="ghost" onClick={loadAll} disabled={loading}><RefreshCw size={16} /> Actualizar</button>
        </header>
        {view === "dashboard" && <Dashboard data={data} setView={setView} />}
        {view === "rooms" && <Rooms rooms={data.rooms} guests={data.guests} reload={loadAll} onToast={setToast} />}
        {view === "guests" && <Guests rooms={data.rooms} guests={data.guests} reload={loadAll} onToast={setToast} />}
        {view === "cleaning" && <Cleaning rooms={data.rooms} incidents={data.incidents} reload={loadAll} />}
        {view === "logbook" && <Logbook incidents={data.incidents} reload={loadAll} />}
        {view === "cash" && <Cash data={data} reload={loadAll} onToast={setToast} />}
        {view === "income" && <Income movements={data.movements} summary={data.summary} receipts={data.receipts} reload={loadAll} onToast={setToast} />}
        {view === "employees" && <Employees employees={data.employees} currentShift={data.currentShift} />}
        {view === "users" && <UsersAdmin users={data.users} roles={data.roles} reload={loadAll} onToast={setToast} />}
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
        <p>CUENCA - ECUADOR</p>
        <div className="mark">+</div>
        <h1>Wild<br />Incas</h1>
        <h2>BACKPACKERS HOSTAL</h2>
        <footer><span>SISTEMA<br />SIMOT v2.0</span><span>EQUIPO<br />J. Gutierrez<br />C. Rojas Benavides<br />R. Padilla</span></footer>
      </section>
      <form onSubmit={submit} className="login-form">
        <p>ACCESO AL SISTEMA</p>
        <h2>Bienvenido</h2>
        <span>Ingresa tus credenciales para continuar</span>
        <label>USUARIO<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>CONTRASENA<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button>Ingresar al sistema</button>
        {error && <small className="error">{error}</small>}
        <small>SIMOT v2.0 - Wild Incas Backpackers Hostal</small>
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
  const byGuest = Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  const filtered = filter === "all" ? rooms : rooms.filter((room) => room.status === filter);
  const floors = [...new Set(filtered.map((room) => room.floor))].sort((a, b) => a - b);

  async function createRoom(values) {
    await request("/rooms", { method: "POST", body: JSON.stringify(values) });
    onToast("Habitacion registrada");
    setOpen(false);
    reload();
  }

  return (
    <>
      <div className="toolbar"><Filters values={["all", "available", "occupied", "cleaning", "reserved"]} active={filter} onChange={setFilter} /><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nueva habitacion</button></div>
      {floors.map((floor) => (
        <section className="floor" key={floor}>
          <div className="section-line"><span>PISO {floor}</span><small>{filtered.filter((room) => room.floor === floor).length} hab.</small></div>
          <div className="room-grid">{filtered.filter((room) => room.floor === floor).map((room) => <RoomTile key={room.id} room={room} guest={byGuest[room.guestId]} />)}</div>
        </section>
      ))}
      {open && <RoomModal onClose={() => setOpen(false)} onSubmit={createRoom} />}
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
    if (paid > 0) await request("/finance/movements", { method: "POST", body: JSON.stringify({ type: "income", concept: `Check-in Hab. ${values.roomId} - ${values.name}`, method: values.method || "Efectivo", amount: paid }) });
    if (paid > 0 && values.email) await request("/notifications/receipts", { method: "POST", body: JSON.stringify({ to: values.email, guestName: values.name, amount: paid, concept: `Hospedaje Hab. ${values.roomId}` }) });
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
      {open && <GuestModal rooms={rooms.filter((room) => room.status !== "occupied")} onClose={() => setOpen(false)} onSubmit={createGuest} />}
    </section>
  );
}

function Cleaning({ rooms, incidents }) {
  return (
    <div className="grid two">
      <section className="panel"><h3>Tareas de limpieza</h3>{rooms.filter((room) => room.status === "cleaning").map((room) => <Task key={room.id} icon={Sparkles} title={`Hab. ${room.id}`} detail={room.notes || "Limpieza pendiente"} status="cleaning" />)}</section>
      <section className="panel"><h3>Mantenimiento</h3>{incidents.filter((item) => item.category === "mantenimiento").map((item) => <Task key={item.id} icon={ClipboardList} title={item.title} detail={item.description} status={item.status} />)}</section>
    </div>
  );
}

function Logbook({ incidents, reload }) {
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("all");
  const filtered = incidents.filter((item) => (status === "all" || item.status === status) && (category === "all" || item.category === category));
  async function createIncident() {
    await request("/operations/incidents", { method: "POST", body: JSON.stringify({ title: "Novedad de turno", description: "Registro creado desde frontend local.", category: "general", createdBy: "Apolo" }) });
    reload();
  }
  return (
    <>
      <div className="split-toolbar"><Filters values={["open", "resolved", "all"]} active={status} onChange={setStatus} /><Filters values={["all", "incidencia", "mantenimiento", "huesped", "seguridad", "general"]} active={category} onChange={setCategory} /><button className="primary" onClick={createIncident}><Plus size={16} /> Nueva novedad</button></div>
      <section className="panel emptyish">{filtered.length === 0 ? <div className="empty"><ClipboardList /><span>No hay novedades con estos filtros</span></div> : filtered.map((item) => <Task key={item.id} icon={ClipboardList} title={item.title} detail={item.description} status={item.status} />)}</section>
    </>
  );
}

function Cash({ data, reload, onToast }) {
  const [checked, setChecked] = useState({});
  const [initial, setInitial] = useState("");
  const [closed, setClosed] = useState("");
  const allDone = data.checklist.length && data.checklist.every((item) => checked[item.id]);

  async function openCash() {
    await request("/finance/shifts/open", { method: "POST", body: JSON.stringify({ responsible: "Apolo Administrador", shift: "Tarde", initial: Number(initial || 0) }) });
    onToast("Caja abierta");
    reload();
  }

  async function closeCash() {
    await request("/finance/shifts/close", { method: "POST", body: JSON.stringify({ closed: Number(closed || 0) }) });
    onToast("Caja cerrada");
    setClosed("");
    reload();
  }

  return (
    <div className="cash-layout">
      <section className="panel">
        <div className="feature-title"><WalletCards /><span><b>{data.shifts.openShift ? "Caja abierta" : "Abrir caja"}</b><small>Turno de recepcion</small></span></div>
        <label>RESPONSABLE<input value={data.shifts.openShift?.responsible || "Apolo Administrador"} readOnly /></label>
        <label>TURNO<div className="segmented"><button>Manana</button><button className="selected">Tarde</button><button>Noche</button></div></label>
        {!data.shifts.openShift && <label>MONTO INICIAL EN CAJA (USD)<input placeholder="0.00" value={initial} onChange={(e) => setInitial(e.target.value)} /></label>}
        {data.shifts.openShift && <label>MONTO DE CIERRE REAL (USD)<input placeholder="0.00" value={closed} onChange={(e) => setClosed(e.target.value)} /></label>}
        {data.shifts.openShift && <button className="primary" onClick={closeCash}><Save size={16} /> Cerrar caja</button>}
      </section>
      <section className="panel">
        <div className="feature-title"><CalendarCheck /><span><b>Checklist de inicio de turno</b><small>Verifica antes de empezar</small></span></div>
        {data.checklist.map((item) => <button className="check-row" key={item.id} onClick={() => setChecked({ ...checked, [item.id]: !checked[item.id] })}><span className={checked[item.id] ? "done" : ""}>{checked[item.id] && <Check size={14} />}</span>{item.title}</button>)}
        <div className="check-footer"><small>{Object.values(checked).filter(Boolean).length} de {data.checklist.length} verificados</small><button className="primary" disabled={!allDone || data.shifts.openShift} onClick={openCash}><WalletCards size={16} /> Abrir caja</button></div>
      </section>
      <section className="panel span-2">
        <div className="section-line"><span>HISTORIAL DE TURNOS</span><small>{data.shifts.history?.length || 0} cerrados</small></div>
        <ShiftTable shifts={data.shifts.history || []} />
      </section>
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
        <section className="panel"><h3>Comprobantes</h3>{receipts.length === 0 ? <div className="empty"><Receipt /><span>Sin comprobantes enviados todavia</span></div> : receipts.map((item) => <Task key={item.id} icon={Receipt} title={item.guestName} detail={`${item.to} - ${money(item.amount)} - ${item.status}`} status={item.status === "sent" ? "active" : "open"} />)}</section>
      </div>
      {open && <MovementModal onClose={() => setOpen(false)} onSubmit={createMovement} />}
    </>
  );
}

function Employees({ employees, currentShift }) {
  return (
    <>
      <div className="shift-banner"><CalendarCheck size={18} /><span><small>TURNO {currentShift?.shift?.toUpperCase()} - ACTIVO AHORA</small><b>{currentShift?.name}</b></span></div>
      <div className="employee-grid">{employees.map((employee) => <article className="employee-card" key={employee.id}><div><Avatar name={employee.name} /><span><b>{employee.name}</b><small>{employee.role}</small></span></div><p>{employee.shift} - {employee.hours}</p><p>{employee.phone}</p><p>{employee.email}</p><p>{employee.username} - {employee.modules.length} modulos</p><footer><small>Desde {employee.since}</small><Badge status={employee.status} /></footer></article>)}</div>
    </>
  );
}

function UsersAdmin({ users, roles, reload, onToast }) {
  const [open, setOpen] = useState(false);
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
  return (
    <>
      <div className="toolbar"><div className="panel slim"><b>Roles operativos</b><small>Administra acceso por modulo como en un ERP real.</small></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo usuario</button></div>
      <div className="grid two">
        <section className="panel"><h3>Usuarios del sistema</h3>{users.map((user) => <div className="user-row" key={user.id}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.username} - {user.email || "sin correo"}</small></span><select value={user.roleId} onChange={(event) => updateRole(user, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><Badge status={user.status} /></div>)}</section>
        <section className="panel"><h3>Permisos por rol</h3>{roles.map((role) => <div className="role-card" key={role.id}><b>{role.name}</b><small>{role.description}</small><p>{role.modules.join(", ")}</p></div>)}</section>
      </div>
      {open && <UserModal roles={roles} onClose={() => setOpen(false)} onSubmit={createUser} />}
    </>
  );
}

function RoomModal({ onClose, onSubmit }) {
  const [values, setValues] = useState({ id: "", floor: 1, type: "Habitacion Privada", capacity: 2, rate: 35, status: "available", notes: "" });
  return <Modal title="Nueva habitacion" onClose={onClose}><FormGrid values={values} setValues={setValues} fields={[["id", "Numero"], ["floor", "Piso", "number"], ["type", "Tipo"], ["capacity", "Capacidad", "number"], ["rate", "Tarifa por noche", "number"], ["notes", "Notas"]]} /><button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Guardar habitacion</button></Modal>;
}

function GuestModal({ rooms, onClose, onSubmit }) {
  const [values, setValues] = useState({ name: "", country: "", documentType: "Pasaporte", documentNumber: "", email: "", roomId: rooms[0]?.id || "", checkIn: new Date().toISOString().slice(0, 10), checkOut: "", exitTime: "11:00", paid: 0, total: 0, method: "Efectivo" });
  return <Modal title="Nuevo huesped" onClose={onClose}><FormGrid values={values} setValues={setValues} fields={[["name", "Nombre"], ["country", "Nacionalidad"], ["documentType", "Documento"], ["documentNumber", "Numero"], ["email", "Email"], ["checkIn", "Entrada", "date"], ["checkOut", "Salida", "date"], ["exitTime", "Hora salida"], ["paid", "Pagado", "number"], ["total", "Total", "number"]]} /><label>HABITACION<select value={values.roomId} onChange={(event) => setValues({ ...values, roomId: event.target.value })}>{rooms.map((room) => <option key={room.id} value={room.id}>Hab. {room.id} - {room.type} - {money(room.rate)}</option>)}</select></label><button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Registrar huesped</button></Modal>;
}

function MovementModal({ onClose, onSubmit }) {
  const [values, setValues] = useState({ type: "income", concept: "", method: "Efectivo", amount: 0 });
  return <Modal title="Movimiento contable" onClose={onClose}><label>TIPO<select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="income">Ingreso</option><option value="expense">Gasto</option></select></label><FormGrid values={values} setValues={setValues} fields={[["concept", "Concepto"], ["method", "Metodo"], ["amount", "Monto", "number"]]} /><button className="primary" onClick={() => onSubmit(values)}><Save size={16} /> Guardar movimiento</button></Modal>;
}

function UserModal({ roles, onClose, onSubmit }) {
  const [values, setValues] = useState({ name: "", username: "", email: "", password: "", roleId: roles[0]?.id || "recepcion" });
  return <Modal title="Nuevo usuario" onClose={onClose}><FormGrid values={values} setValues={setValues} fields={[["name", "Nombre"], ["username", "Usuario"], ["email", "Email"], ["password", "Contrasena", "password"]]} /><label>ROL<select value={values.roleId} onChange={(event) => setValues({ ...values, roleId: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button className="primary" onClick={() => onSubmit(values)}><UserCog size={16} /> Crear usuario</button></Modal>;
}

function FormGrid({ fields, values, setValues }) {
  return <div className="form-grid">{fields.map(([key, label, type = "text"]) => <label key={key}>{label.toUpperCase()}<input type={type} value={values[key] ?? ""} onChange={(event) => setValues({ ...values, [key]: type === "number" ? Number(event.target.value) : event.target.value })} /></label>)}</div>;
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop"><section className="modal"><header><h3>{title}</h3><button onClick={onClose}><X size={18} /></button></header>{children}</section></div>;
}

function ShiftTable({ shifts }) {
  return <div className="table compact"><div className="tr head"><span>FECHA</span><span>TURNO</span><span>RESPONSABLE</span><span>INICIAL</span><span>CIERRE</span><span>ESPERADO</span><span>DIFERENCIA</span></div>{shifts.map((shift) => <div className="tr" key={shift.id}><span>{shift.date}</span><span><Badge status={shift.shift} /></span><span>{shift.responsible}</span><span>{money(shift.initial)}</span><span><b>{money(shift.closed)}</b></span><span>{money(shift.expected)}</span><span className={shift.difference < 0 ? "red" : "green"}>{money(shift.difference)}</span></div>)}</div>;
}

function RoomTile({ room, guest, compact = false }) {
  return <article className={`room-card ${room.status} ${compact ? "compact-room" : ""}`}><div><h3>{room.id}</h3><Badge status={room.status} /></div>{!compact && <><small>PISO {room.floor}</small><p>{room.type}</p><dl><dt>Capacidad</dt><dd>{room.capacity} pers.</dd><dt>Tarifa</dt><dd>{money(room.rate)}/noche</dd><dt>Ultima limpieza</dt><dd>{room.lastCleaned}</dd></dl>{guest && <footer><b>{guest.name}</b><small>Salida: {guest.checkOut} - {guest.exitTime}</small><span>{guest.paid >= guest.total ? "Pagado" : "Parcial"}</span></footer>}{room.notes && <em>{room.notes}</em>}</>}</article>;
}

function Task({ icon: Icon, title, detail, status }) {
  return <div className="task"><Icon size={17} /><span><b>{title}</b><small>{detail}</small></span><Badge status={status} /></div>;
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
