const $ = id => document.getElementById(id);
const statusLabels = { new: 'New', in_progress: 'In progress', replied: 'Replied', closed: 'Closed' };
let token = sessionStorage.getItem('darshAdminToken') || '';
let allEnquiries = [], selectedId = null;
const api = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) { token = ''; sessionStorage.removeItem('darshAdminToken'); showLogin(); } throw new Error(body.error || 'Request failed.'); }
  return body;
};
function message(el, text, kind = '') { el.textContent = text; el.className = 'status ' + kind; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(value) { return value ? new Date(value).toLocaleString() : '—'; }
function showInbox() { $('loginPanel').classList.add('hidden'); $('inboxPanel').classList.remove('hidden'); }
function showLogin() { $('inboxPanel').classList.add('hidden'); $('loginPanel').classList.remove('hidden'); }
function filtered() { const q = $('searchBox').value.trim().toLowerCase(), f = $('filterStatus').value; return allEnquiries.filter(e => (f === 'all' || e.status === f) && (!q || [e.customer_name, e.customer_email, e.company, e.customer_phone, e.message].some(v => String(v || '').toLowerCase().includes(q)))); }
function renderList() {
  const list = $('enquiryList'), rows = filtered(); $('countLabel').textContent = `${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'}`;
  if (!rows.length) { list.innerHTML = '<div class="empty">No enquiries match this filter.</div>'; return; }
  list.innerHTML = rows.map(e => `<button class="item ${e.id === selectedId ? 'active' : ''}" data-id="${esc(e.id)}"><strong>${esc(e.customer_name)}</strong><small>${esc(e.company || 'Company not provided')} · ${esc(fmt(e.created_at))}</small><small>${esc(e.customer_email)} <span class="pill ${e.status === 'new' ? 'new' : ''}">${esc(statusLabels[e.status] || e.status)}</span></small><small>${esc(e.message.slice(0, 95))}${e.message.length > 95 ? '…' : ''}</small></button>`).join('');
  list.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => { selectedId = btn.dataset.id; renderList(); renderDetail(); }));
}
function renderDetail() {
  const e = allEnquiries.find(x => x.id === selectedId), panel = $('detailPanel');
  if (!e) { panel.innerHTML = '<div class="empty">Select an enquiry from the list to view it.</div>'; return; }
  panel.innerHTML = `<h2>${esc(e.customer_name)}</h2><p class="sub">Received ${esc(fmt(e.created_at))}</p><div class="detail-row"><b>Email</b><a href="mailto:${esc(e.customer_email)}">${esc(e.customer_email)}</a></div><div class="detail-row"><b>Phone</b><a href="tel:${esc(e.customer_phone)}">${esc(e.customer_phone)}</a></div><div class="detail-row"><b>Company</b>${esc(e.company || 'Not provided')}</div><div class="detail-row"><b>Requirement</b><div class="message">${esc(e.message)}</div></div><div class="detail-row"><b>Status</b><select id="detailStatus"><option value="new" ${e.status === 'new' ? 'selected' : ''}>New</option><option value="in_progress" ${e.status === 'in_progress' ? 'selected' : ''}>In progress</option><option value="replied" ${e.status === 'replied' ? 'selected' : ''}>Replied</option><option value="closed" ${e.status === 'closed' ? 'selected' : ''}>Closed</option></select><button id="saveStatusButton" class="secondary">Save status</button></div><div class="reply-head"><h2>Reply to customer</h2><p class="sub">Email delivery requires SMTP settings in the server's .env file.</p><form id="replyForm"><label for="replySubject">Email subject</label><input id="replySubject" value="Re: Darsh Industries enquiry" required><label for="replyMessage">Your reply</label><textarea id="replyMessage" placeholder="Write your reply to the customer…" required></textarea><button type="submit" id="sendReplyButton" class="orange">Send email reply</button><p id="replyStatus" class="status" role="status"></p></form></div>`;
  $('saveStatusButton').addEventListener('click', async () => { const b = $('saveStatusButton'); b.disabled = true; try { await api(`/api/enquiries/${encodeURIComponent(e.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: $('detailStatus').value }) }); message($('inboxStatus'), 'Status updated.', 'success'); await loadEnquiries(false); } catch (err) { message($('inboxStatus'), err.message, 'error'); } finally { b.disabled = false; } });
  $('replyForm').addEventListener('submit', async ev => { ev.preventDefault(); const b = $('sendReplyButton'), st = $('replyStatus'); b.disabled = true; message(st, 'Sending reply…'); try { await api(`/api/enquiries/${encodeURIComponent(e.id)}/reply`, { method: 'POST', body: JSON.stringify({ subject: $('replySubject').value.trim(), reply: $('replyMessage').value.trim() }) }); message(st, 'Reply email sent successfully.', 'success'); $('replyMessage').value = ''; await loadEnquiries(false); } catch (err) { message(st, err.message, 'error'); } finally { b.disabled = false; } });
}
async function loadEnquiries(showLoading = true) { if (showLoading) message($('inboxStatus'), 'Loading enquiries…'); try { allEnquiries = await api('/api/enquiries'); if (!allEnquiries.some(e => e.id === selectedId)) selectedId = allEnquiries[0]?.id || null; renderList(); renderDetail(); message($('inboxStatus'), 'Inbox refreshed.', 'success'); } catch (err) { message($('inboxStatus'), err.message, 'error'); } }
$('loginForm').addEventListener('submit', async ev => { ev.preventDefault(); const b = $('loginButton'); b.disabled = true; message($('loginStatus'), 'Signing in…'); try { const result = await api('/api/login', { method: 'POST', headers: {}, body: JSON.stringify({ email: $('loginEmail').value.trim(), password: $('loginPassword').value }) }); token = result.token; sessionStorage.setItem('darshAdminToken', token); showInbox(); await loadEnquiries(); } catch (err) { message($('loginStatus'), err.message, 'error'); } finally { b.disabled = false; } });
$('logoutButton').addEventListener('click', () => { token = ''; sessionStorage.removeItem('darshAdminToken'); allEnquiries = []; selectedId = null; showLogin(); });
$('refreshButton').addEventListener('click', () => loadEnquiries()); $('searchBox').addEventListener('input', renderList); $('filterStatus').addEventListener('change', renderList);
if (token) { showInbox(); loadEnquiries(); } else showLogin();
