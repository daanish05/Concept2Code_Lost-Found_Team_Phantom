// js/admin.js — Admin Dashboard (Enhanced: Analytics, Report Detail, ERP, Escalation, Guidelines)
window.RC = window.RC || {};

(function () {
    'use strict';

    const ADMIN_PASSWORD = 'admin123';
    let _isAuthenticated = false;

    // ── Mock ERP Data ──────────────────────────────────────────
    const ERP_STUDENTS = {
        '21CE042': { name: 'Priya Mehta', dept: 'Civil Engineering', year: '2nd', phone: '9876543210', email: 'priya.mehta@svit.edu', hostel: 'Block B, Room 214' },
        '22CS101': { name: 'Arjun Sharma', dept: 'Computer Science', year: '1st', phone: '9123456789', email: 'arjun.sharma@svit.edu', hostel: 'Block A, Room 105' },
        '21ME056': { name: 'Rahul Kumar', dept: 'Mechanical Eng.', year: '2nd', phone: '9988776655', email: 'rahul.k@svit.edu', hostel: 'Off Campus' },
    };

    // ── ERP lookup ─────────────────────────────────────────────
    function erpLookup() {
        const input = document.getElementById('erp-search-input');
        const resultDiv = document.getElementById('erp-result');
        if (!input || !resultDiv) return;
        const query = input.value.trim();
        const student = ERP_STUDENTS[query.toUpperCase()];
        if (student) {
            resultDiv.innerHTML = `
          <div class="erp-result-card">
            <div style="font-size:0.72rem;color:var(--color-success);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">✅ ERP Record Found</div>
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.25rem;">${_esc(student.name)}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">📚 ${student.dept} · ${student.year} Year</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">📱 ${student.phone}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">✉️ ${student.email}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">🏠 ${student.hostel}</div>
          </div>`;
        } else {
            resultDiv.innerHTML = `<div style="font-size:0.82rem;color:var(--color-danger);padding:0.5rem 0;">❌ No ERP record found for Roll No: <strong>${_esc(query)}</strong></div>`;
        }
    }

    // ── Analytics ──────────────────────────────────────────────
    function _computeAnalytics() {
        const { ItemStore } = window.RC.data;
        const all = ItemStore.getAllItems();
        const lost = ItemStore.getLostItems();

        // Location frequency (lost items)
        const locMap = {};
        lost.forEach(i => { const loc = i.location || 'Unknown'; locMap[loc] = (locMap[loc] || 0) + 1; });
        const locData = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxLoc = Math.max(...locData.map(x => x[1]), 1);

        // Category frequency (all items)
        const catMap = {};
        all.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + 1; });
        const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const maxCat = Math.max(...catData.map(x => x[1]), 1);

        // Hour of day distribution (lost items)
        const hourMap = Array(24).fill(0);
        lost.forEach(i => { hourMap[new Date(i.reportedAt).getHours()]++; });
        // Group into 4 periods
        const periods = [
            { label: 'Night (12am-6am)', count: hourMap.slice(0, 6).reduce((a, b) => a + b, 0), icon: '🌙' },
            { label: 'Morning (6am-12pm)', count: hourMap.slice(6, 12).reduce((a, b) => a + b, 0), icon: '🌅' },
            { label: 'Afternoon (12–6pm)', count: hourMap.slice(12, 18).reduce((a, b) => a + b, 0), icon: '☀️' },
            { label: 'Evening (6pm–12am)', count: hourMap.slice(18, 24).reduce((a, b) => a + b, 0), icon: '🌆' },
        ];
        const maxPeriod = Math.max(...periods.map(p => p.count), 1);

        return { locData, maxLoc, catData, maxCat, periods, maxPeriod };
    }

    function _renderAnalyticsHTML() {
        const { locData, maxLoc, catData, maxCat, periods, maxPeriod } = _computeAnalytics();
        const { categoryIcon } = window.RC.data;
        const barColors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-success)', 'var(--color-urgent)', 'var(--color-danger)', '#a78bfa'];

        const locBars = locData.map(([loc, cnt], i) => `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem;">
          <div style="width:100px;font-size:0.78rem;color:var(--text-secondary);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(loc)}</div>
          <div style="flex:1;background:var(--bg-secondary);border-radius:4px;height:22px;position:relative;">
            <div style="width:${Math.round(cnt / maxLoc * 100)}%;background:${barColors[i]};height:100%;border-radius:4px;transition:width 0.8s;"></div>
          </div>
          <div style="width:24px;font-size:0.78rem;font-weight:700;color:var(--text-primary);">${cnt}</div>
        </div>`).join('');

        const catBars = catData.map(([cat, cnt], i) => `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem;">
          <div style="width:100px;font-size:0.78rem;color:var(--text-secondary);text-align:right;flex-shrink:0;">${categoryIcon(cat)} ${_esc(cat)}</div>
          <div style="flex:1;background:var(--bg-secondary);border-radius:4px;height:22px;position:relative;">
            <div style="width:${Math.round(cnt / maxCat * 100)}%;background:${barColors[i]};height:100%;border-radius:4px;"></div>
          </div>
          <div style="width:24px;font-size:0.78rem;font-weight:700;">${cnt}</div>
        </div>`).join('');

        // Build time-of-day chart as separate rows (icon → count → bars → labels)
        const periodIconRow = `<div style="display:flex;gap:0.75rem;margin-bottom:0.25rem;">
          ${periods.map(p => `<div style="flex:1;text-align:center;font-size:1.1rem;">${p.icon}</div>`).join('')}
        </div>`;
        const periodCountRow = `<div style="display:flex;gap:0.75rem;margin-bottom:0.3rem;">
          ${periods.map((p, i) => `<div style="flex:1;text-align:center;font-size:0.75rem;font-weight:700;color:${barColors[i]};">${p.count}</div>`).join('')}
        </div>`;
        const periodBarRow = `<div style="display:flex;gap:0.75rem;align-items:flex-end;height:72px;background:var(--bg-secondary);border-radius:var(--radius-sm);padding:0 0.25rem;margin-bottom:0.4rem;">
          ${periods.map((p, i) => `<div style="flex:1;background:${barColors[i]};height:${Math.max(Math.round(p.count / maxPeriod * 72), 4)}px;border-radius:4px 4px 0 0;opacity:0.9;" title="${p.label}: ${p.count} items"></div>`).join('')}
        </div>`;
        const periodLabelRow = `<div style="display:flex;gap:0.75rem;border-top:1px solid var(--border-glass);padding-top:0.35rem;">
          ${periods.map(p => `<div style="flex:1;text-align:center;font-size:0.62rem;color:var(--text-muted);line-height:1.3;">${p.label.split('(')[0].trim()}</div>`).join('')}
        </div>`;
        const periodChart = periodIconRow + periodCountRow + periodBarRow + periodLabelRow;


        return `
        <div class="admin-panel" style="grid-column:1/-1;margin-bottom:0;">
          <div class="admin-panel-header"><span>📊 Analytics Dashboard</span></div>
          <div class="admin-panel-body">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;">
              <div>
                <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;">📍 Top Lost Locations</div>
                ${locBars || '<div style="color:var(--text-muted);font-size:0.82rem;">No data yet</div>'}
              </div>
              <div>
                <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;">📦 Category Distribution</div>
                ${catBars || '<div style="color:var(--text-muted);font-size:0.82rem;">No data yet</div>'}
              </div>
              <div>
                <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;">🕐 Time of Day Pattern</div>
                ${periodChart}
              </div>
            </div>
          </div>
        </div>`;
    }

    // ── Full Item Report Modal ────────────────────────────────
    function openFullReport(itemId) {
        const { ItemStore, ClaimStore, formatTime, categoryIcon } = window.RC.data;
        const item = ItemStore.getItemById(itemId);
        if (!item) return;

        const escalLevel = window.RC.escalation && window.RC.escalation.getEscalationLevel(item);
        const nextEsc = window.RC.escalation ? window.RC.escalation.getNextEscalationIn(item) : '';
        const claims = ClaimStore.getByItemId(itemId);
        const matches = window.RC.match.getMatchesForItem(item);
        const matchedItem = matches.length > 0 ? ItemStore.getItemById(matches[0].id) : null;

        const escBadge = escalLevel
            ? `<span style="background:rgba(239,68,68,0.15);color:${escalLevel.color};border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-full);padding:0.15rem 0.6rem;font-size:0.7rem;font-weight:700;">${escalLevel.level}</span>`
            : '';

        const contactSection = item.type === 'lost' ? `
        <div class="report-contact-box green-box">
          <div class="report-contact-title">📞 Owner Contact Info</div>
          <div><strong>${_esc(item.reportedBy)}</strong></div>
          ${item.contactPreference === 'email' ? `<div>✉️ ${_esc(item.contactInfo)}</div>` : `<div>📱 ${_esc(item.contactInfo)}</div>`}
          <div style="font-size:0.75rem;color:var(--text-muted);">Preferred: ${item.contactPreference || 'Any'}</div>
        </div>` : `
        <div class="report-contact-box green-box">
          <div class="report-contact-title">📦 Finder Contact Info</div>
          <div><strong>${_esc(item.reportedBy)}</strong></div>
          ${item.storageLocation ? `<div>🏢 Stored at: <strong>${_esc(item.storageLocation)}</strong></div>` : ''}
          ${item.finderContact ? `<div>📱 ${_esc(item.finderContact)}</div>` : '<div style="color:var(--text-muted);">No direct contact provided</div>'}
        </div>`;

        const matchSection = matchedItem ? `
        <div class="report-contact-box cyan-box">
          <div class="report-contact-title">🎯 Matched ${matchedItem.type === 'found' ? 'Found Item' : 'Lost Item'}</div>
          <div>${categoryIcon(matchedItem.category)} <strong>${_esc(matchedItem.name)}</strong> (${matchedItem.id})</div>
          <div>Reported by: ${_esc(matchedItem.reportedBy)}</div>
          ${matchedItem.type === 'found' && matchedItem.storageLocation ? `<div>🏢 ${_esc(matchedItem.storageLocation)}</div>` : ''}
          ${matchedItem.contactInfo ? `<div>📞 ${_esc(matchedItem.contactInfo)}</div>` : ''}
          ${matchedItem.finderContact ? `<div>📱 ${_esc(matchedItem.finderContact)}</div>` : ''}
        </div>` : '';

        const claimHistory = claims.length > 0 ? `
        <div style="margin-top:0.75rem;">
          <div class="report-contact-title" style="margin-bottom:0.5rem;">📋 Claim History (${claims.length})</div>
          ${claims.map(c => `
            <div style="background:var(--bg-secondary);border-radius:var(--radius-sm);padding:0.6rem 0.75rem;margin-bottom:0.4rem;font-size:0.82rem;">
              <div style="display:flex;justify-content:space-between;">
                <strong>${_esc(c.claimant)}</strong>
                <span style="color:${c.status === 'Approved' ? 'var(--color-success)' : c.status.includes('Pending') ? 'var(--color-urgent)' : 'var(--color-danger)'};">${c.status}</span>
              </div>
              <div style="color:var(--text-muted);font-size:0.75rem;">${formatTime(c.submittedAt)} · Identifier: "${_esc((c.uniqueIdentifier || '').slice(0, 50))}"</div>
            </div>`).join('')}
        </div>` : '<div style="color:var(--text-muted);font-size:0.82rem;">No claims yet.</div>';

        const erpRollNo = item.verificationAnswer || '';
        const erpStudent = ERP_STUDENTS[erpRollNo.toUpperCase()];
        const erpSection = erpStudent ? `
        <div class="report-contact-box" style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.25);">
          <div class="report-contact-title" style="color:var(--color-primary-light);">🎓 ERP Record Match</div>
          <div><strong>${_esc(erpStudent.name)}</strong> · ${erpStudent.dept}</div>
          <div>📱 ${erpStudent.phone} &nbsp; ✉️ ${erpStudent.email}</div>
          <div>🏠 ${erpStudent.hostel}</div>
        </div>` : '';

        const html = `
        <div class="modal-header">
          <div>
            <div class="modal-title">📄 Full Item Report</div>
            <div style="font-size:0.72rem;color:var(--text-muted);font-family:monospace;">${item.id}</div>
          </div>
          <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
            <span class="badge badge-${item.type === 'lost' ? 'lost-type' : 'found-type'}">${item.type.toUpperCase()}</span>
            ${item.priority === 'URGENT' ? '<span class="badge badge-urgent">⚡ URGENT</span>' : item.priority === 'HIGH' ? '<span class="badge badge-high">🚨 HIGH</span>' : '<span class="badge badge-normal">NORMAL</span>'}
            <span class="badge badge-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>
            ${escBadge}
            ${matches.length ? '<span class="badge badge-matched">🎯 MATCHED</span>' : ''}
          </div>

          <div class="detail-grid" style="margin-bottom:1rem;">
            <div class="detail-field"><div class="detail-field-label">Item</div><div class="detail-field-value">${categoryIcon(item.category)} ${_esc(item.name)}</div></div>
            <div class="detail-field"><div class="detail-field-label">Category</div><div class="detail-field-value">${_esc(item.category)}</div></div>
            <div class="detail-field"><div class="detail-field-label">Location</div><div class="detail-field-value">📍 ${_esc(item.location || item.locationFound || '—')}</div></div>
            <div class="detail-field"><div class="detail-field-label">Date</div><div class="detail-field-value">${item.dateLost || item.dateFound || '—'}</div></div>
            <div class="detail-field"><div class="detail-field-label">Reported</div><div class="detail-field-value">${formatTime(item.reportedAt)}</div></div>
            ${nextEsc ? `<div class="detail-field"><div class="detail-field-label">Escalation</div><div class="detail-field-value" style="color:var(--color-urgent);">${nextEsc}</div></div>` : ''}
          </div>

          <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem;padding:0.75rem;background:var(--bg-secondary);border-radius:var(--radius-sm);">${_esc(item.description)}</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
            ${contactSection}
            ${matchSection || '<div></div>'}
          </div>

          ${erpSection}
          ${claimHistory}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="window.RC.app.closeModal()">Close</button>
          <button class="btn btn-outline btn-sm" onclick="window.RC.search.openDetail('${item.id}'); window.RC.app.closeModal();">Open Public View</button>
          ${item.status !== 'Returned' ? `<button class="btn btn-success btn-sm" onclick="window.RC.admin.markReturned('${item.id}'); window.RC.app.closeModal();">✓ Mark Returned</button>` : ''}
        </div>`;

        window.RC.app.openModal(html);
    }

    // ── Guidelines Modal ──────────────────────────────────────
    function openGuidelines() {
        const GUIDE = [
            {
                icon: '💳', title: 'Lost ID Card / Wallet',
                steps: ['🚀 Report immediately on ReConnect — priority auto-escalated', '🏛️ Contact Academic/Admin office with your student details', '📋 File FIR if it contains financial cards/Aadhar', '🔄 Apply for duplicate ID at Admin office (Form B-12)', '🔔 Check ReConnect daily for match notifications'],
            },
            {
                icon: '📱', title: 'Lost Phone',
                steps: ['🔒 Remotely lock via Google Find My / Apple Find My now', '📍 Check last location before reporting on ReConnect', '🚫 Call carrier (+91-98211-00227) to block SIM immediately', '📋 File IMEI-based police complaint (your carrier has the IMEI)', '🔔 Enable notify on device reconnect in Find My Device'],
            },
            {
                icon: '💻', title: 'Lost Laptop',
                steps: ['🔍 Enable Windows Find My Device / Mac Find My if not already on', '📋 Note exact serial number from purchase receipt', '🔒 Remote lock via Microsoft Account / iCloud', '🚔 Report to campus security with serial number for CCTV review', '📩 Email labs@svit.edu if lost in a lab — they can check access logs'],
            },
            {
                icon: '📦', title: 'Found an Item',
                steps: ['🤲 Do NOT open/use the item', '🏢 Deposit immediately at Security Office or Library Help Desk', '📢 Report on ReConnect with detailed description', '🔒 Withhold 1 unique detail (e.g., inner sticker) so owner can verify', '✉️ Provide your contact info so the matching owner can reach you'],
            },
            {
                icon: '🎒', title: 'Lost Bag / Backpack',
                steps: ['🗺️ Retrace your steps and check last visited campus locations', '📢 Report on ReConnect immediately with color, brand, and contents list', '🏛️ Contact Library, Cafeteria, or Dept Office attendants', '📋 List high-value contents separately for verification', '⚡ Mark as URGENT if it contains ID, phone, or valuables'],
            },
            {
                icon: '📄', title: 'Lost Documents / Exam Ticket',
                steps: ['🚨 Mark as URGENT — exam tickets are time-critical', '📞 Immediately contact Exam Cell: +91-79-2630-1000', '🏛️ Visit Academic Office for duplicate issuance', '📢 Post on ReConnect with roll number and exam date', '⏰ Escalation auto-triggers in 24h for admin alert'],
            },
        ];

        const html = `
        <div class="modal-header">
          <div class="modal-title">📖 Situation Guidelines & Response Playbook</div>
          <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
        </div>
        <div class="modal-body" style="padding:0;">
          <div style="padding:1rem 1.5rem 0;font-size:0.85rem;color:var(--text-secondary);">Step-by-step actions for common lost/found situations.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
            ${GUIDE.map((g, i) => `
              <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border-glass);${i % 2 === 0 ? 'border-right:1px solid var(--border-glass);' : ''}">
                <div style="font-size:1.25rem;margin-bottom:0.4rem;">${g.icon}</div>
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.6rem;">${g.title}</div>
                ${g.steps.map(s => `<div style="font-size:0.78rem;color:var(--text-secondary);padding:0.2rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">${s}</div>`).join('')}
              </div>`).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="window.RC.app.closeModal()">Close</button>
        </div>`;
        window.RC.app.openModal(html);
    }

    // ── Main Dashboard ────────────────────────────────────────
    function initAdmin() {
        const loggedIn = sessionStorage.getItem('rc_admin_auth') === 'true';
        if (loggedIn) { _isAuthenticated = true; renderDashboard(); }
        else { _renderLoginForm(); }
    }

    function _renderLoginForm() {
        const container = document.getElementById('admin-content');
        if (!container) return;
        container.innerHTML = `
      <div class="admin-login">
        <div class="admin-login-card">
          <div style="font-size:3rem; margin-bottom:1rem;">🛡️</div>
          <h2 style="margin-bottom:0.5rem;">Admin Access</h2>
          <p style="color:var(--text-muted); font-size:0.875rem; margin-bottom:1.5rem;">Enter the admin password to access the dashboard.</p>
          <div class="form-group">
            <input type="password" id="admin-pw-input" class="form-control" placeholder="Admin password..."
              style="text-align:center;" onkeydown="if(event.key==='Enter') window.RC.admin.tryLogin()">
          </div>
          <button class="btn btn-primary btn-block" onclick="window.RC.admin.tryLogin()">🔓 Access Dashboard</button>
          <div style="margin-top:1rem; font-size:0.75rem; color:var(--text-muted);">Demo password: <code style="background:var(--bg-card); padding:2px 6px; border-radius:4px;">admin123</code></div>
        </div>
      </div>`;
    }

    function tryLogin() {
        const input = document.getElementById('admin-pw-input');
        if (!input) return;
        if (input.value === ADMIN_PASSWORD) {
            _isAuthenticated = true;
            sessionStorage.setItem('rc_admin_auth', 'true');
            renderDashboard();
            window.RC.app.showToast('✅ Access Granted', 'Welcome to the Admin Dashboard.', 'success');
        } else {
            window.RC.app.showToast('❌ Access Denied', 'Incorrect password.', 'error');
            input.value = ''; input.focus();
        }
    }

    function renderDashboard() {
        const { ItemStore, ClaimStore, AuditStore, formatTime, categoryIcon } = window.RC.data;
        const stats = ItemStore.getStats();
        const container = document.getElementById('admin-content');
        if (!container) return;

        // Run escalations each dashboard load
        if (window.RC.escalation) window.RC.escalation.runEscalations();

        const highPriorityItems = [...ItemStore.getLostItems(), ...ItemStore.getFoundItems()]
            .filter(i => (i.priority === 'HIGH' || i.priority === 'URGENT') && i.status !== 'Returned')
            .sort((a, b) => (b.priority === 'URGENT' ? 1 : 0) - (a.priority === 'URGENT' ? 1 : 0));

        const pendingClaims = ClaimStore.getPending();
        const auditLog = AuditStore.getAll().slice(0, 25);
        const flagged = ClaimStore.getFlagged();

        container.innerHTML = `
      <div class="admin-layout">
        <div class="admin-header">
          <div>
            <h2 style="margin-bottom:0.25rem;">🛡️ Admin Dashboard</h2>
            <p style="color:var(--text-muted); font-size:0.875rem;">ReConnect Campus Lost & Found — Secure Command Center</p>
          </div>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="window.RC.admin.openGuidelines()">📖 Guidelines</button>
            <button class="btn btn-outline btn-sm" onclick="window.RC.admin.renderDashboard()">🔄 Refresh</button>
            <button class="btn btn-danger btn-sm" onclick="window.RC.admin.logout()">Logout</button>
          </div>
        </div>

        <!-- Stats -->
        <div class="admin-stats">
          <div class="admin-stat"><div style="font-size:1.5rem;">📋</div><div class="admin-stat-num" style="background:var(--gradient-accent);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${stats.total}</div><div class="admin-stat-label">Total Reports</div></div>
          <div class="admin-stat"><div style="font-size:1.5rem;">🚨</div><div class="admin-stat-num" style="color:var(--color-danger);">${stats.highPriority}</div><div class="admin-stat-label">High Priority Open</div></div>
          <div class="admin-stat"><div style="font-size:1.5rem;">⏳</div><div class="admin-stat-num" style="color:var(--color-urgent);">${stats.pending}</div><div class="admin-stat-label">Pending Claims</div></div>
          <div class="admin-stat"><div style="font-size:1.5rem;">✅</div><div class="admin-stat-num" style="color:var(--color-success);">${stats.recovered}</div><div class="admin-stat-label">Items Recovered</div></div>
          <div class="admin-stat"><div style="font-size:1.5rem;">🎯</div><div class="admin-stat-num" style="color:var(--color-accent);">${stats.matches}</div><div class="admin-stat-label">Smart Matches</div></div>
          <div class="admin-stat"><div style="font-size:1.5rem;">🚫</div><div class="admin-stat-num" style="color:var(--color-danger);">${flagged.length}</div><div class="admin-stat-label">Flagged Accounts</div></div>
        </div>

        <!-- Analytics -->
        ${_renderAnalyticsHTML()}

        <!-- Main Grid -->
        <div class="admin-grid">

          <!-- High Priority with Escalation Status -->
          <div class="admin-panel">
            <div class="admin-panel-header">
              <span>🚨 Pinned – High Priority Items</span>
              <span class="badge badge-high">${highPriorityItems.length}</span>
            </div>
            <div class="admin-panel-body" style="max-height:340px; overflow-y:auto;">
              ${highPriorityItems.length === 0
                ? '<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon">✅</div><p>No high priority items</p></div>'
                : highPriorityItems.map(item => {
                    const escLevel = window.RC.escalation && window.RC.escalation.getEscalationLevel(item);
                    const nextEsc = window.RC.escalation && window.RC.escalation.getNextEscalationIn(item);
                    return `
                  <div class="admin-item-row">
                    <div style="font-size:1.25rem;">${categoryIcon(item.category)}</div>
                    <div class="admin-item-info">
                      <div class="admin-item-name">${_esc(item.name)}</div>
                      <div class="admin-item-sub">
                        ${item.priority === 'URGENT' ? '<span class="badge badge-urgent" style="font-size:0.6rem">URGENT</span>' : '<span class="badge badge-high" style="font-size:0.6rem">HIGH</span>'}
                        ${_esc(item.location || item.locationFound || '')} · ${formatTime(item.reportedAt)}
                      </div>
                      ${escLevel ? `<div style="font-size:0.7rem;color:${escLevel.color};font-weight:600;margin-top:2px;">⏰ ${nextEsc}</div>` : ''}
                      ${item.contactInfo ? `<div style="font-size:0.72rem;color:var(--color-success);">📞 ${_esc(item.contactInfo)}</div>` : ''}
                    </div>
                    <div class="admin-item-actions">
                      <button class="btn btn-outline btn-sm" onclick="window.RC.admin.openFullReport('${item.id}')">📄 Full Report</button>
                      ${item.status !== 'Returned' ? `<button class="btn btn-success btn-sm" onclick="window.RC.admin.markReturned('${item.id}')">✓ Return</button>` : '<span class="badge badge-returned">Returned</span>'}
                    </div>
                  </div>`;
                }).join('')
            }
            </div>
          </div>

          <!-- Pending Claims with Contact Info -->
          <div class="admin-panel">
            <div class="admin-panel-header">
              <span>⏳ Pending Claim Approvals</span>
              <span class="badge badge-urgent">${pendingClaims.length}</span>
            </div>
            <div class="admin-panel-body" style="max-height:340px; overflow-y:auto;">
              ${pendingClaims.length === 0
                ? '<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon">✅</div><p>No pending claims</p></div>'
                : pendingClaims.map(c => {
                    const item = ItemStore.getItemById(c.itemId);
                    return `
                  <div class="admin-item-row">
                    <div style="font-size:1.25rem;">📋</div>
                    <div class="admin-item-info">
                      <div class="admin-item-name">${_esc(c.claimant)} → <em>${_esc(c.itemName)}</em></div>
                      <div class="admin-item-sub">
                        ${formatTime(c.submittedAt)} · ${c.requiresAdminApproval ? '<span style="color:var(--color-danger);font-weight:600">Admin Required</span>' : 'Owner Only'}
                      </div>
                      <div class="admin-item-sub" style="margin-top:2px;font-style:italic;">"${_esc((c.uniqueIdentifier || '').slice(0, 55))}"</div>
                      ${item && item.contactInfo ? `<div style="font-size:0.72rem;color:var(--color-success);">📞 Owner: ${_esc(item.contactInfo)}</div>` : ''}
                    </div>
                    <div class="admin-item-actions" style="flex-direction:column;gap:0.3rem;">
                      <button class="btn btn-outline btn-sm" onclick="window.RC.admin.openFullReport('${c.itemId}')">📄 Report</button>
                      <button class="btn btn-danger btn-sm" onclick="window.RC.admin.rejectClaim('${c.id}')">✗ Reject</button>
                      <button class="btn btn-success btn-sm" onclick="window.RC.admin.approveClaim('${c.id}')">✓ Approve</button>
                    </div>
                  </div>`;
                }).join('')
            }
            </div>
          </div>

          <!-- Audit Log -->
          <div class="admin-panel">
            <div class="admin-panel-header"><span>📜 System Audit Log</span></div>
            <div class="admin-panel-body" style="max-height:300px; overflow-y:auto;">
              ${auditLog.length === 0
                ? '<div style="padding:1rem; color:var(--text-muted); font-size:0.875rem;">No audit entries yet.</div>'
                : auditLog.map(entry => `
                  <div class="audit-row">
                    <span>${_typeIcon(entry.type)}</span>
                    <div>
                      <div style="font-size:0.82rem; font-weight:600;">${_esc(entry.action)}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${_esc(entry.detail)} · by ${_esc(entry.by)}</div>
                    </div>
                    <span class="audit-time">${formatTime(entry.time)}</span>
                  </div>`).join('')
            }
            </div>
          </div>

          <!-- ERP Integration Panel -->
          <div class="admin-panel">
            <div class="admin-panel-header"><span>🎓 ERP Student Lookup</span><span style="font-size:0.7rem;color:var(--color-success);font-weight:600;">● CONNECTED</span></div>
            <div class="admin-panel-body">
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;">Cross-verify claimants against the ERP Student Registry using Roll No.</div>
              <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
                <input type="text" id="erp-search-input" class="form-control" placeholder="Enter Roll No. (e.g. 21CE042)" style="font-size:0.85rem;">
                <button class="btn btn-primary btn-sm" onclick="window.RC.admin.erpLookup()">Search</button>
              </div>
              <div id="erp-result"></div>
              <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-glass);font-size:0.72rem;color:var(--text-muted);">
                🔌 Future integrations: Academic SIS, Hostel Management, Library System, Exam Cell DB
              </div>
            </div>
          </div>

          <!-- Flagged Accounts -->
          <div class="admin-panel">
            <div class="admin-panel-header"><span>🚫 Flagged Accounts</span><span class="badge badge-high">${flagged.length}</span></div>
            <div class="admin-panel-body" style="max-height:250px; overflow-y:auto;">
              ${flagged.length === 0
                ? '<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon">✅</div><p>No flagged accounts</p></div>'
                : flagged.map(f => `
                  <div class="admin-item-row">
                    <div style="font-size:1.25rem;">🚫</div>
                    <div class="admin-item-info">
                      <div class="admin-item-name">${_esc(f.userId)}</div>
                      <div class="admin-item-sub">Reason: ${_esc(f.reason)}</div>
                      <div class="admin-item-sub">Flagged: ${formatTime(f.flaggedAt)}</div>
                    </div>
                    <div class="admin-item-actions">
                      <button class="btn btn-outline btn-sm" onclick="window.RC.admin.unflagUser('${f.userId}')">Lift Ban</button>
                    </div>
                  </div>`).join('')
            }
            </div>
          </div>

          <!-- Escalation Ladder Status -->
          <div class="admin-panel">
            <div class="admin-panel-header"><span>⏰ Escalation Ladder</span></div>
            <div class="admin-panel-body">
              <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:var(--radius-md);">
                  <div style="font-size:1.25rem;">🔔</div>
                  <div style="flex:1;">
                    <div style="font-size:0.85rem;font-weight:600;">24 Hours — Finder Reminder</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">Items with a smart match get a "contact the finder" alert if no claim is made</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);">
                  <div style="font-size:1.25rem;">⚠️</div>
                  <div style="flex:1;">
                    <div style="font-size:0.85rem;font-weight:600;">72 Hours — Admin Alert</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">Admin receives notification. Item flagged for manual review in dashboard</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);">
                  <div style="font-size:1.25rem;">🔴</div>
                  <div style="flex:1;">
                    <div style="font-size:0.85rem;font-weight:600;">7 Days — Mark Unclaimed</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">Item status auto-changed to "Unclaimed". Urgent admin action triggered.</div>
                  </div>
                </div>
              </div>
              <div style="margin-top:1rem;font-size:0.75rem;color:var(--text-muted);">Escalations run automatically on every dashboard load and app start.</div>
            </div>
          </div>

        </div>
      </div>`;
    }

    function approveClaim(claimId) {
        const { ClaimStore, ItemStore, AuditStore, NotifStore } = window.RC.data;
        ClaimStore.update(claimId, { status: 'Approved' });
        ClaimStore.addAudit(claimId, 'Claim approved by Admin', 'Admin');
        const claim = ClaimStore.getAll().find(c => c.id === claimId);
        if (claim) {
            ItemStore.markReturned(claim.itemId);
            NotifStore.add(`✅ Claim approved: "${claim.itemName}" returned to ${claim.claimant}.`, 'success');
        }
        AuditStore.add('Claim Approved', `${claimId} approved by Admin`, 'Admin', 'claim');
        window.RC.app.showToast('✅ Claim Approved', 'Item marked as returned.', 'success');
        renderDashboard();
    }

    function rejectClaim(claimId) {
        const { ClaimStore, AuditStore } = window.RC.data;
        ClaimStore.update(claimId, { status: 'Rejected' });
        ClaimStore.addAudit(claimId, 'Claim rejected by Admin', 'Admin');
        AuditStore.add('Claim Rejected', `${claimId} rejected by Admin`, 'Admin', 'fraud');
        window.RC.app.showToast('❌ Claim Rejected', 'Claim has been rejected.', 'error');
        renderDashboard();
    }

    function markReturned(itemId) {
        window.RC.data.ItemStore.markReturned(itemId);
        window.RC.app.showToast('✅ Marked Returned', `Item ${itemId} marked as returned.`, 'success');
        renderDashboard();
    }

    function unflagUser(userId) {
        const flagged = JSON.parse(localStorage.getItem('rc_flagged_users') || '[]');
        const updated = flagged.filter(f => f.userId !== userId);
        localStorage.setItem('rc_flagged_users', JSON.stringify(updated));
        window.RC.data.AuditStore.add('Restriction Lifted', `${userId} unflagged by Admin`, 'Admin', 'info');
        window.RC.app.showToast('✅ Restriction Lifted', `Account ${userId} unflagged.`, 'success');
        renderDashboard();
    }

    function logout() {
        sessionStorage.removeItem('rc_admin_auth');
        _isAuthenticated = false;
        _renderLoginForm();
    }

    function _typeIcon(type) {
        const m = { report: '📋', match: '🎯', claim: '🔐', fraud: '🚫', return: '✅', escalation: '⏰', info: 'ℹ️' };
        return m[type] || 'ℹ️';
    }

    function _esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.RC.admin = { initAdmin, tryLogin, renderDashboard, approveClaim, rejectClaim, markReturned, unflagUser, logout, openFullReport, openGuidelines, erpLookup };
})();
