import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://127.0.0.1:8080/api";
const DEPOSIT_FIXED = 1000;
const PLATFORM_FIXED = 299;

function money(n) {
  const num = Number(n || 0);
  return `₹${num}`;
}

function Badge({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", disabled, type }) {
  const styles =
    variant === "primary"
      ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "1px solid rgba(255,255,255,0.10)" }
      : variant === "danger"
      ? { background: "rgba(239,68,68,0.12)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.35)" }
      : { background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" };

  return (
    <button
      type={type || "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontWeight: 800,
        letterSpacing: 0.2,
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "white",
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "white",
          outline: "none",
        }}
      >
        {children}
      </select>
    </label>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "radial-gradient(1200px 400px at 20% 0%, rgba(37,99,235,0.18), transparent), rgba(255,255,255,0.04)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson ? body?.error || JSON.stringify(body) : body;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body;
}

async function fetchJsonTry(urls, options) {
  let lastErr = null;
  for (const u of urls) {
    try {
      return await fetchJson(u, options);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

export default function App() {
  // -------- OWNER AUTH --------
  const [ownerUser, setOwnerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pg_owner_user") || "null");
    } catch {
      return null;
    }
  });

  const ownerUserId = ownerUser?.id ? Number(ownerUser.id) : null;

  const [loginName, setLoginName] = useState(ownerUser?.name || "");
  const [loginPhone, setLoginPhone] = useState(ownerUser?.phone || "");
  const [loginMsg, setLoginMsg] = useState("");

  // -------- UI STATE --------
  const [tab, setTab] = useState("bookings"); // bookings | create | rooms | profile
  const [status, setStatus] = useState("pending"); // pending|accepted|rejected
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // -------- REFUND SCREENSHOT (Reject Flow) --------
  const [refundBooking, setRefundBooking] = useState(null);
  const [refundFile, setRefundFile] = useState(null);
  const [refundUploading, setRefundUploading] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");

  // -------- OWNER DATA --------
  const [myPgs, setMyPgs] = useState([]);

  // -------- CREATE PG --------
  const [pgName, setPgName] = useState("");
  const [pgType, setPgType] = useState("boys"); // boys|girls|both
  const [pgDesc, setPgDesc] = useState("");
  const [pgAddress, setPgAddress] = useState("");
  const [pgArea, setPgArea] = useState("");
  const [photos, setPhotos] = useState([]); // File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // string[]
  const [createMsg, setCreateMsg] = useState("");

  // -------- ADD ROOM --------
  const [roomPgId, setRoomPgId] = useState("");
  const [roomType, setRoomType] = useState("double");
  const [rentMonthly, setRentMonthly] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [availableBeds, setAvailableBeds] = useState("");
  const [roomMsg, setRoomMsg] = useState("");

  // -------- OWNER PROFILE --------
  const [upiId, setUpiId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  // cleanup previews
  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ownerLogin(e) {
    e?.preventDefault?.();
    setLoginMsg("");
    setMsg("");
    try {
      const out = await fetchJson(`${API_BASE}/auth/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName, phone: loginPhone }),
      });

      const user = out?.data?.user;
      if (!user?.id) throw new Error("Owner login failed");

      setOwnerUser(user);
      localStorage.setItem("pg_owner_user", JSON.stringify(user));
      setLoginMsg(`✅ Logged in as ${user.name} (ownerUserId: ${user.id})`);

      // load everything
      setTab("bookings");
      setTimeout(() => {
        loadBookings(user.id, status);
        loadMyPgs(user.id);
      }, 0);
    } catch (e2) {
      setLoginMsg(`❌ ${e2.message}`);
    }
  }

  function logout() {
    localStorage.removeItem("pg_owner_user");
    setOwnerUser(null);
    setLoginMsg("Logged out");
    setBookings([]);
    setMyPgs([]);
  }

  async function loadMyPgs(ownerIdParam = ownerUserId) {
    try {
      if (!ownerIdParam) return;

      const ownerId = Number(ownerIdParam);
      if (!Number.isFinite(ownerId)) return;

      // backend route can be any of these (different versions)
      const urls = [
        `${API_BASE}/owner/pgs/${ownerId}`,
        `${API_BASE}/owner/pgs?ownerUserId=${ownerId}`,
        `${API_BASE}/owner/pgs?owner_id=${ownerId}`,
      ];

      const out = await fetchJsonTry(urls);
      const list = out?.data || out || [];
      setMyPgs(Array.isArray(list) ? list : []);

      const firstId = (Array.isArray(list) ? list?.[0]?.id : null) || null;
      if (!roomPgId && firstId) setRoomPgId(String(firstId));
    } catch (e) {
      console.warn("loadMyPgs:", e.message);
      setRoomMsg(`❌ My PGs load failed: ${e.message}`);
    }
  }

  async function loadBookings(ownerIdParam = ownerUserId, st = status) {
    setMsg("");
    setRefundBooking(null);
    setRefundFile(null);
    setRefundMsg("");
    setLoading(true);
    try {
      if (!ownerIdParam) throw new Error("Please login first");

      const ownerId = Number(ownerIdParam);
      if (!Number.isFinite(ownerId)) throw new Error("Invalid ownerUserId");

      const out = await fetchJson(`${API_BASE}/owner/bookings/${ownerId}?status=${encodeURIComponent(st)}`);
      setBookings(out?.data || []);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function acceptBooking(bookingId) {
    setMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");
      const out = await fetchJson(`${API_BASE}/owner/bookings/${bookingId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId }),
      });
      setMsg(`✅ Accepted booking #${out?.data?.id}`);
      await loadBookings(ownerUserId, status);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  async function rejectBooking(bookingId) {
    setMsg("");
    setRefundMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");

      // Step-1: mark as refund_pending (NOT final reject)
      await fetchJson(`${API_BASE}/owner/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId, reason: "Not available" }),
      });

      const bk = bookings.find((b) => Number(b.id) === Number(bookingId)) || { id: bookingId };
      setRefundBooking(bk);
      setRefundFile(null);
      setRefundMsg("");
      setMsg("✅ Refund pending. Upload refund screenshot to complete rejection.");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  async function submitRefundScreenshot() {
    setRefundMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");
      if (!refundBooking?.id) throw new Error("Booking not selected");
      if (!refundFile) throw new Error("Please choose screenshot file");

      setRefundUploading(true);

      const fd = new FormData();
      fd.append("file", refundFile);
      fd.append("ownerUserId", String(ownerUserId));

      await fetchJson(`${API_BASE}/owner/bookings/${refundBooking.id}/refund-screenshot`, {
        method: "POST",
        body: fd,
      });

      setRefundMsg(`✅ Refund screenshot uploaded. Booking #${refundBooking.id} rejected.`);
      setRefundBooking(null);
      setRefundFile(null);
      await loadBookings(ownerUserId, status);
    } catch (e) {
      setRefundMsg(`❌ ${e.message}`);
    } finally {
      setRefundUploading(false);
    }
  }

  function onPhotosChange(fileList) {
    setCreateMsg("");
    // cleanup old previews
    photoPreviews.forEach((u) => URL.revokeObjectURL(u));

    const arr = Array.from(fileList || []);
    const limited = arr.slice(0, 20);
    setPhotos(limited);
    const previews = limited.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(previews);
  }

  async function createPg(e) {
    e?.preventDefault?.();
    setCreateMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");
      if (!pgName.trim()) throw new Error("PG name required");
      if (!pgAddress.trim()) throw new Error("Address required");
      if (!pgArea.trim()) throw new Error("Area required");

      if (photos.length < 10) throw new Error("Minimum 10 photos required");
      if (photos.length > 20) throw new Error("Maximum 20 photos allowed");

      const fd = new FormData();
      fd.append("ownerUserId", String(ownerUserId));

      // ✅ send both key styles to avoid backend mismatch
      fd.append("name", pgName.trim());

      fd.append("pgType", pgType);
      fd.append("pg_type", pgType);

      fd.append("description", pgDesc.trim());

      fd.append("address", pgAddress.trim());
      fd.append("area", pgArea.trim());

      photos.forEach((f) => fd.append("photos", f));

      const res = await fetch(`${API_BASE}/owner/pgs`, { method: "POST", body: fd });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const out = isJson ? await res.json() : await res.text();
      if (!res.ok) throw new Error(isJson ? out?.error || "Create failed" : out);

      setCreateMsg("✅ PG created");
      setPgName("");
      setPgDesc("");
      setPgAddress("");
      setPgArea("");
      setPhotos([]);
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
      setPhotoPreviews([]);

      await loadMyPgs(ownerUserId);
      setTab("rooms");
    } catch (e2) {
      setCreateMsg(`❌ ${e2.message}`);
    }
  }

  async function addRoom(e) {
    e?.preventDefault?.();
    setRoomMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");
      if (!roomPgId) throw new Error("Select PG");
      const rent = Number(rentMonthly);
      const tb = Number(totalBeds);
      const ab = Number(availableBeds);

      if (!Number.isFinite(rent) || rent <= 0) throw new Error("Rent monthly invalid");
      if (!Number.isFinite(tb) || tb <= 0) throw new Error("Total beds invalid");
      if (!Number.isFinite(ab) || ab < 0 || ab > tb) throw new Error("Available beds invalid");

      const out = await fetchJson(`${API_BASE}/owner/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerUserId,
          pg_id: Number(roomPgId),
          room_type: roomType,
          rent_monthly: rent,
          total_beds: tb,
          available_beds: ab,
        }),
      });

      setRoomMsg("✅ Room added");
      setRentMonthly("");
      setTotalBeds("");
      setAvailableBeds("");
      await loadMyPgs(ownerUserId);
      return out;
    } catch (e2) {
      setRoomMsg(`❌ ${e2.message}`);
    }
  }

  async function saveProfile(e) {
    e?.preventDefault?.();
    setProfileMsg("");
    try {
      if (!ownerUserId) throw new Error("Please login first");
      const out = await fetchJson(`${API_BASE}/owner/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerUserId,
          upi_id: upiId.trim() || null,
          bank_account: bankAccount.trim() || null,
          ifsc: ifsc.trim() || null,
        }),
      });
      setProfileMsg("✅ Profile saved");
      return out;
    } catch (e2) {
      setProfileMsg(`❌ ${e2.message}`);
    }
  }

  const bgStyle = {
    minHeight: "100vh",
    color: "white",
    background:
      "radial-gradient(900px 450px at 15% 0%, rgba(37,99,235,0.22), transparent 60%), radial-gradient(900px 450px at 85% 20%, rgba(59,130,246,0.16), transparent 60%), #060A12",
    padding: 18,
  };

  const shellStyle = { maxWidth: 1180, margin: "0 auto" };

  return (
    <div style={bgStyle}>
      <div style={shellStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>PG Owner Panel</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Jaipur only • Deposit <b>₹1000</b> • Platform <b>₹299</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (ownerUserId) {
                  loadBookings(ownerUserId, status);
                  loadMyPgs(ownerUserId);
                }
              }}
              disabled={!ownerUserId}
            >
              Refresh
            </Button>
            {ownerUserId ? <Button variant="secondary" onClick={logout}>Logout</Button> : null}
          </div>
        </div>

        {ownerUserId ? (
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Badge>Owner: {ownerUser?.name}</Badge>
            <Badge>ownerUserId: {ownerUserId}</Badge>
          </div>
        ) : null}

        {/* LOGIN */}
        {!ownerUserId && (
          <div style={{ marginTop: 16 }}>
            <Card>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Owner Login (MVP)</div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>Name + Phone (No OTP)</div>

                <form onSubmit={ownerLogin} style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                  <Input label="Owner Name" value={loginName} onChange={setLoginName} placeholder="e.g. Motisons Owner" />
                  <Input
                    label="Phone (10 digits)"
                    value={loginPhone}
                    onChange={(v) => setLoginPhone(String(v).replace(/\D/g, "").slice(0, 10))}
                    placeholder="e.g. 9876543210"
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Button type="submit">Continue</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setLoginName("");
                        setLoginPhone("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </form>

                {loginMsg ? (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                    {loginMsg}
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        )}

        {/* MAIN APP */}
        {ownerUserId && (
          <div style={{ marginTop: 16 }}>
            {/* TABS */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant={tab === "bookings" ? "primary" : "secondary"} onClick={() => setTab("bookings")}>
                Bookings
              </Button>
              <Button variant={tab === "create" ? "primary" : "secondary"} onClick={() => setTab("create")}>
                Create PG
              </Button>
              <Button variant={tab === "rooms" ? "primary" : "secondary"} onClick={() => {
                setTab("rooms");
                setTimeout(() => loadMyPgs(ownerUserId), 0);
              }}>
                Add Room
              </Button>
              <Button variant={tab === "profile" ? "primary" : "secondary"} onClick={() => setTab("profile")}>
                Owner Profile
              </Button>
            </div>

            {/* BOOKINGS TAB */}
            {tab === "bookings" && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Button
                    variant={status === "pending" ? "primary" : "secondary"}
                    onClick={() => {
                      setStatus("pending");
                      loadBookings(ownerUserId, "pending");
                    }}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={status === "accepted" ? "primary" : "secondary"}
                    onClick={() => {
                      setStatus("accepted");
                      loadBookings(ownerUserId, "accepted");
                    }}
                  >
                    Accepted
                  </Button>
                  <Button
                    variant={status === "rejected" ? "primary" : "secondary"}
                    onClick={() => {
                      setStatus("rejected");
                      loadBookings(ownerUserId, "rejected");
                    }}
                  >
                    Rejected
                  </Button>
                </div>

                {msg ? (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                    {msg}
                  </div>
                ) : null}

                {/* Refund screenshot step (Only after Reject click) */}
                {refundBooking ? (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Refund Screenshot Required</div>
                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                      Upload refund payment screenshot for Booking #{refundBooking.id}. After upload, booking will be rejected.
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setRefundFile(e.target.files?.[0] || null)}
                        style={{
                          padding: "10px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.05)",
                          color: "white",
                        }}
                      />
                      <Button onClick={submitRefundScreenshot} disabled={refundUploading || !refundFile}>
                        {refundUploading ? "Uploading..." : "Submit Screenshot"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRefundBooking(null);
                          setRefundFile(null);
                          setRefundMsg("");
                        }}
                        disabled={refundUploading}
                      >
                        Cancel
                      </Button>
                    </div>

                    {refundMsg ? (
                      <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                        {refundMsg}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {bookings.map((b) => (
                    <div key={b.id} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>{b.pg_name || "PG"}</div>
                        <Badge>{b.booking_type || "fixed"}</Badge>
                      </div>

                      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
                        Booking #{b.id} • Room: <b>{b.room_type || "-"}</b>
                      </div>

                      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
                        User: <b>{b.user_name || "-"}</b> ({b.gender || "-"})
                      </div>

                      <div style={{ marginTop: 10, fontSize: 13 }}>
                        Rent: <b>{money(b.rent_amount)}</b> • Deposit: <b>{money(b.deposit_amount || DEPOSIT_FIXED)}</b> • Platform:{" "}
                        <b>{money(b.platform_fee || PLATFORM_FIXED)}</b>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14 }}>
                        Total: <b>{money(b.total_amount)}</b>
                      </div>

                      {status === "pending" ? (
                        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                          <Button variant="danger" onClick={() => rejectBooking(b.id)}>
                            Reject
                          </Button>
                          <Button onClick={() => acceptBooking(b.id)}>Accept</Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {bookings.length === 0 && !loading ? <div style={{ marginTop: 14, opacity: 0.75 }}>No bookings.</div> : null}
              </div>
            )}

            {/* CREATE PG TAB */}
            {tab === "create" && (
              <div style={{ marginTop: 14 }}>
                <Card>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>Create New PG (Photos required)</div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>Upload minimum 10 and maximum 20 photos</div>

                    <form onSubmit={createPg} style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                      <Input label="PG Name" value={pgName} onChange={setPgName} placeholder="e.g. Motisons Boys PG" />
                      <Select label="PG Type" value={pgType} onChange={setPgType}>
                        <option value="boys">boys</option>
                        <option value="girls">girls</option>
                        <option value="both">both</option>
                      </Select>

                      <Input label="Description" value={pgDesc} onChange={setPgDesc} placeholder="Near metro, food included, etc" />
                      <Input label="Area (Jaipur)" value={pgArea} onChange={setPgArea} placeholder="e.g. Mansarovar Jaipur" />

                      <Input label="Address" value={pgAddress} onChange={setPgAddress} placeholder="Full address" />

                      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Upload Photos (10–20)</div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => onPhotosChange(e.target.files)}
                          style={{
                            padding: "10px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.05)",
                            color: "white",
                          }}
                        />
                        <div style={{ opacity: 0.85, fontSize: 13 }}>
                          Selected: <b>{photos.length}</b> {photos.length >= 10 && photos.length <= 20 ? "✅" : ""}
                        </div>
                      </label>

                      <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                        <Button type="submit">Create PG</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setPhotos([]);
                            photoPreviews.forEach((u) => URL.revokeObjectURL(u));
                            setPhotoPreviews([]);
                            setCreateMsg("");
                          }}
                        >
                          Clear Photos
                        </Button>
                      </div>
                    </form>

                    {createMsg ? (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                        {createMsg}
                      </div>
                    ) : null}

                    {photoPreviews.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Preview</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 8 }}>
                          {photoPreviews.map((src, idx) => (
                            <div
                              key={idx}
                              style={{
                                borderRadius: 12,
                                overflow: "hidden",
                                border: "1px solid rgba(255,255,255,0.10)",
                                background: "rgba(255,255,255,0.02)",
                                aspectRatio: "1/1",
                              }}
                              title={photos[idx]?.name || ""}
                            >
                              <img src={src} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* ADD ROOM TAB */}
            {tab === "rooms" && (
              <div style={{ marginTop: 14 }}>
                <Card>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>Add Room to PG</div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>Select your PG and add room details</div>

                    <form onSubmit={addRoom} style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                      <Select label="Select PG" value={roomPgId} onChange={setRoomPgId}>
                        <option value="">-- Select --</option>
                        {myPgs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (#{p.id})
                          </option>
                        ))}
                      </Select>

                      <Select label="Room Type" value={roomType} onChange={setRoomType}>
                        <option value="single">single</option>
                        <option value="double">double</option>
                        <option value="triple">triple</option>
                        <option value="four">four</option>
                      </Select>

                      <Input label="Rent Monthly (₹)" value={rentMonthly} onChange={setRentMonthly} placeholder="e.g. 8000" />
                      <Input label="Total Beds" value={totalBeds} onChange={setTotalBeds} placeholder="e.g. 2" />
                      <Input label="Available Beds" value={availableBeds} onChange={setAvailableBeds} placeholder="e.g. 2" />

                      <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                        <Button type="submit">Add Room</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setRentMonthly("");
                            setTotalBeds("");
                            setAvailableBeds("");
                            setRoomMsg("");
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </form>

                    {roomMsg ? (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                        {roomMsg}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            )}

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div style={{ marginTop: 14 }}>
                <Card>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>Owner Profile</div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>UPI/Bank details</div>

                    <form onSubmit={saveProfile} style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                      <Input label="UPI ID" value={upiId} onChange={setUpiId} placeholder="e.g. owner@upi" />
                      <Input label="Bank Account" value={bankAccount} onChange={setBankAccount} placeholder="e.g. 1234567890" />
                      <Input label="IFSC" value={ifsc} onChange={setIfsc} placeholder="e.g. HDFC0001234" />

                      <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                        <Button type="submit">Save</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setUpiId("");
                            setBankAccount("");
                            setIfsc("");
                            setProfileMsg("");
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </form>

                    {profileMsg ? (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                        {profileMsg}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}