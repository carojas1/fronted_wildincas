import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BadgeDollarSign,
  BedDouble,
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Grid2X2,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "https://backend-wildincas.onrender.com/api";

const nav = [
  { id: "dashboard", label: "Dashboard", hint: "Operacion de hoy", icon: Grid2X2, group: "PRINCIPAL" },
  { id: "reservations", label: "Reservas", hint: "Estadias y consumos", icon: CalendarCheck, group: "OPERACION" },
  { id: "guests", label: "Huespedes", hint: "Directorio de clientes", icon: Users, group: "OPERACION" },
  { id: "rooms", label: "Habitaciones", hint: "Inventario y tarifas", icon: BedDouble, group: "OPERACION" },
  { id: "cleaning", label: "Limpieza", hint: "Tareas por habitacion", icon: Sparkles, group: "OPERACION" },
  { id: "logbook", label: "Bitacora", hint: "Novedades e incidencias", icon: ClipboardList, group: "OPERACION" },
  { id: "billing", label: "Facturacion", hint: "Facturas y pagos", icon: Receipt, group: "FINANZAS" },
  { id: "cash", label: "Caja", hint: "Turnos y efectivo", icon: WalletCards, group: "FINANZAS" },
  { id: "income", label: "Contabilidad", hint: "Ingresos, gastos y Excel", icon: BadgeDollarSign, group: "FINANZAS" },
  { id: "employees", label: "Empleados", hint: "Personal y turnos", icon: BriefcaseBusiness, group: "ADMINISTRACION" },
  { id: "users", label: "Accesos", hint: "Roles y permisos", icon: UserCog, group: "ADMINISTRACION" }
];

const labels = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "En limpieza",
  maintenance: "Mantenimiento",
  out_of_service: "Fuera de servicio",
  confirmed: "Confirmada",
  checked_in: "Hospedado",
  checked_out: "Finalizada",
  cancelled: "Cancelada",
  open: "Abierta",
  resolved: "Resuelta",
  income: "Ingreso",
  expense: "Gasto",
  paid: "Pagada",
  partial: "Pago parcial",
  pending: "Pendiente",
  sent: "Enviado",
  queued: "En cola",
  sending: "Enviando",
  pending_retry: "Reintento pendiente",
  configuration_error: "Configuracion pendiente",
  failed: "Fallido",
  active: "Activo",
  inactive: "Inactivo",
  overdue: "Salida vencida",
  overpaid: "Sobrepago",
  voided: "Anulado",
  all: "Todos"
};

const emptyData = {
  rooms: [], reservations: [], guests: [], movements: [], incidents: [], checklist: [], employees: [],
  invoices: [], payments: [], notifications: [], dashboard: {}, summary: {}, metrics: {}, daily: {}, shifts: {},
  users: [], roles: [], currentShift: null, emailConfig: {}
};

const viewSources = {
  dashboard: [["rooms", "/rooms", []], ["dashboard", "/reservations/dashboard", {}], ["metrics", "/finance/metrics", {}], ["movements", "/finance/movements", []]],
  reservations: [["rooms", "/rooms", []], ["reservations", "/reservations/reservations", []], ["guests", "/reservations/guests", []], ["payments", "/finance/payments", []]],
  guests: [["guests", "/reservations/guests", []], ["reservations", "/reservations/reservations", []], ["payments", "/finance/payments", []], ["invoices", "/finance/invoices", []]],
  rooms: [["rooms", "/rooms", []]],
  cleaning: [["rooms", "/rooms", []], ["incidents", "/operations/incidents", []]],
  logbook: [["incidents", "/operations/incidents", []], ["rooms", "/rooms", []]],
  billing: [["invoices", "/finance/invoices", []], ["payments", "/finance/payments", []], ["reservations", "/reservations/reservations", []], ["notifications", "/notifications/events", []], ["emailConfig", "/notifications/config", {}]],
  cash: [["daily", "/finance/daily", {}], ["shifts", "/finance/shifts", {}], ["checklist", "/operations/checklist", []]],
  income: [["summary", "/finance/summary", {}], ["movements", "/finance/movements", []], ["payments", "/finance/payments", []]],
  employees: [["employees", "/employees", []], ["currentShift", "/employees/current-shift", null], ["roles", "/auth/roles", []], ["users", "/auth/users", []]],
  users: [["users", "/auth/users", []], ["roles", "/auth/roles", []], ["emailConfig", "/notifications/config", {}]]
};

function sessionValue() {
  try { return JSON.parse(localStorage.getItem("simot-session") || "null"); } catch { return null; }
}

let authFailureNotified = false;

async function request(path, options = {}) {
  const session = sessionValue();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`Tiempo de espera agotado en ${path}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    if (response.status === 401 && session) {
      localStorage.removeItem("simot-session");
      if (!authFailureNotified) {
        authFailureNotified = true;
        window.dispatchEvent(new CustomEvent("simot:unauthorized", { detail: payload.error?.message }));
      }
    }
    throw new Error(payload.error?.message || `Error ${response.status}`);
  }
  return payload.data;
}

async function attempt(notify, action) {
  try {
    return { ok: true, value: await action() };
  } catch (error) {
    notify(error.message || "No se pudo completar la operacion", "warning");
    return { ok: false, value: null };
  }
}

function money(value) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function dateText(value, withTime = false) {
  if (!value) return "-";
  const date = new Date(withTime ? value : `${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-EC", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function App() {
  const [session, setSession] = useState(sessionValue);
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function loadView(target = view) {
    setLoading(true);
    const sources = viewSources[target] || viewSources.dashboard;
    try {
      const results = await Promise.allSettled(sources.map(([, path]) => request(path)));
      const updates = {};
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") updates[sources[index][0]] = result.value;
        else failures.push(sources[index][1]);
      });
      if (Object.keys(updates).length) setData((current) => ({ ...current, ...updates }));
      if (failures.length) notify(`No se actualizaron ${failures.length} fuente(s). Se conservaron los ultimos datos validos.`, "warning");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    loadView(view);
    const timer = setInterval(() => loadView(view), 60000);
    return () => clearInterval(timer);
  }, [session, view]);

  useEffect(() => {
    function handleUnauthorized() {
      setData(emptyData);
      setSession(null);
      setToast({ message: "Tu sesion vencio. Ingresa nuevamente.", tone: "warning" });
    }
    window.addEventListener("simot:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("simot:unauthorized", handleUnauthorized);
  }, []);

  function notify(message, tone = "success") {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 5000);
  }

  if (!session) return <Login onLogin={(value) => { authFailureNotified = false; setSession(value); setView("dashboard"); }} />;
  const modules = session.user.modules || [];
  const visibleNav = modules.includes("all") ? nav : nav.filter((item) => modules.includes(item.id));
  const active = visibleNav.some((item) => item.id === view) ? view : visibleNav[0]?.id || "dashboard";
  const title = nav.find((item) => item.id === active)?.label || "Dashboard";
  const reload = () => loadView(active);
  const common = { data, reload, notify, session };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>WI</span><div><strong>Wild Incas</strong><small>Hotel management</small></div></div>
      <div className="system-state"><i /> Operacion conectada</div>
      <nav>{[...new Set(visibleNav.map((item) => item.group))].map((group) => <div className="nav-section" key={group}>
        <p>{group}</p>{visibleNav.filter((item) => item.group === group).map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setView(item.id)} title={item.label}>
          <item.icon size={18} /><span><b>{item.label}</b><small>{item.hint}</small></span>
        </button>)}</div>)}</nav>
      <div className="profile"><Avatar name={session.user.name} /><span><b>{session.user.name}</b><small>{session.user.role}</small></span><button title="Cerrar sesion" onClick={() => { localStorage.removeItem("simot-session"); setSession(null); }}><LogOut size={17} /></button></div>
    </aside>
    <main>
      <header className="page-header"><div><p>{nav.find((item) => item.id === active)?.group}</p><h1>{title}</h1></div><button className="secondary" onClick={reload} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Actualizar</button></header>
      {active === "dashboard" && <Dashboard {...common} setView={setView} />}
      {active === "reservations" && <Reservations {...common} />}
      {active === "guests" && <Guests {...common} />}
      {active === "rooms" && <Rooms {...common} />}
      {active === "cleaning" && <Cleaning {...common} />}
      {active === "logbook" && <Logbook {...common} />}
      {active === "billing" && <Billing {...common} />}
      {active === "cash" && <Cash {...common} />}
      {active === "income" && <Accounting {...common} />}
      {active === "employees" && <Employees {...common} />}
      {active === "users" && <Access {...common} />}
    </main>
    {toast && <button className={`toast ${toast.tone}`} onClick={() => setToast(null)}>{toast.message}</button>}
  </div>;
}

