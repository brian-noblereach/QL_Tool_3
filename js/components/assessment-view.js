// js/components/assessment-view.js - Assessment display and user scoring (V03)
// Updated to work with v3 API schemas (sector funding, IP landscape, flat competitive, solution_value)

class AssessmentView {
  constructor() {
    this.currentView = {
      team: 'summary',
      funding: 'summary',
      competitive: 'summary',
      market: 'summary',
      iprisk: 'summary',
      solutionvalue: 'summary'
    };

    this.data = {
      company: null,
      team: null,
      funding: null,
      competitive: null,
      market: null,
      iprisk: null,
      solutionvalue: null
    };

    this.userScores = {
      team: { score: null, justification: '', submitted: false, timesSubmitted: 0 },
      funding: { score: null, justification: '', submitted: false, timesSubmitted: 0 },
      competitive: { score: null, justification: '', submitted: false, timesSubmitted: 0 },
      market: { score: null, justification: '', submitted: false, timesSubmitted: 0 },
      iprisk: { score: null, justification: '', submitted: false, timesSubmitted: 0 },
      solutionvalue: { score: null, justification: '', submitted: false, timesSubmitted: 0 }
    };

    this.aiScores = {
      team: null,
      funding: null,
      competitive: null,
      market: null,
      iprisk: null,
      solutionvalue: null
    };
  }

  init() {
    this.setupSliders();
    this.setupViewToggles();
    this.setupSubmitButtons();
    console.log('AssessmentView initialized');
  }

  /**
   * Reset all assessment state and DOM elements for a fresh assessment.
   * Must be called when starting a new analysis or clicking "New Assessment."
   */
  reset() {
    const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];

    dimensions.forEach(dim => {
      // Reset in-memory state
      this.userScores[dim] = { score: null, justification: '', submitted: false, timesSubmitted: 0 };
      this.aiScores[dim] = null;
      this.data[dim] = null;
      this.currentView[dim] = 'summary';

      // Reset DOM: textarea
      const justEl = document.getElementById(`${dim}-justification`);
      if (justEl) justEl.value = '';

      // Reset DOM: slider to default (5)
      const slider = document.getElementById(`${dim}-score-slider`);
      if (slider) slider.value = 5;

      // Reset DOM: score display
      const display = document.getElementById(`${dim}-user-score`);
      if (display) display.textContent = '5';

      // Reset DOM: rubric display to default score 5
      this.updateRubricDisplay(dim, 5);

      // Reset DOM: deviation warning
      const deviation = document.getElementById(`${dim}-deviation`);
      if (deviation) {
        deviation.textContent = '';
        deviation.className = 'deviation-warning';
      }

      // Reset DOM: submit button
      const submitBtn = document.getElementById(`${dim}-submit-btn`);
      if (submitBtn) {
        submitBtn.classList.remove('submitted', 'update-mode');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Assessment';
      }

      // Reset DOM: scoring card
      const scoringCard = document.getElementById(`${dim}-scoring-card`);
      if (scoringCard) scoringCard.classList.remove('has-submission');

      // Reset DOM: score badges
      const aiBadge = document.getElementById(`${dim}-ai-score-badge`);
      if (aiBadge) aiBadge.textContent = '-';
      const userBadge = document.getElementById(`${dim}-user-score-badge`);
      if (userBadge) userBadge.textContent = '-';
    });

    // Reset company data
    this.data.company = null;

    // Clear Solution Value evidence
    const svEvidence = document.getElementById('solutionvalue-evidence');
    if (svEvidence) svEvidence.innerHTML = '<div class="evidence-pending-notice">Evidence will appear as Company, Market, and Competitive analyses complete.</div>';

