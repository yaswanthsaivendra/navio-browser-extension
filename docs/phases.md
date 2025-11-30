# Navio Browser Extension - Development Phases

This document outlines the phased development approach for the Navio browser extension, a tool that enables sales reps to record and replay demo flows with live overlay guidance on product UIs.

---

## Phase 1: MVP - Standalone Extension (No Backend)

**Goal:** Prove core value with a fully functional standalone extension that works without backend infrastructure.

### Scope

#### 1.1 Recording System

- **Click Event Capture**

  - Listen to click events on any webpage
  - Capture DOM selector using priority strategy:
    1. `data-testid`, `data-id` attributes
    2. Unique IDs
    3. Class combinations
    4. XPath (fallback)
  - Record current URL, element text, timestamp
  - Store in `chrome.storage.local`

- **Step Annotation**

  - Auto-open modal after each captured action
  - Fields: Step Title (auto-suggested), Description, Presenter Notes
  - Allow editing/deleting steps during recording
  - Manual step creation option

- **Recording Controls**
  - Start/Stop recording from extension popup
  - Floating on-screen toolbar with:
    - Step counter
    - "Add Manual Step" button
    - "Undo Last Step" button
    - "Finish Recording" button
    - "Hide Toolbar" toggle

#### 1.2 Overlay Runtime (Playback)

- **Visual Components**

  - **Highlight Box:** 2px solid border with pulse animation around target element
  - **Tooltip:** Positioned card showing step title + description
  - **Presenter Panel:** Fixed right sidebar (320px) with:
    - Flow name and close button
    - Scrollable steps list
    - Current step details
    - Private presenter notes (yellow background)
    - Next/Previous navigation buttons

- **Step Execution Logic**

  - Load flow from storage
  - Query DOM for each step's selector
  - Render highlight and tooltip when element found
  - Show fallback modal if element not found
  - Auto-scroll to highlighted element
  - Support keyboard navigation (→ next, ← previous)

- **Selector Monitoring**
  - Use MutationObserver for DOM changes
  - Re-attempt selector match on mutations
  - 2-second timeout before showing fallback

#### 1.3 Storage & Export

- **Local Storage**

  - Save flows to `chrome.storage.local`
  - Data structure:

    ```typescript
    type Flow = {
      id: string
      name: string
      createdAt: string
      steps: FlowStep[]
    }

    type FlowStep = {
      id: string
      selector: string
      url: string
      title: string
      description: string
      notes: string // Private presenter notes
      order: number
    }
    ```

- **Import/Export**
  - Export flow as JSON file
  - Import flow from JSON file
  - List all saved flows in popup

#### 1.4 Extension Popup UI

- **States:**
  - **Idle:** "Start Recording" + "Load Existing Flows" buttons
  - **Recording:** Red dot indicator, step counter, "Pause" + "Finish & Save" buttons
  - **Playback:** Flow dropdown, "Start Guided Demo" + "Open Editor" buttons

### Technical Implementation

- **Framework:** Vite + React + TypeScript
- **UI:** React + TailwindCSS
- **Language:** TypeScript
- **Build:** Vite
- **Manifest:** Chrome Manifest v3
- **Styling:** Shadow DOM for overlay isolation
- **Icons:** Lucide React

### Success Criteria

- ✅ Record a 5-step flow on any website
- ✅ Play back with visible highlights and tooltips
- ✅ View presenter notes in side panel
- ✅ Export and import flows as JSON
- ✅ New user can install and use in under 5 minutes

### Out of Scope (Phase 1)

- ❌ Backend integration
- ❌ Multi-user/team features
- ❌ Branching flows
- ❌ Input event capture
- ❌ Demo data overrides
- ❌ Analytics
- ❌ Cloud sync
- ❌ Video/screenshot recording

---

## Phase 2: Backend Integration & Team Features

**Goal:** Enable team collaboration, cloud sync, and centralized flow management.

### Scope

#### 2.1 Backend API Integration

- **Authentication**

  - User login/signup via web app
  - JWT token storage in extension
  - Secure API communication

- **Flow Sync**

  - Upload flows to backend
  - Download team flows
  - Real-time sync across devices
  - Conflict resolution

- **API Endpoints**
  - `POST /api/flows` - Create flow
  - `GET /api/flows` - List user/team flows
  - `GET /api/flows/:id` - Get flow details
  - `PUT /api/flows/:id` - Update flow
  - `DELETE /api/flows/:id` - Delete flow
  - `POST /api/flows/:id/share` - Share with team

#### 2.2 Team Collaboration