function Login({ onLogin }) {
  const [values, setValues] = useState({ username: "apolo", password: "admin123" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [warming, setWarming] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(API.replace(/\/api\/?$/, "/health"), { signal: controller.signal })
      .catch(() => null)
      .finally(() => setWarming(false));
    return () => controller.abort();
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request("/auth/login", { method: "POST", body: JSON.stringify(values), timeout: 70000 });
      localStorage.setItem("simot-session", JSON.stringify(result)); onLogin(result);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <div className="login-page">
    <section className="login-brand"><div className="brand-mark">WI</div><div><p>Cuenca, Ecuador</p><h1>Wild Incas</h1><h2>Gestion hotelera, reservas y contabilidad en una sola operacion.</h2></div><footer><span>API Gateway</span><span>Microservicios</span><span>Supabase</span></footer></section>
    <form className="login-panel" onSubmit={submit}><div className="login-icon"><ShieldCheck size={22} /></div><p>ACCESO AL SISTEMA</p><h2>Bienvenido</h2>
      <Field label="Usuario" value={values.username} onChange={(username) => setValues({ ...values, username })} autoComplete="username" />
      <Field label="Contrasena" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} autoComplete="current-password" />
      <button className="primary" disabled={busy}>{busy ? "Conectando con la operacion..." : "Ingresar"}</button>
      <div className={`login-connection ${warming ? "warming" : "ready"}`}><i />{warming ? "Preparando servicios de produccion" : "Servicios listos para iniciar sesion"}</div>
      {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}
    </form>
  </div>;
}

function Dashboard({ data, setView }) {
  const occupied = data.dashboard.occupiedRoomIds?.length || 0;
  const occupancy = data.rooms.length ? Math.round((occupied / data.rooms.length) * 100) : 0;
  const recentMovements = data.movements.filter((item) => item.status !== "voided").slice(0, 8);
  const cards = [
    ["Ocupacion actual", `${occupancy}%`, `${occupied} de ${data.rooms.length} habitaciones`, BedDouble],
    ["Cobros confirmados", money(data.metrics.collected), "Pagos efectivos registrados", TrendingUp],
    ["Facturacion final", money(data.metrics.revenue), `${data.metrics.invoices || 0} comprobantes emitidos`, Receipt],
    ["Por cobrar", money(data.metrics.accountsReceivable), "Saldos de facturas finales", WalletCards]
  ];
  return <div className="dashboard-stack">
    <section className="kpi-grid">{cards.map(([title, value, detail, Icon]) => <article className="kpi" key={title}><span><Icon size={18} /></span><small>{title}</small><strong>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel room-board"><PanelHeader title="Estado de habitaciones" action="Ver habitaciones" onClick={() => setView("rooms")} /><div className="room-map">{data.rooms.map((room) => <RoomCompact key={room.id} room={room} />)}</div><RoomLegend /></article>
      <article className="panel today"><PanelHeader title="Agenda de hoy" />
        <AgendaBlock title="Llegadas" items={data.dashboard.arrivals} empty="Sin llegadas programadas" />
        <AgendaBlock title="Salidas" items={data.dashboard.departures} empty="Sin salidas pendientes" />
      </article>
      <article className="panel span-2"><PanelHeader title="Actividad financiera reciente" action="Abrir contabilidad" onClick={() => setView("income")} /><MovementList items={recentMovements} /></article>
    </section>
  </div>;
}

function Reservations({ data, reload, notify, session }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const overdueCount = data.reservations.filter(isOverdueStay).length;
  const rows = data.reservations.filter((item) => {
    const statusMatches = filter === "all" || (filter === "overdue" ? isOverdueStay(item) : item.status === filter);
    const queryMatches = [item.code, item.guest?.name, item.guest?.documentNumber, item.roomId]
      .some((value) => String(value || "").toLowerCase().includes(query.toLowerCase()));
    return statusMatches && queryMatches;
  });
  async function create(values) {
    const result = await request("/reservations/reservations", { method: "POST", body: JSON.stringify({ ...values, actor: session.user.name }) });
    notify(result.notification?.status === "sent" ? "Reserva guardada y correo enviado" : "Reserva guardada; correo en cola de reintento", result.notification?.status === "sent" ? "success" : "warning");
    setModal(null); reload();
  }
  async function checkIn(item) {
    const result = await attempt(notify, () => request(`/reservations/reservations/${item.id}/check-in`, { method: "POST", body: JSON.stringify({ actor: session.user.name }) }));
    if (!result.ok) return;
    notify(`Check-in registrado en la habitacion ${item.roomId}`); reload();
  }
  async function cancel(item) {
    const reason = window.prompt("Motivo de cancelacion", "Solicitud del cliente");
    if (reason === null) return;
    const result = await attempt(notify, () => request(`/reservations/reservations/${item.id}/cancel`, { method: "POST", body: JSON.stringify({ reason, actor: session.user.name }) }));
    if (!result.ok) return;
    notify("Reserva cancelada"); reload();
  }
  async function addCharge(item, values) {
    await request(`/reservations/reservations/${item.id}/charges`, { method: "POST", body: JSON.stringify({ ...values, actor: session.user.name }) });
    notify("Consumo agregado a la estadia"); setModal(null); reload();
  }
  async function addPayment(item, values) {
    const result = await request(`/reservations/reservations/${item.id}/payments`, { method: "POST", body: JSON.stringify({ ...values, actor: session.user.name }) });
    notify(`Pago registrado. Cambio: ${money(result.payment.change)}. ${result.notification?.status === "sent" ? "Correo enviado." : "Correo en cola."}`); setModal(null); reload();
  }
  async function checkout(item) {
    if (!window.confirm(`Finalizar estadia ${item.code} y emitir factura definitiva?`)) return;
    const result = await attempt(notify, () => request(`/reservations/reservations/${item.id}/checkout`, { method: "POST", body: JSON.stringify({ actor: session.user.name }) }));
    if (!result.ok) return;
    notify(`Checkout completado. Factura ${result.value.invoice.number} por ${money(result.value.invoice.total)}`); reload();
  }
  async function update(item, values) {
    await request(`/reservations/reservations/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...values, actor: session.user.name }) });
    notify("Reserva actualizada"); setModal(null); reload();
  }
  return <>
    <div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reserva, huesped, documento o habitacion" /></div><StatusFilters values={["all", "overdue", "confirmed", "checked_in", "checked_out", "cancelled"]} active={filter} onChange={setFilter} />{overdueCount > 0 && <div className="counter attention"><AlertTriangle size={15} /> {overdueCount} salida(s) por cerrar</div>}<button className="primary" onClick={() => setModal({ type: "create" })}><Plus size={17} /> Nueva estadia</button></div>
    <div className="data-table reservation-table"><div className="table-row table-head"><span>RESERVA / HUESPED</span><span>HABITACION</span><span>ESTADIA</span><span>TOTAL</span><span>ESTADO</span><span>ACCIONES</span></div>
      {rows.map((item) => {
        const account = paymentSummary(data.payments, item.id, item.total);
        const overdue = isOverdueStay(item);
        return <div className={`table-row ${overdue ? "overdue-row" : ""}`} key={item.id}><span><b>{item.code}</b><small>{item.guest?.name}</small><small>{item.guest?.documentNumber || "Consumidor final"}</small></span><span><b>Hab. {item.roomId}</b><small>{item.roomType}</small><small>{money(item.nightlyRate)}/noche</small></span><span><b>{dateText(item.checkIn)} - {dateText(item.checkOut)}</b><small>{item.nights} noche(s), {item.adults} adulto(s)</small><small>{item.charges?.length || 0} consumo(s)</small>{overdue && <small className="negative">Salida pendiente desde {dateText(item.checkOut)}</small>}</span><span><b>{money(item.total)}</b><small>{money(account.paid)} pagado</small><small>{money(account.balance)} pendiente</small>{account.overpaid > 0 && <small className="negative">Sobrepago: {money(account.overpaid)}</small>}</span><span><Status status={overdue ? "overdue" : item.status} /></span><span className="row-actions">
        <IconButton title="Ver detalle" onClick={() => setModal({ type: "detail", item })}><Eye size={16} /></IconButton>
        {["confirmed", "checked_in"].includes(item.status) && <IconButton title="Editar o ampliar estadia" onClick={() => setModal({ type: "edit", item })}><Pencil size={16} /></IconButton>}
        {item.status === "confirmed" && <IconButton title="Check-in" onClick={() => checkIn(item)}><LogIn size={16} /></IconButton>}
        {item.status === "checked_in" && <IconButton title="Agregar cargo o servicio" onClick={() => setModal({ type: "charge", item })}><Plus size={16} /></IconButton>}
        {["confirmed", "checked_in", "checked_out"].includes(item.status) && paymentTotal(data.payments, item.id) < item.total && <IconButton title="Registrar pago" onClick={() => setModal({ type: "payment", item })}><CreditCard size={16} /></IconButton>}
        {item.status === "checked_in" && <IconButton title="Checkout" onClick={() => checkout(item)}><LogOut size={16} /></IconButton>}
        {item.status === "confirmed" && <IconButton title="Cancelar" danger onClick={() => cancel(item)}><X size={16} /></IconButton>}
      </span></div>;
      })}
      {!rows.length && <Empty icon={BookOpenCheck} text="No hay reservas con estos filtros" />}
    </div>
    {modal?.type === "create" && <ReservationModal rooms={data.rooms} reservations={data.reservations} onClose={() => setModal(null)} onSubmit={create} />}
    {modal?.type === "edit" && <ReservationModal reservation={modal.item} rooms={data.rooms} reservations={data.reservations} onClose={() => setModal(null)} onSubmit={(values) => update(modal.item, values)} />}
    {modal?.type === "charge" && <ChargeModal reservation={modal.item} onClose={() => setModal(null)} onSubmit={(values) => addCharge(modal.item, values)} />}
    {modal?.type === "payment" && <PaymentModal reservation={modal.item} payments={data.payments} onClose={() => setModal(null)} onSubmit={(values) => addPayment(modal.item, values)} />}
    {modal?.type === "detail" && <ReservationDetail item={data.reservations.find((row) => row.id === modal.item.id) || modal.item} payments={data.payments} onClose={() => setModal(null)} />}
  </>;
}

function Guests({ data, reload, notify }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const rows = data.guests.filter((item) => [item.name, item.documentNumber, item.email, item.phone].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  async function update(values) {
    const result = await attempt(notify, () => request(`/reservations/guests/${values.id}`, { method: "PATCH", body: JSON.stringify(values) }));
    if (!result.ok) return;
    notify("Datos del huesped actualizados"); setEditing(null); reload();
  }
  return <><div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, cedula, correo o telefono" /></div><div className="counter">{rows.length} huespedes</div></div>
    <div className="guest-grid">{rows.map((guest) => {
      const stays = data.reservations.filter((item) => item.guestId === guest.id);
      return <article className="guest-card" key={guest.id}>
        <header><Avatar name={guest.name} /><span><b>{guest.name}</b><small>{guest.country || "Nacionalidad no registrada"}</small></span><IconButton title="Editar" onClick={() => setEditing(guest)}><Pencil size={15} /></IconButton></header>
        <dl><dt>Documento</dt><dd>{guest.documentType} {guest.documentNumber || "-"}</dd><dt>Correo</dt><dd>{guest.email || "-"}</dd><dt>Telefono</dt><dd>{guest.phone || "-"}</dd><dt>Direccion</dt><dd>{guest.address || "-"}</dd></dl>
        <footer><button className="text-action" onClick={() => setHistory({ guest, stays })}><Eye size={15} /> Ver {stays.length} estadia(s)</button><Status status={stays.some((item) => item.status === "checked_in") ? "active" : "inactive"} /></footer>
      </article>;
    })}</div>
    {editing && <GuestModal guest={editing} onClose={() => setEditing(null)} onSubmit={update} />}
    {history && <GuestHistoryModal guest={history.guest} stays={history.stays} payments={data.payments} onClose={() => setHistory(null)} />}
  </>;
}

function Rooms({ data, reload, notify }) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const rows = data.rooms.filter((room) => filter === "all" || room.status === filter);
  async function save(values) {
    const { _new, ...payload } = values;
    const result = await attempt(notify, () => request(_new ? "/rooms" : `/rooms/${values.id}`, {
      method: _new ? "POST" : "PATCH",
      body: JSON.stringify(payload)
    }));
    if (!result.ok) return;
    notify(_new ? "Habitacion creada" : "Habitacion actualizada"); setEditing(null); reload();
  }
  function createRoom() {
    setEditing({ _new: true, id: "", floor: 1, type: "Habitacion Privada", capacity: 2, rate: 0, status: "available", notes: "", amenities: [] });
  }
  return <><div className="toolbar"><StatusFilters values={["all", "available", "occupied", "cleaning", "maintenance", "out_of_service"]} active={filter} onChange={setFilter} /><div className="counter">{data.rooms.length} habitaciones configuradas</div><button className="primary" onClick={createRoom}><Plus size={17} /> Nueva habitacion</button></div>
    {[...new Set(rows.map((room) => room.floor))].sort((a, b) => a - b).map((floor) => <section className="floor" key={floor}><div className="section-title"><span>Piso {floor}</span><small>{rows.filter((room) => room.floor === floor).length} habitaciones</small></div><div className="room-grid">{rows.filter((room) => room.floor === floor).map((room) => <RoomCard key={room.id} room={room} reservation={data.reservations.find((item) => item.roomId === room.id && item.status === "checked_in")} onEdit={() => setEditing(room)} />)}</div></section>)}
    {!rows.length && <Empty icon={BedDouble} text={data.rooms.length ? "No hay habitaciones con este filtro" : "No hay habitaciones configuradas"} />}
    {editing && <RoomModal room={editing} onClose={() => setEditing(null)} onSubmit={save} />}
  </>;
}

function Cleaning({ data, reload, notify }) {
  const [creating, setCreating] = useState(false);
  const rooms = data.rooms.filter((item) => item.status === "cleaning");
  async function complete(room) { const result = await attempt(notify, () => request(`/rooms/${room.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "available" }) })); if (!result.ok) return; notify(`Habitacion ${room.id} limpia y disponible`); reload(); }
  async function create(values) { const result = await attempt(notify, () => request(`/rooms/${values.roomId}/cleaning`, { method: "POST", body: JSON.stringify({ notes: values.notes }) })); if (!result.ok) return; notify("Tarea de limpieza creada"); setCreating(false); reload(); }
  return <><div className="toolbar"><div className="counter">{rooms.length} tareas pendientes</div><button className="primary" onClick={() => setCreating(true)}><Plus size={17} /> Nueva tarea</button></div><div className="cleaning-layout"><section className="panel"><PanelHeader title="Limpieza de habitaciones" />{rooms.length ? rooms.map((room) => <article className="work-item" key={room.id}><span className="work-icon"><Sparkles size={18} /></span><div><b>Habitacion {room.id}</b><p>{room.housekeepingNotes || room.notes || "Limpieza completa pendiente"}</p><small>{room.type} - Piso {room.floor} - ultima limpieza {room.lastCleaned || "sin registro"}</small></div><button className="primary compact" onClick={() => complete(room)}><Check size={16} /> Completar</button></article>) : <Empty icon={Sparkles} text="No hay habitaciones pendientes de limpieza" />}</section><section className="panel"><PanelHeader title="Mantenimiento abierto" />{data.incidents.filter((item) => item.category === "mantenimiento" && item.status === "open").map((item) => <WorkIncident key={item.id} item={item} />)}</section></div>{creating && <CleaningModal rooms={data.rooms} onClose={() => setCreating(false)} onSubmit={create} />}</>;
}

