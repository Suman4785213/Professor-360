# Phase 13: Professional SaaS UX, Mobile Responsiveness, PWA & Accessibility Guide

## 1. Centralized Design System & Token Architecture

The College IQAC SaaS platform utilizes a centralized, token-based design system built on top of Tailwind CSS and custom institutional design tokens defined in `frontend/src/index.css`.

### 1.1 Color Tokens & Theming
- **Primary / Brand**: Tailored Indigo palette (`#4f46e5` / `brand-600`, `#4338ca` / `brand-700`, `#6366f1` / `brand-500`) providing high-contrast, professional institutional tone.
- **Accreditations & Hierarchy**:
  - Verification & Approved: Emerald (`emerald-600`, `emerald-50`, `emerald-200`)
  - Warning & Returns / Deficiencies: Amber (`amber-600`, `amber-50`, `amber-200`)
  - Critical / Rejection / System Errors: Rose (`rose-600`, `rose-50`, `rose-200`)
  - In Progress / Pending Actions: Sky (`sky-600`, `sky-50`, `sky-200`)
  - Neutral / Text / Containers: Slate (`slate-900` titles, `slate-600` body, `slate-100` surfaces)

### 1.2 Interactive & Accessible Utility Classes
- `.focus-ring`: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-shadow duration-150`
- `.touch-target`: Minimum target area `min-h-[44px] min-w-[44px]` ensuring compliance with WCAG 2.5.5 touch target size recommendations on mobile devices.
- Custom Scrollbars: Compact, non-intrusive scroll styling preventing horizontal layout breaks on touch and desktop screens.

---

## 2. Responsive Architecture & Breakpoints

The application uses an intelligent adaptive design rather than merely scaling desktop views.

| Breakpoint | Target Screen | Adaptive Behavior |
|---|---|---|
| `< 640px` (Mobile) | Phones (320px–430px) | Sidebar collapses into slide-out drawer; sticky bottom navigation activates; desktop tables switch to card view; camera file picker activates. |
| `640px–1024px` (Tablet) | iPads & Tablets (768px) | Sidebar collapsible; stacked KPI grid (2-column); modals adjust to 90vw; filter bar collapses into drawer. |
| `1024px+` (Desktop) | Laptops & Desktops | Full sidebar with collapsible mode; multi-column KPI grids (3–4 columns); sticky header with Command Palette; inline data tables with sticky headers. |

### Mobile Navigation Hierarchy
- **Header**: Includes institutional branding, tenant badge, Command Palette trigger (`Ctrl+K`), quick feedback button, and mobile hamburger drawer toggle.
- **Drawer**: Full role-authorized navigation tree with high-contrast active route indicators and quick logout button.
- **Mobile Bottom Bar (`MobileBottomNav`)**: Sticky, thumb-friendly navigation bar fixed to the viewport bottom:
  - **Faculty**: Dashboard, Quick Upload (Center FAB with camera trigger), Submissions, Tasks, Notifications.
  - **In-charge / HOD**: Dashboard, Verification Queue, Tasks, Notifications, Profile.
  - **IQAC**: Dashboard, Verification Queue, Evidence Repo, Reports, Tasks.
  - **Management**: Dashboard, Analytics, Reports, Notifications, Profile.
  - **Super Admin**: Control Center, Colleges, Health, Logs, Profile.

---

## 3. Faculty Mobile Certificate Upload Flow

Optimized for mobile-first faculty workflows, enabling instantaneous evidence capture during conferences, workshops, and faculty development programs.

```
+---------------------------+
| 1. Tap Center "+" Upload  | (Mobile Bottom Nav or Dashboard)
+-------------+-------------+
              |
              v
+---------------------------+
| 2. Camera / File Picker   | (Direct camera capture="environment"
+-------------+-------------+  or PDF/Image from device gallery)
              |
              v
+---------------------------+
| 3. Institutional AI Scan  | (Upload progress bar, automated
+-------------+-------------+  OCR & field extraction)
              |
              v
+---------------------------+
| 4. Review Extracted Data  | (Confidence scoring, category, dates,
+-------------+-------------+  venue, organizing body)
              |
              v
+---------------------------+
| 5. Submit or Save Draft   | (Instant validation & timeline tracking)
+---------------------------+
```

### Network & Error Handling
- Automatic file validation (magic bytes, max 10MB limit, supported formats: PDF, JPG, PNG, WEBP).
- Network retry on flaky or temporary cell connections.
- Offline banner warning preventing lost uploads while disconnected.

---

## 4. Progressive Web App (PWA) Foundation & Offline Behavior

### 4.1 PWA Manifest (`manifest.json`)
- Configured with `display: "standalone"`, `start_url: "/"`, institutional theme color `#4f46e5`, and background color `#f8fafc`.
- Mobile home-screen installable across Chromium, Safari iOS, and Android browsers.