- **Flow Sharing**

  - Share flows with team members
  - Permission levels (view/edit)
  - Team library of flows

- **Version Control**
  - Track flow modifications
  - View change history
  - Restore previous versions

#### 2.3 Enhanced Recording

- **Input Event Capture**

  - Record text input events
  - Capture field selectors
  - Store input type (text, email, etc.)
  - Security: Never capture passwords

- **Navigation Events**

  - Track URL changes
  - Record before/after URLs
  - Handle SPA navigation

- **Visibility Triggers**
  - Detect element appearance
  - "Wait for element" steps

#### 2.4 Flow Management UI

- **Web Dashboard**
  - Browse all flows
  - Search and filter
  - Analytics (usage stats)
  - Bulk operations

### Technical Implementation

- **Backend:** Node.js/Express or similar
- **Database:** PostgreSQL
- **Storage:** AWS S3 for flow metadata
- **Auth:** JWT + OAuth providers
- **Real-time:** WebSockets for sync

### Success Criteria

- ✅ Users can log in from extension
- ✅ Flows sync across devices
- ✅ Team members can share flows
- ✅ Input events captured securely
- ✅ Web dashboard shows all flows

---

## Phase 3: Advanced Features & Branching

**Goal:** Support complex demo scenarios with branching logic and dynamic content.

### Scope

#### 3.1 Branching Flows

- **Branch Points**

  - Define decision points in flow
  - Multiple paths from single step
  - Manual branch selection during playback
  - Conditional branching (future: auto-detect)

- **Branch UI**
  - Branch selector in presenter panel
  - Visual flow diagram
  - Path preview

#### 3.2 Demo Data Overrides

- **Data Injection**

  - Override displayed data during demo
  - Replace text content in DOM
  - Inject custom values (names, numbers, etc.)
  - Persona-based presets (Enterprise, SMB, etc.)

- **Safe Mutation**
  - Only visual changes, no form submission
  - Restore original data after demo
  - Clear visual indicator of overridden data

#### 3.3 Enhanced Presenter Tools

- **Persona Presets**

  - Toggle between customer personas
  - Auto-adjust talking points
  - Customize data overrides per persona

- **Suggested Phrases**
  - Context-aware talking points
  - Industry-specific language
  - Objection handling tips

#### 3.4 Analytics & Insights

- **Usage Tracking**

  - Flow completion rates
  - Step-by-step timing
  - Drop-off points
  - Rep performance metrics

- **Optimization Suggestions**
  - Identify problematic steps
  - Recommend flow improvements
  - A/B test different flows

### Technical Implementation

- **Flow Engine:** State machine for branching
- **Data Overrides:** DOM manipulation with restore
- **Analytics:** Event tracking + backend aggregation
- **ML (future):** Auto-suggest optimizations

### Success Criteria

- ✅ Create flows with 2+ branches
- ✅ Switch personas during demo
- ✅ Override demo data safely
- ✅ View analytics dashboard
- ✅ Receive optimization suggestions

---

## Phase 4: Intelligence & Automation

**Goal:** Reduce manual work with AI-powered features and automation.

### Scope

#### 4.1 Smart Recording

- **Auto-Annotation**

  - AI-generated step titles
  - Auto-suggested descriptions
  - Context-aware presenter notes

- **Intelligent Selectors**
  - ML-based selector stability scoring
  - Auto-fallback selector generation
  - Predictive selector healing

#### 4.2 Auto-Generated Flows

- **Flow Templates**

  - Common demo patterns
  - Industry-specific templates
  - One-click flow creation

- **Flow Suggestions**
  - Analyze product usage
  - Recommend demo flows
  - Auto-create from user journeys

#### 4.3 Real-Time Assistance

- **Live Coaching**

  - Real-time objection handling
  - Competitor comparison data
  - Pricing guidance

- **Smart Branching**
  - Auto-detect user intent
  - Suggest next steps
  - Adaptive flow routing

#### 4.4 Integration Ecosystem

- **CRM Integration**

  - Salesforce, HubSpot sync
  - Auto-log demo activities
  - Pull prospect context

- **Analytics Platforms**
  - Export to BI tools
  - Custom reporting
  - API access

### Technical Implementation

- **AI/ML:** GPT-4 for annotations, ML models for selectors
- **Integrations:** REST APIs + webhooks
- **Real-time:** WebSockets for live assistance

### Success Criteria

- ✅ AI generates 80%+ accurate annotations
- ✅ Flows auto-heal when UI changes
- ✅ CRM integration logs demos
- ✅ Real-time coaching suggestions
- ✅ Template library available

