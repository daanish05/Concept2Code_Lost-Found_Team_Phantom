// js/claim.js — Secure Claim Workflow with Anti-Fraud
window.RC = window.RC || {};

(function () {
    'use strict';

    const MAX_ATTEMPTS = 3;
    let _claimState = {};

    function openClaimModal(itemId) {
        const { ItemStore, SessionStore, ClaimStore } = window.RC.data;
        const item = ItemStore.getItemById(itemId);
        if (!item) return;

        const session = SessionStore.get();
        const userId = session ? session.id : 'anon';
        const userName = session ? session.name : 'Anonymous';

        // Check if flagged
        if (ClaimStore.isFlagged(userId)) {
            window.RC.app.openModal(_renderFlaggedModal());
            return;
        }

        // Check attempts
        const attempts = ClaimStore.getAttempts(userId, itemId);
        if (attempts >= MAX_ATTEMPTS) {
            ClaimStore.flagUser(userId, `Exceeded ${MAX_ATTEMPTS} claim attempts on ${itemId}`);
            window.RC.app.openModal(_renderFlaggedModal());
            return;
        }

        // Check if already claimed
        const existingClaims = ClaimStore.getByItemId(itemId).filter(c => c.claimant === userName);
        if (existingClaims.some(c => c.status.includes('Pending'))) {
            window.RC.app.openModal(`
        <div class="modal-header">
          <div class="modal-title">⏳ Claim Pending</div>
          <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-box"><span>ℹ️</span><span>You already have a pending claim for this item. Please wait for approval.</span></div>
        </div>
        <div class="modal-footer"><button class="btn btn-outline" onclick="window.RC.app.closeModal()">OK</button></div>`);
            return;
        }

        _claimState = { itemId, item, userId, userName, step: 1, data: {} };
        _renderStep(1);
    }

    function _renderStep(step) {
        const { item } = _claimState;
        const isHigh = item.priority === 'HIGH' || item.priority === 'URGENT';
        const attemptsLeft = MAX_ATTEMPTS - window.RC.data.ClaimStore.getAttempts(_claimState.userId, item.id);

        const stepsHtml = `
      <div class="claim-steps">
        ${['Verify', 'Identify', 'Submit', 'Confirm'].map((s, i) => `
          <div class="claim-step">
            <div class="step-dot ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}">${step > i + 1 ? '✓' : i + 1}</div>
            <div class="step-label ${step === i + 1 ? 'active' : ''}">${s}</div>
          </div>`).join('')}
      </div>`;

        let panelHtml = '';

        if (step === 1) {
            panelHtml = `
        <div class="claim-panel active" id="claim-p1">
          ${isHigh ? `<div class="warning-box" style="margin-bottom:1rem;"><span>🚨</span><span>This is a HIGH PRIORITY item. Your claim requires <strong>Owner + Admin approval</strong>.</span></div>` : ''}
          <div class="info-box" style="margin-bottom:1rem;"><span>ℹ️</span><span>You have <strong>${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''}</strong> remaining. Incorrect answers flag your account.</span></div>
          <div class="form-group">
            <label class="form-label">Item: <strong>${_esc(item.name)}</strong></label>
          </div>
          <div class="form-group">
            <label class="form-label">Verification Question <span class="required">*</span></label>
            <div style="padding:0.75rem 1rem; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.2); border-radius:var(--radius-md); font-weight:500; margin-bottom:0.75rem;">
              ${_esc(item.verificationQuestion || 'Describe a unique feature of this item.')}
            </div>
            <input type="text" id="claim-verif-ans" class="form-control" placeholder="Your answer..." required autocomplete="off">
            <div class="form-hint">Answer must exactly match what the owner set. Case-insensitive.</div>
          </div>
        </div>`;
        } else if (step === 2) {
            panelHtml = `
        <div class="claim-panel active" id="claim-p2">
          <div class="form-group">
            <label class="form-label">Describe a Unique Identifier <span class="required">*</span></label>
            <textarea id="claim-identifier" class="form-control" rows="3" placeholder="e.g. There's a scratch on the back, the serial number ends in 7722, the wallpaper is a photo of my dog..." required></textarea>
            <div class="form-hint">Describe something only the true owner would know (not mentioned in the public description).</div>
          </div>
          <div class="form-group">
            <label class="form-label">Additional Proof (Optional)</label>
            <textarea id="claim-proof" class="form-control" rows="2" placeholder="e.g. I have a purchase receipt, ID card, photo of the item before it was lost..."></textarea>
          </div>
        </div>`;
        } else if (step === 3) {
            const { data } = _claimState;
            const needsAdmin = item.priority === 'HIGH' || item.priority === 'URGENT';
            panelHtml = `
        <div class="claim-panel active" id="claim-p3">
          <div class="info-box" style="margin-bottom:1rem;"><span>🔍</span><span>Review your claim details before submitting. This cannot be undone.</span></div>
          <div style="background:var(--bg-card); border:1px solid var(--border-glass); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem;">
            <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">CLAIM SUMMARY</div>
            <div style="font-size:0.875rem; margin-bottom:0.4rem;"><strong>Item:</strong> ${_esc(item.name)} (${item.id})</div>
            <div style="font-size:0.875rem; margin-bottom:0.4rem;"><strong>Claimant:</strong> ${_esc(_claimState.userName)}</div>
            <div style="font-size:0.875rem; margin-bottom:0.4rem;"><strong>Unique Identifier Provided:</strong> ${_esc(data.identifier || '—')}</div>
            <div style="font-size:0.875rem;"><strong>Approval Required:</strong> ${needsAdmin ? '🔒 Owner + Admin (HIGH PRIORITY)' : '✅ Owner Only'}</div>
          </div>
          ${needsAdmin ? `<div class="warning-box"><span>⚠️</span><span>This claim requires <strong>admin approval</strong> in addition to owner confirmation before the item is released.</span></div>` : ''}
        </div>`;
        } else if (step === 4) {
            panelHtml = `
        <div class="claim-panel active" id="claim-p4">
          <div style="text-align:center; padding:2rem 0;">
            <div style="font-size:3rem; margin-bottom:1rem;">✅</div>
            <h3 style="margin-bottom:0.5rem; color:var(--color-success);">Claim Submitted!</h3>
            <p style="color:var(--text-secondary); margin-bottom:1rem;">Your claim is now pending review. You will be contacted once verified.</p>
            <div style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">Claim ID: ${_claimState.claimId || '—'}</div>
          </div>
        </div>`;
        }

        const footerHtml = step < 3
            ? `<button class="btn btn-outline" onclick="window.RC.app.closeModal()">Cancel</button>
         <button class="btn btn-primary" onclick="window.RC.claim._nextStep()">Continue →</button>`
            : step === 3
                ? `<button class="btn btn-outline" onclick="window.RC.claim._prevStep()">← Back</button>
           <button class="btn btn-primary" id="claim-submit-btn" onclick="window.RC.claim._submitClaim()">🔐 Submit Claim</button>`
                : `<button class="btn btn-primary" onclick="window.RC.app.closeModal()">Done</button>`;

        const html = `
      <div class="modal-header">
        <div class="modal-title">🔐 Claim Item – ${_esc(item.name)}</div>
        <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        ${stepsHtml}
        ${panelHtml}
      </div>
      <div class="modal-footer">${footerHtml}</div>`;

        window.RC.app.openModal(html);
        _claimState.step = step;
    }

    function _nextStep() {
        const { step, item, userId } = _claimState;

        if (step === 1) {
            const answer = (document.getElementById('claim-verif-ans')?.value || '').trim().toLowerCase();
            if (!answer) {
                window.RC.app.showToast('⚠️ Required', 'Please answer the verification question.', 'error');
                return;
            }
            const correct = (item.verificationAnswer || '').toLowerCase().trim();
            if (answer !== correct) {
                const count = window.RC.data.ClaimStore.incrementAttempts(userId, item.id);
                const left = MAX_ATTEMPTS - count;
                if (left <= 0) {
                    window.RC.data.ClaimStore.flagUser(userId, 'Repeated incorrect claim answers');
                    window.RC.app.openModal(_renderFlaggedModal());
                    return;
                }
                window.RC.app.showToast('❌ Incorrect Answer', `${left} attempt${left !== 1 ? 's' : ''} remaining before restriction.`, 'error');
                return;
            }
            _claimState.data.answer = answer;
        }

        if (step === 2) {
            const id = (document.getElementById('claim-identifier')?.value || '').trim();
            if (!id) {
                window.RC.app.showToast('⚠️ Required', 'Please describe a unique identifier.', 'error');
                return;
            }
            _claimState.data.identifier = id;
            _claimState.data.proof = (document.getElementById('claim-proof')?.value || '').trim();
        }

        _renderStep(step + 1);
    }

    function _prevStep() {
        _renderStep(_claimState.step - 1);
    }

    function _submitClaim() {
        const { item, userId, userName, data } = _claimState;
        const btn = document.getElementById('claim-submit-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Submitting...'; }

        const isHigh = item.priority === 'HIGH' || item.priority === 'URGENT';

        setTimeout(() => {
            const claim = window.RC.data.ClaimStore.add({
                itemId: item.id,
                itemName: item.name,
                claimant: userName,
                claimantId: userId,
                verificationAnswer: data.answer,
                uniqueIdentifier: data.identifier,
                proof: data.proof || '',
                status: isHigh ? 'Pending Admin Approval' : 'Pending Owner Approval',
                requiresAdminApproval: isHigh,
                auditLog: [
                    { action: 'Claim submitted', time: Date.now(), by: userName },
                    { action: 'Verification passed', time: Date.now(), by: 'System' },
                    { action: isHigh ? 'Sent for Owner + Admin approval' : 'Sent for Owner approval', time: Date.now(), by: 'System' },
                ],
            });

            window.RC.data.ItemStore.updateItem(item.id, { status: 'Claimed' });
            window.RC.data.AuditStore.add('Claim Submitted', `${userName} claimed "${item.name}" (${item.id})`, userName, 'claim');
            window.RC.data.NotifStore.add(`📋 New claim by ${userName} for "${item.name}" — awaiting approval.`, 'claim');
            window.RC.app.updateNotifBadge();

            _claimState.claimId = claim.id;
            _renderStep(4);
        }, 700);
    }

    function _renderFlaggedModal() {
        return `
      <div class="modal-header">
        <div class="modal-title">🚫 Account Restricted</div>
        <button class="modal-close" onclick="window.RC.app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="text-align:center; padding:2rem 0;">
          <div style="font-size:3rem; margin-bottom:1rem;">🚫</div>
          <h3 style="color:var(--color-danger); margin-bottom:0.75rem;">Claim Access Temporarily Restricted</h3>
          <p style="color:var(--text-secondary);">Due to repeated incorrect claim attempts or suspicious behavior, your ability to submit new claims has been temporarily suspended for 24 hours.</p>
          <div style="margin-top:1.5rem;" class="warning-box"><span>⚠️</span><span>This has been logged in the system audit trail. If you believe this is an error, please contact the campus admin office.</span></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="window.RC.app.closeModal()">OK</button></div>`;
    }

    function _esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.RC.claim = { openClaimModal, _nextStep, _prevStep, _submitClaim };
})();
