const BASE = "http://localhost:8080";

async function req(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : JSON.stringify(json));
  return json;
}

export const Api = {
  ownerBookings: (ownerUserId, status) =>
    req(`/api/owner/bookings/${ownerUserId}?status=${status}`),

  acceptBooking: (bookingId) =>
    req(`/api/owner/bookings/${bookingId}/accept`, { method: "POST" }),

  rejectBooking: (bookingId, reason) =>
    req(`/api/owner/bookings/${bookingId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  ownerPgs: (ownerUserId) => req(`/api/owner/pgs/${ownerUserId}`),

  createPgWithImages: (formData) =>
    req(`/api/owner/pgs`, {
      method: "POST",
      body: formData,
    }),

  addRoom: (pgId, payload) =>
    req(`/api/owner/pgs/${pgId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // ✅ Owner Profile
  getOwnerProfile: (ownerUserId) => req(`/api/owner/profile/${ownerUserId}`),

  updateOwnerProfile: (ownerUserId, payload) =>
    req(`/api/owner/profile/${ownerUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
