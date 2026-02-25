# NobleReach Venture Assessment Platform

An AI-powered due diligence tool for evaluating deep-tech ventures across six assessment dimensions.

![Version](https://img.shields.io/badge/version-3.0-blue)
![Status](https://img.shields.io/badge/status-pilot-orange)

---

## Overview

The Venture Assessment Platform automates initial qualification of deep-tech ventures for NobleReach Foundation's Science-to-Venture (S2V) team. It leverages AI workflows to analyze companies and generate structured assessments, reducing due diligence time from weeks to minutes.

### Key Features

- **Multi-source Analysis**: Analyze ventures using website URLs, uploaded documents (PDF/Word), or both
- **Six Assessment Dimensions**: Researcher Aptitude, Sector Funding, Competitive Winnability, Market Opportunity, IP Landscape, and Solution Value
- **AI-Powered Scoring**: Five dimensions receive AI-generated scores (1-9) with detailed evidence; Solution Value is human-scored with AI-aggregated evidence
- **Human-in-the-Loop**: Advisors review AI analysis, adjust scores, and add justifications
- **Score Persistence**: All scores saved to a database for tracking and comparison
- **PDF Export**: Generate comprehensive assessment reports
- **Load Previous**: Reload past assessments for review or score updates
- **Progress Recovery**: Resume interrupted analyses from checkpoints
- **Access Control**: Password-protected with server-side token authentication

---

## How It Works

```
                          ┌─────────────────┐
                          │   Stack AI      │
                     ┌───▶│  (6 Workflows)  │
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
2. **Input**: Enter a company URL and/or upload a document
3. **Analysis**: AI workflows extract company data and evaluate each dimension in parallel
4. **Review**: Browse results across tabs with summary, detailed, and source views
5. **Score**: Adjust scores and add justifications based on your expertise
6. **Export**: Generate PDF reports and save scores to the database

---

## Architecture

### File Structure

```
Qualification Tool v03/
├── index.html                  # Single-page application entry point
├── css/
│   └── styles.css              # NobleReach brand styling
├── js/
│   ├── api/                    # Stack AI workflow integrations
│   │   ├── stack-proxy-v2.js   # Proxy client (config + file upload)
│   │   ├── company.js          # Company data extraction
│   │   ├── team.js             # Researcher aptitude analysis
│   │   ├── funding.js          # Sector funding analysis
│   │   ├── competitive.js      # Competitive winnability analysis
│   │   ├── market.js           # Market opportunity analysis
│   │   └── iprisk.js           # IP landscape analysis
│   ├── components/             # UI components (tabs, views, modals)
│   ├── core/                   # Application logic
│   │   ├── auth.js             # Access control (token auth)
│   │   ├── app.js              # Main application controller
│   │   ├── pipeline.js         # Analysis orchestration
│   │   └── state-manager.js    # State persistence (localStorage)
│   └── utils/                  # Utilities (export, formatters, etc.)
└── assets/                     # Icons and logos
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JavaScript | No framework dependencies, runs on any static host |
| AI Backend | Stack AI | Hosted inference workflows for each assessment dimension |
| Auth & Proxy | Google Apps Script | Password verification, API config delivery, file uploads |
| Database | Smartsheet | Score storage and portfolio tracking |
| PDF Export | jsPDF | Client-side PDF report generation |


---

## Configuration

### Stack AI Workflows

| Workflow | Purpose | Scoring |
|----------|---------|---------|
| Company (URL/File/Both) | Extract structured company data | N/A (data source) |
| Researcher Aptitude | Evaluate team composition, publications, commercialization signals | AI: 1-9 |
| Sector Funding | Analyze sector deal activity and funding trends | AI: 1-9 |
| Competitive Winnability | Assess competitive landscape, incumbents, and differentiation | AI: 1-9 |
| Market Opportunity | Evaluate TAM, CAGR, market segments, and growth potential | AI: 1-9 |
| IP Landscape | Analyze patent position, freedom to operate, and blocking risk | AI: 1-9 |
| Solution Value | Aggregate evidence from company, market, and competitive analyses | Human only |

### Smartsheet Integration

Scores are automatically saved with:
- Venture name and source URL
- Advisor name and portfolio
- AI and user scores for each dimension
- Justification notes and final recommendation
- Submission timestamps and row IDs for updates

---

## Usage

### Assessment Workflow

1. Open the application in a modern browser (Chrome or Edge recommended)
2. Enter the access code when prompted
3. Enter the venture's website URL and/or upload a pitch deck
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
| 3.0 | Feb 2026 | V3 schema migration, access control, UI/UX improvements, PDF export remap, API key hardening |
| 2.1 | Jan 2026 | Load Previous assessments, Smartsheet row updates, assessment caching |
| 2.0 | Jan 2026 | Direct browser-to-Stack AI calls, timeout elimination |
| 1.5 | Dec 2025 | File upload support, structured extraction schema |
| 1.0 | Nov 2025 | Initial release |

---

## Support

- **Technical Issues**: Open the browser console (F12) for detailed diagnostic logs
- **Stack AI**: Check workflow status and execution logs in the Stack AI dashboard
- **Proxy Issues**: Check Google Apps Script execution logs at [script.google.com](https://script.google.com)
- **Access Issues**: Contact your NobleReach administrator for a valid access code

---

## License

Internal use only — NobleReach Foundation
