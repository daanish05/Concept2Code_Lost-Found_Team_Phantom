// js/app.js — App Router, Global Utilities, Notifications
window.RC = window.RC || {};

(function () {
    'use strict';

    const PAGES = ['home', 'report-lost', 'report-found', 'browse', 'admin'];

    // ── Router ────────────────────────────────────────────────
    function navigate(page) {
        window.location.hash = page;
    }

    function showPage(page) {
        if (!PAGES.includes(page)) page = 'home';
        PAGES.forEach(p => {
            const el = document.getElementById(`page-${p}`);
            if (el) el.classList.toggle('active', p === page);
        });
        document.querySelectorAll('.nav-links a').forEach(a => {
            a.classList.toggle('active', a.dataset.page === page);
        });
        // Page init hooks
        if (page === 'browse') window.RC.search && window.RC.search.initSearch();
        if (page === 'report-lost') window.RC.report && window.RC.report.initLostForm();
        if (page === 'report-found') window.RC.report && window.RC.report.initFoundForm();
        if (page === 'admin') window.RC.admin && window.RC.admin.initAdmin();
        if (page === 'home') _renderHome();
        window.scrollTo(0, 0);
    }

    // ── Toast Notifications ───────────────────────────────────
    function showToast(title, msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', match: '🎯' };
        const id = 'toast-' + Date.now();
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.id = id;
        el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <span class="toast-close" onclick="document.getElementById('${id}').remove()">✕</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('removing');
            setTimeout(() => el.remove(), 350);
        }, 4200);
    }

    // ── Modal ─────────────────────────────────────────────────
    function openModal(html) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        if (!overlay || !container) return;
        container.innerHTML = html;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => {
            const container = document.getElementById('modal-container');
            if (container) container.innerHTML = '';
        }, 280);
    }

    // ── Notification Badge ────────────────────────────────────
    function updateNotifBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;
        const unread = window.RC.data.NotifStore.getUnread().length;
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function openNotifications() {
        const notifs = window.RC.data.NotifStore.getAll();
        const html = `
      <div class="modal-header">
        <div class="modal-title">🔔 Notifications</div>
        <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="padding:0;">
        ${notifs.length === 0
                ? '<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon">🔔</div><p>No notifications</p></div>'
                : notifs.map(n => `
            <div style="padding:0.9rem 1.5rem; border-bottom:1px solid var(--border-glass); display:flex; gap:0.75rem; align-items:flex-start; ${!n.read ? 'background:rgba(139,92,246,0.04);' : ''}">
              <span style="font-size:1.15rem;">${n.type === 'urgent' ? '🚨' : n.type === 'match' ? '🎯' : n.type === 'claim' ? '📋' : '🔔'}</span>
              <div style="flex:1;">
                <div style="font-size:0.85rem; ${!n.read ? 'font-weight:600;' : 'color:var(--text-secondary);'}">${_esc(n.msg)}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">${window.RC.data.formatTime(n.time)}</div>
              </div>
              ${!n.read ? '<div style="width:6px; height:6px; background:var(--color-primary); border-radius:50%; flex-shrink:0; margin-top:6px;"></div>' : ''}
            </div>`).join('')
            }
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline btn-sm" onclick="window.RC.data.NotifStore.markAllRead(); window.RC.app.updateNotifBadge(); window.RC.app.closeModal();">Mark All Read</button>
        <button class="btn btn-outline" onclick="window.RC.app.closeModal()">Close</button>
      </div>`;
        openModal(html);
        window.RC.data.NotifStore.markAllRead();
        updateNotifBadge();
    }

    // ── Home Page ─────────────────────────────────────────────
    function _renderHome() {
        const { ItemStore, formatTime, categoryIcon } = window.RC.data;
        const stats = ItemStore.getStats();

        // Update stat counters
        _animateCount('stat-total', stats.total);
        _animateCount('stat-recovered', stats.recovered);
        _animateCount('stat-today', stats.today);
        _animateCount('stat-matches', stats.matches);

        // Recent high priority
        const recentGrid = document.getElementById('recent-high-priority');
        if (recentGrid) {
            const urgentItems = [...ItemStore.getLostItems(), ...ItemStore.getFoundItems()]
                .filter(i => (i.priority === 'URGENT' || i.priority === 'HIGH') && i.status === 'Open')
                .sort((a, b) => b.reportedAt - a.reportedAt)
                .slice(0, 4);

            if (urgentItems.length === 0) {
                recentGrid.innerHTML = `<div style="color:var(--text-muted); font-size:0.875rem;">No urgent items at this time ✅</div>`;
            } else {
                recentGrid.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:1rem;">` +
                    urgentItems.map(item => `
            <div class="card" style="cursor:pointer; border-color:${item.priority === 'URGENT' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'};" onclick="RC.app.navigate('browse'); setTimeout(()=>RC.search.openDetail('${item.id}'),300)">
              <div class="card-body" style="padding:1rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                  <span style="font-size:1.5rem;">${categoryIcon(item.category)}</span>
                  <div>
                    <div style="font-weight:600; font-size:0.9rem;">${_esc(item.name)}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${item.id}</div>
                  </div>
                </div>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem;">
                  ${item.priority === 'URGENT' ? '<span class="badge badge-urgent">⚡ URGENT</span>' : '<span class="badge badge-high">🚨 HIGH</span>'}
                  <span class="badge badge-${item.type === 'lost' ? 'lost-type' : 'found-type'}">${item.type.toUpperCase()}</span>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted);">📍 ${_esc(item.location || item.locationFound || '')} · ${formatTime(item.reportedAt)}</div>
              </div>
            </div>`).join('') + `</div>`;
            }
        }

        // Urgent alert bar
        const urgentCount = ItemStore.getLostItems().filter(i => i.priority === 'URGENT' && i.status === 'Open').length;
        const urgentBar = document.getElementById('urgent-alert-bar');
        if (urgentBar) {
            if (urgentCount > 0) {
                urgentBar.className = 'urgent-alert-bar visible';
                urgentBar.innerHTML = `<span>⚡</span> <strong>${urgentCount} URGENT item${urgentCount > 1 ? 's' : ''}</strong> require immediate attention. <a href="#browse" onclick="RC.app.navigate('browse')" style="color:inherit; text-decoration:underline; margin-left:4px;">View all →</a>`;
            } else {
                urgentBar.className = 'urgent-alert-bar';
            }
        }
    }

    function _animateCount(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const duration = 800;
        const start = performance.now();
        const from = parseInt(el.textContent) || 0;
        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(from + (target - from) * ease);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ── Session / User ────────────────────────────────────────
    function ensureSession() {
        let session = window.RC.data.SessionStore.get();
        if (!session) {
            const name = prompt('Welcome to ReConnect!\n\nPlease enter your name to continue:') || 'Student';
            session = window.RC.data.SessionStore.set(name.trim() || 'Student');
        }
        const navUser = document.getElementById('nav-user');
        if (navUser) navUser.textContent = session.name;
        return session;
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        window.RC.data.init(); // seed data
        ensureSession();
        // Run escalation checks once on start
        if (window.RC.escalation) window.RC.escalation.runEscalations();
        updateNotifBadge();

        // Hash router
        function route() {
            const hash = window.location.hash.replace('#', '') || 'home';
            showPage(hash);
        }
        window.addEventListener('hashchange', route);
        route();

        // Close modal on overlay click
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) closeModal();
            });
        }

        // Notification bell
        const bell = document.getElementById('notif-bell');
        if (bell) bell.addEventListener('click', openNotifications);

        // Keyboard: Escape to close modal
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
    }

    function _esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.RC.app = { navigate, showPage, showToast, openModal, closeModal, updateNotifBadge, openNotifications, init };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