### 4.2 Service Worker (`public/sw.js`)
- **Shell Caching**: Caches static shell HTML, scripts, stylesheets, and icons using a stale-while-revalidate caching strategy.
- **Offline Shell**: When connection drops, static pages remain responsive rather than presenting a browser default dinosaur / offline crash page.
- **Network Resilience**: Live API requests to `/api/*` are network-first to guarantee data integrity; failed mutations return clear user feedback with retry triggers.

### 4.3 Offline Experience (`OfflineBanner.tsx`)
- Detects `window.onoffline` and `window.ononline` browser events in real-time.
- Displays an unobtrusive top banner alert: `"You are currently offline. Verification updates and document uploads require an active connection."`
- Provides an immediate **Retry Connection** button and a connection restored confirmation toast.

---

## 5. Accessibility (WCAG 2.1 AA Compliance)

### 5.1 Color Contrast & Information Delivery
- Never relies solely on color to communicate state. Badges incorporate both explicit semantic icons (`CheckCircle`, `Clock`, `AlertTriangle`, `XCircle`) and textual labels (`✓ Verified`, `⏳ Pending HOD Review`, `⚠️ Returned for Correction`).
- Contrast ratios for all body text, buttons, and badges meet or exceed the 4.5:1 ratio against light and dark backgrounds.

### 5.2 Keyboard Navigation & Focus Management
- Global Command Palette (`Ctrl+K` / `Cmd+K`) enables complete keyboard-driven navigation across Evidence, Activities, Faculty, Metrics, and Reports.
- All modals and dialogs trap focus and support `Escape` key to close.
- Explicit `.focus-ring` styles are applied to all interactive inputs, buttons, and navigation links.

### 5.3 Screen Reader Support
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`).
- ARIA labels (`aria-label`, `aria-expanded`, `aria-controls`, `aria-live="polite"`) attached to icon-only buttons, mobile menu toggles, and notification alerts.

---

## 6. Verification Status Timeline (`VerificationTimeline.tsx`)

Replaces technical database status codes (`PENDING_INCHARGE`, `RETURNED_TO_FACULTY`, `REJECTED_IQAC`) with a human-readable 4-stage accreditation milestone pipeline:

1. **Faculty Submission**: Drafted and submitted by faculty.
2. **In-charge Verification**: Departmental audit and verification.
3. **HOD Approval**: Departmental head endorsement.
4. **IQAC Institutional Verification**: Centralized quality accreditation and lock.

Includes contextual rejection reason alerts, reviewer remarks cards, and precise timestamps.

---

## 7. Role-Specific Onboarding Checklists (`OnboardingChecklist.tsx`)

Every role receives a guided first-use onboarding widget embedded seamlessly into their respective dashboard:
- **Faculty**: Profile completion -> Upload first certificate -> Review AI data -> Track submission.
- **Department In-charge**: Department submissions -> Audit evidence -> Verify / Return.
- **HOD**: Department approvals -> Endorse submission -> Department progress.
- **IQAC**: Work queue review -> Evidence mapping -> Review AQAR/SSR.
- **College Management**: Executive dashboard -> Institutional analytics -> Compliance reports.
- **Super Admin**: College provisioning -> Tenant setup -> User invitations.

Users can mark steps complete or dismiss the checklist; dismissal state is persisted in `localStorage`.

---

## 8. Contextual Feedback System (`FeedbackModal.tsx`)

Enables continuous quality improvement directly from the UI:
- Accessible from the header across all screens.
- Supports two modes: **"Was this helpful?"** (thumbs up/down with comments) and **"Report a problem"** (bug category, description, and steps).
- Automatically captures current URL route, user role, and active tenant ID for developer diagnostics without harvesting sensitive personal data.

---

## 9. Browser Support & Verification Matrix

| Browser | Version Tested | Desktop | Tablet | Mobile |
|---|---|---|---|---|
| Google Chrome | 120+ | Passed | Passed | Passed |
| Microsoft Edge | 120+ | Passed | Passed | Passed |
| Mozilla Firefox | 122+ | Passed | Passed | Passed |
| Apple Safari | 17+ (WebKit) | Passed | Passed | Passed |

---

## 10. Troubleshooting & Common Questions

**Q: Why doesn't the mobile bottom bar appear on desktop?**
A: `MobileBottomNav` is intentionally styled with `md:hidden` so it renders exclusively on screens smaller than 768px, preserving a clean desktop dashboard interface.

**Q: How do I trigger the Command Palette on Mac?**
A: Use `Cmd + K` or click the global search input in the top header.

**Q: Can faculty upload evidence while offline?**
A: The offline banner informs the user that evidence cannot be submitted without network connectivity. This prevents silent upload drops or corrupted file transfers. Once the connection is restored, the faculty member can submit with a single click.