---

## Phase 5: Enterprise & Scale

**Goal:** Enterprise-ready features for large sales organizations.

### Scope

#### 5.1 Enterprise Security

- **SSO/SAML**

  - Enterprise identity providers
  - Role-based access control (RBAC)
  - Audit logs

- **Compliance**
  - SOC 2 Type II
  - GDPR compliance
  - Data residency options

#### 5.2 Advanced Administration

- **Team Management**

  - Hierarchical teams
  - Flow approval workflows
  - Content governance

- **Custom Branding**
  - White-label overlays
  - Custom color schemes
  - Company logo in presenter panel

#### 5.3 Performance & Scale

- **Optimization**

  - CDN for flow assets
  - Lazy loading
  - Caching strategies

- **Reliability**
  - 99.9% uptime SLA
  - Multi-region deployment
  - Disaster recovery

#### 5.4 Advanced Analytics

- **Executive Dashboards**

  - Team performance metrics
  - ROI tracking
  - Conversion attribution

- **Custom Reports**
  - Configurable metrics
  - Scheduled exports
  - API access

### Technical Implementation

- **Infrastructure:** Multi-region cloud (AWS/GCP)
- **Security:** SOC 2 audit, penetration testing
- **Monitoring:** DataDog, Sentry
- **CDN:** CloudFront or similar

### Success Criteria

- ✅ SSO integration complete
- ✅ SOC 2 certification achieved
- ✅ 99.9% uptime maintained
- ✅ 10,000+ concurrent users supported
- ✅ Custom branding deployed

---

## Timeline Estimates

| Phase                | Duration    | Dependencies     |
| -------------------- | ----------- | ---------------- |
| Phase 1 (MVP)        | 4-6 weeks   | None             |
| Phase 2 (Backend)    | 6-8 weeks   | Phase 1 complete |
| Phase 3 (Advanced)   | 8-10 weeks  | Phase 2 complete |
| Phase 4 (AI)         | 10-12 weeks | Phase 3 complete |
| Phase 5 (Enterprise) | 12-16 weeks | Phase 4 complete |

**Total estimated timeline:** 10-13 months from start to enterprise-ready

---

## Design Principles (All Phases)

1. **Minimal Interference** - Overlays guide without distracting
2. **Professional** - Polished appearance for client demos
3. **Clear Hierarchy** - Prospect-facing vs. rep-facing content is obvious
4. **Consistency** - Shared design system with web app
5. **Safety** - No product engineering changes required
6. **Lightweight** - No DOM mutation beyond overlays
7. **Universal** - Works on any modern web app

---

## Technical Constraints

- **Browser Support:** Chrome (Manifest v3), Firefox (future)
- **Security:** Content Security Policy compliant
- **Performance:** <50ms overlay render time
- **Accessibility:** WCAG AA compliance
- **Compatibility:** Works with SPAs (React, Vue, Angular)

---

## Risk Mitigation

| Risk                            | Mitigation                                      |
| ------------------------------- | ----------------------------------------------- |
| Selector breakage on UI changes | Multi-strategy selector generation + ML healing |
| Performance impact on host page | Shadow DOM isolation, debounced events          |
| Security concerns               | No password capture, CSP compliance, audit logs |
| Browser compatibility           | Progressive enhancement, feature detection      |
| Scalability                     | CDN, caching, multi-region deployment           |

---

## Success Metrics

### Phase 1 (MVP)

- 50+ flows recorded by beta users
- 90%+ playback success rate
- <5 min time to first flow

### Phase 2 (Backend)

- 100+ active teams
- 1,000+ flows in library
- 95%+ sync reliability

### Phase 3 (Advanced)

- 30%+ flows use branching
- 50%+ demos use data overrides
- 20%+ improvement in demo conversion

### Phase 4 (AI)

- 80%+ AI annotation accuracy
- 90%+ selector auto-healing success
- 40%+ reduction in flow creation time

### Phase 5 (Enterprise)

- 10+ enterprise customers
- 99.9%+ uptime
- SOC 2 certified

---

## Next Steps

1. **Immediate (Phase 1):**

   - Set up Vite + React project structure
   - Implement click event recorder
   - Build basic overlay runtime
   - Create extension popup UI

2. **Short-term (Phase 2):**

   - Design backend API schema
   - Implement authentication
   - Build flow sync mechanism

3. **Long-term (Phase 3+):**
   - Research branching flow patterns
   - Prototype data override system
   - Evaluate AI/ML providers

---

_Last updated: 2025-11-29_