function Logbook({ data, reload, notify, session }) {
  const [filter, setFilter] = useState("open"); const [creating, setCreating] = useState(false);
  const rows = data.incidents.filter((item) => filter === "all" || item.status === filter);
  async function create(values) { const result = await attempt(notify, () => request("/operations/incidents", { method: "POST", body: JSON.stringify({ ...values, createdBy: session.user.name }) })); if (!result.ok) return; notify("Novedad registrada"); setCreating(false); reload(); }
  async function resolve(item) { const resolution = window.prompt("Resolucion aplicada", "Trabajo completado y verificado"); if (resolution === null) return; const result = await attempt(notify, () => request(`/operations/incidents/${item.id}/resolve`, { method: "PATCH", body: JSON.stringify({ resolution, resolvedBy: session.user.name }) })); if (!result.ok) return; notify("Novedad resuelta"); reload(); }
  return <><div className="toolbar"><StatusFilters values={["open", "resolved", "all"]} active={filter} onChange={setFilter} /><button className="primary" onClick={() => setCreating(true)}><Plus size={17} /> Nueva novedad</button></div><section className="panel incident-list">{rows.map((item) => <article className="incident" key={item.id}><span className={`priority ${item.priority}`} /><div><header><b>{item.title}</b><Status status={item.status} /></header><p>{item.description}</p><small>{dateText(item.createdAt, true)} - {item.createdBy}{item.roomId ? ` - Hab. ${item.roomId}` : ""}</small>{item.actionRequired && <em>Accion requerida: {item.actionRequired}</em>}{item.resolution && <em>Resolucion: {item.resolution}</em>}</div>{item.status === "open" && <button className="primary compact" onClick={() => resolve(item)}><Check size={16} /> Completar</button>}</article>)}{!rows.length && <Empty icon={ClipboardList} text="No hay novedades con este estado" />}</section>{creating && <IncidentModal rooms={data.rooms} onClose={() => setCreating(false)} onSubmit={create} />}</>;
}

