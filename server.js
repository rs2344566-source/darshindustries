require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
app.disable('x-powered-by');
app.use(express.json({ limit: '30kb' }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Please wait and try again.' } });
const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many submissions. Please try again later.' } });
let enquiries;
let mailer;

function safeText(value, max = 4000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function configured(name) { return Boolean(process.env[name] && !process.env[name].includes('CHANGE_THIS') && !process.env[name].includes('YOUR_')); }
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !configured('JWT_SECRET')) return res.status(401).json({ error: 'Please sign in again.' });
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Your session expired. Please sign in again.' }); }
}
function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.MAIL_FROM);
}
function getMailer() {
  if (!mailConfigured()) return null;
  if (!mailer) mailer = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
  return mailer;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: Boolean(enquiries), emailConfigured: mailConfigured() }));
app.post('/api/login', loginLimiter, (req, res) => {
  const email = safeText(req.body.email, 320).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!configured('ADMIN_EMAIL') || !configured('ADMIN_PASSWORD') || !configured('JWT_SECRET')) return res.status(503).json({ error: 'Admin login is not configured. Follow BACKEND_SETUP.md.' });
  const expectedEmail = process.env.ADMIN_EMAIL.toLowerCase();
  const emailMatches = email === expectedEmail;
  const suppliedHash = crypto.createHash('sha256').update(password).digest();
  const expectedHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  const passwordMatches = crypto.timingSafeEqual(suppliedHash, expectedHash);
  if (!emailMatches || !passwordMatches) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign({ sub: expectedEmail, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, email: expectedEmail });
});
app.post('/api/enquiries', enquiryLimiter, async (req, res, next) => {
  try {
    const customer_name = safeText(req.body.name, 120);
    const customer_email = safeText(req.body.email, 320).toLowerCase();
    const customer_phone = safeText(req.body.phone, 60);
    const company = safeText(req.body.company, 160);
    const message = safeText(req.body.message, 5000);
    if (!customer_name || !customer_email || !customer_phone || !message) return res.status(400).json({ error: 'Please complete all required fields.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const doc = { customer_name, customer_email, customer_phone, company, message, status: 'new', created_at: new Date(), updated_at: new Date(), replies: [] };
    const result = await enquiries.insertOne(doc);
    // Optional notification email. Enquiry is saved even if email notifications are not configured.
    let notificationSent = false;
    const transport = getMailer();
    if (transport && process.env.OWNER_EMAIL) {
      try {
        await transport.sendMail({ from: process.env.MAIL_FROM, to: process.env.OWNER_EMAIL, replyTo: customer_email, subject: `New website enquiry — ${customer_name}`, text: `New Darsh Industries enquiry\n\nName: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}\nCompany: ${company || 'Not provided'}\n\nRequirement:\n${message}\n\nOpen the private admin inbox to respond.` });
        notificationSent = true;
      } catch (e) { console.error('Owner notification email failed:', e.message); }
    }
    res.status(201).json({ ok: true, id: result.insertedId.toString(), notificationSent, message: 'Your enquiry has been submitted successfully.' });
  } catch (err) { next(err); }
});
app.get('/api/enquiries', requireAuth, async (_req, res, next) => {
  try {
    const rows = await enquiries.find({}, { projection: { replies: 1, customer_name: 1, customer_email: 1, customer_phone: 1, company: 1, message: 1, status: 1, created_at: 1, updated_at: 1 } }).sort({ created_at: -1 }).limit(500).toArray();
    res.json(rows.map(e => ({ ...e, id: e._id.toString(), _id: undefined })));
  } catch (err) { next(err); }
});
app.patch('/api/enquiries/:id/status', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid enquiry ID.' });
    const status = safeText(req.body.status, 30);
    if (!['new', 'in_progress', 'replied', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const result = await enquiries.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, updated_at: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ error: 'Enquiry not found.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
app.post('/api/enquiries/:id/reply', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid enquiry ID.' });
    const subject = safeText(req.body.subject, 200);
    const reply = safeText(req.body.reply, 8000);
    if (!subject || !reply) return res.status(400).json({ error: 'Subject and reply are required.' });
    const enquiry = await enquiries.findOne({ _id: new ObjectId(req.params.id) });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });
    const transport = getMailer();
    if (!transport) return res.status(503).json({ error: 'Email sending is not configured yet. Set SMTP settings in .env and restart the server.' });
    await transport.sendMail({ from: process.env.MAIL_FROM, to: enquiry.customer_email, replyTo: process.env.OWNER_EMAIL || undefined, subject, text: `${reply}\n\nRegards,\nDarsh Industries\n${process.env.OWNER_EMAIL || ''}` });
    await enquiries.updateOne({ _id: enquiry._id }, { $set: { status: 'replied', updated_at: new Date() }, $push: { replies: { subject, message: reply, sent_at: new Date(), sent_to: enquiry.customer_email } } });
    res.json({ ok: true, message: 'Reply email sent successfully.' });
  } catch (err) { next(err); }
});

app.use((req, res, next) => { if (/^\/(?:server\.js|package(?:-lock)?\.json|\.env(?:\..*)?|\.gitignore|BACKEND_SETUP\.md|README_MONGODB\.txt)$/i.test(req.path)) return res.sendStatus(404); next(); });
// Serve public assets (CSS, images, JavaScript and HTML) from the same URL paths
// locally and on Vercel. Vercel also serves these files directly from /public.
const PUBLIC_ROOT = path.join(ROOT, 'public');
app.use(express.static(PUBLIC_ROOT, { extensions: ['html'], dotfiles: 'deny' }));

const PUBLIC_PAGES = new Set([
  'index', 'about', 'vision', 'products', 'quality', 'gallery',
  'contact', 'railway', 'rubber', 'die', 'admin'
]);
app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_ROOT, 'html', 'index.html'));
});
// Friendly root-level aliases keep relative navigation links working from '/'.
app.get('/:page.html', (req, res, next) => {
  if (!PUBLIC_PAGES.has(req.params.page)) return next();
  res.sendFile(path.join(PUBLIC_ROOT, 'html', `${req.params.page}.html`), err => {
    if (err) next(err);
  });
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'A server error occurred. Check the server terminal for details.' }); });

async function start() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('YOUR_')) {
    console.error('\nMongoDB is not configured. Copy .env.example to .env and add your MongoDB Atlas connection string. See BACKEND_SETUP.md.\n');
    process.exit(1);
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'darshindustries');
  enquiries = db.collection('enquiries');
  await enquiries.createIndex({ created_at: -1 });
  await enquiries.createIndex({ customer_email: 1 });
  app.listen(PORT, () => console.log(`Darsh Industries website and API running at http://localhost:${PORT}\nContact page: http://localhost:${PORT}/html/contact.html\nPrivate inbox: http://localhost:${PORT}/html/admin.html`));
}
start().catch(err => { console.error('Could not start server:', err.message); process.exit(1); });
