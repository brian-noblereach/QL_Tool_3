# NobleReach Venture Assessment Platform

An AI-powered due diligence tool for evaluating deep-tech ventures and pre-company research projects.

![Version](https://img.shields.io/badge/version-3.1-blue)
![Status](https://img.shields.io/badge/status-pilot-orange)

---

## Overview

The Venture Assessment Platform automates initial qualification of deep-tech ventures for NobleReach Foundation's Science-to-Venture (S2V) team. It leverages multi-agent AI workflows to analyze companies and pre-company research projects, generating structured assessments across six dimensions. This reduces due diligence time from weeks to minutes, enabling the team to screen large portfolios from university partners.

### Key Features

- **Multi-source Analysis**: Analyze ventures using website URLs, uploaded documents (PDF/Word/pitch decks), or both
- **Six Assessment Dimensions**: Researcher Aptitude, Sector Funding, Competitive Winnability, Market Opportunity, IP Landscape, and Solution Value
- **AI-Powered Scoring**: Five dimensions receive AI-generated scores (1-9) with detailed evidence and rubric-based justifications; Solution Value is human-scored with AI-aggregated evidence
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
