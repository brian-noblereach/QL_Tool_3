# NobleReach Venture Assessment Platform

An AI-powered due diligence tool for evaluating deep-tech ventures and pre-company research projects.

![Version](https://img.shields.io/badge/version-3.5-blue)
![Status](https://img.shields.io/badge/status-pilot-orange)

---

## Overview

The Venture Assessment Platform automates initial qualification of deep-tech ventures for NobleReach Foundation's Science-to-Venture (S2V) team. It leverages multi-agent AI workflows to analyze companies and pre-company research projects, generating structured assessments across six dimensions. This reduces due diligence time from weeks to minutes, enabling the team to screen large portfolios from university partners.

### Key Features

- **Multi-source Analysis**: Analyze ventures using website URLs, uploaded documents (PDF/Word/pitch decks), or both
- **Six Assessment Dimensions**: Researcher Aptitude, Sector Funding, Competitive Winnability, Market Opportunity, IP Landscape, and Solution Value
- **AI-Powered Scoring**: Five dimensions receive AI-generated scores (1-9) with detailed evidence and rubric-based justifications; Solution Value is human-scored with rubric-aligned AI evidence (beachhead customer, unmet-need gap type, quantified benefit comparisons with evidence-quality flags)
- **Human-in-the-Loop**: Advisors review AI analysis, adjust scores, and add justifications
- **Pre-company Research Support**: Handles university lab projects, grant-funded research, and technology disclosures alongside incorporated ventures
- **Fact vs. Plan Distinction**: AI workflows distinguish accomplished milestones from forward-looking claims in pitch decks and grant proposals
- **Score Persistence**: All scores saved to a database for tracking and comparison
- **PDF Export**: Generate comprehensive assessment reports
- **Load Previous**: Reload past assessments for review or score updates
- **Progress Recovery**: Resume interrupted analyses from checkpoints
- **Access Control**: Role-based access with server-side token authentication

---

## How It Works

```
                          ┌─────────────────┐
                          │   Stack AI      │
                     ┌───▶│  (7 Workflows)  │
                     │    └─────────────────┘
┌─────────────────┐  │
│   Web Browser   │──┤
│    (Client)     │  │    ┌─────────────────┐     ┌─────────────────┐
└─────────────────┘  └───▶│  Google Apps    │────▶│   Smartsheet    │
                          │  Script Proxy   │     │   (Score DB)    │
                          │  (Auth + Config)│     └─────────────────┘
                          └─────────────────┘
```

1. **Authenticate**: Enter the access code provided by your administrator
2. **Input**: Enter a company URL and/or upload documents (pitch deck, grant application, tech disclosure, etc.)
3. **Analysis**: AI workflows extract company data, then evaluate each dimension in parallel using multi-agent research pipelines
4. **Review**: Browse results across tabs with summary, detailed, and source views
5. **Score**: Adjust scores and add justifications based on your expertise
6. **Export**: Generate PDF reports and save scores to the database

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JavaScript | No framework dependencies, runs on any static host |
| AI Backend | Stack AI | Multi-agent inference workflows with web search and API integrations |
| Auth & Proxy | Google Apps Script | Password verification, API config delivery, file uploads |
| Database | Smartsheet | Score storage and portfolio tracking |
| PDF Export | jsPDF | Client-side PDF report generation |

---

## Usage

### Assessment Workflow

1. Open the application in a modern browser (Chrome or Edge recommended)
2. Enter the access code when prompted
3. Enter the venture's website URL and/or upload documents
4. Enter your name and select a portfolio
5. Click **Start Assessment** — analysis runs in parallel (~2-5 minutes)
6. Review AI analysis across each tab (Summary / Detailed / Sources views)
7. Adjust scores using the sliders and add justifications
8. Write a final recommendation
9. Click **Submit to Portfolio** to save scores
10. Click **Export PDF** to generate a report

### Loading Previous Assessments

1. Click **Load Previous** on the start screen
2. Search or select from the list of past assessments
3. Full assessments restore all AI evidence and scores
4. Score-only assessments can be updated or re-analyzed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.5 | May 2026 | **Bug fix**: justification text now persists on every keystroke, so drafts survive Load Previous (earlier versions only saved on Submit). **UX**: AI scores hidden on the Summary tab; new "Next steps" checklist above the Summary content shows what's still missing with anchor links and flash highlight. **Bug fix**: advisor-name input gets autocomplete + soft warning on typos, sourced from the proxy config. **Feature**: four new Smartsheet fields — Verdict (Yes/Hold/No), Institution, Technology Description, Technology Domain. Institution and Technology Domain are free text with portfolio-scoped autocomplete suggestions served by the proxy (extend by editing one block in `Code.gs` — no client release). Institution is auto-detected from URL + AI affiliations; Technology Description is auto-derived from the AI extraction; Technology Domain comes from a new AI classification step in the Venture Info workflow that prefers a 5-term taxonomy and may invent a new short label when nothing fits. All four round-trip through state, cache, Smartsheet, and PDF export. Smartsheet Institution and Technology Domain columns must be changed from Dropdown → Text before deploy. **Bug fix**: Venture-Level Decisions now reset when a new analysis starts (previously the prior venture's verdict / institution / track / pathway / dual-use / ecosystem / tech description / tech domain bled into the new one). Refresh during an in-progress venture still restores the in-progress values. |
| 3.4 | May 2026 | Load Previous reliability: file-only assessments no longer overwrite each other (every analysis now gets a unique cache key, fixing a bug where multiple file uploads by the same advisor collapsed onto a single `documentupload_<advisor>` slot). Cache-management controls added: per-row delete and "Clear all" in the Load Previous modal, plus automatic 90-day expiration of stale entries. Beforeunload prompt reworded to explicitly mention unsubmitted-to-Smartsheet scores instead of generic "unsaved work" |
| 3.3 | May 2026 | Solution Value tab redesigned around the human rubric: rubric-aligned `solution_value` schema (beachhead customer, unmet-need gap type, quantified benefit magnitudes with evidence-quality flags, ranked stakeholders), four-section tab layout (Unmet Need / Who Feels It Most / Magnitude of Benefit / Related Evidence), PDF export and scoring guidance updated to match. Progress-bar timings recalibrated for current Stack AI run times (~7 min typical, ~8 min worst-case); clearer file-upload error messages |
| 3.2 | Apr 2026 | Venture-Level Advisor Decisions on Summary tab: Local Ecosystem Activation, Track Assignment, Pathway, Dual-Use flag — round-tripped through Smartsheet, cache, and PDF |
| 3.1 | Mar–Apr 2026 | Multi-agent workflow redesigns (Sector Funding, Competitive, IP, Market, Researcher Aptitude), improved team discovery, fact-vs-plan enforcement in venture extraction, scoring rubric calibration |
| 3.0 | Feb 2026 | V3 schema migration, access control, role-based auth, UI/UX improvements, PDF export remap |
| 2.1 | Jan 2026 | Load Previous assessments, Smartsheet row updates, assessment caching |
| 2.0 | Jan 2026 | Direct browser-to-Stack AI calls, timeout elimination |
| 1.5 | Dec 2025 | File upload support, structured extraction schema |
| 1.0 | Nov 2025 | Initial release |

---

## Support

- **Technical Issues**: Open the browser console (F12) for detailed diagnostic logs
- **Access Issues**: Contact your NobleReach administrator for a valid access code

---

## License

Internal use only — NobleReach Foundation
