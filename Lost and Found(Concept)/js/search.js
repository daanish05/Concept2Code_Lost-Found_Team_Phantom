// js/search.js — Browse, Search, Filter & Item Detail
window.RC = window.RC || {};

(function () {
  'use strict';

  let _currentFilters = { type: 'all', category: '', location: '', priority: '', status: '', query: '' };
  let _debounceTimer = null;
  let _initialized = false;

  function initSearch() {
    if (!_initialized) {
      _initialized = true;
      _renderFilterSidebar();
      _bindSearch();
    }
    renderItems();
  }

  function renderItems(filters) {
    if (filters) _currentFilters = { ..._currentFilters, ...filters };
    const { ItemStore, formatTime, categoryIcon } = window.RC.data;
    const all = ItemStore.getAllItems();
    const filtered = _applyFilters(all, _currentFilters);

    const grid = document.getElementById('browse-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;

    if (countEl) countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''} found`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No items found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(item => _renderCard(item)).join('');

    grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.id));
    });
  }

  function _renderCard(item) {
    const { formatTime, categoryIcon } = window.RC.data;
    const isHigh = item.priority === 'HIGH' || item.priority === 'URGENT';
    const isUrgent = item.priority === 'URGENT';
    const hasMatch = item.matchIds && item.matchIds.length > 0;

    let cardClass = 'item-card';
    if (isUrgent) cardClass += ' urgent';
    else if (isHigh) cardClass += ' high-priority';
    if (hasMatch) cardClass += ' matched';

    const priorityBadge = isUrgent
      ? `<span class="badge badge-urgent">⚡ URGENT</span>`
      : isHigh
        ? `<span class="badge badge-high">🚨 HIGH</span>`
        : `<span class="badge badge-normal">NORMAL</span>`;

    const statusBadge = `<span class="badge badge-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>`;
    const typeBadge = item.type === 'lost'
      ? `<span class="badge badge-lost-type">LOST</span>`
      : `<span class="badge badge-found-type">FOUND</span>`;
    const matchBadge = hasMatch ? `<span class="badge badge-matched">🎯 MATCH</span>` : '';

    const locStr = item.location || item.locationFound || 'Unknown';
    const dateStr = item.dateLost || item.dateFound || '';

    return `
      <div class="${cardClass}" data-id="${item.id}" role="button" tabindex="0">
        <div class="item-card-top"></div>
        <div class="item-card-body">
          <div class="item-card-header">
            <div>
              <div class="item-card-title">${categoryIcon(item.category)} ${_esc(item.name)}</div>
              <div class="item-card-id">${item.id}</div>
            </div>
          </div>
          <div class="item-card-badges">
            ${typeBadge} ${priorityBadge} ${statusBadge} ${matchBadge}
          </div>
          <div class="item-card-desc">${_esc(item.description)}</div>
          <div class="item-card-meta">
            <span>📍 ${_esc(locStr)}</span>
            <span>🕐 ${formatTime(item.reportedAt)}</span>
            ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
          </div>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.RC.search.openDetail('${item.id}')">
            View Details →
          </button>
        </div>
      </div>`;
  }

  function openDetail(itemId) {
    const { ItemStore, getAuthorityContact, formatTime, formatDate, categoryIcon, DEVICE_TRACKING } = window.RC.data;
    const item = ItemStore.getItemById(itemId);
    if (!item) return;

    const matches = window.RC.match.getMatchesForItem(item);
    const isHigh = item.priority === 'HIGH' || item.priority === 'URGENT';
    const locStr = item.location || item.locationFound || 'Unknown';
    const authority = item.authorityContact || getAuthorityContact(locStr);

    const devicePanel = _renderDevicePanel(item);
    const matchBanner = matches.length > 0 ? `
      <div class="match-banner">
        <div class="match-banner-icon">🎯</div>
        <div class="match-banner-text">
          <div class="match-banner-title">Smart Match Found!</div>
          <div class="match-banner-sub">${matches.length} potential match${matches.length > 1 ? 'es' : ''} detected. <a href="#" onclick="event.preventDefault(); window.RC.search.openDetail('${matches[0].id}')">View matched item →</a></div>
        </div>
      </div>` : '';

    const contactSection = _renderContactSection(item);
    const matchContactSection = matches.length > 0 ? _renderMatchContactSection(matches[0]) : '';

    const claimBtn = item.type === 'lost' && item.status === 'Open'
      ? `<button class="btn btn-primary" onclick="window.RC.claim.openClaimModal('${item.id}')">🔐 Claim This Item</button>`
      : item.status === 'Claimed'
        ? `<button class="btn btn-outline" disabled>✅ Already Claimed</button>`
        : item.status === 'Returned'
          ? `<button class="btn btn-outline" disabled>🏁 Returned</button>`
          : `<button class="btn btn-secondary" onclick="window.RC.search.openDetail('${item.id}')">📩 Contact Finder</button>`;

    const html = `
      <div class="modal-header">
        <div>
          <div class="modal-title">${categoryIcon(item.category)} ${_esc(item.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px; font-family:monospace">${item.id}</div>
        </div>
        <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
          <span class="badge badge-${item.type === 'lost' ? 'lost-type' : 'found-type'}">${item.type.toUpperCase()}</span>
          ${item.priority === 'URGENT' ? '<span class="badge badge-urgent">⚡ URGENT</span>' : item.priority === 'HIGH' ? '<span class="badge badge-high">🚨 HIGH PRIORITY</span>' : '<span class="badge badge-normal">NORMAL</span>'}
          <span class="badge badge-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>
          ${matches.length ? '<span class="badge badge-matched">🎯 MATCH FOUND</span>' : ''}
        </div>

        ${matchBanner}

        ${isHigh ? `<div class="warning-box" style="margin-bottom:1rem;"><span>🚨</span><span>This is a HIGH PRIORITY item. Admin has been notified. Verification required for all claims.</span></div>` : ''}

        <div class="detail-grid">
          <div class="detail-field">
            <div class="detail-field-label">Category</div>
            <div class="detail-field-value">${item.category}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">${item.type === 'lost' ? 'Date Lost' : 'Date Found'}</div>
            <div class="detail-field-value">${item.dateLost || item.dateFound || '—'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">${item.type === 'lost' ? 'Last Seen Location' : 'Found At'}</div>
            <div class="detail-field-value">📍 ${_esc(locStr)}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">Reported By</div>
            <div class="detail-field-value">${_esc(item.reportedBy || 'Anonymous')}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">Reported</div>
            <div class="detail-field-value">${formatTime(item.reportedAt)}</div>
          </div>
          ${item.storageLocation ? `
          <div class="detail-field">
            <div class="detail-field-label">Stored At</div>
            <div class="detail-field-value">🏢 ${_esc(item.storageLocation)}</div>
          </div>` : ''}
        </div>

        <div class="detail-field" style="margin-bottom:1rem;">
          <div class="detail-field-label">Description</div>
          <div class="detail-field-value" style="color:var(--text-secondary); line-height:1.6;">${_esc(item.description)}</div>
        </div>

        ${contactSection}
        ${matchContactSection}

        ${authority ? `
        <div class="authority-panel visible" style="margin-bottom:1rem;">
          <div class="authority-header"><span>${authority.icon || '🏛️'}</span> Relevant Authority</div>
          <div class="authority-name">${authority.name}</div>
          <div class="authority-detail">📞 ${authority.phone}</div>
          <div class="authority-detail">✉️ ${authority.email}</div>
          <div class="authority-detail">📍 ${authority.office}</div>
        </div>` : ''}

        ${devicePanel}

        <div style="margin-top:0.75rem;padding:0.6rem 0.75rem;background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.15);border-radius:var(--radius-md);display:flex;align-items:center;gap:0.75rem;">
          <div id="item-qr-placeholder" style="flex-shrink:0;"></div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Scan this QR code to share item details. <a href="#" style="color:var(--color-primary-light);" onclick="event.preventDefault();window.RC.search.openQRModal('${item.id}')">Print full QR tag →</a></div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window.RC.app.closeModal()">Close</button>
        ${claimBtn}
      </div>`;

    window.RC.app.openModal(html);
    // Small delay to ensure DOM is ready for QR
    setTimeout(() => _renderQR(item), 100);
  }

  function _renderQR(item) {
    const el = document.getElementById('item-qr-placeholder');
    if (!el || typeof QRCode === 'undefined') return;
    el.innerHTML = '';
    new QRCode(el, {
      text: `ReConnect ID: ${item.id} | ${item.name} | ${item.type.toUpperCase()} | Lost at: ${item.location || item.locationFound || 'Unknown'} | Report at: reconnect.svit.edu`,
      width: 120, height: 120,
      colorDark: '#8b5cf6', colorLight: '#0a0a1a',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function openQRModal(itemId) {
    const { ItemStore, categoryIcon } = window.RC.data;
    const item = ItemStore.getItemById(itemId);
    if (!item) return;
    const html = `
      <div class="modal-header">
        <div class="modal-title">📱 QR Tag for Item</div>
        <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="text-align:center;">
        <div style="background:#fff;display:inline-block;padding:1.25rem;border-radius:var(--radius-lg);margin-bottom:1rem;">
          <div id="qr-print-target"></div>
        </div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem;font-family:monospace;font-weight:700;">${item.id}</div>
        <div style="font-size:0.9rem;font-weight:600;">${categoryIcon(item.category)} ${_esc(item.name)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">${item.type.toUpperCase()} · ${item.location || item.locationFound || ''}</div>
        <div style="margin-top:1rem;padding:0.75rem;background:rgba(139,92,246,0.07);border-radius:var(--radius-md);font-size:0.78rem;color:var(--text-secondary);">
          Print this QR tag and place it where the item was last seen. Anyone who scans it gets the item ID to look up on ReConnect.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window.RC.app.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print QR Tag</button>
      </div>`;
    window.RC.app.openModal(html);
    setTimeout(() => {
      const el = document.getElementById('qr-print-target');
      if (el && typeof QRCode !== 'undefined') {
        new QRCode(el, {
          text: `ReConnect Item: ${item.id} | ${item.name} | Visit reconnect.svit.edu and search for this ID`,
          width: 200, height: 200,
          colorDark: '#1e1e3a', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 150);
  }

  function _renderContactSection(item) {
    if (item.type === 'lost') {
      if (!item.contactInfo) return '';
      const prefIcon = item.contactPreference === 'phone' ? '📞' : item.contactPreference === 'email' ? '✉️' : '🔔';
      return `
        <div style="background:rgba(16,185,129,0.07); border:1px solid rgba(16,185,129,0.25); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1rem;">
          <div style="font-size:0.78rem; font-weight:700; color:var(--color-success); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.6rem;">📞 Contact the Owner</div>
          <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">${_esc(item.reportedBy || 'Owner')}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.2rem;">${prefIcon} ${_esc(item.contactInfo)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Preferred: ${item.contactPreference || 'Any'}</div>
        </div>`;
    } else {
      // Found item — show storage + finder contact if available
      const extras = item.finderContact
        ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">📱 ${_esc(item.finderContact)}</div>`
        : '';
      return `
        <div style="background:rgba(16,185,129,0.07); border:1px solid rgba(16,185,129,0.25); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1rem;">
          <div style="font-size:0.78rem; font-weight:700; color:var(--color-success); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.6rem;">📦 Retrieve / Contact the Finder</div>
          <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">Found by: ${_esc(item.reportedBy || 'Anonymous')}</div>
          ${item.storageLocation ? `<div style="font-size:0.85rem; color:var(--text-secondary);">🏢 Item is stored at: <strong>${_esc(item.storageLocation)}</strong></div>` : ''}
          ${extras}
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">Visit the storage location or use the claim process to verify and retrieve your item.</div>
        </div>`;
    }
  }

  function _renderMatchContactSection(matchedItem) {
    if (!matchedItem) return '';
    const isLost = matchedItem.type === 'lost';
    const contact = isLost ? matchedItem.contactInfo : matchedItem.finderContact;
    const storage = matchedItem.storageLocation;
    return `
      <div style="background:rgba(6,182,212,0.07); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1rem;">
        <div style="font-size:0.78rem; font-weight:700; color:var(--color-accent-light); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.6rem;">🎯 Connect with Matched ${isLost ? 'Owner' : 'Finder'}</div>
        <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">${_esc(matchedItem.name)}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:0.25rem;">Reported by: ${_esc(matchedItem.reportedBy || 'Anonymous')}</div>
        ${contact ? `<div style="font-size:0.85rem; color:var(--text-secondary);">📱 ${_esc(contact)}</div>` : ''}
        ${storage ? `<div style="font-size:0.82rem; color:var(--text-secondary);">🏢 Stored at: ${_esc(storage)}</div>` : ''}
        <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="window.RC.search.openDetail('${matchedItem.id}')">View Matched Item →</button>
      </div>`;
  }

  function _renderDevicePanel(item) {
    const DT = window.RC.data.DEVICE_TRACKING;
    const trackable = DT[item.category];
    if (!trackable || item.type !== 'lost') return '';

    const links = [...(trackable.android || []), ...(trackable.apple || []), ...(trackable.links || [])];
    const linksHtml = links.map(l => `
      <a href="${l.url}" target="_blank" rel="noopener" class="device-action">
        <span class="device-action-icon">${l.icon}</span>
        <div>
          <div class="device-action-label">${l.label}</div>
          <div class="device-action-sub">${l.sub}</div>
        </div>
        <span class="device-action-arrow">→</span>
      </a>`).join('');

    const stepsHtml = trackable.steps ? `
      <div style="margin-top:0.75rem;">
        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Recovery Steps</div>
        ${trackable.steps.map(s => `<div style="font-size:0.82rem; color:var(--text-secondary); padding:0.3rem 0; border-bottom:1px solid var(--border-glass);">${s}</div>`).join('')}
      </div>` : '';

    return `
      <div class="device-panel">
        <div class="device-panel-title"><span>📡</span> Device Recovery Assistance</div>
        ${linksHtml}
        ${stepsHtml}
      </div>`;
  }

  function _applyFilters(items, f) {
    return items.filter(item => {
      if (f.type && f.type !== 'all' && item.type !== f.type) return false;
      if (f.category && item.category !== f.category) return false;
      if (f.location) {
        const loc = item.location || item.locationFound || '';
        if (loc !== f.location) return false;
      }
      if (f.priority) {
        if (f.priority === 'urgent' && item.priority !== 'URGENT') return false;
        if (f.priority === 'high' && item.priority === 'NORMAL') return false;
        if (f.priority === 'normal' && item.priority !== 'NORMAL') return false;
      }
      if (f.status && item.status !== f.status) return false;
      if (f.query) {
        const q = f.query.toLowerCase();
        const hay = `${item.name} ${item.description} ${item.category} ${item.location || ''} ${item.locationFound || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function _renderFilterSidebar() {
    const { CATEGORIES, LOCATIONS } = window.RC.data;

    const catContainer = document.getElementById('filter-categories');
    if (catContainer) {
      catContainer.innerHTML = `
        <label class="filter-option active" data-filter="category" data-value="">
          <input type="radio" name="filter-cat" value="" checked> All Categories
        </label>` +
        CATEGORIES.map(c => `
          <label class="filter-option" data-filter="category" data-value="${c}">
            <input type="radio" name="filter-cat" value="${c}"> ${c}
          </label>`).join('');
      catContainer.querySelectorAll('.filter-option').forEach(lbl => {
        lbl.addEventListener('click', () => {
          catContainer.querySelectorAll('.filter-option').forEach(l => l.classList.remove('active'));
          lbl.classList.add('active');
          renderItems({ category: lbl.dataset.value });
        });
      });
    }

    const locContainer = document.getElementById('filter-locations');
    if (locContainer) {
      locContainer.innerHTML = `
        <label class="filter-option active" data-value="">
          <input type="radio" name="filter-loc" value="" checked> All Locations
        </label>` +
        LOCATIONS.map(l => `
          <label class="filter-option" data-value="${l}">
            <input type="radio" name="filter-loc" value="${l}"> ${l}
          </label>`).join('');
      locContainer.querySelectorAll('.filter-option').forEach(lbl => {
        lbl.addEventListener('click', () => {
          locContainer.querySelectorAll('.filter-option').forEach(l => l.classList.remove('active'));
          lbl.classList.add('active');
          renderItems({ location: lbl.dataset.value });
        });
      });
    }
  }

  function _bindSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        renderItems({ query: input.value.trim() });
      }, 280);
    });

    // Type filter buttons
    document.querySelectorAll('[data-type-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-type-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderItems({ type: btn.dataset.typeFilter });
      });
    });

    // Priority filter
    document.querySelectorAll('[data-priority-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-priority-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderItems({ priority: btn.dataset.priorityFilter });
      });
    });
  }

  function _esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.RC.search = { initSearch, renderItems, openDetail, openQRModal };
})();
