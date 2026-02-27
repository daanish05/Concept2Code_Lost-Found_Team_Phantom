// js/escalation.js — Automatic Escalation Ladder for ReConnect
window.RC = window.RC || {};

(function () {
    'use strict';

    // ── Escalation Rules ──────────────────────────────────────
    // 24h  → If matched found item exists but no claim: remind finder
    // 72h  → Escalate to admin notification
    // 168h → 7 days: mark item status as "Unclaimed"
    const RULES = [
        { hours: 24, key: 'esc_24h', level: '⏰ 24h', color: 'var(--color-accent)' },
        { hours: 72, key: 'esc_72h', level: '⚠️ 72h', color: 'var(--color-urgent)' },
        { hours: 168, key: 'esc_7d', level: '🔴 7 Days', color: 'var(--color-danger)' },
    ];

    function runEscalations() {
        const { ItemStore, AuditStore, NotifStore } = window.RC.data;
        const lostItems = ItemStore.getLostItems();
        const now = Date.now();
        let count = 0;

        lostItems.forEach(item => {
            if (item.status === 'Returned' || item.status === 'Claimed') return;

            const ageHours = (now - item.reportedAt) / 3600000;

            // 7-day: mark unclaimed
            if (ageHours >= 168 && !item.esc_7d) {
                ItemStore.updateItem(item.id, { esc_7d: true, status: 'Unclaimed' });
                AuditStore.add('Escalation: 7 Days', `"${item.name}" (${item.id}) marked UNCLAIMED – no resolution`, 'System', 'escalation');
                NotifStore.add(`🔴 7-DAY ESCALATION: "${item.name}" marked UNCLAIMED. Immediate admin action needed.`, 'urgent');
                count++;
            }
            // 72h: notify admin
            else if (ageHours >= 72 && !item.esc_72h) {
                ItemStore.updateItem(item.id, { esc_72h: true });
                AuditStore.add('Escalation: 72 Hours', `"${item.name}" open for 3+ days without resolution`, 'System', 'escalation');
                NotifStore.add(`⚠️ 72h ESCALATION: "${item.name}" still unresolved. Admin review required.`, 'urgent');
                count++;
            }
            // 24h: remind if matched but unclaimed
            else if (ageHours >= 24 && !item.esc_24h) {
                ItemStore.updateItem(item.id, { esc_24h: true });
                if (item.matchIds && item.matchIds.length > 0) {
                    NotifStore.add(`🔔 24h REMINDER: "${item.name}" has a smart match (${item.matchIds[0]}) but no claim made yet.`, 'match');
                }
                count++;
            }
        });

        return count;
    }

    function getEscalationLevel(item) {
        if (!item || item.type !== 'lost') return null;
        const ageHours = (Date.now() - item.reportedAt) / 3600000;
        if (ageHours >= 168) return RULES[2];
        if (ageHours >= 72) return RULES[1];
        if (ageHours >= 24) return RULES[0];
        return null;
    }

    // Pretty time remaining to next escalation level
    function getNextEscalationIn(item) {
        if (!item) return '';
        const ageHours = (Date.now() - item.reportedAt) / 3600000;
        for (const rule of RULES) {
            if (ageHours < rule.hours) {
                const remaining = rule.hours - ageHours;
                if (remaining < 1) return `< 1h to ${rule.level}`;
                if (remaining < 24) return `${Math.round(remaining)}h to ${rule.level}`;
                return `${Math.round(remaining / 24)}d to ${rule.level}`;
            }
        }
        return '🔴 Max escalation reached';
    }

    window.RC.escalation = { runEscalations, getEscalationLevel, getNextEscalationIn, RULES };
})();
