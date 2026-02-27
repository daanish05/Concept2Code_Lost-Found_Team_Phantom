// js/report.js — Lost & Found form handling
window.RC = window.RC || {};

(function () {
    'use strict';

    let _lostInitialized = false;
    let _foundInitialized = false;

    function initLostForm() {
        const cats = window.RC.data.CATEGORIES;
        const locs = window.RC.data.LOCATIONS;

        // Populate selects
        _populateSelect('lost-category', cats);
        _populateSelect('lost-location', locs);

        if (_lostInitialized) return;
        _lostInitialized = true;

        // Category change: show/hide "Other" text input
        const catSel = document.getElementById('lost-category');
        if (catSel) {
            catSel.addEventListener('change', () => {
                const otherInput = document.getElementById('lost-category-other');
                if (otherInput) otherInput.style.display = catSel.value === 'Other' ? 'block' : 'none';
                _updatePriorityNotice('lost-priority-notice', catSel.value);
                _updateAuthority('lost-authority-panel', document.getElementById('lost-location')?.value);
            });
        }

        // Location change: show/hide "Other" text + authority panel
        const locSel = document.getElementById('lost-location');
        if (locSel) {
            locSel.addEventListener('change', () => {
                const otherInput = document.getElementById('lost-location-other');
                if (otherInput) otherInput.style.display = locSel.value === 'Other' ? 'block' : 'none';
                _updateAuthority('lost-authority-panel', locSel.value);
            });
        }

        // Image preview
        const imgInput = document.getElementById('lost-image');
        if (imgInput) {
            imgInput.addEventListener('change', (e) => _previewImage(e, 'lost-image-preview'));
        }

        const uploadArea = document.getElementById('lost-upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => imgInput && imgInput.click());
            uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', e => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files[0]) {
                    imgInput.files = e.dataTransfer.files;
                    _previewImage({ target: { files: e.dataTransfer.files } }, 'lost-image-preview');
                }
            });
        }

        // Submit
        const form = document.getElementById('form-lost');
        if (form) {
            form.addEventListener('submit', handleLostSubmit);
        }
    }

    function initFoundForm() {
        const cats = window.RC.data.CATEGORIES;
        const locs = window.RC.data.LOCATIONS;

        _populateSelect('found-category', cats);
        _populateSelect('found-location', locs);

        if (_foundInitialized) return;
        _foundInitialized = true;

        // Category / Location "Other" show/hide for found form
        const fCat = document.getElementById('found-category');
        if (fCat) fCat.addEventListener('change', () => {
            const o = document.getElementById('found-category-other');
            if (o) o.style.display = fCat.value === 'Other' ? 'block' : 'none';
        });
        const fLoc = document.getElementById('found-location');
        if (fLoc) fLoc.addEventListener('change', () => {
            const o = document.getElementById('found-location-other');
            if (o) o.style.display = fLoc.value === 'Other' ? 'block' : 'none';
        });



        const imgInput = document.getElementById('found-image');
        if (imgInput) imgInput.addEventListener('change', e => _previewImage(e, 'found-image-preview'));

        const uploadArea = document.getElementById('found-upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => imgInput && imgInput.click());
            uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        }

        const form = document.getElementById('form-found');
        if (form) form.addEventListener('submit', handleFoundSubmit);
    }

    function handleLostSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!_validate(form)) return;

        const session = window.RC.data.SessionStore.get();
        const catRaw = _val('lost-category');
        const locRaw = _val('lost-location');
        const data = {
            name: _val('lost-name'),
            category: catRaw === 'Other' ? (_val('lost-category-other') || 'Other') : catRaw,
            description: _val('lost-description'),
            dateLost: _val('lost-date'),
            location: locRaw === 'Other' ? (_val('lost-location-other') || 'Other') : locRaw,
            contactPreference: _val('lost-contact-pref'),
            contactInfo: _val('lost-contact-info'),
            verificationQuestion: _val('lost-verif-q'),
            verificationAnswer: _val('lost-verif-a').toLowerCase().trim(),
            isUrgent: document.getElementById('lost-urgent')?.checked || false,
            reportedBy: session ? session.name : 'Anonymous',
        };

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Submitting...';

        setTimeout(() => {
            const item = window.RC.data.ItemStore.addLostItem(data);
            const matches = window.RC.match.runMatch(item);

            window.RC.app.showToast(
                '📢 Lost Item Reported!',
                `ID: ${item.id} | Priority: ${item.priority}`,
                item.priority !== 'NORMAL' ? 'warning' : 'success'
            );

            if (matches.length > 0) {
                setTimeout(() => {
                    window.RC.app.showToast('🎯 Smart Match!', `We found a potential match for your item!`, 'info');
                }, 800);
            }

            window.RC.app.updateNotifBadge();
            form.reset();
            document.getElementById('lost-image-preview') && (document.getElementById('lost-image-preview').style.display = 'none');
            document.getElementById('lost-authority-panel') && (document.getElementById('lost-authority-panel').className = 'authority-panel');
            document.getElementById('lost-priority-notice') && (document.getElementById('lost-priority-notice').className = 'priority-notice');
            btn.disabled = false;
            btn.textContent = '📢 Submit Lost Report';

            setTimeout(() => window.RC.app.navigate('browse'), 1200);
        }, 600);
    }

    function handleFoundSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!_validate(form)) return;

        const session = window.RC.data.SessionStore.get();
        const fCatRaw = _val('found-category');
        const fLocRaw = _val('found-location');
        const data = {
            name: _val('found-name'),
            category: fCatRaw === 'Other' ? (_val('found-category-other') || 'Other') : fCatRaw,
            description: _val('found-description'),
            locationFound: fLocRaw === 'Other' ? (_val('found-location-other') || 'Other') : fLocRaw,
            dateFound: _val('found-date'),
            storageLocation: _val('found-storage'),
            finderContact: _val('found-contact-info'),
            reportedBy: session ? session.name : 'Anonymous',
        };

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Submitting...';

        setTimeout(() => {
            const item = window.RC.data.ItemStore.addFoundItem(data);
            const matches = window.RC.match.runMatch(item);

            window.RC.app.showToast('📦 Found Item Reported!', `ID: ${item.id} — Thank you for reporting!`, 'success');

            if (matches.length > 0) {
                setTimeout(() => {
                    window.RC.app.showToast('🎯 Smart Match!', `Potential owner found – they\'ve been notified!`, 'info');
                }, 800);
            }

            window.RC.app.updateNotifBadge();
            form.reset();
            document.getElementById('found-image-preview') && (document.getElementById('found-image-preview').style.display = 'none');
            btn.disabled = false;
            btn.textContent = '📦 Submit Found Report';
            setTimeout(() => window.RC.app.navigate('browse'), 1200);
        }, 600);
    }

    function _populateSelect(id, options) {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = `<option value="">Select...</option>` +
            options.map(o => `<option value="${o}">${o}</option>`).join('');
    }

    function _val(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function _validate(form) {
        const required = form.querySelectorAll('[required]');
        let ok = true;
        required.forEach(el => {
            el.classList.remove('error');
            if (!el.value.trim()) {
                el.classList.add('form-control-error');
                ok = false;
            } else {
                el.classList.remove('form-control-error');
            }
        });
        if (!ok) {
            window.RC.app.showToast('⚠️ Incomplete Form', 'Please fill in all required fields.', 'error');
        }
        return ok;
    }

    function _previewImage(e, previewId) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = ev.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    function _updatePriorityNotice(panelId, category) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const isHigh = window.RC.data.HIGH_PRIORITY_CATEGORIES.has(category);
        if (isHigh) {
            panel.className = 'priority-notice visible';
            panel.innerHTML = `
        <span class="priority-notice-icon">🚨</span>
        <div class="priority-notice-text">
          <strong>HIGH PRIORITY Category Detected.</strong><br>
          Items in this category are automatically escalated. Admin will be notified immediately upon submission. 
          Owner + Admin approval required for any claim.
        </div>`;
        } else {
            panel.className = 'priority-notice';
        }
    }

    function _updateAuthority(panelId, location) {
        const panel = document.getElementById(panelId);
        if (!panel || !location) return;
        const contact = window.RC.data.getAuthorityContact(location);
        panel.className = 'authority-panel visible';
        panel.innerHTML = `
      <div class="authority-header"><span>${contact.icon}</span> Did you try contacting the relevant authority?</div>
      <div style="font-size:0.8rem; color:var(--color-accent-light); margin-bottom:0.75rem; font-style:italic;">
        They may already have your item! Contact them first before or alongside reporting.
      </div>
      <div class="authority-name">${contact.name}</div>
      <div class="authority-detail">📞 ${contact.phone}</div>
      <div class="authority-detail">✉️ ${contact.email}</div>
      <div class="authority-detail">📍 ${contact.office}</div>
      <a href="tel:${contact.phone.replace(/[^+0-9]/g, '')}" 
         style="display:inline-flex;align-items:center;gap:0.4rem;margin-top:0.75rem;padding:0.4rem 0.85rem;background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3);border-radius:var(--radius-full);color:var(--color-accent-light);font-size:0.78rem;font-weight:600;text-decoration:none;">
        📞 Call Now
      </a>`;
    }

    window.RC.report = { initLostForm, initFoundForm };
})();
