# T14 Dashboard Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the T14 dashboard as a polished, responsive civic administration interface without changing behavior.

**Architecture:** Keep the existing server-rendered EJS architecture and data contract. Improve semantic presentation markup in the dashboard view and encapsulate all visual behavior in the existing stylesheet.

**Tech Stack:** EJS, semantic HTML, CSS, inline decorative SVG

**Spec:** `docs/superpowers/specs/2026-11-13-t14-dashboard-visual-polish-design.md`

## Global Constraints

- No new dependencies, routes, data behavior, or client-side JavaScript.
- Preserve existing metric hooks, labels, accessibility, and responsive behavior.
- Keep every T01–T14 test passing.

## Review Focus

- Empty-state dashboard remains polished and readable.
- Long service types do not break the activity table.
- Navigation remains usable on narrow viewports.
- Color is never the only status indicator.
- Existing non-dashboard management views remain unaffected.

---

### Task 1: Professional Dashboard Presentation

**Files:**
- Modify: `test/dashboardInterface.test.js`
- Modify: `src/views/dashboard/index.ejs`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: existing `residents`, `serviceRequests`, `openServiceRequests`, and `recentServiceRequests` view locals.
- Produces: the same dashboard content inside a professional `app-header`, `dashboard-hero`, metric-card, and activity-panel presentation shell.

- [ ] Add an integration assertion for the new semantic presentation classes and read-only context.
- [ ] Run `node --test test/dashboardInterface.test.js` and verify the new assertion fails.
- [ ] Refine the dashboard EJS markup while preserving all routes, labels, and `data-metric` attributes.
- [ ] Add scoped professional dashboard styling, responsive behavior, focus states, and reduced-motion handling.
- [ ] Run `node --test test/dashboardInterface.test.js` and verify it passes.
- [ ] Run `npm test` and verify the complete suite passes.
- [ ] Inspect the dashboard at desktop and mobile widths in a browser.
