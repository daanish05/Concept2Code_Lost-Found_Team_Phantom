// js/data.js — Data layer for ReConnect (localStorage-backed)
window.RC = window.RC || {};

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────
  const CATEGORIES = [
    'ID Card', 'Wallet', 'Phone', 'Laptop', 'Keys',
    'Documents', 'Exam Ticket', 'Electronics', 'Bag / Backpack',
    'Accessories', 'Clothing', 'Books', 'Other'
  ];

  const HIGH_PRIORITY_CATEGORIES = new Set([
    'ID Card', 'Wallet', 'Phone', 'Laptop', 'Keys', 'Documents', 'Exam Ticket'
  ]);

  const LOCATIONS = [
    'Library', 'Cafeteria', 'Hostel Block', 'Parking Area',
    'Sports Complex', 'Academic Block', 'Admin Office',
    'Lab Block', 'Auditorium', 'Medical Center', 'Other'
  ];

  const AUTHORITY_CONTACTS = {
    'Library':        { name: 'Library Help Desk', phone: '+91-79-2630-1001', email: 'library@svit.edu', office: 'Ground Floor, Central Library', icon: '📚' },
    'Cafeteria':      { name: 'Cafeteria Manager', phone: '+91-79-2630-1025', email: 'cafeteria@svit.edu', office: 'Main Cafeteria, Block A', icon: '🍽️' },
    'Hostel Block':   { name: 'Warden Office', phone: '+91-79-2630-1050', email: 'warden@svit.edu', office: 'Hostel Admin Block, Room 101', icon: '🏠' },
    'Parking Area':   { name: 'Security Cabin', phone: '+91-79-2630-1099', email: 'security@svit.edu', office: 'Main Gate Security Post', icon: '🔒' },
    'Sports Complex': { name: 'Physical Education Dept.', phone: '+91-79-2630-1070', email: 'sports@svit.edu', office: 'Sports Complex Admin Room', icon: '⚽' },
    'Academic Block': { name: 'Department Office', phone: '+91-79-2630-1030', email: 'academic@svit.edu', office: 'Block B, Room 205', icon: '🎓' },
    'Admin Office':   { name: 'Administrative Office', phone: '+91-79-2630-1000', email: 'admin@svit.edu', office: 'Main Admin Building, Room 10', icon: '🏛️' },
    'Lab Block':      { name: 'Lab Supervisor', phone: '+91-79-2630-1045', email: 'labs@svit.edu', office: 'Lab Block Reception', icon: '🔬' },
    'Auditorium':     { name: 'Events & Facilities', phone: '+91-79-2630-1060', email: 'events@svit.edu', office: 'Auditorium Lobby', icon: '🎭' },
    'Medical Center': { name: 'Medical Center', phone: '+91-79-2630-1090', email: 'medical@svit.edu', office: 'Medical Block, Ground Floor', icon: '🏥' },
    'Other':          { name: 'Campus Security', phone: '+91-79-2630-1099', email: 'security@svit.edu', office: 'Main Gate Security Post', icon: '🔒' },
  };

  const DEVICE_TRACKING = {
    Phone: {
      android: [
        { icon: '🌐', label: 'Google Find My Device', url: 'https://www.google.com/android/find', sub: 'Locate, lock, or erase your Android phone' },
        { icon: '📱', label: 'Samsung SmartThings Find', url: 'https://www.samsung.com/global/galaxy/apps/smartthings/', sub: 'For Samsung Galaxy devices' },
      ],
      apple: [
        { icon: '🍎', label: 'Apple Find My', url: 'https://www.icloud.com/find', sub: 'Track your iPhone on iCloud' },
      ],
      steps: [
        '🔒 Remotely lock the device to prevent unauthorized access',
        '📋 Enable Lost Mode to display a custom recovery message',
        '📍 Note last known location from the tracking app',
        '🚫 Contact your carrier to block the SIM card',
        '🛡️ Change your passwords immediately',
      ]
    },
    Laptop: {
      steps: [
        '🔍 Enable tracking via your OS (Windows: Find My Device / Mac: Find My)',
        '📋 Note your laptop\'s MAC address for campus security',
        '🔒 Remotely lock device using Microsoft/Apple account',
        '📧 Enable auto-notification if device connects to internet',
        '🚔 File a report with campus security with serial number',
      ],
      links: [
        { icon: '🪟', label: 'Windows Find My Device', url: 'https://account.microsoft.com/devices', sub: 'Locate via Microsoft Account' },
        { icon: '🍎', label: 'Mac Find My', url: 'https://www.icloud.com/find', sub: 'Locate your Mac on iCloud' },
      ]
    },
    Electronics: {
      steps: [
        '📡 If Bluetooth-enabled, use Find My or similar app',
        '📋 Note serial number for security report',
        '🔍 Check campus CCTV footage with security',
      ]
    }
  };

  // ── Storage Keys ──────────────────────────────────────────
  const KEYS = {
    LOST: 'rc_lost_items',
    FOUND: 'rc_found_items',
    CLAIMS: 'rc_claims',
    SESSION: 'rc_user_session',
    ATTEMPTS: 'rc_claim_attempts',
    FLAGGED: 'rc_flagged_users',
    AUDIT: 'rc_audit_log',
    INIT: 'rc_initialized_v2',
    NOTIFICATIONS: 'rc_notifications',
  };

  // ── Helpers ───────────────────────────────────────────────
  function genId(prefix) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function readObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
  }
  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function classifyPriority(category, isUrgent) {
    if (isUrgent) return 'URGENT';
    if (HIGH_PRIORITY_CATEGORIES.has(category)) return 'HIGH';
    return 'NORMAL';
  }

  function getAuthorityContact(location) {
    return AUTHORITY_CONTACTS[location] || AUTHORITY_CONTACTS['Other'];
  }

  // ── Seed Data ─────────────────────────────────────────────
  const SEED_LOST = [
    {
      id: 'RC-1001-LOST', type: 'lost', name: 'MacBook Pro 14"',
      category: 'Laptop',
      description: 'Silver MacBook Pro with a blue Hydro Flask sticker on the lid. Charger is white MagSafe.',
      dateLost: '2026-02-25', location: 'Library',
      contactPreference: 'email', contactInfo: 'arjun.sharma@svit.edu',
      verificationQuestion: 'What sticker is on the lid of the laptop?',
      verificationAnswer: 'blue hydro flask',
      isUrgent: true, priority: 'URGENT', status: 'Open',
      reportedBy: 'Arjun Sharma', reportedAt: Date.now() - 7200000, matchIds: [],
    },
    {
      id: 'RC-1002-LOST', type: 'lost', name: 'Student ID Card',
      category: 'ID Card',
      description: 'SVIT University student ID card. Name: Priya Mehta, Roll No: 21CE042, Semester 4.',
      dateLost: '2026-02-26', location: 'Academic Block',
      contactPreference: 'phone', contactInfo: '9876543210',
      verificationQuestion: 'What is your full roll number?',
      verificationAnswer: '21CE042',
      isUrgent: true, priority: 'URGENT', status: 'Open',
      reportedBy: 'Priya Mehta', reportedAt: Date.now() - 18000000, matchIds: ['RC-2004-FOUND'],
    },
    {
      id: 'RC-1003-LOST', type: 'lost', name: 'Black Leather Wallet',
      category: 'Wallet',
      description: 'Black leather bi-fold wallet with initials "RK" embossed. Contains debit card, some cash.',
      dateLost: '2026-02-26', location: 'Cafeteria',
      contactPreference: 'email', contactInfo: 'rahul.k@svit.edu',
      verificationQuestion: 'What initials are embossed on the wallet?',
      verificationAnswer: 'RK',
      isUrgent: false, priority: 'HIGH', status: 'Open',
      reportedBy: 'Rahul Kumar', reportedAt: Date.now() - 28800000, matchIds: ['RC-2002-FOUND'],
    },
    {
      id: 'RC-1004-LOST', type: 'lost', name: 'iPhone 15 Pro (Space Black)',
      category: 'Phone',
      description: 'Space Black iPhone 15 Pro with a clear MagSafe case. Lock screen wallpaper is a mountain sunset.',
      dateLost: '2026-02-27', location: 'Hostel Block',
      contactPreference: 'email', contactInfo: 'neha.p@svit.edu',
      verificationQuestion: 'Describe your lock screen wallpaper exactly.',
      verificationAnswer: 'mountain sunset',
      isUrgent: true, priority: 'URGENT', status: 'Open',
      reportedBy: 'Neha Patil', reportedAt: Date.now() - 3600000, matchIds: [],
    },
    {
      id: 'RC-1005-LOST', type: 'lost', name: 'Keychain with 3 Keys',
      category: 'Keys',
      description: 'Silver keychain with a small Doraemon character charm. Has 3 keys — two room keys and one bike key.',
      dateLost: '2026-02-24', location: 'Parking Area',
      contactPreference: 'phone', contactInfo: '9123456789',
      verificationQuestion: 'What cartoon character is on your keychain charm?',
      verificationAnswer: 'Doraemon',
      isUrgent: false, priority: 'HIGH', status: 'Open',
      reportedBy: 'Kiran Desai', reportedAt: Date.now() - 86400000, matchIds: ['RC-2003-FOUND'],
    },
    {
      id: 'RC-1006-LOST', type: 'lost', name: 'Navy Blue Umbrella',
      category: 'Accessories',
      description: 'Compact navy blue foldable umbrella with wooden handle. Has a tag inside with the name written.',
      dateLost: '2026-02-23', location: 'Sports Complex',
      contactPreference: 'email', contactInfo: 'amit.d@svit.edu',
      verificationQuestion: 'What name is written on the inner tag?',
      verificationAnswer: 'Amit D',
      isUrgent: false, priority: 'NORMAL', status: 'Open',
      reportedBy: 'Amit Dubey', reportedAt: Date.now() - 172800000, matchIds: [],
    },
    {
      id: 'RC-1007-LOST', type: 'lost', name: 'Engg. Mathematics Notebook',
      category: 'Documents',
      description: 'Green spiral notebook, handwritten Engineering Maths notes. Cover reads "Sneha Patil – Sem 4".',
      dateLost: '2026-02-27', location: 'Academic Block',
      contactPreference: 'phone', contactInfo: '9988776655',
      verificationQuestion: 'What subject and semester is on the notebook cover?',
      verificationAnswer: 'Engineering Mathematics Sem 4',
      isUrgent: false, priority: 'HIGH', status: 'Open',
      reportedBy: 'Sneha Patil', reportedAt: Date.now() - 10800000, matchIds: [],
    },
  ];

  const SEED_FOUND = [
    {
      id: 'RC-2001-FOUND', type: 'found', name: 'Android Smartphone',
      category: 'Phone',
      description: 'Black Android phone found on a library study desk. Screen has a cracked top-right corner.',
      locationFound: 'Library', dateFound: '2026-02-27',
      storageLocation: 'Security Office',
      reportedBy: 'Finder (Anon)', reportedAt: Date.now() - 1800000, status: 'Open', matchIds: [],
    },
    {
      id: 'RC-2002-FOUND', type: 'found', name: 'Brown Leather Wallet',
      category: 'Wallet',
      description: 'Brown leather wallet found near cafeteria exit door. Contains a student ID card (name unclear).',
      locationFound: 'Cafeteria', dateFound: '2026-02-26',
      storageLocation: 'With Finder',
      reportedBy: 'Deepa Nair', reportedAt: Date.now() - 21600000, status: 'Open', matchIds: ['RC-1003-LOST'],
    },
    {
      id: 'RC-2003-FOUND', type: 'found', name: 'Keys with Cartoon Keychain',
      category: 'Keys',
      description: 'Set of keys with a cute cartoon character keychain found in parking lot near gate 2.',
      locationFound: 'Parking Area', dateFound: '2026-02-25',
      storageLocation: 'Security Office',
      reportedBy: 'Security Guard', reportedAt: Date.now() - 72000000, status: 'Open', matchIds: ['RC-1005-LOST'],
    },
    {
      id: 'RC-2004-FOUND', type: 'found', name: 'SVIT Student ID Card',
      category: 'ID Card',
      description: 'SVIT University student ID card found in academic block corridor near Room 205.',
      locationFound: 'Academic Block', dateFound: '2026-02-27',
      storageLocation: 'Security Office',
      reportedBy: 'Prof. R. Shah', reportedAt: Date.now() - 7200000, status: 'Open', matchIds: ['RC-1002-LOST'],
    },
    {
      id: 'RC-2005-FOUND', type: 'found', name: 'Red Steel Water Bottle',
      category: 'Accessories',
      description: 'Stainless steel red water bottle with no name on it. Found at sports complex bench.',
      locationFound: 'Sports Complex', dateFound: '2026-02-26',
      storageLocation: 'With Finder',
      reportedBy: 'Vishal Rao', reportedAt: Date.now() - 43200000, status: 'Open', matchIds: [],
    },
    {
      id: 'RC-2006-FOUND', type: 'found', name: 'MacBook MagSafe Charger',
      category: 'Electronics',
      description: 'White MagSafe MacBook charger (USB-C, 67W) found at library study table near window seat.',
      locationFound: 'Library', dateFound: '2026-02-25',
      storageLocation: 'Library Help Desk',
      reportedBy: 'Library Staff', reportedAt: Date.now() - 108000000, status: 'Open', matchIds: [],
    },
  ];

  const SEED_CLAIMS = [
    {
      id: 'CLM-DEMO-001',
      itemId: 'RC-1002-LOST',
      itemName: 'Student ID Card',
      claimant: 'Ravi Teja',
      verificationAnswer: 'wrong answer',
      uniqueIdentifier: 'It has my photo',
      proof: 'I have my enrollment certificate',
      status: 'Rejected',
      requiresAdminApproval: true,
      submittedAt: Date.now() - 3600000,
      auditLog: [
        { action: 'Claim submitted', time: Date.now() - 3600000, by: 'Ravi Teja' },
        { action: 'Verification failed – incorrect answer', time: Date.now() - 3500000, by: 'System' },
        { action: 'Claim rejected – fraud risk', time: Date.now() - 3400000, by: 'System' },
      ]
    },
    {
      id: 'CLM-DEMO-002',
      itemId: 'RC-1005-LOST',
      itemName: 'Keychain with 3 Keys',
      claimant: 'Kiran Desai',
      verificationAnswer: 'Doraemon',
      uniqueIdentifier: 'Bike key has a red rubber grip',
      proof: 'I can describe all 3 keys in detail',
      status: 'Pending Admin Approval',
      requiresAdminApproval: true,
      submittedAt: Date.now() - 1800000,
      auditLog: [
        { action: 'Claim submitted', time: Date.now() - 1800000, by: 'Kiran Desai' },
        { action: 'Verification passed', time: Date.now() - 1700000, by: 'System' },
        { action: 'Sent to admin for final approval', time: Date.now() - 1600000, by: 'System' },
      ]
    },
  ];

  const SEED_AUDIT = [
    { id: 'AUD-001', action: 'Item Reported (Lost)', detail: 'MacBook Pro 14" – URGENT', time: Date.now() - 7200000, by: 'Arjun Sharma', type: 'report' },
    { id: 'AUD-002', action: 'Auto-Match Found', detail: 'Keys RC-1005-LOST ↔ RC-2003-FOUND', time: Date.now() - 70000000, by: 'System', type: 'match' },
    { id: 'AUD-003', action: 'Claim Rejected', detail: 'False claim attempt on ID Card RC-1002-LOST', time: Date.now() - 3400000, by: 'System', type: 'fraud' },
    { id: 'AUD-004', action: 'Claim Pending Approval', detail: 'Keychain RC-1005-LOST — awaiting admin', time: Date.now() - 1600000, by: 'System', type: 'claim' },
    { id: 'AUD-005', action: 'Item Reported (Found)', detail: 'SVIT Student ID Card', time: Date.now() - 7200000, by: 'Prof. R. Shah', type: 'report' },
  ];

  // ── Initialization ─────────────────────────────────────────
  function init() {
    if (!localStorage.getItem(KEYS.INIT)) {
      save(KEYS.LOST, SEED_LOST);
      save(KEYS.FOUND, SEED_FOUND);
      save(KEYS.CLAIMS, SEED_CLAIMS);
      save(KEYS.AUDIT, SEED_AUDIT);
      save(KEYS.ATTEMPTS, {});
      save(KEYS.FLAGGED, []);
      save(KEYS.NOTIFICATIONS, [
        { id: 'n1', msg: 'Auto-match found: Lost Keys ↔ Found Keys in Parking!', type: 'match', read: false, time: Date.now() - 70000000 },
        { id: 'n2', msg: 'URGENT: Student ID Card reported lost — admin notified.', type: 'urgent', read: false, time: Date.now() - 18000000 },
        { id: 'n3', msg: 'Claim pending approval for Keychain – Kiran Desai', type: 'claim', read: false, time: Date.now() - 1800000 },
      ]);
      localStorage.setItem(KEYS.INIT, 'true');
    }
  }

  // ── Item Store ─────────────────────────────────────────────
  const ItemStore = {
    getLostItems() { return read(KEYS.LOST); },
    getFoundItems() { return read(KEYS.FOUND); },
    getAllItems() { return [...read(KEYS.LOST), ...read(KEYS.FOUND)]; },

    getItemById(id) {
      return this.getAllItems().find(i => i.id === id) || null;
    },

    addLostItem(data) {
      const items = read(KEYS.LOST);
      const priority = classifyPriority(data.category, data.isUrgent);
      const item = {
        ...data,
        id: genId('RC'),
        type: 'lost',
        priority,
        status: 'Open',
        reportedAt: Date.now(),
        matchIds: [],
        authorityContact: getAuthorityContact(data.location),
      };
      items.unshift(item);
      save(KEYS.LOST, items);
      AuditStore.add('Item Reported (Lost)', `${item.name} – ${priority}`, data.reportedBy || 'User', 'report');
      if (priority === 'URGENT' || priority === 'HIGH') {
        NotifStore.add(`🚨 HIGH PRIORITY: "${item.name}" reported lost at ${item.location}. Admin notified.`, 'urgent');
      }
      return item;
    },

    addFoundItem(data) {
      const items = read(KEYS.FOUND);
      const item = {
        ...data,
        id: genId('RC'),
        type: 'found',
        status: 'Open',
        reportedAt: Date.now(),
        matchIds: [],
      };
      items.unshift(item);
      save(KEYS.FOUND, items);
      AuditStore.add('Item Reported (Found)', `${item.name} at ${item.locationFound}`, data.reportedBy || 'User', 'report');
      return item;
    },

    updateItem(id, updates) {
      ['LOST', 'FOUND'].forEach(t => {
        const key = KEYS[t];
        const items = read(key);
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
          items[idx] = { ...items[idx], ...updates };
          save(key, items);
        }
      });
    },

    markReturned(id) {
      this.updateItem(id, { status: 'Returned', returnedAt: Date.now() });
      AuditStore.add('Item Returned', `Item ${id} marked as returned`, 'Admin', 'return');
    },

    getStats() {
      const lost = read(KEYS.LOST);
      const found = read(KEYS.FOUND);
      const all = [...lost, ...found];
      const returned = all.filter(i => i.status === 'Returned').length;
      const today = all.filter(i => Date.now() - i.reportedAt < 86400000).length;
      const claims = read(KEYS.CLAIMS);
      const matches = all.filter(i => i.matchIds && i.matchIds.length > 0).length;
      return {
        total: all.length,
        recovered: returned,
        today,
        matches: Math.floor(matches / 2),
        pending: claims.filter(c => c.status.includes('Pending')).length,
        highPriority: all.filter(i => (i.priority === 'HIGH' || i.priority === 'URGENT') && i.status === 'Open').length,
      };
    },
  };

  // ── Claim Store ────────────────────────────────────────────
  const ClaimStore = {
    getAll() { return read(KEYS.CLAIMS); },
    getByItemId(itemId) { return read(KEYS.CLAIMS).filter(c => c.itemId === itemId); },
    getPending() { return read(KEYS.CLAIMS).filter(c => c.status.includes('Pending')); },

    add(claim) {
      const claims = read(KEYS.CLAIMS);
      const full = { ...claim, id: genId('CLM'), submittedAt: Date.now(), auditLog: claim.auditLog || [] };
      claims.unshift(full);
      save(KEYS.CLAIMS, claims);
      return full;
    },

    update(id, updates) {
      const claims = read(KEYS.CLAIMS);
      const idx = claims.findIndex(c => c.id === id);
      if (idx !== -1) { claims[idx] = { ...claims[idx], ...updates }; save(KEYS.CLAIMS, claims); }
    },

    addAudit(claimId, action, by = 'System') {
      const claims = read(KEYS.CLAIMS);
      const idx = claims.findIndex(c => c.id === claimId);
      if (idx !== -1) {
        claims[idx].auditLog = claims[idx].auditLog || [];
        claims[idx].auditLog.push({ action, time: Date.now(), by });
        save(KEYS.CLAIMS, claims);
      }
    },

    getAttempts(userId, itemId) {
      const atts = readObj(KEYS.ATTEMPTS);
      return (atts[`${userId}:${itemId}`] || 0);
    },

    incrementAttempts(userId, itemId) {
      const atts = readObj(KEYS.ATTEMPTS);
      const key = `${userId}:${itemId}`;
      atts[key] = (atts[key] || 0) + 1;
      save(KEYS.ATTEMPTS, atts);
      return atts[key];
    },

    isFlagged(userId) {
      const flagged = read(KEYS.FLAGGED);
      return flagged.some(f => f.userId === userId && (!f.until || f.until > Date.now()));
    },

    flagUser(userId, reason) {
      const flagged = read(KEYS.FLAGGED);
      if (!flagged.find(f => f.userId === userId)) {
        flagged.push({ userId, reason, until: Date.now() + 3600000 * 24, flaggedAt: Date.now() });
        save(KEYS.FLAGGED, flagged);
        AuditStore.add('User Flagged', `${userId}: ${reason}`, 'System', 'fraud');
      }
    },

    getFlagged() { return read(KEYS.FLAGGED).filter(f => !f.until || f.until > Date.now()); },
  };

  // ── Audit Store ────────────────────────────────────────────
  const AuditStore = {
    getAll() { return read(KEYS.AUDIT); },
    add(action, detail, by, type = 'info') {
      const log = read(KEYS.AUDIT);
      log.unshift({ id: genId('AUD'), action, detail, by, time: Date.now(), type });
      save(KEYS.AUDIT, log.slice(0, 200));
    },
  };

  // ── Notification Store ─────────────────────────────────────
  const NotifStore = {
    getAll() { return read(KEYS.NOTIFICATIONS); },
    getUnread() { return read(KEYS.NOTIFICATIONS).filter(n => !n.read); },

    add(msg, type = 'info') {
      const items = read(KEYS.NOTIFICATIONS);
      items.unshift({ id: genId('N'), msg, type, read: false, time: Date.now() });
      save(KEYS.NOTIFICATIONS, items.slice(0, 50));
    },

    markRead(id) {
      const items = read(KEYS.NOTIFICATIONS);
      const idx = items.findIndex(n => n.id === id);
      if (idx !== -1) { items[idx].read = true; save(KEYS.NOTIFICATIONS, items); }
    },

    markAllRead() {
      const items = read(KEYS.NOTIFICATIONS).map(n => ({ ...n, read: true }));
      save(KEYS.NOTIFICATIONS, items);
    },
  };

  // ── Session Store ──────────────────────────────────────────
  const SessionStore = {
    get() { return readObj(KEYS.SESSION, null); },
    set(name) {
      const user = { id: 'user_' + Math.random().toString(36).slice(2, 8), name, role: 'student', sessionStart: Date.now() };
      save(KEYS.SESSION, user);
      return user;
    },
    clear() { localStorage.removeItem(KEYS.SESSION); },
  };

  // ── Public API ─────────────────────────────────────────────
  window.RC.data = {
    CATEGORIES, HIGH_PRIORITY_CATEGORIES, LOCATIONS,
    AUTHORITY_CONTACTS, DEVICE_TRACKING,
    ItemStore, ClaimStore, AuditStore, NotifStore, SessionStore,
    classifyPriority, getAuthorityContact, genId,
    formatTime(ts) {
      const diff = Date.now() - ts;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      return Math.floor(diff / 86400000) + 'd ago';
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    categoryIcon(cat) {
      const icons = {
        'ID Card': '🪪', 'Wallet': '👛', 'Phone': '📱', 'Laptop': '💻',
        'Keys': '🔑', 'Documents': '📄', 'Exam Ticket': '📋',
        'Electronics': '⚡', 'Bag / Backpack': '🎒', 'Accessories': '🎯',
        'Clothing': '👕', 'Books': '📚', 'Other': '📦',
      };
      return icons[cat] || '📦';
    },
    init,
  };
})();