    console.log('[AssessmentView] Reset complete');
  }

  // ========== SLIDER SETUP ==========
  
  setupSliders() {
    const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];

    dimensions.forEach(dim => {
      const slider = document.getElementById(`${dim}-score-slider`);
      const display = document.getElementById(`${dim}-user-score`);
      const deviationEl = document.getElementById(`${dim}-deviation`);
      const rubricEl = document.getElementById(`${dim}-rubric`);
      
      if (slider && display) {
        slider.addEventListener('input', (e) => {
          const score = parseInt(e.target.value);
          display.textContent = score;
          this.userScores[dim].score = score;
          this.updateRubricDisplay(dim, score);
          this.checkDeviation(dim, score, deviationEl);
          
          if (window.app?.stateManager) {
            window.app.stateManager.saveUserScore(dim, {
              score,
              justification: this.userScores[dim].justification
            });
          }
        });
      }
      
      if (rubricEl) {
        this.updateRubricDisplay(dim, 5);
      }
    });
  }

  // ========== RUBRIC DEFINITIONS ==========
  
  getRubricDefinitions(dimension) {
    const rubrics = {
      team: {
        1: { label: 'No Signal', description: 'No credible signals of research quality or translation interest. Limited track record; no relevant highlights.' },
        2: { label: 'Weak Signal', description: 'Limited credibility signals and no translation indicators. Early work exists but little evidence of momentum or fit.' },
        3: { label: 'Developing', description: 'Some credible academic signals (for stage) but translation orientation unclear. Limited evidence of impact or applied interest.' },
        4: { label: 'Credible (Stage-Adjusted)', description: 'Credible academic profile relative to career stage. Translation orientation unclear; no clear applied/commercial signals.' },
        5: { label: 'Credible + Some Applied', description: 'Solid credibility for stage with at least one applied/industry or tech-transfer indicator. Translation interest plausible but unproven.' },
        6: { label: 'High-Potential Early-Career', description: 'Strong credibility for stage with standout signals (awards, high-impact work, key role) and signs of passion/drive. Translation orientation limited but promising.' },
        7: { label: 'Translational Operator', description: 'Strong credibility plus clear translation orientation (industry collabs, licensing/SBIR, startup/advisory). Likely to engage in spinout activities.' },
        8: { label: 'Proven Translator', description: 'Excellent credibility and repeated translation signals with demonstrated execution (multiple partnerships, successful tech transfer, startup leadership/advisory).' },
        9: { label: 'Category Leader', description: 'Field-leading credibility with exceptional translation track record and leadership. High confidence in sustained engagement and ability to drive commercialization.' }
      },
      funding: {
        1: { label: 'No Investor Signal', description: 'No comparable funding activity in the sector. Minimal investor interest or deal activity.' },
        2: { label: 'Very Limited', description: 'Very limited funding activity, mostly grants. Few institutional investors active in the space.' },
        3: { label: 'Early/Angel-Led', description: 'Some angel/seed activity, limited institutional participation. Funding ecosystem still nascent.' },
        4: { label: 'Growing Early-Stage', description: 'Growing investor interest; early-stage rounds becoming more common. A few notable deals.' },
        5: { label: 'Established VC Activity', description: 'Regular Series A/B activity with established VC interest. Healthy, repeatable deal flow.' },
        6: { label: 'Strong Institutional Backing', description: 'Strong institutional backing with multiple growth rounds. Sector attracting significant capital.' },
        7: { label: 'Scaled Winners', description: 'High-profile investors and strong deal flow. Multiple companies reaching large scale (often $1B+ valuation).' },
        8: { label: 'Top-Tier Frenzy', description: 'Exceptional funding environment with multiple scaled winners. Top-tier VCs actively competing for deals.' },
        9: { label: 'Peak Capital Cycle', description: 'Peak funding activity with repeated mega-rounds. Sector is a top investment category.' }
      },
      competitive: {
        1: { label: 'Dominated Market', description: 'Market dominated by incumbents with entrenched advantages. Very difficult to differentiate or compete.' },
        2: { label: 'Crowded Field', description: 'Many strong competitors with established share. Differentiation opportunities are limited.' },
        3: { label: 'Competitive', description: 'Several capable players. Differentiation possible but challenging and often costly.' },
        4: { label: 'Differentiable', description: 'Moderate competition with clear differentiation paths. Some barriers to entry exist.' },
        5: { label: 'Neutral Landscape', description: 'Average competitive landscape. Competition is manageable but offers no inherent advantage.' },
        6: { label: 'Winnable Position', description: 'Market may be competitive, but clear differentiation and defensibility are achievable (tech, cost, channel, or timing).' },
        7: { label: 'Protected Niche', description: 'Limited competition with strong differentiation. Significant barriers protect a defensible niche.' },
        8: { label: 'Strong Moat', description: 'Few direct competitors and meaningful barriers to entry. Strong defensive moat and pricing power potential.' },
        9: { label: 'Category Creator', description: 'No true direct competitors today; defines a new category. Must still validate that a real market exists.' }
      },
      market: {
        1: { label: 'Tiny / Slow', description: 'TAM < $500M and CAGR < 10%. Limited opportunity and slow growth.' },
        2: { label: 'Small / Steady', description: 'TAM < $500M and CAGR 10-20%. Small but growing market.' },
        3: { label: 'Small / Fast', description: 'TAM < $500M and CAGR > 20%. Small market with rapid growth potential.' },
        4: { label: 'Mid / Slow', description: 'TAM $500M-$5B and CAGR < 10%. Substantial market, limited growth.' },
        5: { label: 'Mid / Steady', description: 'TAM $500M-$5B and CAGR 10-20%. Good size with healthy growth.' },
        6: { label: 'Mid / Fast', description: 'TAM $500M-$5B and CAGR > 20%. Strong opportunity with rapid expansion.' },
        7: { label: 'Large / Slow', description: 'TAM > $5B and CAGR < 10%. Very large market in a mature growth phase.' },
        8: { label: 'Large / Steady', description: 'TAM > $5B and CAGR 10-20%. Excellent size with sustained growth.' },
        9: { label: 'Large / Fast', description: 'TAM > $5B and CAGR > 20%. Exceptional opportunity: large and rapidly expanding.' }
      },
      iprisk: {
        1: { label: 'Severe Exposure', description: 'Severe IP exposure with little protectable differentiation. Crowded landscape with likely blockers held by others.' },
        2: { label: 'High Risk', description: 'High IP risk with limited protectable differentiation. Existing patents suggest likely blocking issues or costly workarounds.' },
        3: { label: 'Major Challenges', description: 'Significant IP challenges. Some protectable features, but key areas look crowded or uncertain.' },
        4: { label: 'Moderate Risk', description: 'Moderate IP risk with some protectable features. Mixed landscape; targeted FTO likely needed to avoid blockers.' },
        5: { label: 'Average Position', description: 'Average IP position. Neither particularly strong nor weak; protection strategy still required.' },
        6: { label: 'Good Position', description: 'Good protectability with some unique features. Risks appear manageable with an IP strategy and targeted FTO review.' },
        7: { label: 'Strong Foundation', description: 'Clear protectable differentiation and a plausible strategy to file/defend. Limited apparent blocking risk.' },
        8: { label: 'Very Low Risk', description: 'Excellent future protectability with few apparent conflicts. Low likelihood of blocking IP; FTO appears favorable.' },
        9: { label: 'Minimal Blocking Risk', description: 'No obvious blocking IP identified and strong freedom-to-operate plus future protectability signal (subject to diligence).' }
      },
      solutionvalue: {
        1: { label: 'Negligible', description: 'No clear customer value or meaningful problem addressed.' },
        2: { label: 'Low Value / Nice-to-Have', description: 'Primarily convenience or marginal optimization; not tied to a strong unmet need.' },
        3: { label: 'Marginal', description: 'Minor benefit and/or unclear problem severity; difficult to justify switching from current approaches.' },
        4: { label: 'Limited Value', description: 'Some benefit, but the problem is not acute or the improvement over current options is small/uncertain.' },
        5: { label: 'Moderate Value', description: 'Useful improvement but not decisive; helps with a real problem, yet benefits may be incremental or limited in scope.' },
        6: { label: 'Clear Value', description: 'Material benefit for an important problem; improvement is obvious and compelling, though not a breakthrough.' },
        7: { label: 'High Value', description: 'Strong improvement in key outcomes (cost/time/risk/performance) for a clear pain point; meaningfully better than alternatives.' },
        8: { label: 'Breakthrough', description: 'Very large improvement vs status quo; solves a painful, high-priority problem with substantial measurable benefit.' },
        9: { label: 'Transformative (Major Unmet Need)', description: 'Step-change improvement for the beachhead customer; clearly addresses a severe unmet need with outsized outcome impact.' }
      }
    };
    return rubrics[dimension] || {};
  }

  updateRubricDisplay(dimension, score) {
    const rubricEl = document.getElementById(`${dimension}-rubric`);
    if (!rubricEl) return;
    
    const rubrics = this.getRubricDefinitions(dimension);
    const rubric = rubrics[score];
    
    if (rubric) {
      const colorClass = score <= 3 ? 'low' : (score <= 6 ? 'medium' : 'high');
      rubricEl.innerHTML = `
        <div class="rubric-content ${colorClass}">
          <strong>Score ${score}: ${this.escape(rubric.label)}</strong>
          <p>${this.escape(rubric.description)}</p>
        </div>
      `;
      rubricEl.classList.remove('hidden');
    }
  }

  checkDeviation(dim, userScore, deviationEl) {
    const aiScore = this.aiScores[dim];
    if (aiScore === null || aiScore === undefined || !deviationEl) {
      if (deviationEl) deviationEl.classList.add('hidden');
      return;
    }
    const diff = Math.abs(userScore - aiScore);
    const valueEl = deviationEl.querySelector('.deviation-value');
    if (diff >= 2 && valueEl) {
      valueEl.textContent = diff;
      deviationEl.classList.remove('hidden');
    } else {
      deviationEl.classList.add('hidden');
    }
  }

  // ========== VIEW TOGGLES ==========
  
  setupViewToggles() {
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        const panel = e.currentTarget.closest('.tab-panel');
        if (!panel) return;
        
        const dimension = panel.id.replace('panel-', '');
        this.switchView(dimension, view);
        
        panel.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  }

  switchView(dimension, view) {
    this.currentView[dimension] = view;
    const container = document.getElementById(`${dimension}-evidence`);
    if (!container) return;
    
    const content = container.dataset[view];
    if (content) {
      container.innerHTML = content;
      // Re-attach accordion listeners if in detailed view
      if (view === 'detailed') {
        this.setupAccordions(container);
      }
    }
  }

  setupAccordions(container) {
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        item.classList.toggle('expanded');
      });
    });
  }

  // ========== SUBMIT BUTTONS ==========
  
  setupSubmitButtons() {
    const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];
    dimensions.forEach(dim => {
      const submitBtn = document.getElementById(`${dim}-submit-btn`);
      if (submitBtn) {
        submitBtn.addEventListener('click', () => this.submitAssessment(dim));
      }
    });
  }

  submitAssessment(dimension) {
    const justificationEl = document.getElementById(`${dimension}-justification`);
    const submitBtn = document.getElementById(`${dimension}-submit-btn`);
    const slider = document.getElementById(`${dimension}-score-slider`);
    const scoringCard = document.getElementById(`${dimension}-scoring-card`);
    
    const score = this.userScores[dimension].score || parseInt(slider?.value) || 5;
    const justification = justificationEl?.value || '';
    const isUpdate = this.userScores[dimension].submitted;
    
    // Update state
    this.userScores[dimension].score = score;
    this.userScores[dimension].justification = justification;
    this.userScores[dimension].submitted = true;
    this.userScores[dimension].timesSubmitted++;
    
    console.log(`Assessment ${isUpdate ? 'updated' : 'submitted'} for ${dimension}:`, { score, justification, timesSubmitted: this.userScores[dimension].timesSubmitted });
    
    // Update button to show submitted/update state
    if (submitBtn) {
      submitBtn.classList.add('submitted');
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        ${isUpdate ? 'Updated' : 'Submitted'}
      `;
      
      // After a brief moment, switch to "Update" state
      setTimeout(() => {
        submitBtn.classList.remove('submitted');
        submitBtn.classList.add('update-mode');
        submitBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Update Score
        `;
        submitBtn.disabled = false;
      }, 1500);
    }
    
    // Add visual indicator to scoring card
    if (scoringCard) {
      scoringCard.classList.add('has-submission');
    }
    
    // Keep slider and justification ENABLED for updates
    // (removed the disabling code)
    
    if (window.app?.stateManager) {
      window.app.stateManager.saveUserScore(dimension, { score, justification });
    }
    if (window.app?.toastManager) {
      window.app.toastManager.success(`${this.capitalize(dimension)} assessment ${isUpdate ? 'updated' : 'submitted'}`);
    }
    
    // Submit to Smartsheet
    this.submitToSmartsheet(dimension);
    
    // Update summary view after submit
    if (window.summaryView && this.data) {
      console.log('Updating summary view with data:', this.data);
      window.summaryView.update({
        company: this.data.company,
        team: this.data.team,
        funding: this.data.funding,
        competitive: this.data.competitive,
        market: this.data.market,
        iprisk: this.data.iprisk
      });
    } else {
      console.warn('Could not update summary:', { summaryView: !!window.summaryView, data: !!this.data });
    }
    
    // Check if all scores are now submitted - trigger auto-submit check
    this.checkAllScoresSubmitted();
  }

  /**
   * Submit score to Smartsheet
   * @param {string} dimension - team, funding, competitive, market, iprisk
   */
  async submitToSmartsheet(dimension) {
    if (!window.SmartsheetIntegration) {
      console.warn('SmartsheetIntegration not loaded');
      return;
    }

    const context = window.SmartsheetIntegration.getContext();
    
    // Get AI score based on dimension
    const aiScore = this.aiScores[dimension];
    
    const scoreData = {
      aiScore: aiScore,
      userScore: this.userScores[dimension].score,
      justification: this.userScores[dimension].justification
    };

    await window.SmartsheetIntegration.submitScore(dimension, scoreData, context);
  }

  /**
   * Check if all 5 scores have been submitted and trigger final submit modal
   */
  checkAllScoresSubmitted() {
    const allDimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];
    const aiDimensions = ['team', 'funding', 'competitive', 'market', 'iprisk'];
    const allSubmitted = allDimensions.every(dim => this.userScores[dim].submitted);

    if (allSubmitted) {
      console.log('[AssessmentView] All scores submitted, triggering final submit check');

      // Gather data for the modal
      const scores = {};
      const missingJustifications = [];

      allDimensions.forEach(dim => {
        scores[dim] = {
          aiScore: this.aiScores[dim],
          userScore: this.userScores[dim].score,
          justification: this.userScores[dim].justification
        };

        if (!this.userScores[dim].justification || this.userScores[dim].justification.trim() === '') {
          missingJustifications.push(dim);
        }
      });

      // Calculate averages (AI average over 5 AI-scored dimensions only)
      const aiScoreSum = aiDimensions.reduce((sum, dim) => sum + (this.aiScores[dim] || 0), 0);
      const userScoreSum = allDimensions.reduce((sum, dim) => sum + (this.userScores[dim].score || 0), 0);
      const avgAiScore = (aiScoreSum / aiDimensions.length).toFixed(1);
      const avgUserScore = (userScoreSum / allDimensions.length).toFixed(1);

      // Notify app to show the final submit modal
      if (window.app?.showFinalSubmitModal) {
        window.app.showFinalSubmitModal({
          scores,
          missingJustifications,
          avgAiScore,
          avgUserScore
        });
      }
    }
  }

  /**
   * Get the submission status for all dimensions
   * @returns {Object} Status object with counts and details
   */
  getSubmissionStatus() {
    const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];
    const submitted = dimensions.filter(dim => this.userScores[dim].submitted);
    const pending = dimensions.filter(dim => !this.userScores[dim].submitted);
    const missingJustifications = dimensions.filter(dim => 
      this.userScores[dim].submitted && 
      (!this.userScores[dim].justification || this.userScores[dim].justification.trim() === '')
    );
    
    return {
      totalCount: dimensions.length,
      submittedCount: submitted.length,
      pendingCount: pending.length,
      submitted,
      pending,
      missingJustifications,
      allSubmitted: submitted.length === dimensions.length
    };
  }

  setUserScore(dimension, scoreData) {
    if (!scoreData) return;
    const slider = document.getElementById(`${dimension}-score-slider`);
    const display = document.getElementById(`${dimension}-user-score`);
    const justificationEl = document.getElementById(`${dimension}-justification`);

    // Always update slider/display — clear to default if no score
    if (slider) {
      slider.value = scoreData.score || 5;
      this.userScores[dimension].score = scoreData.score || null;
    }
    if (display) display.textContent = scoreData.score || '5';

    // Always update justification — clear if empty
    if (justificationEl) {
      justificationEl.value = scoreData.justification || '';
      this.userScores[dimension].justification = scoreData.justification || '';
    }

    if (scoreData.score) this.updateRubricDisplay(dimension, scoreData.score);
  }

  // ========== COMPANY DATA ==========
  
  loadCompanyData(data) {
    this.data.company = data;
    const container = document.getElementById('overview-content');
    if (!container) return;

    const overview = data.company_overview || {};
    const tech = data.technology || {};
    const products = data.products_services || {};
    const market = data.market_context || {};

    // Build products list from products_services.products[]
    const productsList = (products.products || []).slice(0, 3);

    container.innerHTML = `
      <div class="overview-grid compact">
        <div class="overview-card">
          <h3>Company</h3>
          <h4>${this.escape(overview.name || 'Unknown Company')}</h4>
          <p>${this.escape(overview.one_liner || overview.detailed_description || '')}</p>
          <div class="overview-meta">
            ${overview.website ? `<span class="meta-item"><span class="meta-icon">🌐</span>${this.displayUrl(overview.website)}</span>` : ''}
            ${overview.founded_year ? `<span class="meta-item"><span class="meta-icon">📅</span>Founded ${overview.founded_year}</span>` : ''}
            ${overview.company_stage ? `<span class="meta-item"><span class="meta-icon">📊</span>${this.escape(overview.company_stage)}</span>` : ''}
          </div>
        </div>

        <div class="overview-card">
          <h3>Technology</h3>
          <p>${this.escape(tech.core_technology || '')}</p>
          ${tech.key_differentiators?.length > 0 ? `
            <div class="innovations-list">
              <strong>Key Differentiators:</strong>
              <ul>${tech.key_differentiators.slice(0, 3).map(i => `<li>${this.escape(typeof i === 'string' ? i : JSON.stringify(i))}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${tech.technology_readiness ? `<p><strong>Readiness:</strong> ${this.escape(tech.technology_readiness)}</p>` : ''}
        </div>

        <div class="overview-card">
          <h3>Products & Services</h3>
          ${productsList.length > 0 ? `
            <div class="products-list">
              ${productsList.map(p => `
                <div class="product-item">
                  <strong>${this.escape(p.name || '')}</strong>
                  ${p.status ? `<span class="status-badge">${this.escape(p.status)}</span>` : ''}
                  ${p.description ? `<p>${this.escape(this.truncate(p.description, 100))}</p>` : ''}
                  ${p.target_customers ? `<p class="target-customers"><em>${this.escape(p.target_customers)}</em></p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p>No products identified.</p>'}
          ${products.business_model ? `<p><strong>Business Model:</strong> ${this.escape(products.business_model)}</p>` : ''}
          ${products.target_industries?.length > 0 ? `
            <p><strong>Industries:</strong> ${products.target_industries.slice(0, 4).map(i => this.escape(i)).join(', ')}</p>
          ` : ''}
        </div>

        <div class="overview-card">
          <h3>Market Context</h3>
          ${market.target_market ? `<p><strong>Target Market:</strong> ${this.escape(market.target_market)}</p>` : ''}
          ${market.market_trends?.length > 0 ? `
            <div class="market-trends-list">
              <strong>Market Trends:</strong>
              <ul>${market.market_trends.slice(0, 3).map(t => `<li>${this.escape(t)}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${market.competitive_positioning ? `<p><strong>Competitive Positioning:</strong> ${this.escape(market.competitive_positioning)}</p>` : ''}
        </div>
      </div>

      ${(() => {
        const dq = data.data_quality_assessment || {};
        const confidence = dq.overall_confidence || '';
        const gaps = dq.information_gaps || [];
        const warnings = dq.forward_looking_warnings || [];
        const sources = dq.sources_used || [];
        if (!confidence && gaps.length === 0 && sources.length === 0) return '';

        const confidenceColors = { 'High': 'var(--nr-teal-1)', 'Medium': '#d97706', 'Low': '#dc2626' };
        const confidenceColor = confidenceColors[confidence] || '#6b7280';

        return `
          <div class="data-quality-section">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <strong style="font-size: 13px; color: var(--slate-700);">Data Quality</strong>
              ${confidence ? `<span class="metric-inline" style="border-color: ${confidenceColor}; color: ${confidenceColor};">${confidence} Confidence</span>` : ''}
            </div>
            ${gaps.length > 0 ? `
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 12px; color: #92400e;">Information Gaps:</strong>
                ${gaps.map(g => `<div class="info-gap-item">&bull; ${this.escape(g)}</div>`).join('')}
              </div>
            ` : ''}
            ${warnings.length > 0 ? `
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 12px; color: #92400e;">Forward-Looking Warnings:</strong>
                ${warnings.map(w => `<div class="info-gap-item">&bull; ${this.escape(w)}</div>`).join('')}
              </div>
            ` : ''}
            ${sources.length > 0 ? `
              <details style="margin-top: 4px;">
                <summary style="font-size: 12px; color: var(--slate-500); cursor: pointer;">Sources consulted (${sources.length})</summary>
                <ul style="margin: 4px 0 0 16px; font-size: 11px; color: var(--slate-500);">
                  ${sources.map(s => `<li>${s.startsWith('http') ? `<a href="${this.escape(s)}" target="_blank" rel="noopener">${this.escape(this.truncate(s, 60))}</a>` : this.escape(s)}</li>`).join('')}
                </ul>
              </details>
            ` : ''}
          </div>
        `;
      })()}
    `;
  }

  // ========== TEAM DATA ==========
  
  loadTeamData(data) {
    this.data.team = data;
    
    // API returns: { team: {...}, scoring: {...}, score: 6, formatted: {...} }
    const score = data?.score;
    this.aiScores.team = score;
    
    const aiScoreEl = document.getElementById('team-ai-score');
    if (aiScoreEl) aiScoreEl.textContent = score ?? '-';
    
    const slider = document.getElementById('team-score-slider');
    const display = document.getElementById('team-user-score');
    if (slider && score) {
      slider.value = score;
      if (display) display.textContent = score;
      this.userScores.team.score = score;
      this.updateRubricDisplay('team', score);
    }
    
    this.displayTeamEvidence(data);
  }

  displayTeamEvidence(data) {
    const container = document.getElementById('team-evidence');
    if (!container) return;
    
    // Use formatted data if available, fallback to raw
    const formatted = data?.formatted || {};
    const teamRaw = data?.team || {};
    const scoringRaw = data?.scoring || {};
    
    const members = formatted.members || teamRaw.team_members || [];
    const composition = formatted.teamComposition || {};
    const compositionRaw = scoringRaw.team_composition || {};
    const teamSize = composition.total || compositionRaw.total_members || members.length || '-';

    // Count publications across all team members
    const publicationsCount = members.reduce((count, m) => count + (m.papers_publications?.length || 0), 0);
    // Count commercialization signals from evaluation steps
    const evalSteps = formatted.evaluationSteps || scoringRaw.evaluation_steps || {};
    const commSignalsCount = Array.isArray(evalSteps.commercialization_signals_found) ? evalSteps.commercialization_signals_found.length : 0;

    const strengths = formatted.strengths || scoringRaw.key_strengths || [];
    const gaps = formatted.gaps || scoringRaw.key_gaps || [];
    const sources = formatted.sources || teamRaw.trusted_sources || [];
    const confidence = formatted.confidence || teamRaw.data_confidence;
    const confidenceJustification = formatted.confidenceJustification || teamRaw.confidence_justification || '';
    const justification = formatted.justification || scoringRaw.score_justification || '';
    const rubricMatch = formatted.rubric || scoringRaw.rubric_match_explanation || '';

    // SUMMARY VIEW
    const summaryHTML = `
      <div class="evidence-content">
        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">Team Size</span>
            <span class="metric-value">${teamSize}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Publications</span>
            <span class="metric-value">${publicationsCount}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Comm. Signals</span>
            <span class="metric-value">${commSignalsCount}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">${confidence || '-'}</span>
          </div>
        </div>
        
        <div class="evidence-section">
          <h4>AI Assessment Rationale</h4>
          <div class="ai-rationale">${this.formatRationale(justification)}</div>
        </div>
        
        <div class="two-column-grid">
          <div class="evidence-section">
            <h4>Key Strengths</h4>
            <ul class="compact-list">${strengths.map(s => `<li>${this.escape(s)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
          <div class="evidence-section">
            <h4>Key Gaps</h4>
            <ul class="compact-list">${gaps.map(g => `<li>${this.escape(g)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
        </div>
      </div>
    `;
    
    // DETAILED VIEW - Expandable team member cards
    const detailedHTML = `
      <div class="evidence-content">
        <h4>Team Members (${members.length})</h4>
        <div class="accordion-list">
          ${members.map((m, i) => `
            <div class="accordion-item ${i === 0 ? 'expanded' : ''}">
              <div class="accordion-header">
                <div class="member-header-info">
                  <strong>${this.escape(m.name || 'Unknown')}</strong>
                  <span class="member-role-badge">${this.escape(m.role_at_venture || '')}</span>
                </div>
                <span class="accordion-icon">▼</span>
              </div>
              <div class="accordion-content">
                ${m.work_history?.length > 0 ? `
                  <div class="member-section">
                    <h5>Work History</h5>
                    <ul class="timeline-list">
                      ${m.work_history.slice(0, 4).map(w => `
                        <li>
                          <strong>${this.escape(w.position || w.company)}</strong>
                          ${w.company ? `<span class="org-name">@ ${this.escape(w.company)}</span>` : ''}
                          ${w.duration ? `<span class="duration">${this.escape(w.duration)}</span>` : ''}
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
                ${m.education_history?.length > 0 ? `
                  <div class="member-section">
                    <h5>Education</h5>
                    <ul class="timeline-list">
                      ${m.education_history.map(e => `
                        <li>
                          <strong>${this.escape(e.degree || '')}</strong>
                          <span class="org-name">${this.escape(e.institution || '')}</span>
                          ${e.year ? `<span class="duration">${e.year}</span>` : ''}
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
                ${m.commercialization_experience?.length > 0 ? `
                  <div class="member-section">
                    <h5>Commercialization Experience</h5>
                    <ul>
                      ${m.commercialization_experience.map(c => `
                        <li>${this.escape(c.description || '')} ${c.outcome ? `<em>(${this.escape(c.outcome)})</em>` : ''}</li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
                ${m.awards_recognition?.length > 0 && m.awards_recognition[0]?.award_name !== '—' ? `
                  <div class="member-section">
                    <h5>Awards & Recognition</h5>
                    <ul>
                      ${m.awards_recognition.filter(a => a.award_name && a.award_name !== '—').map(a => `
                        <li>${this.escape(a.award_name)} ${a.organization ? `(${this.escape(a.organization)})` : ''}</li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // SOURCES VIEW
    const sourcesHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Data Sources</h4>
          ${sources.length > 0 ? `
            <ul class="source-list">
              ${sources.map(s => `<li><a href="${this.escape(this.cleanSourceUrl(s))}" target="_blank" rel="noopener">${this.truncateUrl(s)}</a></li>`).join('')}
            </ul>
          ` : '<p>No sources available.</p>'}
        </div>
        <div class="evidence-section">
          <h4>Rubric Alignment</h4>
          <div class="rubric-explanation">${this.formatRationale(rubricMatch)}</div>
        </div>
        <div class="evidence-section">
          <h4>Confidence Note</h4>
          <p><strong>${confidence || '-'}</strong> confidence level.</p>
          <p>${this.escape(confidenceJustification || 'No additional confidence information.')}</p>
        </div>
      </div>
    `;
    
    container.innerHTML = summaryHTML;
    container.dataset.summary = summaryHTML;
    container.dataset.detailed = detailedHTML;
    container.dataset.sources = sourcesHTML;
    
    // Setup accordions for initial view if detailed
    if (this.currentView.team === 'detailed') {
      this.setupAccordions(container);
    }
  }

  // ========== FUNDING DATA (v3 - Sector Funding) ==========

  loadFundingData(data) {
    this.data.funding = data;

    // v3: { analysis: {...}, assessment: {...}, score: 5, formatted: {...} }
    const score = data?.score || data?.assessment?.score;
    this.aiScores.funding = score;

    const aiScoreEl = document.getElementById('funding-ai-score');
    if (aiScoreEl) aiScoreEl.textContent = score ?? '-';

    const slider = document.getElementById('funding-score-slider');
    const display = document.getElementById('funding-user-score');
    if (slider && score) {
      slider.value = score;
      if (display) display.textContent = score;
      this.userScores.funding.score = score;
      this.updateRubricDisplay('funding', score);
    }

    this.displayFundingEvidence(data);
  }

  /**
   * Format a deal amount from the v3 funding schema for display
   */
  formatDealAmount(amount) {
    if (!amount || amount === 'undisclosed' || amount === 'Undisclosed' || amount === 'Unknown') {
      return 'Undisclosed';
    }
    const parsed = this.parseFundingAmount(amount);
    if (parsed !== null) {
      return this.formatCurrencyWithCommas(parsed, true);
    }
    return this.escape(String(amount));
  }

  /**
   * Render a relevance badge for sector funding deals
   */
  renderRelevanceBadge(relevance) {
    const level = (relevance || 'broad').toLowerCase();
    const labels = { core: 'Core', adjacent: 'Adjacent', broad: 'Broad' };
    return `<span class="relevance-badge relevance-${level}">${labels[level] || this.escape(relevance)}</span>`;
  }

  displayFundingEvidence(data) {
    const container = document.getElementById('funding-evidence');
    if (!container) return;

    // v3 formatted data from funding.js formatForDisplay()
    const formatted = data?.formatted || {};

    // Sector activity metrics
    const activityLevel = formatted.activityLevel || 'none_found';
    const fundingTrend = formatted.fundingTrend || 'unknown';
    const totalDeals = formatted.totalVerifiedDeals || 0;
    const dataReliability = formatted.dataReliability || 'unverified';
    const weightedDeals = formatted.weightedDealCount || 0;
    const narrativeSummary = formatted.narrativeSummary || formatted.summary || '';
    const stageMaturity = formatted.stageMaturity || 'unknown';
    const investorTypes = formatted.investorTypes || [];
    const scaledWinners = formatted.scaledWinners;
    const primarySector = formatted.primarySector || '';
    const broaderSector = formatted.broaderSector || '';

    // Verified deals and supporting evidence
    const verifiedDeals = formatted.verifiedDeals || [];
    const marketReports = formatted.marketReports || [];
    const governmentPrograms = formatted.governmentPrograms || [];
    const humanReviewFlags = formatted.humanReviewFlags || [];
    const dataGaps = formatted.dataGaps || '';

    // Score justification sub-assessments
    const dealVolumeAssessment = formatted.dealVolumeAssessment || '';
    const stageDistribution = formatted.stageDistribution || '';
    const investorQuality = formatted.investorQuality || '';
    const scaledOutcomes = formatted.scaledOutcomes || '';
    const trendAssessment = formatted.trendAssessment || '';
    const sectorEvidence = formatted.sectorEvidence || [];

    // Venture's own funding context (from company data, NOT rating criteria)
    const companyFunding = this.data.company?.funding_and_investors || {};
    const ventureFundingRounds = companyFunding.funding_rounds || [];
    const ventureGrants = companyFunding.government_grants || [];
    const ventureTotalFunding = companyFunding.total_funding || 'Unknown';
    const ventureNotableInvestors = companyFunding.notable_investors || [];

    // Format activity level for display
    const formatActivityLevel = (level) => {
      const labels = {
        'none_found': 'None Found',
        'minimal': 'Minimal',
        'moderate': 'Moderate',
        'active': 'Active',
        'very_active': 'Very Active',
        'hot': 'Hot'
      };
      return labels[level] || this.capitalize(String(level).replace(/_/g, ' '));
    };

    // SUMMARY VIEW - includes sector deals, market reports, and government programs
    const summaryHTML = `
      <div class="evidence-content">
        ${primarySector ? `<p class="industry-context"><strong>Sector Assessed:</strong> ${this.escape(primarySector)}${broaderSector ? ` (${this.escape(broaderSector)})` : ''}</p>` : ''}

        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">Activity Level</span>
            <span class="metric-value">${formatActivityLevel(activityLevel)}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Funding Trend</span>
            <span class="metric-value">${this.capitalize(String(fundingTrend).replace(/_/g, ' '))}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Verified Deals</span>
            <span class="metric-value">${totalDeals}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Distinct Sources</span>
            <span class="metric-value">${formatted.distinctSources || '-'}</span>
          </div>
        </div>

        <div class="evidence-section">
          <h4>AI Assessment Rationale</h4>
          <div class="ai-rationale">${this.formatRationale(narrativeSummary)}</div>
        </div>

        ${humanReviewFlags.length > 0 ? `
          <div class="evidence-section">
            <h4>Human Review Flags</h4>
            <ul class="compact-list warning-list">${humanReviewFlags.map(f => `<li>${this.escape(f)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${verifiedDeals.length > 0 ? `
          <div class="evidence-section">
            <h4>Verified Sector Deals (${verifiedDeals.length})</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Series</th>
                  <th>Amount</th>
                  <th>Relevance</th>
                  <th>Investors</th>
                </tr>
              </thead>
              <tbody>
                ${verifiedDeals.slice(0, 5).map(d => `
                  <tr>
                    <td><strong>${this.escape(d.company || '')}</strong></td>
                    <td>${this.formatDate(d.date)}</td>
                    <td>${this.escape(d.series || 'N/A')}</td>
                    <td>${this.formatDealAmount(d.amount)}</td>
                    <td>${this.renderRelevanceBadge(d.relevance)}</td>
                    <td class="investors-cell">${this.escape(this.truncate(d.investors || '', 60))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${verifiedDeals.length > 5 ? `<p class="more-link">+ ${verifiedDeals.length - 5} more deals in detailed view</p>` : ''}
          </div>
        ` : ''}

        ${marketReports.length > 0 ? `
          <div class="evidence-section">
            <h4>Market Reports (${marketReports.length})</h4>
            <div class="market-reports-list">
              ${marketReports.map(r => `
                <div class="market-report-item">
                  <strong>${r.sourceUrl ? `<a href="${this.escape(this.cleanSourceUrl(r.sourceUrl))}" target="_blank" rel="noopener">${this.escape(r.title || 'Report')}</a>` : this.escape(r.title || 'Report')}</strong>
                  ${r.keyFinding ? `<p>${this.escape(r.keyFinding)}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${governmentPrograms.length > 0 ? `
          <div class="evidence-section">
            <h4>Government Programs (${governmentPrograms.length})</h4>
            <div class="govt-programs-list">
              ${governmentPrograms.map(g => `
                <div class="govt-program-item">
                  <strong>${g.sourceUrl ? `<a href="${this.escape(this.cleanSourceUrl(g.sourceUrl))}" target="_blank" rel="noopener">${this.escape(g.name || 'Program')}</a>` : this.escape(g.name || 'Program')}</strong>
                  ${g.amount && g.amount !== 'undisclosed' ? ` ${this.formatDealAmount(g.amount)}` : ''}
                  ${g.description ? `<p>${this.escape(g.description)}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${(ventureFundingRounds.length > 0 || ventureGrants.length > 0 || ventureTotalFunding !== 'Unknown') ? `
          <div class="evidence-section venture-context-section">
            <h4>Venture Funding Context (Reference Only)</h4>
            <div class="context-notice">
              <strong>For reference only</strong> -- rate based on sector activity above, not the venture's own funding.
            </div>
            ${ventureTotalFunding && ventureTotalFunding !== 'Unknown' ? `<p><strong>Total Funding:</strong> ${this.escape(ventureTotalFunding)}</p>` : ''}
            ${ventureFundingRounds.length > 0 ? `
              <div class="funding-timeline">
                ${ventureFundingRounds.slice(0, 3).map(r => `
                  <div class="funding-event">
                    <span class="funding-date">${this.formatDate(r.date)}</span>
                    <span class="funding-type">${this.escape(r.round_type || '')}</span>
                    <span class="funding-amount">${this.formatDealAmount(r.amount)}</span>
                    ${(r.lead_investors || []).length > 0 ? `<span class="funding-investors">${r.lead_investors.slice(0, 2).map(i => this.escape(i)).join(', ')}</span>` : ''}
                  </div>
                `).join('')}
                ${ventureFundingRounds.length > 3 ? `<p class="more-link">+ ${ventureFundingRounds.length - 3} more rounds in detailed view</p>` : ''}
              </div>
            ` : '<p class="no-data-message">No prior funding rounds identified for this venture.</p>'}
            ${ventureGrants.length > 0 ? `
              <h5>Government Grants</h5>
              <table class="data-table">
                <thead><tr><th>Type</th><th>Amount</th><th>Agency</th><th>Year</th></tr></thead>
                <tbody>
                  ${ventureGrants.map(g => `<tr><td>${this.escape(g.grant_type || '')}</td><td>${this.formatDealAmount(g.amount)}</td><td>${this.escape(g.agency || '')}</td><td>${this.escape(g.year || '')}</td></tr>`).join('')}
                </tbody>
              </table>
            ` : ''}
            ${ventureNotableInvestors.length > 0 ? `<p><strong>Notable Investors:</strong> ${ventureNotableInvestors.map(i => this.escape(i)).join(', ')}</p>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    // DETAILED VIEW - Score justification breakdown, sector metrics, full deals, data gaps
    const detailedHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Score Justification Detail</h4>
          ${dealVolumeAssessment ? `<div class="landscape-narrative"><h5>Deal Volume</h5><p>${this.escape(dealVolumeAssessment)}</p></div>` : ''}
          ${stageDistribution ? `<div class="landscape-narrative"><h5>Stage Distribution</h5><p>${this.escape(stageDistribution)}</p></div>` : ''}
          ${investorQuality ? `<div class="landscape-narrative"><h5>Investor Quality</h5><p>${this.escape(investorQuality)}</p></div>` : ''}
          ${scaledOutcomes ? `<div class="landscape-narrative"><h5>Scaled Outcomes</h5><p>${this.escape(scaledOutcomes)}</p></div>` : ''}
          ${trendAssessment ? `<div class="landscape-narrative"><h5>Trend Assessment</h5><p>${this.escape(trendAssessment)}</p></div>` : ''}
        </div>

        ${sectorEvidence.length > 0 ? `
          <div class="evidence-section">
            <h4>Sector Evidence</h4>
            ${sectorEvidence.map(e => `
              <div class="landscape-narrative">
                <h5>${this.capitalize(this.escape(e.evidence_type || '').replace(/_/g, ' '))}</h5>
                <p>${this.escape(e.description || '')}${e.rubric_implication ? ` <em>${this.escape(e.rubric_implication)}</em>` : ''}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="evidence-section">
          <h4>Sector Metrics</h4>
          <div class="metrics-row compact">
            <div class="metric-card small">
              <span class="metric-label">Stage Maturity</span>
              <span class="metric-value">${this.capitalize(String(stageMaturity).replace(/_/g, ' '))}</span>
            </div>
            <div class="metric-card small">
              <span class="metric-label">Scaled Winners</span>
              <span class="metric-value">${scaledWinners ? 'Yes' : 'No'}</span>
            </div>
            <div class="metric-card small">
              <span class="metric-label">Distinct Sources</span>
              <span class="metric-value">${formatted.distinctSources || '-'}</span>
            </div>
          </div>
          ${investorTypes.length > 0 ? `<p><strong>Investor Types:</strong> ${investorTypes.map(t => this.escape(t)).join(', ')}</p>` : ''}
        </div>

        ${verifiedDeals.length > 0 ? `
          <div class="evidence-section">
            <h4>All Verified Sector Deals (${verifiedDeals.length})</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Series</th>
                  <th>Amount</th>
                  <th>Relevance</th>
                  <th>Investors</th>
                </tr>
              </thead>
              <tbody>
                ${verifiedDeals.map(d => `
                  <tr>
                    <td><strong>${this.escape(d.company || '')}</strong></td>
                    <td>${this.formatDate(d.date)}</td>
                    <td>${this.escape(d.series || 'N/A')}</td>
                    <td>${this.formatDealAmount(d.amount)}</td>
                    <td>${this.renderRelevanceBadge(d.relevance)}</td>
                    <td class="investors-cell">${this.escape(this.truncate(d.investors || '', 60))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${dataGaps ? `
          <div class="evidence-section">
            <h4>Data Gaps</h4>
            <p>${this.escape(dataGaps)}</p>
          </div>
        ` : ''}
      </div>
    `;

    // SOURCES VIEW - Extract source URLs from verified deals and market reports
    const dealSources = verifiedDeals.filter(d => d.sourceUrl).map(d => ({
      label: `${d.company || 'Deal'} (${d.sourceName || 'source'})`,
      url: d.sourceUrl
    }));
    const reportSources = marketReports.filter(r => r.sourceUrl).map(r => ({
      label: r.title || 'Market Report',
      url: r.sourceUrl
    }));
    const programSources = governmentPrograms.filter(g => g.sourceUrl).map(g => ({
      label: g.name || 'Government Program',
      url: g.sourceUrl
    }));
    const allSources = [...dealSources, ...reportSources, ...programSources];

    const sourcesHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Deal Sources (${dealSources.length})</h4>
          ${dealSources.length > 0 ? `
            <ul class="source-list">
              ${dealSources.map(s => `
                <li>
                  <strong>${this.escape(s.label)}</strong>:
                  <a href="${this.escape(this.cleanSourceUrl(s.url))}" target="_blank" rel="noopener">${this.truncateUrl(s.url)}</a>
                </li>
              `).join('')}
            </ul>
          ` : '<p>No source URLs available for deals.</p>'}
        </div>
        ${reportSources.length > 0 ? `
          <div class="evidence-section">
            <h4>Market Report Sources (${reportSources.length})</h4>
            <ul class="source-list">
              ${reportSources.map(s => `
                <li>
                  <strong>${this.escape(s.label)}</strong>:
                  <a href="${this.escape(this.cleanSourceUrl(s.url))}" target="_blank" rel="noopener">${this.truncateUrl(s.url)}</a>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        ${programSources.length > 0 ? `
          <div class="evidence-section">
            <h4>Government Program Sources (${programSources.length})</h4>
            <ul class="source-list">
              ${programSources.map(s => `
                <li>
                  <strong>${this.escape(s.label)}</strong>:
                  <a href="${this.escape(this.cleanSourceUrl(s.url))}" target="_blank" rel="noopener">${this.truncateUrl(s.url)}</a>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        <div class="evidence-section">
          <h4>Data Reliability</h4>
          <p><strong>${this.capitalize(String(dataReliability).replace(/_/g, ' '))}</strong> -- ${totalDeals} verified deal(s) from ${formatted.distinctSources || 0} distinct source(s).</p>
          ${dataGaps ? `<p><strong>Data Gaps:</strong> ${this.escape(dataGaps)}</p>` : ''}
        </div>
      </div>
    `;

    container.innerHTML = summaryHTML;
    container.dataset.summary = summaryHTML;
    container.dataset.detailed = detailedHTML;
    container.dataset.sources = sourcesHTML;
  }

  // ========== COMPETITIVE DATA ==========
  
  loadCompetitiveData(data) {
    this.data.competitive = data;
    
    // API returns: { analysis: {...}, assessment: {...}, score: 2, formatted: {...} }
    const score = data?.score || data?.assessment?.score;
    this.aiScores.competitive = score;
    
    const aiScoreEl = document.getElementById('competitive-ai-score');
    if (aiScoreEl) aiScoreEl.textContent = score ?? '-';
    
    const slider = document.getElementById('competitive-score-slider');
    const display = document.getElementById('competitive-user-score');
    if (slider && score) {
      slider.value = score;
      if (display) display.textContent = score;
      this.userScores.competitive.score = score;
      this.updateRubricDisplay('competitive', score);
    }
    
    this.displayCompetitiveEvidence(data);
  }

  displayCompetitiveEvidence(data) {
    const container = document.getElementById('competitive-evidence');
    if (!container) return;

    // v3 formatted data from competitive.js formatForDisplay()
    const formatted = data?.formatted || {};
    const analysisRaw = data?.analysis || {};
    const assessmentRaw = data?.assessment || {};

    // v3: flat top-level fields (no market_overview/competitive_analysis wrappers)
    const competitors = formatted.competitors || analysisRaw.competitors || [];
    const competitorCount = formatted.competitorCount || assessmentRaw.competitor_count || {};
    const estimatedTotal = formatted.totalCompetitors || competitorCount.estimated_total_market || analysisRaw.estimated_total_competitors || '';
    const marketLeaders = formatted.marketLeaders || assessmentRaw.market_leaders || [];
    const intensity = formatted.competitiveIntensity || assessmentRaw.competitive_intensity || analysisRaw.competitive_intensity || '';
    const keyRisks = formatted.keyRisks || assessmentRaw.key_risk_factors || [];
    const opportunities = formatted.opportunities || assessmentRaw.differentiation_opportunities || [];
    const marketGaps = formatted.marketGaps || analysisRaw.market_gaps || [];

    // v3: evaluation steps and market overview from formatted
    const evaluationSteps = formatted.evaluationSteps || assessmentRaw.evaluation_steps || {};
    const marketOverview = formatted.marketOverview || {};
    const competitiveScope = marketOverview.competitiveScope || analysisRaw.competitive_scope || '';
    const competitiveIntensityDetail = marketOverview.competitiveIntensity || '';

    // v3: justification is a string (not object)
    const justification = formatted.justification || assessmentRaw.score_justification || '';
    const rubricMatch = formatted.rubricMatch || assessmentRaw.rubric_match_explanation || '';
    const confidenceNote = formatted.confidenceNote || assessmentRaw.confidence_note || '';

    const confidence = formatted.confidence || analysisRaw.data_confidence;
    const confidenceJustification = formatted.confidenceJustification || analysisRaw.data_confidence_justification || '';
    const sources = formatted.sources || [];

    // v3: market dynamics at top level
    const marketDynamics = marketOverview.marketDynamics || analysisRaw.market_dynamics || '';
    // v3: job_to_be_done at top level
    const jobToBeDone = marketOverview.jobToBeDone || analysisRaw.job_to_be_done || '';

    // SUMMARY VIEW
    const summaryHTML = `
      <div class="evidence-content">
        ${jobToBeDone ? `<p class="industry-context"><strong>Job to Be Done:</strong> ${this.escape(jobToBeDone)}</p>` : ''}

        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">Competitors Found</span>
            <span class="metric-value">${competitorCount.total || competitors.length || '-'}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Est. Total Market</span>
            <span class="metric-value">${this.escape(String(estimatedTotal || '-'))}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Large Corps</span>
            <span class="metric-value">${competitorCount.large_companies || '-'}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Intensity</span>
            <span class="metric-value">${this.capitalize(intensity)}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">${confidence || '-'}</span>
          </div>
        </div>

        <div class="evidence-section">
          <h4>AI Assessment Rationale</h4>
          <div class="ai-rationale">${this.formatRationale(justification)}</div>
        </div>

        ${confidenceNote ? `
          <div class="evidence-section">
            <h4>Confidence Note</h4>
            <p>${this.escape(confidenceNote)}</p>
          </div>
        ` : ''}

        <div class="two-column-grid">
          <div class="evidence-section">
            <h4>Key Risk Factors</h4>
            <ul class="compact-list">${keyRisks.slice(0, 4).map(r => `<li>${this.escape(r)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
          <div class="evidence-section">
            <h4>Differentiation Opportunities</h4>
            <ul class="compact-list">${opportunities.slice(0, 4).map(o => `<li>${this.escape(o)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
        </div>

        ${marketLeaders.length > 0 ? `
          <div class="evidence-section">
            <h4>Market Leaders</h4>
            <div class="leader-badges">
              ${marketLeaders.map(l => `<span class="leader-badge">${this.escape(l)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // DETAILED VIEW - Competitors first, then market analysis
    const detailedHTML = `
      <div class="evidence-content">
        ${competitiveScope ? `
          <div class="evidence-section">
            <h4>Competitive Scope</h4>
            <p>${this.escape(competitiveScope)}</p>
          </div>
        ` : ''}

        <div class="evidence-section">
          <h4>Profiled Competitors (${competitors.length}${estimatedTotal ? ` of ~${this.escape(String(estimatedTotal))} estimated` : ''})</h4>
          <div class="competitor-grid">
            ${competitors.slice(0, 12).map(c => `
              <div class="competitor-card-detailed">
                <div class="competitor-header">
                  <strong class="competitor-name">${this.escape(c.name || c.company_name || 'Unknown Competitor')}</strong>
                  <div class="competitor-badges">
                    <span class="size-badge ${(c.size || c.size_category || c.companySize || '').toLowerCase()}">${this.escape(c.size || c.size_category || c.companySize || '')}</span>
                    ${c.competitorType ? `<span class="type-badge">${this.escape(c.competitorType)}</span>` : ''}
                  </div>
                </div>
                ${c.product ? `<p class="product-name"><strong>${this.escape(c.product)}</strong></p>` : ''}
                ${c.description ? `<p class="product-desc">${this.escape(this.truncate(c.description, 150))}</p>` : ''}
                ${c.strengths?.length > 0 ? `
                  <div class="competitor-strengths">
                    <strong>Strengths:</strong> ${c.strengths.slice(0, 2).map(s => this.escape(s)).join('; ')}
                  </div>
                ` : ''}
                ${c.weaknesses?.length > 0 ? `
                  <div class="competitor-weaknesses">
                    <strong>Weaknesses:</strong> ${c.weaknesses.slice(0, 2).map(w => this.escape(w)).join('; ')}
                  </div>
                ` : ''}
                ${c.differentiation ? `<p class="competitor-diff"><em>${this.escape(c.differentiation)}</em></p>` : ''}
                ${c.revenue ? `<p class="competitor-revenue">Revenue: ${this.escape(c.revenue)}</p>` : ''}
              </div>
            `).join('')}
          </div>
          ${competitors.length > 12 ? `<p class="more-note">+ ${competitors.length - 12} more competitors</p>` : ''}
        </div>

        <div class="evidence-section">
          <h4>Market Dynamics</h4>
          <p>${this.escape(marketDynamics || 'Not provided.')}</p>
        </div>

        ${marketGaps.length > 0 ? `
          <div class="evidence-section">
            <h4>Market Gaps</h4>
            <ul class="compact-list">${marketGaps.map(g => `<li>${this.escape(typeof g === 'string' ? g : JSON.stringify(g))}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${(evaluationSteps.saturation_assessment || evaluationSteps.incumbent_strength_assessment || evaluationSteps.differentiation_assessment) ? `
          <div class="evidence-section">
            <h4>Competitive Landscape Analysis</h4>
            ${evaluationSteps.saturation_assessment ? `<div class="landscape-narrative"><h5>Market Saturation</h5><p>${this.escape(evaluationSteps.saturation_assessment)}</p></div>` : ''}
            ${evaluationSteps.incumbent_strength_assessment ? `<div class="landscape-narrative"><h5>Incumbent Analysis</h5><p>${this.escape(evaluationSteps.incumbent_strength_assessment)}</p></div>` : ''}
            ${evaluationSteps.differentiation_assessment ? `<div class="landscape-narrative"><h5>Differentiation Assessment</h5><p>${this.escape(evaluationSteps.differentiation_assessment)}</p></div>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    // SOURCES VIEW
    const sourcesHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Data Sources</h4>
          ${sources.length > 0 ? `
            <ul class="source-list">
              ${sources.map(s => {
                const cleanUrl = this.cleanSourceUrl(s);
                return `<li><a href="${this.escape(cleanUrl)}" target="_blank" rel="noopener">${this.truncateUrl(cleanUrl)}</a></li>`;
              }).join('')}
            </ul>
          ` : '<p>No sources available.</p>'}
        </div>
        <div class="evidence-section">
          <h4>Rubric Alignment</h4>
          <div class="rubric-explanation">${this.formatRationale(rubricMatch)}</div>
        </div>
        <div class="evidence-section">
          <h4>Confidence Note</h4>
          <p><strong>${confidence || '-'}</strong> confidence level.</p>
          <p>${this.escape(confidenceJustification || 'No additional confidence information.')}</p>
        </div>
      </div>
    `;

    container.innerHTML = summaryHTML;
    container.dataset.summary = summaryHTML;
    container.dataset.detailed = detailedHTML;
    container.dataset.sources = sourcesHTML;
  }

  // ========== MARKET DATA ==========
  
  loadMarketData(data) {
    this.data.market = data;
    
    // API returns: { analysis: {...}, scoring: {...}, formatted: {...} }
    // Score is in scoring.score
    const score = data?.scoring?.score || data?.score;
    this.aiScores.market = score;
    
    const aiScoreEl = document.getElementById('market-ai-score');
    if (aiScoreEl) aiScoreEl.textContent = score ?? '-';
    
    const slider = document.getElementById('market-score-slider');
    const display = document.getElementById('market-user-score');
    if (slider && score) {
      slider.value = score;
      if (display) display.textContent = score;
      this.userScores.market.score = score;
      this.updateRubricDisplay('market', score);
    }
    
    this.displayMarketEvidence(data);
  }

  displayMarketEvidence(data) {
    const container = document.getElementById('market-evidence');
    if (!container) return;

    // v3 formatted data from market.js formatForDisplay()
    const formatted = data?.formatted || {};
    const analysisRaw = data?.analysis || {};
    const scoringRaw = data?.scoring || {};

    // Primary market from formatted (has tam, cagr) or analysis (has tam_usd, cagr_percent)
    const primaryMarket = formatted.primaryMarket || analysisRaw?.primary_market || {};
    const tam = primaryMarket.tam || primaryMarket.tam_usd;
    const cagr = primaryMarket.cagr || primaryMarket.cagr_percent;

    // Markets array - formatted uses: tam, cagr, source
    const markets = formatted.markets || analysisRaw?.markets || [];

    const marketAnalysis = analysisRaw?.market_analysis || {};
    const confidence = formatted.confidence || formatted.sourceCredibility || scoringRaw?.data_quality?.source_credibility;
    const confidenceJustification = formatted.confidenceJustification || analysisRaw?.data_confidence_justification || '';

    // v3: justification is a string (not object with .summary)
    const justificationSummary = formatted.justification || scoringRaw?.justification || '';
    // v3: strengths/limitations from scoring_alignment
    const strengths = formatted.strengths || analysisRaw?.scoring_alignment?.strengths || [];
    const limitations = formatted.limitations || analysisRaw?.scoring_alignment?.limitations || [];

    // TAM/CAGR categories
    const tamCategory = formatted.tamCategory || formatted.rubricDetails?.tamCategory || scoringRaw?.rubric_application?.tam_category || '';
    const cagrCategory = formatted.cagrCategory || formatted.rubricDetails?.cagrCategory || scoringRaw?.rubric_application?.cagr_category || '';

    // v3: data quality uses sourceCredibility and dataConcerns (no dataDate/dataRecency)
    const sourceCredibility = formatted.sourceCredibility || scoringRaw?.data_quality?.source_credibility || '';
    const dataConcerns = formatted.dataConcerns || scoringRaw?.data_quality?.data_concerns || [];

    // Format category nicely
    const formatCategory = (cat) => {
      if (!cat) return '-';
      return cat.replace(/_/g, ' ')
        .replace('under 500M', '< $500M')
        .replace('500M to 5B', '$500M - $5B')
        .replace('over 5B', '> $5B')
        .replace('under 10', '< 10%')
        .replace('10 to 20', '10-20%')
        .replace('10 to 35', '10-35%')
        .replace('over 20', '> 20%')
        .replace('over 35', '> 35%');
    };

    // SUMMARY VIEW
    const summaryHTML = `
      <div class="evidence-content">
        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">TAM</span>
            <span class="metric-value">${this.formatCurrency(tam)}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">CAGR</span>
            <span class="metric-value">${typeof cagr === 'number' ? cagr.toFixed(1) + '%' : '-'}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">${confidence || '-'}</span>
          </div>
        </div>

        <div class="evidence-section">
          <h4>AI Assessment Rationale</h4>
          <div class="ai-rationale">${this.formatRationale(justificationSummary)}</div>
        </div>

        <div class="two-column-grid">
          <div class="evidence-section">
            <h4>Strengths</h4>
            <ul class="compact-list">${strengths.map(s => `<li>${this.escape(s)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
          <div class="evidence-section">
            <h4>Limitations</h4>
            <ul class="compact-list">${limitations.map(l => `<li>${this.escape(l)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
        </div>
      </div>
    `;

    // DETAILED VIEW - Market segments table + analysis
    const detailedHTML = `
      <div class="evidence-content">
        ${formatted.executiveSummary ? `
          <div class="evidence-section">
            <h4>Executive Summary</h4>
            <p>${this.escape(formatted.executiveSummary)}</p>
          </div>
        ` : ''}

        <div class="evidence-section">
          <h4>Market Segments</h4>
          ${markets.length > 0 ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Market</th>
                  <th>TAM</th>
                  <th>CAGR</th>
                </tr>
              </thead>
              <tbody>
                ${markets.map((m, i) => {
                  const mTam = m.tam || m.tam_current_usd;
                  const mCagr = m.cagr || m.cagr_percent;
                  return `
                    <tr>
                      <td>${m.rank || i + 1}</td>
                      <td>${this.escape(m.description)}</td>
                      <td>${this.formatCurrency(mTam)}</td>
                      <td>${typeof mCagr === 'number' ? mCagr.toFixed(1) + '%' : '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<p>No market data available.</p>'}
        </div>

        <div class="evidence-section">
          <h4>Primary Market Selection</h4>
          <p><strong>${this.escape(primaryMarket.description || '')}</strong></p>
          <p>${this.escape(primaryMarket.rationale || primaryMarket.selection_rationale || '')}</p>
        </div>

        ${(formatted.trends || marketAnalysis.trends)?.length > 0 ? `
          <div class="evidence-section">
            <h4>Market Trends</h4>
            <ul>${(formatted.trends || marketAnalysis.trends).map(t => `<li>${this.escape(t)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${(formatted.unmetNeeds || marketAnalysis.unmet_needs)?.length > 0 ? `
          <div class="evidence-section">
            <h4>Unmet Needs</h4>
            <ul>${(formatted.unmetNeeds || marketAnalysis.unmet_needs).map(n => `<li>${this.escape(typeof n === 'string' ? n : JSON.stringify(n))}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${(formatted.opportunities || marketAnalysis.opportunities)?.length > 0 ? `
          <div class="evidence-section">
            <h4>Opportunities</h4>
            <ul>${(formatted.opportunities || marketAnalysis.opportunities).map(o => `<li>${this.escape(o)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${(formatted.barriers || marketAnalysis.barriers_to_entry)?.length > 0 ? `
          <div class="evidence-section">
            <h4>Barriers to Entry</h4>
            <ul>${(formatted.barriers || marketAnalysis.barriers_to_entry).map(b => `<li>${this.escape(b)}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;

    // SOURCES VIEW
    const marketSources = markets.filter(m => m.source || m.source_url).map(m => ({
      label: m.description,
      url: m.source || m.source_url
    }));
    const dataSources = formatted.dataSources || [];

    const sourcesHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Market Data Sources</h4>
          ${marketSources.length > 0 ? `
            <ul class="source-list">
              ${marketSources.map(s => `
                <li>
                  <strong>${this.escape(s.label)}</strong>:
                  <a href="${this.escape(this.cleanSourceUrl(s.url))}" target="_blank" rel="noopener">${this.truncateUrl(s.url)}</a>
                </li>
              `).join('')}
            </ul>
          ` : (dataSources.length > 0 ? `
            <ul class="source-list">
              ${dataSources.map(s => `<li><a href="${this.escape(this.cleanSourceUrl(s))}" target="_blank" rel="noopener">${this.truncateUrl(s)}</a></li>`).join('')}
            </ul>
          ` : '<p>No source URLs available.</p>')}
        </div>
        <div class="evidence-section">
          <h4>Confidence Note</h4>
          <p><strong>${confidence || '-'}</strong> confidence level.</p>
          <p>${this.escape(confidenceJustification || 'No additional confidence information.')}</p>
        </div>
        <div class="evidence-section">
          <h4>Data Quality</h4>
          ${sourceCredibility ? `<p><strong>Source Credibility:</strong> ${this.escape(sourceCredibility)}</p>` : ''}
          ${dataConcerns.length > 0 ? `
            <p><strong>Concerns:</strong></p>
            <ul>${dataConcerns.map(c => `<li>${this.escape(c)}</li>`).join('')}</ul>
          ` : '<p>No data concerns noted.</p>'}
        </div>
      </div>
    `;

    container.innerHTML = summaryHTML;
    container.dataset.summary = summaryHTML;
    container.dataset.detailed = detailedHTML;
    container.dataset.sources = sourcesHTML;
  }

  // ========== IP RISK DATA ==========
  
  loadIpRiskData(data) {
    this.data.iprisk = data;
    
    // API returns: { data: {...}, score: 3, formatted: {...} }
    const score = data?.score || data?.formatted?.score;
    this.aiScores.iprisk = score;
    
    const aiScoreEl = document.getElementById('iprisk-ai-score');
    if (aiScoreEl) aiScoreEl.textContent = score ?? '-';
    
    const slider = document.getElementById('iprisk-score-slider');
    const display = document.getElementById('iprisk-user-score');
    if (slider && score) {
      slider.value = score;
      if (display) display.textContent = score;
      this.userScores.iprisk.score = score;
      this.updateRubricDisplay('iprisk', score);
    }
    
    this.displayIpRiskEvidence(data);
  }

  displayIpRiskEvidence(data) {
    const container = document.getElementById('iprisk-evidence');
    if (!container) return;

    // v3 formatted data from iprisk.js formatForDisplay()
    const formatted = data?.formatted || {};
    const ipData = data?.data || {};

    // Company IP position
    const companyIP = formatted.companyIP || {};
    const companyPatentsFound = companyIP.patentsFound || 0;
    const companyIPSummary = companyIP.summary || '';
    const ownedPatentIds = companyIP.ownedPatentIds || [];

    // Landscape analysis
    const patentDensity = formatted.patentDensity || 'unknown';
    const totalRelevantPatents = formatted.totalRelevantPatents || 0;
    const uniqueFeatures = formatted.uniqueFeatures || [];
    const crowdedFeatures = formatted.crowdedFeatures || [];
    const topOwners = formatted.topOwners || [];
    const relevantPatents = formatted.relevantPatents || [];

    // Risk assessment
    const overallRisk = formatted.overallRisk || 'medium';
    const freedomToOperate = formatted.freedomToOperate || 'moderate';
    const blockingPatentsIdentified = formatted.blockingPatentsIdentified || false;
    const challenges = formatted.challenges || [];
    const riskAnalysis = formatted.riskAnalysis || '';

    // Patent tables
    const companyPatents = formatted.companyPatents || [];
    const thirdPartyPatents = formatted.thirdPartyPatents || [];

    // Score details
    const justification = formatted.justification || '';
    const keyRiskFactors = formatted.keyRiskFactors || [];
    const rubricMatch = formatted.rubricMatch || '';
    const evaluationSteps = formatted.evaluationSteps || {};
    const dataConfidenceImpact = formatted.dataConfidenceImpact || '';

    // Data quality
    const confidence = formatted.dataConfidence || ipData?.data_confidence;
    const confidenceJustification = formatted.dataConfidenceJustification || ipData?.data_confidence_justification || '';

    // SUMMARY VIEW
    const summaryHTML = `
      <div class="evidence-content">
        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">Overall Risk</span>
            <span class="metric-value risk-${overallRisk.toLowerCase()}">${this.capitalize(overallRisk)}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">FTO</span>
            <span class="metric-value">${this.capitalize(String(freedomToOperate).replace(/_/g, ' '))}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Patent Density</span>
            <span class="metric-value">${this.capitalize(String(patentDensity).replace(/_/g, ' '))}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Relevant Patents</span>
            <span class="metric-value">${totalRelevantPatents || '-'}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">${confidence || '-'}</span>
          </div>
        </div>

        <div class="evidence-section">
          <h4>AI Assessment Rationale</h4>
          <div class="ai-rationale">${this.formatRationale(justification || riskAnalysis || data?.rubricDescription || 'No rationale provided.')}</div>
        </div>

        <div class="evidence-section">
          <h4>Company IP Position</h4>
          <p>${this.escape(companyIPSummary || 'No IP summary available.')}</p>
          <div style="margin-top: 8px;">
            ${companyPatentsFound > 0 ? `<span class="metric-inline">Patents Found: ${companyPatentsFound}</span>` : ''}
            ${blockingPatentsIdentified ? `<span class="warning-badge">Blocking patents identified</span>` : ''}
          </div>
        </div>

        <div class="two-column-grid">
          <div class="evidence-section">
            <h4>Unique Protectable Features</h4>
            <ul class="compact-list">${uniqueFeatures.slice(0, 4).map(f => `<li>${this.escape(f)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
          <div class="evidence-section">
            <h4>Key Challenges</h4>
            <ul class="compact-list">${challenges.slice(0, 4).map(c => `<li>${this.escape(c)}</li>`).join('') || '<li>None identified</li>'}</ul>
          </div>
        </div>

        ${keyRiskFactors.length > 0 ? `
          <div class="evidence-section">
            <h4>Key Risk Factors</h4>
            <ul class="compact-list">${keyRiskFactors.map(f => `<li>${this.escape(f)}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;

    // DETAILED VIEW
    const detailedHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Patent Landscape</h4>
          <div class="metrics-row compact">
            <div class="metric-card small">
              <span class="metric-label">Total Relevant</span>
              <span class="metric-value">${totalRelevantPatents || '-'}</span>
            </div>
            <div class="metric-card small">
              <span class="metric-label">Company Patents</span>
              <span class="metric-value">${companyPatentsFound || companyPatents.length || '-'}</span>
            </div>
            <div class="metric-card small">
              <span class="metric-label">Third Party</span>
              <span class="metric-value">${thirdPartyPatents.length || '-'}</span>
            </div>
            <div class="metric-card small">
              <span class="metric-label">Density</span>
              <span class="metric-value">${this.capitalize(String(patentDensity).replace(/_/g, ' '))}</span>
            </div>
          </div>
        </div>

        ${riskAnalysis ? `
          <div class="evidence-section">
            <h4>Risk Analysis</h4>
            <div class="ai-rationale">${this.formatRationale(riskAnalysis)}</div>
          </div>
        ` : ''}

        ${Object.keys(evaluationSteps).length > 0 ? `
          <div class="evidence-section">
            <h4>Scoring Methodology</h4>
            ${(() => {
              const stepLabels = {
                patent_density_baseline: 'Patent Density Baseline',
                blocking_patent_assessment: 'Blocking Patent Assessment',
                venture_ip_assessment: 'Venture IP Assessment',
                fto_assessment: 'Freedom to Operate Assessment'
              };
              return Object.entries(evaluationSteps)
                .filter(([key, val]) => val && key !== 'baseline_range')
                .map(([key, val]) => {
                  const label = stepLabels[key] || this.capitalize(key.replace(/_/g, ' '));
                  return `<div class="landscape-narrative"><h5>${this.escape(label)}</h5><p>${this.escape(String(val))}</p></div>`;
                }).join('');
            })()}
          </div>
        ` : ''}

        ${topOwners.length > 0 ? `
          <div class="evidence-section">
            <h4>Top Patent Holders</h4>
            <div class="patent-holder-chips">
              ${topOwners.slice(0, 8).map(o => `
                <span class="patent-holder-chip">${this.escape(o.assignee)} <strong>${o.patentCount}</strong></span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${relevantPatents.length > 0 ? `
          <div class="evidence-section">
            <h4>Key Relevant Patents (${relevantPatents.length})</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patent ID</th>
                  <th>Title</th>
                  <th>Assignee</th>
                  <th>Year</th>
                  <th>Blocking</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${relevantPatents.map(p => `
                  <tr>
                    <td>${p.link ? `<a href="${this.escape(this.cleanPatentLink(p.link))}" target="_blank" rel="noopener">${this.escape(p.id)}</a>` : this.escape(p.id)}</td>
                    <td>${this.escape(this.truncate(p.title, 50))}</td>
                    <td>${this.escape(p.assignee)}</td>
                    <td>${p.year || '-'}</td>
                    <td><span class="risk-badge risk-${(p.blockingPotential || 'low').toLowerCase()}">${this.capitalize(p.blockingPotential || 'low')}</span></td>
                    <td>${this.escape(p.status || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="evidence-section"><h4>Key Relevant Patents</h4><p>No relevant patents identified.</p></div>'}

        ${crowdedFeatures.length > 0 ? `
          <div class="evidence-section">
            <h4>Crowded Patent Areas</h4>
            <ul>${crowdedFeatures.map(f => `<li>${this.escape(f)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${dataConfidenceImpact ? `
          <div class="evidence-section">
            <h4>Data Confidence Impact</h4>
            <p>${this.escape(dataConfidenceImpact)}</p>
          </div>
        ` : ''}
      </div>
    `;

    // SOURCES VIEW
    const patentSources = relevantPatents.filter(p => p.link).map(p => ({
      id: p.id,
      link: p.link
    }));

    const sourcesHTML = `
      <div class="evidence-content">
        <div class="evidence-section">
          <h4>Patent Sources</h4>
          ${patentSources.length > 0 ? `
            <ul class="source-list">
              ${patentSources.map(p => `
                <li>
                  <strong>${this.escape(p.id)}</strong>:
                  <a href="${this.escape(this.cleanPatentLink(p.link))}" target="_blank" rel="noopener">Google Patents</a>
                </li>
              `).join('')}
            </ul>
          ` : '<p>No patent sources available.</p>'}
        </div>

        ${topOwners.length > 0 ? `
          <div class="evidence-section">
            <h4>Major Patent Holders</h4>
            <div class="litigator-list">
              ${topOwners.slice(0, 8).map(o => `<span class="litigator-badge">${this.escape(o.assignee)} (${o.patentCount})</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="evidence-section">
          <h4>Rubric Alignment</h4>
          <div class="rubric-explanation">${this.formatRationale(rubricMatch || data?.rubricDescription || '')}</div>
        </div>
        <div class="evidence-section">
          <h4>Confidence Note</h4>
          <p><strong>${confidence || '-'}</strong> confidence level.</p>
          <p>${this.escape(confidenceJustification || 'No additional confidence information.')}</p>
        </div>
      </div>
    `;

    container.innerHTML = summaryHTML;
    container.dataset.summary = summaryHTML;
    container.dataset.detailed = detailedHTML;
    container.dataset.sources = sourcesHTML;
  }

  // ========== EXPORT DATA ==========
  
  /**
   * Load and render aggregated evidence for Solution Value assessment.
   * Called when company, market, or competitive data loads.
   * v3: Now pulls from solution_value section in company data (optional),
   * plus market and competitive data.
   */
  loadSolutionValueEvidence() {
    const container = document.getElementById('solutionvalue-evidence');
    if (!container) return;

    const company = this.data.company;
    const market = this.data.market;
    const competitive = this.data.competitive;

    const sections = [];

    // Build summary header with key metrics
    const sv = company?.solution_value || {};
    const stakeholderCount = (sv.affected_stakeholders || []).length;
    const impactCount = (sv.non_financial_impact || []).length;
    const hasSummaryMetrics = sv.problem_severity || stakeholderCount > 0 || impactCount > 0;

    if (hasSummaryMetrics) {
      const severityColors = { low: 'low', moderate: 'medium', high: 'high', critical: 'high' };
      const severityClass = severityColors[sv.problem_severity] || 'medium';
      sections.push(`
        <div class="sv-summary-header">
          ${sv.problem_severity ? `<span class="metric-inline">Severity: <span class="severity-badge severity-${severityClass}">${this.capitalize(sv.problem_severity)}</span></span>` : ''}
          ${stakeholderCount > 0 ? `<span class="metric-inline">Stakeholders: ${stakeholderCount}</span>` : ''}
          ${impactCount > 0 ? `<span class="metric-inline">Impact Dimensions: ${impactCount}</span>` : ''}
        </div>
      `);
    }

    // Section 1: Solution Value (from Company API - new v3 optional section)
    if (company) {
      const hasSolutionValue = sv.problem_statement || sv.value_proposition || sv.problem_severity;

      if (hasSolutionValue) {
        let svHTML = `
          <div class="evidence-subsection">
            <h4>Problem & Value</h4>
            <div class="evidence-source-tag">Source: Company Analysis (Solution Value)</div>
            ${sv.problem_statement ? `<div class="evidence-item"><strong>Problem Statement:</strong> ${this.escape(sv.problem_statement)}</div>` : ''}
            ${sv.value_proposition ? `<div class="evidence-item"><strong>Value Proposition:</strong> ${this.escape(sv.value_proposition)}</div>` : ''}
        `;

        // Problem Severity justification (badge is now in header)
        if (sv.problem_severity && sv.problem_severity_justification) {
          svHTML += `
            <div class="evidence-item">
              <p>${this.escape(sv.problem_severity_justification)}</p>
            </div>
          `;
        }

        // Affected Stakeholders - compact list instead of table
        const stakeholders = sv.affected_stakeholders || [];
        if (stakeholders.length > 0) {
          svHTML += `
            <div class="evidence-item">
              <strong>Affected Stakeholders:</strong>
              <ul class="compact-list">${stakeholders.map(s => `<li><strong>${this.escape(s.stakeholder || '')}:</strong> ${this.escape(s.how_affected || '')}</li>`).join('')}</ul>
            </div>
          `;
        }

        // Status Quo Limitations
        const limitations = sv.status_quo_limitations || [];
        if (limitations.length > 0) {
          svHTML += `
            <div class="evidence-item">
              <strong>Status Quo Limitations:</strong>
              <ul class="compact-list">${limitations.map(l => `<li>${this.escape(l)}</li>`).join('')}</ul>
            </div>
          `;
        }

        // Non-Financial Impact
        const impacts = sv.non_financial_impact || [];
        if (impacts.length > 0) {
          svHTML += `
            <div class="evidence-item">
              <strong>Non-Financial Impact:</strong>
              <ul class="compact-list">${impacts.map(i => `<li><strong>${this.escape(i.dimension || '')}:</strong> ${this.escape(i.description || '')}</li>`).join('')}</ul>
            </div>
          `;
        }

        svHTML += '</div>';
        sections.push(svHTML);
      } else {
        // Fallback: pull from market_context if solution_value not present
        const marketCtx = company.market_context || {};
        const targetMarket = marketCtx.target_market || '';
        const positioning = marketCtx.competitive_positioning || '';

        if (targetMarket || positioning) {
          sections.push(`
            <div class="evidence-subsection">
              <h4>Company Context</h4>
              <div class="evidence-source-tag">Source: Company Analysis</div>
              ${targetMarket ? `<div class="evidence-item"><strong>Target Market:</strong> ${this.escape(targetMarket)}</div>` : ''}
              ${positioning ? `<div class="evidence-item"><strong>Competitive Positioning:</strong> ${this.escape(positioning)}</div>` : ''}
            </div>
          `);
        }
      }
    }

    // Section 2: Market Needs & Scoring Alignment (from Market API)
    if (market) {
      const mFormatted = market.formatted || {};
      const mAnalysis = market.analysis?.market_analysis || {};
      const scoringAlignment = market.analysis?.scoring_alignment || {};
      const unmetNeeds = mFormatted.unmetNeeds || mAnalysis.unmet_needs || [];
      const executiveSummary = mFormatted.executiveSummary || mAnalysis.executive_summary || '';
      const mStrengths = mFormatted.strengths || scoringAlignment.strengths || [];
      const mLimitations = mFormatted.limitations || scoringAlignment.limitations || [];

      if (unmetNeeds.length > 0 || executiveSummary || mStrengths.length > 0) {
        sections.push(`
          <div class="evidence-subsection">
            <h4>Market Needs & Scoring Alignment</h4>
            <div class="evidence-source-tag">Source: Market Analysis</div>
            ${executiveSummary ? `<div class="evidence-item"><strong>Executive Summary:</strong> ${this.escape(executiveSummary)}</div>` : ''}
            ${unmetNeeds.length > 0 ? `
              <div class="evidence-item">
                <strong>Unmet Needs:</strong>
                <ul class="compact-list">${unmetNeeds.map(n => `<li>${this.escape(typeof n === 'string' ? n : JSON.stringify(n))}</li>`).join('')}</ul>
              </div>
            ` : ''}
            ${mStrengths.length > 0 ? `
              <div class="evidence-item">
                <strong>Strengths:</strong>
                <ul class="compact-list">${mStrengths.map(s => `<li>${this.escape(s)}</li>`).join('')}</ul>
              </div>
            ` : ''}
            ${mLimitations.length > 0 ? `
              <div class="evidence-item">
                <strong>Limitations:</strong>
                <ul class="compact-list">${mLimitations.map(l => `<li>${this.escape(l)}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        `);
      }
    }

    // Section 3: Competitive Gaps & Opportunities (from Competitive API)
    if (competitive) {
      // v3: job_to_be_done and market_gaps at top level of analysis
      const cAnalysis = competitive.analysis || {};
      const cAssessment = competitive.assessment || {};
      const cFormatted = competitive.formatted || {};
      const jobToBeDone = cAnalysis.job_to_be_done || cFormatted.marketOverview?.jobToBeDone || '';
      const marketGaps = cAnalysis.market_gaps || cFormatted.marketGaps || [];
      const diffOpportunities = cAssessment.differentiation_opportunities || cFormatted.opportunities || [];

      if (jobToBeDone || marketGaps.length > 0 || diffOpportunities.length > 0) {
        sections.push(`
          <div class="evidence-subsection">
            <h4>Competitive Gaps & Opportunities</h4>
            <div class="evidence-source-tag">Source: Competitive Analysis</div>
            ${jobToBeDone ? `<div class="evidence-item"><strong>Job to Be Done:</strong> ${this.escape(jobToBeDone)}</div>` : ''}
            ${marketGaps.length > 0 ? `
              <div class="evidence-item">
                <strong>Market Gaps:</strong>
                <ul class="compact-list">${marketGaps.map(g => `<li>${this.escape(typeof g === 'string' ? g : JSON.stringify(g))}</li>`).join('')}</ul>
              </div>
            ` : ''}
            ${diffOpportunities.length > 0 ? `
              <div class="evidence-item">
                <strong>Differentiation Opportunities:</strong>
                <ul class="compact-list">${diffOpportunities.map(o => `<li>${this.escape(typeof o === 'string' ? o : JSON.stringify(o))}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        `);
      }
    }

    // Render
    if (sections.length === 0) {
      container.innerHTML = `
        <div class="evidence-pending-notice">
          <p>Evidence will populate as analyses complete. This section aggregates findings from the Company, Market, and Competitive analyses.</p>
        </div>
      `;
    } else {
      const pendingSources = [];
      if (!company) pendingSources.push('Company');
      if (!market) pendingSources.push('Market');
      if (!competitive) pendingSources.push('Competitive');

      const pendingNotice = pendingSources.length > 0
        ? `<div class="evidence-partial-notice"><span class="notice-icon">&#9203;</span> Awaiting: ${pendingSources.join(', ')} analysis</div>`
        : '';

      container.innerHTML = `
        <div class="evidence-content aggregated-evidence">
          ${pendingNotice}
          ${sections.join('')}
        </div>
      `;
    }

    // Update the user score badge if score is submitted
    const badgeEl = document.getElementById('solutionvalue-user-score-badge');
    if (badgeEl && this.userScores.solutionvalue.submitted) {
      badgeEl.textContent = this.userScores.solutionvalue.score;
    }
  }

  getExportData() {
    const getDimensionExport = (dim) => {
      const userScore = this.userScores[dim];
      return {
        ...(this.data[dim] || {}),
        aiScore: this.aiScores[dim],
        userScore: userScore.submitted ? userScore.score : null,
        userJustification: (userScore.submitted && userScore.justification) ? userScore.justification : null,
        isSubmitted: userScore.submitted
      };
    };

    // Get final recommendation from state manager
    const finalRecommendation = window.app?.stateManager?.getFinalRecommendation() || '';

    return {
      company: this.data.company,
      team: getDimensionExport('team'),
      funding: getDimensionExport('funding'),
      competitive: getDimensionExport('competitive'),
      market: getDimensionExport('market'),
      iprisk: getDimensionExport('iprisk'),
      solutionvalue: getDimensionExport('solutionvalue'),
      finalRecommendation: finalRecommendation || null
    };
  }

  // ========== UTILITY METHODS ==========
  
  escape(str) {
    if (!str) return '';
    // Comprehensive HTML entity escaping to prevent XSS
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/`/g, '&#x60;');
  }

  // Format rationale text - handle bullets and newlines
  formatRationale(text) {
    if (!text) return 'No rationale provided.';
    // Convert markdown-style bullets and newlines to HTML
    let formatted = this.escape(text);
    // Handle bullet points (- or •)
    formatted = formatted.replace(/^[-•]\s*/gm, '</p><p>• ');
    // Handle numbered lists
    formatted = formatted.replace(/^\d+\.\s*/gm, '</p><p>• ');
    // Handle newlines
    formatted = formatted.replace(/\\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '</p><p>');
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/^<\/p>/, '');
    return `<p>${formatted}</p>`.replace(/<p>\s*<\/p>/g, '');
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Clean source URLs by removing citation reference suffixes like [%5E26563.0.0] or [^26563.0.0]
   * These appear at the end of some source URLs from the API
   * @param {string} url - The URL to clean
   * @returns {string} - Cleaned URL
   */
  cleanSourceUrl(url) {
    if (!url) return '';
    // Remove patterns like [%5E26563.0.0] or [^26563.0.0] or __[%5E8551.0.0]__ from end of URL
    // %5E is URL-encoded ^
    return String(url)
      .replace(/_*\[%5E[\d.]+\]_*$/i, '')
      .replace(/_*\[\^[\d.]+\]_*$/i, '')
      .replace(/\[%5E[\d.]+\]$/i, '')
      .replace(/\[\^[\d.]+\]$/i, '');
  }

  /**
   * Fix Google Patents links by stripping hyphens from patent IDs in URLs.
   * e.g., https://patents.google.com/patent/US12230784-B2 → .../US12230784B2
   */
  cleanPatentLink(url) {
    if (!url) return '';
    const cleaned = this.cleanSourceUrl(url);
    // Strip hyphens only from the patent ID portion of Google Patents URLs
    return cleaned.replace(/(patents\.google\.com\/patent\/)([A-Z0-9-]+)/i, (match, prefix, patentId) => {
      return prefix + patentId.replace(/-/g, '');
    });
  }

  displayUrl(url) {
    if (!url) return '';
    const cleanUrl = this.cleanSourceUrl(url);
    try {
      const parsed = new URL(cleanUrl);
      return parsed.hostname.replace('www.', '');
    } catch {
      return cleanUrl;
    }
  }

  truncateUrl(url) {
    if (!url) return '';
    const cleanUrl = this.cleanSourceUrl(url);
    try {
      const parsed = new URL(cleanUrl);
      const path = parsed.pathname.length > 30 ? parsed.pathname.slice(0, 30) + '...' : parsed.pathname;
      return parsed.hostname.replace('www.', '') + path;
    } catch {
      return cleanUrl.length > 50 ? cleanUrl.slice(0, 50) + '...' : cleanUrl;
    }
  }

  truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    // Handle formats like "2024-02-28" or "2025-04"
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[parseInt(parts[1]) - 1] || parts[1];
      return `${month} ${parts[0]}`;
    }
    return dateStr;
  }

  formatCurrency(value) {
    if (!value && value !== 0) return '-';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return value;
    
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(0) + 'K';
    return '$' + num.toFixed(0);
  }

  formatCurrencyWithCommas(valueInMillions, includeDecimals = true) {
    if (!valueInMillions && valueInMillions !== 0) return '-';
    const num = typeof valueInMillions === 'number' ? valueInMillions : parseFloat(valueInMillions);
    if (isNaN(num)) return String(valueInMillions);
    
    // If it's less than 1 million dollars (value < 1 when expressed in millions)
    // Display as actual dollar amount with commas
    if (num < 1 && num > 0) {
      const dollars = Math.round(num * 1000000);
      return '$' + dollars.toLocaleString('en-US');
    }
    
    // For values >= 1000 million (i.e., >= 1 billion)
    if (num >= 1000) {
      // Billions - remove trailing .0 if whole number
      const billionValue = num / 1000;
      if (billionValue % 1 === 0) {
        return '$' + billionValue.toFixed(0) + 'B';
      }
      return '$' + billionValue.toFixed(1) + 'B';
    } else if (num >= 1) {
      // Millions - remove trailing .0 if whole number
      if (num % 1 === 0) {
        return '$' + num.toFixed(0) + 'M';
      }
      const formatted = includeDecimals ? num.toFixed(1) : num.toFixed(0);
      return '$' + formatted + 'M';
    } else if (num === 0) {
      return '$0';
    }
    
    // Fallback for any edge cases
    return '$' + num.toFixed(1) + 'M';
  }

  /**
   * Parse a funding amount from various formats and return value in millions
   * Handles: numbers (assumed millions), strings like "$10M", "10 million", "1.5B", "$1,500,000"
   * @param {number|string} amount - The amount to parse
   * @returns {number|null} - Amount in millions, or null if unparseable
   */
  parseFundingAmount(amount) {
    if (amount === null || amount === undefined || amount === '' || 
        amount === 'undisclosed' || amount === 'Undisclosed' || amount === 'Unknown') {
      return null;
    }
    
    // If it's already a number, assume it's in millions (API convention)
    if (typeof amount === 'number') {
      return amount;
    }
    
    const amountStr = String(amount).toLowerCase().trim();
    
    // Extract numeric value
    const numMatch = amountStr.match(/[\d,.]+/);
    if (!numMatch) return null;
    
    const num = parseFloat(numMatch[0].replace(/,/g, ''));
    if (isNaN(num)) return null;
    
    // Determine the unit and convert to millions
    if (amountStr.includes('billion') || amountStr.includes('bn') || 
        (amountStr.includes('b') && !amountStr.includes('m'))) {
      return num * 1000; // Convert billions to millions
    } else if (amountStr.includes('million') || amountStr.includes('mn') || amountStr.includes('m')) {
      return num; // Already in millions
    } else if (amountStr.includes('thousand') || amountStr.includes('k')) {
      return num / 1000; // Convert thousands to millions
    } else if (num >= 1000000) {
      // Large number without unit - assume raw dollars
      return num / 1000000;
    } else if (num >= 1000) {
      // Could be thousands of dollars or raw millions - context dependent
      // If it has $ sign and is over 1000, likely raw dollars in thousands format
      if (amountStr.includes('$')) {
        return num / 1000000; // Treat as raw dollars
      }
      // Otherwise assume it's already in millions (API data)
      return num;
    } else {
      // Small number - assume already in millions
      return num;
    }
  }

  formatIntensity(value) {
    if (!value && value !== 0) return '-';
    const v = String(value).toLowerCase();
    if (v === 'high') return 'High';
    if (v === 'medium' || v === 'moderate') return 'Moderate';
    if (v === 'low') return 'Low';
    if (typeof value === 'number') {
      if (value <= 2) return 'Very Low';
      if (value <= 4) return 'Low';
      if (value <= 6) return 'Moderate';
      if (value <= 8) return 'High';
      return 'Very High';
    }
    return this.capitalize(value);
  }
}

window.AssessmentView = AssessmentView;
