// js/match.js — Smart Auto-Matching Engine
window.RC = window.RC || {};

(function () {
    'use strict';

    const SCORE_THRESHOLD = 55;

    function tokenize(text) {
        if (!text) return new Set();
        return new Set(
            text.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2 && !['the', 'and', 'with', 'was', 'has', 'have', 'are', 'for'].includes(w))
        );
    }

    function keywordScore(a, b) {
        const tokA = tokenize((a.name || '') + ' ' + (a.description || ''));
        const tokB = tokenize((b.name || '') + ' ' + (b.description || ''));
        if (!tokA.size || !tokB.size) return 0;
        let overlap = 0;
        tokA.forEach(t => { if (tokB.has(t)) overlap++; });
        return Math.round((overlap / Math.max(tokA.size, tokB.size)) * 30);
    }

    function categoryScore(a, b) {
        return a.category === b.category ? 40 : 0;
    }

    function locationScore(lost, found) {
        const lostLoc = (lost.location || '').toLowerCase();
        const foundLoc = (found.locationFound || found.location || '').toLowerCase();
        if (!lostLoc || !foundLoc) return 0;
        if (lostLoc === foundLoc) return 20;
        // Same building (rough match)
        const firstWord = l => l.split(/\s/)[0];
        if (firstWord(lostLoc) === firstWord(foundLoc)) return 10;
        return 0;
    }

    function timeScore(lost, found) {
        const tLost = lost.reportedAt || Date.now();
        const tFound = found.reportedAt || Date.now();
        const diffH = Math.abs(tLost - tFound) / 3600000;
        if (diffH <= 24) return 10;
        if (diffH <= 72) return 5;
        return 0;
    }

    function scoreMatch(lost, found) {
        let score = 0;
        score += categoryScore(lost, found);
        score += keywordScore(lost, found);
        score += locationScore(lost, found);
        score += timeScore(lost, found);
        return score;
    }

    function runMatch(newItem) {
        const { ItemStore, NotifStore, AuditStore } = window.RC.data;
        const matches = [];

        if (newItem.type === 'lost') {
            const foundItems = ItemStore.getFoundItems().filter(f => f.status === 'Open');
            foundItems.forEach(found => {
                const score = scoreMatch(newItem, found);
                if (score >= SCORE_THRESHOLD) {
                    matches.push({ item: found, score });
                }
            });
        } else if (newItem.type === 'found') {
            const lostItems = ItemStore.getLostItems().filter(l => l.status === 'Open');
            lostItems.forEach(lost => {
                const score = scoreMatch(lost, newItem);
                if (score >= SCORE_THRESHOLD) {
                    matches.push({ item: lost, score });
                }
            });
        }

        if (matches.length > 0) {
            matches.sort((a, b) => b.score - a.score);
            const best = matches[0];
            const otherId = best.item.id;

            // Update both items with matchIds
            const existingIds = newItem.matchIds || [];
            if (!existingIds.includes(otherId)) {
                ItemStore.updateItem(newItem.id, { matchIds: [...existingIds, otherId] });
            }
            const otherIds = best.item.matchIds || [];
            if (!otherIds.includes(newItem.id)) {
                ItemStore.updateItem(otherId, { matchIds: [...otherIds, newItem.id] });
            }

            const msg = `🎯 Smart Match Found! "${newItem.name}" matches "${best.item.name}" (Score: ${best.score}/100). Check item details.`;
            NotifStore.add(msg, 'match');
            AuditStore.add('Auto-Match Found', `${newItem.id} ↔ ${otherId} (score: ${best.score})`, 'System', 'match');

            return matches;
        }
        return [];
    }

    function getMatchesForItem(item) {
        if (!item || !item.matchIds || !item.matchIds.length) return [];
        const { ItemStore } = window.RC.data;
        return item.matchIds
            .map(id => ItemStore.getItemById(id))
            .filter(Boolean);
    }

    window.RC.match = { runMatch, getMatchesForItem, scoreMatch };
})();