function Billing({ data, reload, notify }) {
  const [invoice, setInvoice] = useState(null);
  const [payment, setPayment] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = data.invoices.filter((item) => (filter === "all" || item.paymentStatus === filter)
    && [item.number, item.reservationCode, item.guest?.name, item.guest?.documentNumber, item.roomId]
      .some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  const totals = data.invoices.reduce((summary, item) => ({
    billed: summary.billed + Number(item.total || 0),
    paid: summary.paid + Number(item.paid || 0),
    balance: summary.balance + Number(item.balance || 0)
  }), { billed: 0, paid: 0, balance: 0 });
  async function pay(item, values) {
    const reservation = data.reservations.find((row) => row.id === item.reservationId);
    if (!reservation) throw new Error("No se encontro la reserva de esta factura");
    await request(`/reservations/reservations/${reservation.id}/payments`, { method: "POST", body: JSON.stringify(values) });
    notify("Pago aplicado a la factura"); setPayment(null); reload();
  }
  async function retry(job) { const result = await attempt(notify, () => request(`/notifications/events/${job.id}/retry`, { method: "POST", body: "{}" })); if (!result.ok) return; notify("Correo agregado a la cola de reintento"); reload(); }
  async function sendInvoice(item) {
    if (!item.guest?.email) throw new Error("Registra el correo del cliente antes de enviar la factura");
    const reservation = data.reservations.find((row) => row.id === item.reservationId) || { code: item.reservationCode, roomId: item.roomId, checkIn: item.checkIn, checkOut: item.checkOut };
    await request("/notifications/events", { method: "POST", body: JSON.stringify({ eventType: "invoice-finalized", to: item.guest.email, idempotencyKey: `invoice-manual:${item.id}:${Date.now()}`, payload: { invoice: item, reservation, guest: item.guest } }) });
    notify(`Factura ${item.number} agregada a la cola de correo`); reload();
  }
  async function voidPayment(item) {
    const reason = window.prompt("Motivo de anulacion del pago", "Registro duplicado o correccion autorizada");
    if (reason === null) return;
    const result = await attempt(notify, () => request(`/finance/payments/${item.id}/void`, { method: "POST", body: JSON.stringify({ reason }) }));
    if (!result.ok) return;
    notify("Pago anulado con trazabilidad contable", "warning"); setInvoice(null); reload();
  }
  const invoicePayments = invoice ? data.payments.filter((item) => item.invoiceId === invoice.id || item.reservationId === invoice.reservationId) : [];
  const invoiceDelivery = invoice ? data.notifications.find((job) => job.payload?.invoice?.id === invoice.id) : null;
  return <div className="billing-layout">
    <section className="kpi-grid billing-kpis span-2"><MiniKpi title="Facturado" value={money(totals.billed)} detail={`${data.invoices.length} comprobantes definitivos`} /><MiniKpi title="Cobrado" value={money(totals.paid)} detail="Pagos confirmados" /><MiniKpi title="Por cobrar" value={money(totals.balance)} detail="Saldos pendientes" /><MiniKpi title="Aceptados por Brevo" value={data.emailConfig.queue?.sent || 0} detail={`${data.emailConfig.queue?.pending || 0} en proceso`} /></section>
    <div className="toolbar span-2"><div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Factura, cliente, documento o habitacion" /></div><StatusFilters values={["all", "paid", "partial", "pending"]} active={filter} onChange={setFilter} /></div>
    <section className="panel span-2"><PanelHeader title="Facturas definitivas" /><div className="data-table invoice-table"><div className="table-row table-head"><span>FACTURA</span><span>CLIENTE</span><span>ESTADIA</span><span>TOTAL</span><span>SALDO</span><span>ESTADO / ACCIONES</span></div>{rows.map((item) => <div className="table-row" key={item.id}><span><b>{item.number}</b><small>{dateText(item.issuedAt, true)}</small><small>{item.reservationCode}</small></span><span><b>{item.guest?.name || "Consumidor final"}</b><small>{item.guest?.documentNumber || "Documento no registrado"}</small><small>{item.guest?.email || "Sin correo"}</small></span><span><b>Hab. {item.roomId}</b><small>{dateText(item.checkIn)} - {dateText(item.checkOut)}</small><small>{item.nights || "-"} noche(s)</small></span><span><b>{money(item.total)}</b><small>{money(item.paid)} cobrado</small></span><span><b className={item.balance > 0 ? "negative" : "positive"}>{money(item.balance)}</b></span><span className="invoice-actions"><Status status={item.paymentStatus} /><IconButton title="Ver comprobante" onClick={() => setInvoice(item)}><Eye size={16} /></IconButton><IconButton title={item.guest?.email ? "Enviar al correo" : "Cliente sin correo registrado"} onClick={() => sendInvoice(item).catch((error) => notify(error.message, "warning"))}><Send size={16} /></IconButton>{item.balance > 0 && <IconButton title="Registrar pago" onClick={() => setPayment(item)}><CreditCard size={16} /></IconButton>}</span></div>)}{!rows.length && <Empty icon={Receipt} text={data.invoices.length ? "No hay facturas con este filtro" : "Las facturas se emiten al completar el checkout"} />}</div></section>
    <section className="panel"><PanelHeader title="Entrega de correos" /><div className="mail-summary"><span><b>{data.emailConfig.queue?.sent || 0}</b><small>Enviados</small></span><span><b>{data.emailConfig.queue?.pending || 0}</b><small>Pendientes</small></span><span><b>{data.emailConfig.queue?.failed || 0}</b><small>Fallidos</small></span></div>{data.notifications.slice(0, 8).map((job) => <div className="mail-row" key={job.id}><span className={`mail-dot ${job.status}`} /><div><b>{eventLabel(job.eventType)}</b><small>{job.to}</small><small>{dateText(job.createdAt, true)} - intento {job.attempts}</small>{job.error && <em>{job.error}</em>}</div><Status status={job.status} />{["failed", "pending_retry", "configuration_error"].includes(job.status) && <IconButton title="Reintentar" onClick={() => retry(job)}><RefreshCw size={15} /></IconButton>}</div>)}{!data.notifications.length && <Empty icon={Mail} text="Aun no existen envios registrados" />}</section>
    <section className="panel"><PanelHeader title="Pagos recientes" /><PaymentList items={data.payments.filter((item) => item.status !== "voided").slice(0, 8)} /></section>
    {invoice && <InvoiceModal invoice={invoice} payments={invoicePayments} delivery={invoiceDelivery} onSend={() => sendInvoice(invoice)} onVoid={voidPayment} onClose={() => setInvoice(null)} />}
    {payment && <PaymentModal reservation={{ ...data.reservations.find((row) => row.id === payment.reservationId), total: payment.total }} payments={data.payments} onClose={() => setPayment(null)} onSubmit={(values) => pay(payment, values)} />}
  </div>;
}

function Cash({ data, reload, notify, session }) {
  const [checked, setChecked] = useState(Object.fromEntries(data.checklist.filter((item) => item.done).map((item) => [item.id, true])));
  const [values, setValues] = useState({ shift: "Tarde", initial: 0, closed: 0, notes: "" });
  const [movement, setMovement] = useState(false);
  const open = data.shifts.openShift;
  const allDone = data.checklist.length > 0 && data.checklist.every((item) => checked[item.id]);
  async function toggle(item) { const done = !checked[item.id]; setChecked({ ...checked, [item.id]: done }); const result = await attempt(notify, () => request(`/operations/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ done }) })); if (!result.ok) setChecked({ ...checked, [item.id]: !done }); }
  async function openShift() { const result = await attempt(notify, () => request("/finance/shifts/open", { method: "POST", body: JSON.stringify({ shift: values.shift, responsible: session.user.name, initial: values.initial, notes: values.notes }) })); if (!result.ok) return; notify("Caja abierta"); reload(); }
  async function closeShift() { const result = await attempt(notify, () => request("/finance/shifts/close", { method: "POST", body: JSON.stringify({ closed: values.closed, notes: values.notes }) })); if (!result.ok) return; notify("Caja cerrada y conciliada"); reload(); }
  async function addMovement(payload) { const result = await attempt(notify, () => request("/finance/movements", { method: "POST", body: JSON.stringify(payload) })); if (!result.ok) return; notify("Movimiento registrado"); setMovement(false); reload(); }
  return <div className="cash-layout"><section className="panel cash-control"><PanelHeader title={open ? "Caja abierta" : "Apertura de caja"} /><div className="cash-status"><WalletCards size={20} /><span><small>Responsable</small><b>{open?.responsible || session.user.name}</b></span><Status status={open ? "open" : "inactive"} /></div>
    <Field label="Turno" type="select" value={open?.shift || values.shift} disabled={Boolean(open)} options={["Manana", "Tarde", "Noche"]} onChange={(shift) => setValues({ ...values, shift })} />
    {!open && <Field label="Fondo inicial" type="number" value={values.initial} onChange={(initial) => setValues({ ...values, initial })} />}
    {open && <><div className="calculation cash-reconciliation"><span><small>Fondo inicial</small><b>{money(open.initial)}</b></span><span><small>Entradas en efectivo</small><b>{money(open.cashIncome)}</b></span><span><small>Salidas en efectivo</small><b>{money(open.cashExpense)}</b></span><span><small>Efectivo esperado</small><b>{money(open.expected)}</b></span></div><Field label="Efectivo contado al cierre" type="number" value={values.closed} onChange={(closed) => setValues({ ...values, closed })} /><p className={`cash-difference ${Number(values.closed) - Number(open.expected) < 0 ? "negative" : "positive"}`}>Diferencia estimada: {money(Number(values.closed) - Number(open.expected))}</p></>}
    <Field label="Observaciones" type="textarea" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} />
    <div className="button-row">{open ? <><button className="secondary" onClick={() => setMovement(true)}><Plus size={16} /> Ingreso o gasto</button><button className="primary" onClick={closeShift}><Save size={16} /> Cerrar caja</button></> : <button className="primary" disabled={!allDone} onClick={openShift}><WalletCards size={16} /> Abrir caja</button>}</div></section>
    <section className="panel"><PanelHeader title="Checklist del turno" />{data.checklist.map((item) => <button className="check-item" key={item.id} onClick={() => toggle(item)}><span className={checked[item.id] ? "checked" : ""}>{checked[item.id] && <Check size={14} />}</span>{item.title}</button>)}<div className="check-progress">{Object.values(checked).filter(Boolean).length} de {data.checklist.length} verificados</div></section>
    <section className="panel span-2"><PanelHeader title={`Movimientos del ${data.daily.date || "dia"}`} /><div className="kpi-grid compact-kpis"><MiniKpi title="Ingresos" value={money(data.daily.income)} /><MiniKpi title="Gastos" value={money(data.daily.expense)} /><MiniKpi title="Balance" value={money(data.daily.balance)} />{(data.daily.methods || []).map((item) => <MiniKpi key={item.method} title={item.method} value={money(item.balance)} detail={`${money(item.income)} entrada / ${money(item.expense)} salida`} />)}</div></section>
    <section className="panel span-2"><PanelHeader title="Historial de turnos" /><ShiftTable items={data.shifts.history || []} /></section>{movement && <MovementModal onClose={() => setMovement(false)} onSubmit={addMovement} />}</div>;
}

function Accounting({ data, reload, notify }) {
  const [movement, setMovement] = useState(false);
  async function add(payload) { const result = await attempt(notify, () => request("/finance/movements", { method: "POST", body: JSON.stringify(payload) })); if (!result.ok) return; notify("Movimiento contable registrado"); setMovement(false); reload(); }
  async function download() {
    const result = await attempt(notify, async () => {
      const response = await fetch(`${API}/finance/export.xlsx`, { headers: { Authorization: `Bearer ${sessionValue().token}` } });
      if (!response.ok) throw new Error("No se pudo generar el Excel");
      return response.blob();
    });
    if (!result.ok) return;
    const url = URL.createObjectURL(result.value); const link = document.createElement("a"); link.href = url; link.download = `wild-incas-contabilidad-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(url); notify("Excel contable generado");
  }
  const validMovements = data.movements.filter((item) => item.status !== "voided");
  const voidedPayments = data.payments.filter((item) => item.status === "voided");
  return <><div className="accounting-head"><section className="kpi-grid"><MiniKpi title="Ingresos" value={money(data.summary.income)} /><MiniKpi title="Gastos" value={money(data.summary.expense)} /><MiniKpi title="Utilidad" value={money(data.summary.balance)} /><MiniKpi title="Por cobrar" value={money(data.summary.accountsReceivable)} /></section><div className="button-row"><button className="secondary" onClick={download}><FileSpreadsheet size={17} /> Exportar Excel</button><button className="primary" onClick={() => setMovement(true)}><Plus size={17} /> Movimiento</button></div></div><section className="panel"><PanelHeader title="Libro de movimientos validos" /><MovementList items={validMovements} detailed /></section>{voidedPayments.length > 0 && <section className="panel audit-panel"><PanelHeader title="Correcciones auditadas" /><p>Los pagos anulados no afectan caja, ingresos ni exportaciones. Se conservan para trazabilidad.</p><PaymentList items={voidedPayments} /></section>}{movement && <MovementModal onClose={() => setMovement(false)} onSubmit={add} />}</>;
}

function Employees({ data, reload, notify }) {
  const [editing, setEditing] = useState(null); const [creating, setCreating] = useState(false);
  async function create(values) {
    const username = values.username || values.email.split("@")[0]; const password = values.password || `${username}#2026`;
    const role = data.roles.find((item) => item.id === values.roleId);
    const result = await attempt(notify, () => request("/employees/onboard", { method: "POST", body: JSON.stringify({ ...values, username, password, role: role?.name, modules: values.modules?.length ? values.modules : role?.modules || [] }) }));
    if (!result.ok) return;
    notify(result.value.notification?.status === "sent" ? "Empleado creado y acceso aceptado por Brevo" : "Empleado y acceso creados; correo en cola", result.value.notification?.status === "sent" ? "success" : "warning"); setCreating(false); reload();
  }
  async function update(values) { const result = await attempt(notify, () => request(`/employees/${values.id}`, { method: "PATCH", body: JSON.stringify(values) })); if (!result.ok) return; notify("Empleado y permisos de acceso actualizados"); setEditing(null); reload(); }
  return <><div className="toolbar"><div className="shift-banner"><CalendarCheck size={19} /><span><small>Turno activo</small><b>{data.currentShift?.name || "Sin asignacion"} - {data.currentShift?.shift || ""}</b></span></div><button className="primary" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo empleado</button></div><div className="employee-grid">{data.employees.map((item) => <article className="employee-card" key={item.id}><header><Avatar name={item.name} /><span><b>{item.name}</b><small>{item.role}</small></span><IconButton title="Editar" onClick={() => setEditing(item)}><Pencil size={15} /></IconButton></header><dl><dt>Turno</dt><dd>{item.shift} - {item.hours}</dd><dt>Telefono</dt><dd>{item.phone || "-"}</dd><dt>Correo</dt><dd>{item.email}</dd><dt>Usuario</dt><dd>{item.username}</dd></dl><div className="module-tags">{(item.modules || []).map((module) => <span key={module}>{module}</span>)}</div><footer><small>Desde {item.since}</small><Status status={item.status} /></footer></article>)}</div>{creating && <EmployeeModal roles={data.roles} onClose={() => setCreating(false)} onSubmit={create} />}{editing && <EmployeeModal employee={editing} roles={data.roles} onClose={() => setEditing(null)} onSubmit={update} />}</>;
}

function Access({ data, reload, notify }) {
  const [creating, setCreating] = useState(false); const [testEmail, setTestEmail] = useState("");
  async function create(values) { const result = await attempt(notify, () => request("/auth/users", { method: "POST", body: JSON.stringify(values) })); if (!result.ok) return; notify("Usuario creado"); setCreating(false); reload(); }
  async function changeRole(user, roleId) { const result = await attempt(notify, () => request(`/auth/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ roleId }) })); if (!result.ok) return; notify("Rol actualizado"); reload(); }
  async function testMail() { const result = await attempt(notify, () => request("/notifications/test", { method: "POST", body: JSON.stringify({ to: testEmail }) })); if (!result.ok) return; notify(result.value.status === "sent" ? "Correo de prueba aceptado por Brevo" : `Correo en cola: ${result.value.error || result.value.status}`, result.value.status === "sent" ? "success" : "warning"); reload(); }
  return <div className="access-layout"><section className="panel"><PanelHeader title="Usuarios del sistema" action="Nuevo usuario" onClick={() => setCreating(true)} />{data.users.map((user) => <div className="user-row" key={user.id}><Avatar name={user.name} /><span><b>{user.name}</b><small>{user.username} - {user.email || "sin correo"}</small></span><select value={user.roleId} onChange={(e) => changeRole(user, e.target.value)}>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><Status status={user.status} /></div>)}</section><section className="panel"><PanelHeader title="Roles y modulos" />{data.roles.map((role) => <article className="role-row" key={role.id}><header><b>{role.name}</b><small>{role.modules.length} permisos</small></header><p>{role.description}</p><div className="module-tags">{role.modules.map((module) => <span key={module}>{module}</span>)}</div></article>)}<div className="email-test"><Field label="Prueba de correo Brevo" value={testEmail} placeholder="correo@ejemplo.com" onChange={setTestEmail} /><button className="primary" disabled={!testEmail} onClick={testMail}><Mail size={16} /> Enviar prueba</button><small>API: {data.emailConfig.apiConfigured ? "configurada" : "pendiente"} - SMTP: {data.emailConfig.smtpConfigured ? "configurado" : "pendiente"}</small></div></section>{creating && <UserModal roles={data.roles} onClose={() => setCreating(false)} onSubmit={create} />}</div>;
}

function ReservationModal({ reservation, rooms, reservations, onClose, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [values, setValues] = useState(reservation ? { ...reservation, ...reservation.guest, action: reservation.status === "checked_in" ? "check_in" : "reserve" } : { name: "", documentType: "Cedula", documentNumber: "", email: "", phone: "", address: "", country: "", checkIn: today, checkOut: tomorrow, exitTime: "11:00", adults: 1, children: 0, roomId: "", nightlyRate: 0, source: "Recepcion", notes: "", action: "check_in" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eligible = rooms.filter((room) => {
    const isCurrentRoom = room.id === reservation?.roomId;
    const physicalStateAllowsUse = isCurrentRoom || (values.action === "check_in"
      ? room.status === "available"
      : !["maintenance", "out_of_service"].includes(room.status));
    const hasDateConflict = reservations.some((item) => item.id !== reservation?.id
      && item.roomId === room.id
      && ["confirmed", "checked_in"].includes(item.status)
      && values.checkIn < item.checkOut
      && values.checkOut > item.checkIn);
    return physicalStateAllowsUse && !hasDateConflict;
  });
  const selected = rooms.find((room) => room.id === values.roomId);
  const nights = Math.max(1, Math.ceil((new Date(values.checkOut || values.checkIn) - new Date(values.checkIn)) / 86400000) || 1);
  function update(next) {
    const merged = { ...values, ...next };
    const room = rooms.find((item) => item.id === merged.roomId);
    if (next.roomId && !reservation) merged.nightlyRate = room?.rate || 0;
    if (next.action === "check_in" && room && room.id !== reservation?.roomId && room.status !== "available") merged.roomId = "";
    setValues(merged);
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await onSubmit({ ...values, roomType: selected?.type || reservation?.roomType }); }
    catch (requestError) { setError(requestError.message || "No se pudo guardar la estadia"); setBusy(false); }
  }
  return <Modal title={reservation ? `Editar o ampliar ${reservation.code}` : "Registrar nueva estadia"} onClose={busy ? () => {} : onClose} size="large"><div className="modal-section"><h4>Datos del huesped</h4><div className="form-grid"><Field label="Nombre completo" required value={values.name} onChange={(name) => update({ name })} /><Field label="Cedula o RUC" value={values.documentNumber} onChange={(documentNumber) => update({ documentNumber })} /><Field label="Tipo de documento" type="select" options={["Cedula", "RUC", "Pasaporte"]} value={values.documentType} onChange={(documentType) => update({ documentType })} /><Field label="Correo" type="email" value={values.email} onChange={(email) => update({ email })} /><Field label="Telefono" value={values.phone} onChange={(phone) => update({ phone })} /><Field label="Nacionalidad" value={values.country} onChange={(country) => update({ country })} /><Field label="Direccion" value={values.address} onChange={(address) => update({ address })} /></div></div><div className="modal-section"><h4>Estadia</h4><div className="form-grid"><Field label="Entrada" type="date" required value={values.checkIn} onChange={(checkIn) => update({ checkIn })} /><Field label="Salida" type="date" required value={values.checkOut} onChange={(checkOut) => update({ checkOut })} /><Field label="Hora de salida" type="time" value={values.exitTime} onChange={(exitTime) => update({ exitTime })} /><Field label="Adultos" type="number" min="1" value={values.adults} onChange={(adults) => update({ adults })} /><Field label="Ninos" type="number" min="0" value={values.children} onChange={(children) => update({ children })} /><Field label="Origen" type="select" options={["Recepcion", "Telefono", "WhatsApp", "Booking", "Web"]} value={values.source} onChange={(source) => update({ source })} /></div><Field label="Habitacion disponible" type="select" value={values.roomId} onChange={(roomId) => update({ roomId })} options={[{ value: "", label: "Seleccionar habitacion" }, ...eligible.map((room) => ({ value: room.id, label: `Hab. ${room.id} - ${room.type} - ${money(room.rate)}/noche` }))]} /><div className="form-grid"><Field label="Tarifa por noche" type="number" value={values.nightlyRate} onChange={(nightlyRate) => update({ nightlyRate })} /><Field label="Accion inicial" type="select" options={[{ value: "reserve", label: "Confirmar reserva" }, { value: "check_in", label: "Ingresar ahora" }]} value={values.action} onChange={(action) => update({ action })} /></div><Field label="Notas internas" type="textarea" value={values.notes} onChange={(notes) => update({ notes })} /></div><div className="calculation"><span><small>Noches</small><b>{nights}</b></span><span><small>Habitacion</small><b>{selected ? `Hab. ${selected.id}` : "-"}</b></span><span><small>Tarifa</small><b>{money(values.nightlyRate)}</b></span><span><small>Total hospedaje</small><b>{money(nights * Number(values.nightlyRate || 0))}</b></span></div>{error && <p className="form-error">{error}</p>}<button className="primary full" disabled={busy || !values.name || !values.roomId || !values.checkOut || values.checkOut <= values.checkIn} onClick={submit}><Save size={17} /> {busy ? "Guardando estadia..." : reservation ? "Guardar cambios" : values.action === "check_in" ? "Registrar check-in" : "Confirmar reserva"}</button></Modal>;
}

function GuestModal({ guest, onClose, onSubmit }) { const [values, setValues] = useState(guest); return <Modal title="Editar huesped" onClose={onClose}><div className="form-grid"><Field label="Nombre" value={values.name} onChange={(name) => setValues({ ...values, name })} /><Field label="Documento" value={values.documentNumber} onChange={(documentNumber) => setValues({ ...values, documentNumber })} /><Field label="Correo" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} /><Field label="Telefono" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} /><Field label="Nacionalidad" value={values.country} onChange={(country) => setValues({ ...values, country })} /><Field label="Direccion" value={values.address} onChange={(address) => setValues({ ...values, address })} /></div><button className="primary full" onClick={() => onSubmit(values)}><Save size={16} /> Guardar huesped</button></Modal>; }

function ChargeModal({ reservation, onClose, onSubmit }) {
  const [values, setValues] = useState({ category: "Servicio adicional", description: "", quantity: 1, unitPrice: 0, notes: "" });
  return <Modal title={`Nuevo cargo - ${reservation.code}`} onClose={onClose}>
    <div className="form-grid">
      <Field label="Categoria" type="select" options={["Hospedaje adicional", "Lavanderia", "Transporte", "Danos o reposicion", "Servicio adicional"]} value={values.category} onChange={(category) => setValues({ ...values, category })} />
      <Field label="Descripcion" value={values.description} onChange={(description) => setValues({ ...values, description })} />
      <Field label="Cantidad" type="number" min="1" value={values.quantity} onChange={(quantity) => setValues({ ...values, quantity })} />
      <Field label="Precio unitario" type="number" value={values.unitPrice} onChange={(unitPrice) => setValues({ ...values, unitPrice })} />
    </div>
    <Field label="Observaciones" type="textarea" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} />
    <div className="calculation"><span><small>Total del cargo</small><b>{money(values.quantity * values.unitPrice)}</b></span></div>
    <button className="primary full" disabled={!values.description || values.unitPrice <= 0} onClick={() => onSubmit(values)}><Plus size={16} /> Agregar a la cuenta</button>
  </Modal>;
}

function PaymentModal({ reservation, payments, onClose, onSubmit }) {
  const totalPaid = paymentTotal(payments, reservation.id);
  const pending = Math.max(0, Number(reservation.total || 0) - totalPaid);
  const [values, setValues] = useState({ amount: pending, received: pending, method: "Efectivo", reference: "", notes: "Pago de hospedaje", idempotencyKey: `payment:${reservation.id}:${globalThis.crypto?.randomUUID?.() || Date.now()}` });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = values.method === "Efectivo" ? Math.max(0, Number(values.received || 0) - Number(values.amount || 0)) : 0;
  const invalid = values.amount <= 0 || values.amount > pending || (values.method === "Efectivo" && values.received < values.amount);
  async function submit() {
    if (busy || invalid) return;
    setBusy(true);
    setError("");
    try { await onSubmit(values); }
    catch (requestError) { setError(requestError.message || "No se pudo registrar el pago"); setBusy(false); }
  }
  return <Modal title={`Registrar pago - ${reservation.code || "factura"}`} onClose={busy ? () => {} : onClose}>
    <div className="calculation"><span><small>Total</small><b>{money(reservation.total)}</b></span><span><small>Pagado</small><b>{money(totalPaid)}</b></span><span><small>Pendiente</small><b>{money(pending)}</b></span><span><small>Cambio</small><b>{money(change)}</b></span></div>
    <div className="form-grid"><Field label="Metodo" type="select" options={["Efectivo", "Transferencia", "Tarjeta", "Deposito"]} value={values.method} onChange={(method) => setValues({ ...values, method, received: method === "Efectivo" ? values.received : values.amount })} /><Field label="Monto aplicado" type="number" min="0.01" max={pending} step="0.01" value={values.amount} onChange={(amount) => setValues({ ...values, amount })} /><Field label="Recibido del cliente" type="number" min="0" step="0.01" value={values.received} disabled={values.method !== "Efectivo"} onChange={(received) => setValues({ ...values, received })} /><Field label="Referencia" value={values.reference} onChange={(reference) => setValues({ ...values, reference })} /></div>
    <Field label="Nota" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} />
    {values.amount > pending && <p className="form-error">El monto supera el saldo pendiente de {money(pending)}.</p>}
    {error && <p className="form-error">{error}</p>}
    <button className="primary full" disabled={busy || invalid} onClick={submit}><CreditCard size={16} /> {busy ? "Registrando pago..." : "Confirmar pago"}</button>
  </Modal>;
}

function ReservationDetail({ item, payments, onClose }) { const account = paymentSummary(payments, item.id, item.total); return <Modal title={`${item.code} - ${item.guest?.name}`} onClose={onClose} size="large"><div className="detail-grid"><Info label="Estado"><Status status={isOverdueStay(item) ? "overdue" : item.status} /></Info><Info label="Habitacion">Hab. {item.roomId} - {item.roomType}</Info><Info label="Estadia">{dateText(item.checkIn)} - {dateText(item.checkOut)}</Info><Info label="Contacto">{item.guest?.email || "-"} / {item.guest?.phone || "-"}</Info></div><h4>Detalle de la cuenta</h4><LineItems lines={item.lines || []} /><div className="calculation"><span><small>Total</small><b>{money(item.total)}</b></span><span><small>Pagado</small><b>{money(account.paid)}</b></span><span><small>Pendiente</small><b>{money(account.balance)}</b></span><span><small>Sobrepago</small><b className={account.overpaid > 0 ? "negative" : ""}>{money(account.overpaid)}</b></span></div><h4>Pagos</h4><PaymentList items={payments.filter((payment) => payment.reservationId === item.id)} /></Modal>; }

function GuestHistoryModal({ guest, stays, payments, onClose }) {
  return <Modal title={`Historial - ${guest.name}`} onClose={onClose} size="large">
    <div className="detail-grid"><Info label="Documento">{guest.documentType} {guest.documentNumber || "-"}</Info><Info label="Correo">{guest.email || "-"}</Info><Info label="Telefono">{guest.phone || "-"}</Info><Info label="Estadias registradas">{stays.length}</Info></div>
    <h4>Estadias y saldos</h4>
    <div className="history-list">{stays.map((stay) => {
      const account = paymentSummary(payments, stay.id, stay.total);
      return <article key={stay.id}><span><b>{stay.code} - Hab. {stay.roomId}</b><small>{dateText(stay.checkIn)} - {dateText(stay.checkOut)} ({stay.nights} noche(s))</small></span><span><b>{money(stay.total)}</b><small>{money(account.paid)} pagado / {money(account.balance)} pendiente</small>{account.overpaid > 0 && <small className="negative">Sobrepago {money(account.overpaid)}</small>}</span><Status status={isOverdueStay(stay) ? "overdue" : stay.status} /></article>;
    })}{!stays.length && <Empty icon={BookOpenCheck} text="Este huesped aun no tiene estadias" />}</div>
  </Modal>;
}

function InvoiceModal({ invoice, payments, delivery, onSend, onVoid, onClose }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const activePayments = payments.filter((item) => item.status !== "voided");
  async function send() {
    if (sending || !invoice.guest?.email) return;
    setSending(true);
    setError("");
    try { await onSend(invoice); }
    catch (requestError) { setError(requestError.message || "No se pudo programar el correo"); }
    finally { setSending(false); }
  }
  return <Modal title="Factura de hospedaje" onClose={onClose} size="invoice">
    <div className="invoice-toolbar"><span className="invoice-assurance"><CheckCircle2 size={17} /> Documento definitivo guardado en contabilidad</span><div className="invoice-toolbar-actions"><button className="secondary" disabled={sending || !invoice.guest?.email} onClick={send}><Send size={16} /> {sending ? "Enviando..." : "Enviar por correo"}</button><button className="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button></div></div>
    {error && <p className="form-error">{error}</p>}
    <article className="invoice-document">
      <header className="invoice-brand">
        <div className="invoice-logo"><Building2 size={21} /><span>WI</span></div>
        <div className="invoice-hotel"><strong>Wild Incas</strong><span>Backpackers Hostal</span><small>Cuenca, Ecuador / Gestion hotelera</small></div>
        <div className="invoice-identity"><small>FACTURA DE HOSPEDAJE</small><b>{invoice.number}</b><Status status={invoice.paymentStatus} /></div>
      </header>
      <section className="invoice-meta">
        <div><small>Fecha de emision</small><b>{dateText(invoice.issuedAt, true)}</b></div>
        <div><small>Reserva</small><b>{invoice.reservationCode || "-"}</b></div>
        <div><small>Habitacion</small><b>Hab. {invoice.roomId} / {invoice.roomType || "Hospedaje"}</b></div>
        <div><small>Estadia</small><b>{dateText(invoice.checkIn)} al {dateText(invoice.checkOut)}</b></div>
      </section>
      <section className="invoice-customer">
        <div><small>Huesped / cliente</small><b>{invoice.guest?.name || "Consumidor final"}</b><span>{invoice.guest?.documentType || "Documento"}: {invoice.guest?.documentNumber || "No registrado"}</span><span>{invoice.guest?.address || "Direccion no registrada"}</span></div>
        <div><small>Contacto y entrega</small><b>{invoice.guest?.email || "Correo no registrado"}</b><span>{invoice.guest?.phone || "Telefono no registrado"}</span><span className={`delivery-line ${delivery?.status || "not_sent"}`}>{delivery?.status === "sent" ? "Correo aceptado por Brevo" : delivery ? labels[delivery.status] || delivery.status : "Correo pendiente de envio"}</span></div>
      </section>
      <div className="invoice-detail-title"><span>Detalle facturado</span><small>Valores expresados en USD</small></div>
      <LineItems lines={invoice.lines || []} />
      <section className="invoice-closing">
        <div className="invoice-notes"><small>Informacion del servicio</small><p>{invoice.notes || "Servicio de hospedaje registrado por Wild Incas."}</p><dl><div><dt>Noches</dt><dd>{invoice.nights || "-"}</dd></div><div><dt>Emitido por</dt><dd>{invoice.issuedBy || "Recepcion"}</dd></div><div><dt>Moneda</dt><dd>{invoice.currency || "USD"}</dd></div></dl><span>Documento comercial interno para control de la estadia. No sustituye un comprobante tributario autorizado por el SRI.</span></div>
        <div className="totals"><span>Subtotal <b>{money(invoice.subtotal)}</b></span><span>Impuestos <b>{money(invoice.tax)}</b></span><span className="grand">Total <b>{money(invoice.total)}</b></span><span>Pagado <b>{money(invoice.paid)}</b></span><span className={invoice.balance > 0 ? "balance due" : "balance"}>Saldo <b>{money(invoice.balance)}</b></span></div>
      </section>
      <section className="invoice-payments"><div className="invoice-section-heading"><h4>Pagos registrados</h4><span>{activePayments.length} movimiento(s) valido(s)</span></div><div className="invoice-payment-ledger">{payments.length ? payments.map((item) => <div key={item.id} className={item.status === "voided" ? "voided" : ""}><span><CreditCard size={16} /><b>{item.method}</b><small>{dateText(item.createdAt, true)}{item.reference ? ` / ${item.reference}` : ""}{item.voidReason ? ` / Anulado: ${item.voidReason}` : ""}</small></span><strong>{money(item.amount)}</strong>{item.status !== "voided" && onVoid && <IconButton danger title="Anular pago" onClick={() => onVoid(item)}><X size={15} /></IconButton>}</div>) : <Empty icon={CreditCard} text="No hay pagos registrados" />}</div></section>
      <footer><span>Gracias por hospedarte en Wild Incas.</span><small>Generado por SIMOT / {invoice.number} / {dateText(invoice.issuedAt, true)}</small></footer>
    </article>
  </Modal>;
}

function RoomModal({ room, onClose, onSubmit }) { const [values, setValues] = useState(room); return <Modal title={room._new ? "Nueva habitacion" : `Editar habitacion ${room.id}`} onClose={onClose}><div className="form-grid"><Field label="Numero" value={values.id} disabled={!values._new} onChange={(id) => setValues({ ...values, id })} /><Field label="Piso" type="number" value={values.floor} onChange={(floor) => setValues({ ...values, floor })} /><Field label="Tipo" value={values.type} onChange={(type) => setValues({ ...values, type })} /><Field label="Capacidad" type="number" min="1" value={values.capacity} onChange={(capacity) => setValues({ ...values, capacity })} /><Field label="Tarifa por noche" type="number" value={values.rate} onChange={(rate) => setValues({ ...values, rate })} /><Field label="Estado" type="select" options={[{ value: "available", label: "Disponible" }, { value: "occupied", label: "Ocupada" }, { value: "cleaning", label: "En limpieza" }, { value: "maintenance", label: "Mantenimiento" }, { value: "out_of_service", label: "Fuera de servicio" }]} value={values.status} onChange={(status) => setValues({ ...values, status })} /></div><Field label="Notas operativas" type="textarea" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} /><button className="primary full" onClick={() => onSubmit(values)}><Save size={16} /> Guardar habitacion</button></Modal>; }

function CleaningModal({ rooms, onClose, onSubmit }) { const eligible = rooms.filter((room) => room.status === "available"); const [values, setValues] = useState({ roomId: eligible[0]?.id || "", notes: "Limpieza completa, cambio de lenceria y revision de inventario" }); return <Modal title="Nueva tarea de limpieza" onClose={onClose}>{eligible.length ? <><Field label="Habitacion disponible" type="select" options={eligible.map((room) => ({ value: room.id, label: `Hab. ${room.id} - ${room.type}` }))} value={values.roomId} onChange={(roomId) => setValues({ ...values, roomId })} /><Field label="Trabajo requerido" type="textarea" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} /><button className="primary full" disabled={!values.roomId} onClick={() => onSubmit(values)}><Sparkles size={16} /> Crear tarea</button></> : <Empty icon={BedDouble} text="No hay habitaciones disponibles que puedan enviarse a limpieza" />}</Modal>; }

function IncidentModal({ rooms, onClose, onSubmit }) { const [values, setValues] = useState({ title: "", description: "", category: "general", priority: "media", roomId: "", actionRequired: "" }); return <Modal title="Nueva novedad" onClose={onClose}><div className="form-grid"><Field label="Que ocurrio" value={values.title} onChange={(title) => setValues({ ...values, title })} /><Field label="Categoria" type="select" options={["general", "incidencia", "mantenimiento", "huesped", "seguridad"]} value={values.category} onChange={(category) => setValues({ ...values, category })} /><Field label="Prioridad" type="select" options={["baja", "media", "alta"]} value={values.priority} onChange={(priority) => setValues({ ...values, priority })} /><Field label="Habitacion" type="select" options={[{ value: "", label: "No aplica" }, ...rooms.map((room) => ({ value: room.id, label: `Hab. ${room.id}` }))]} value={values.roomId} onChange={(roomId) => setValues({ ...values, roomId })} /></div><Field label="Detalle" type="textarea" value={values.description} onChange={(description) => setValues({ ...values, description })} /><Field label="Accion requerida" value={values.actionRequired} onChange={(actionRequired) => setValues({ ...values, actionRequired })} /><button className="primary full" disabled={!values.title || !values.description} onClick={() => onSubmit(values)}><Save size={16} /> Registrar novedad</button></Modal>; }

function MovementModal({ onClose, onSubmit }) { const [values, setValues] = useState({ type: "expense", category: "Operativo", concept: "", method: "Efectivo", reference: "", amount: 0, notes: "" }); return <Modal title="Movimiento contable" onClose={onClose}><div className="form-grid"><Field label="Tipo" type="select" options={[{ value: "income", label: "Ingreso" }, { value: "expense", label: "Gasto" }]} value={values.type} onChange={(type) => setValues({ ...values, type })} /><Field label="Categoria" value={values.category} onChange={(category) => setValues({ ...values, category })} /><Field label="Concepto" value={values.concept} onChange={(concept) => setValues({ ...values, concept })} /><Field label="Metodo" type="select" options={["Efectivo", "Transferencia", "Tarjeta", "Deposito"]} value={values.method} onChange={(method) => setValues({ ...values, method })} /><Field label="Referencia" value={values.reference} onChange={(reference) => setValues({ ...values, reference })} /><Field label="Monto" type="number" value={values.amount} onChange={(amount) => setValues({ ...values, amount })} /></div><Field label="Observaciones" type="textarea" value={values.notes} onChange={(notes) => setValues({ ...values, notes })} /><button className="primary full" disabled={!values.concept || values.amount <= 0} onClick={() => onSubmit(values)}><Save size={16} /> Guardar movimiento</button></Modal>; }

function EmployeeModal({ employee, roles, onClose, onSubmit }) { const [values, setValues] = useState(employee || { name: "", roleId: "recepcion", role: "Recepcion", shift: "Tarde", hours: "14:00 - 22:00", phone: "", email: "", username: "", password: "", modules: [] }); const modules = nav.map((item) => item.id); function toggle(id) { setValues({ ...values, modules: values.modules?.includes(id) ? values.modules.filter((item) => item !== id) : [...(values.modules || []), id] }); } return <Modal title={employee ? "Editar empleado" : "Nuevo empleado y acceso"} onClose={onClose} size="large"><div className="form-grid"><Field label="Nombre" value={values.name} onChange={(name) => setValues({ ...values, name })} /><Field label="Cargo" value={values.role} onChange={(role) => setValues({ ...values, role })} /><Field label="Turno" type="select" options={["Manana", "Tarde", "Noche"]} value={values.shift} onChange={(shift) => setValues({ ...values, shift })} /><Field label="Horario" value={values.hours} onChange={(hours) => setValues({ ...values, hours })} /><Field label="Telefono" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} /><Field label="Correo" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} /><Field label="Usuario" value={values.username} onChange={(username) => setValues({ ...values, username })} /><Field label="Contrasena temporal" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} /><Field label="Rol de acceso" type="select" options={roles.map((role) => ({ value: role.id, label: role.name }))} value={values.roleId} onChange={(roleId) => setValues({ ...values, roleId, modules: roles.find((role) => role.id === roleId)?.modules || [] })} /></div><div className="permission-picker">{modules.map((id) => <button type="button" key={id} className={values.modules?.includes(id) ? "selected" : ""} onClick={() => toggle(id)}>{nav.find((item) => item.id === id)?.label}</button>)}</div><button className="primary full" disabled={!values.name || !values.email} onClick={() => onSubmit(values)}><UserCog size={16} /> {employee ? "Guardar empleado" : "Crear empleado y cuenta"}</button></Modal>; }

function UserModal({ roles, onClose, onSubmit }) { const [values, setValues] = useState({ name: "", username: "", email: "", password: "", roleId: "recepcion" }); return <Modal title="Nuevo usuario" onClose={onClose}><div className="form-grid"><Field label="Nombre" value={values.name} onChange={(name) => setValues({ ...values, name })} /><Field label="Usuario" value={values.username} onChange={(username) => setValues({ ...values, username })} /><Field label="Correo" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} /><Field label="Contrasena" type="password" value={values.password} onChange={(password) => setValues({ ...values, password })} /><Field label="Rol" type="select" options={roles.map((role) => ({ value: role.id, label: role.name }))} value={values.roleId} onChange={(roleId) => setValues({ ...values, roleId })} /></div><button className="primary full" onClick={() => onSubmit(values)}><UserCog size={16} /> Crear usuario</button></Modal>; }

function Field({ label, type = "text", value, onChange, options = [], required, disabled, ...props }) { if (type === "select") return <label className="field"><span>{label}{required && " *"}</span><select value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{options.map((option) => { const item = typeof option === "string" ? { value: option, label: option } : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select></label>; if (type === "textarea") return <label className="field"><span>{label}{required && " *"}</span><textarea value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} {...props} /></label>; return <label className="field"><span>{label}{required && " *"}</span><input type={type} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} {...props} /></label>; }
function Modal({ title, children, onClose, size = "normal" }) { return <div className="modal-backdrop"><section className={`modal ${size}`}><header><h3>{title}</h3><IconButton title="Cerrar" onClick={onClose}><X size={18} /></IconButton></header>{children}</section></div>; }
function PanelHeader({ title, action, onClick }) { return <header className="panel-header"><h3>{title}</h3>{action && <button onClick={onClick}>{action}<ChevronRight size={15} /></button>}</header>; }
function IconButton({ children, title, onClick, danger = false }) { return <button className={`icon-action ${danger ? "danger" : ""}`} title={title} onClick={onClick}>{children}</button>; }
function Status({ status }) { return <span className={`status ${status}`}>{labels[status] || status}</span>; }
function Avatar({ name }) { return <i className="avatar">{String(name || "?").slice(0, 1).toUpperCase()}</i>; }
function Empty({ icon: Icon, text }) { return <div className="empty-state"><Icon size={28} /><span>{text}</span></div>; }
function MiniKpi({ title, value, detail }) { return <article className="kpi mini"><small>{title}</small><strong>{value}</strong>{detail && <p>{detail}</p>}</article>; }
function Info({ label, children }) { return <div className="info"><small>{label}</small><b>{children}</b></div>; }
function StatusFilters({ values, active, onChange }) { return <div className="status-filters">{values.map((value) => <button key={value} className={active === value ? "active" : ""} onClick={() => onChange(value)}>{labels[value] || value}</button>)}</div>; }
function paymentTotal(payments, reservationId) { return Number(payments.filter((item) => item.status !== "voided" && item.reservationId === reservationId).reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)); }
function paymentSummary(payments, reservationId, total) { const paid = paymentTotal(payments, reservationId); return { paid, balance: Number(Math.max(0, Number(total || 0) - paid).toFixed(2)), overpaid: Number(Math.max(0, paid - Number(total || 0)).toFixed(2)) }; }
function isOverdueStay(item) {
  if (item.status !== "checked_in" || !item.checkOut) return false;
  const departure = new Date(`${item.checkOut}T${item.exitTime || "11:00"}:00`);
  return Number.isFinite(departure.getTime()) && departure.getTime() < Date.now();
}
function eventLabel(type) { return ({ "reservation-confirmed": "Reserva confirmada", "reservation-modified": "Reserva actualizada", "reservation-cancelled": "Reserva cancelada", "check-in": "Comprobante de check-in", "payment-confirmation": "Confirmacion de pago", "invoice-finalized": "Factura final", "employee-welcome": "Acceso de empleado", test: "Prueba de correo" })[type] || type; }
function RoomCompact({ room }) { return <div className={`room-compact ${room.status}`}><span><b>{room.id}</b><small>{room.type}</small></span><Status status={room.status} /></div>; }
function RoomLegend() { return <div className="legend">{["available", "occupied", "cleaning", "maintenance", "out_of_service"].map((status) => <span key={status}><i className={status} />{labels[status]}</span>)}</div>; }
function AgendaBlock({ title, items = [], empty }) { return <div className="agenda-block"><h4>{title}<span>{items.length}</span></h4>{items.length ? items.slice(0, 4).map((item) => <div key={item.id}><span><b>{item.guest?.name}</b><small>Hab. {item.roomId} - {item.code}</small></span><strong>{dateText(title === "Llegadas" ? item.checkIn : item.checkOut)}</strong></div>) : <small className="muted">{empty}</small>}</div>; }
function RoomCard({ room, reservation, onEdit }) { return <article className="room-card"><header><span><b>{room.id}</b><small>Piso {room.floor}</small></span><Status status={room.status} /></header><h3>{room.type}</h3><dl><dt>Capacidad</dt><dd>{room.capacity} personas</dd><dt>Tarifa</dt><dd>{money(room.rate)} / noche</dd><dt>Ultima limpieza</dt><dd>{room.lastCleaned || "-"}</dd></dl>{reservation && <div className="occupant"><b>{reservation.guest?.name}</b><small>Salida {dateText(reservation.checkOut)}</small></div>}{(room.housekeepingNotes || room.notes) && <p className="room-note">{room.housekeepingNotes || room.notes}</p>}<footer><IconButton title="Editar habitacion" onClick={onEdit}><Pencil size={16} /></IconButton></footer></article>; }
function WorkIncident({ item }) { return <article className="work-item"><span className="work-icon warning"><AlertTriangle size={18} /></span><div><b>{item.title}</b><p>{item.description}</p><small>{item.roomId ? `Hab. ${item.roomId} - ` : ""}{dateText(item.createdAt, true)}</small></div><Status status={item.status} /></article>; }
function LineItems({ lines }) { return <div className="line-items"><div className="line head"><span>DETALLE</span><span>CANT.</span><span>PRECIO</span><span>TOTAL</span></div>{lines.map((line) => <div className="line" key={line.id}><span><b>{line.description}</b><small>{line.category}</small></span><span>{line.quantity}</span><span>{money(line.unitPrice)}</span><span><b>{money(line.total)}</b></span></div>)}</div>; }
function PaymentList({ items }) { return items.length ? <div className="payment-list">{items.map((item) => <div key={item.id} className={item.status === "voided" ? "voided" : ""}><span><CreditCard size={16} /><b>{item.method} {item.status === "voided" ? "- Anulado" : ""}</b><small>{dateText(item.createdAt, true)}{item.reference ? ` - ${item.reference}` : ""}{item.voidReason ? ` - ${item.voidReason}` : ""}</small></span><strong>{money(item.amount)}</strong></div>)}</div> : <Empty icon={CreditCard} text="No hay pagos registrados" />; }
function MovementList({ items, detailed = false }) { return <div className="movement-list">{items.map((item) => <article key={item.id}><span className={`movement-icon ${item.type}`}>{item.type === "income" ? "+" : "-"}</span><div><b>{item.concept}</b><small>{dateText(item.date)} - {item.category || "Sin categoria"}{item.reference ? ` - ${item.reference}` : ""}</small>{detailed && item.notes && <em>{item.notes}</em>}</div><span><small>{item.method}</small><strong className={item.type}>{item.type === "income" ? "+" : "-"}{money(item.amount)}</strong></span></article>)}{!items.length && <Empty icon={TrendingUp} text="No hay movimientos registrados" />}</div>; }
function ShiftTable({ items }) { return <div className="data-table shift-table"><div className="table-row table-head"><span>FECHA</span><span>TURNO</span><span>RESPONSABLE</span><span>INICIAL</span><span>ESPERADO</span><span>CIERRE</span><span>DIFERENCIA</span></div>{items.map((item) => <div className="table-row" key={item.id}><span>{dateText(item.date)}</span><span>{item.shift}</span><span>{item.responsible}</span><span>{money(item.initial)}</span><span>{money(item.expected)}</span><span>{money(item.closed)}</span><span className={item.difference < 0 ? "negative" : "positive"}>{money(item.difference)}</span></div>)}</div>; }

createRoot(document.getElementById("root")).render(<App />);
