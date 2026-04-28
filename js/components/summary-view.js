// js/components/summary-view.js - Summary panel display (V02)
// Updated to handle actual API data structures

class SummaryView {
  constructor() {
    this.data = null;
    this.recommendationSubmitted = false;
  }

  init() {
    Debug.log('SummaryView initialized');
    this.setupFinalRecommendation();
    this.setupVentureDecisions();
    this.setupDatabaseSync();
  }

  /**
   * Wire up the Venture-Level Decisions card (Track, Pathway, Dual-use, Ecosystem notes).
   * Each control reads from StateManager on load and auto-saves on change.
   */
  setupVentureDecisions() {
    const sm = window.app?.stateManager;
    if (!sm) return;

    // Track Assignment (radios)
    const trackRadios = document.querySelectorAll('input[name="venture-track"]');
    const currentTrack = sm.getTrackAssignment();
    trackRadios.forEach(r => {
      if (parseInt(r.value, 10) === currentTrack) r.checked = true;
      r.addEventListener('change', () => {
        if (r.checked) sm.saveTrackAssignment(parseInt(r.value, 10));
      });
    });

    // Pathway (radios)
    const pathwayRadios = document.querySelectorAll('input[name="venture-pathway"]');
    const currentPathway = sm.getPathway();
    pathwayRadios.forEach(r => {
      if (r.value === currentPathway) r.checked = true;
      r.addEventListener('change', () => {
        if (r.checked) sm.savePathway(r.value);
      });
    });

    // Dual-use checkbox
    const dualUse = document.getElementById('venture-dual-use');
    if (dualUse) {
      dualUse.checked = sm.getDualUse();
      dualUse.addEventListener('change', () => sm.saveDualUse(dualUse.checked));
    }

    // Local Ecosystem Activation notes (debounced save)
    const notes = document.getElementById('venture-ecosystem-notes');
    if (notes) {
      notes.value = sm.getEcosystemNotes();
      let timer = null;
      notes.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => sm.saveEcosystemNotes(notes.value), 300);
      });
    }
  }

  /**
   * Read current Venture-Level Decisions from state for submission payload.
   * @returns {{trackAssignment: (1|2|3|null), pathway: ('license'|'company'|'both'|null), dualUse: boolean, ecosystemNotes: string}}
   */
  getVentureDecisions() {
    const sm = window.app?.stateManager;
    if (!sm) {
      return { trackAssignment: null, pathway: null, dualUse: false, ecosystemNotes: '' };
    }
    return {
      trackAssignment: sm.getTrackAssignment(),
      pathway: sm.getPathway(),
      dualUse: sm.getDualUse(),
      ecosystemNotes: sm.getEcosystemNotes()
    };
  }

  /**
   * Apply Venture-Level Decisions coming from a loaded assessment (cache or Smartsheet).
   * Persists each value through StateManager and updates the UI controls.
   */
  applyVentureDecisions(decisions) {
    if (!decisions) return;
    const sm = window.app?.stateManager;
    if (!sm) return;

    if (decisions.trackAssignment !== undefined) {
      sm.saveTrackAssignment(decisions.trackAssignment);
      document.querySelectorAll('input[name="venture-track"]').forEach(r => {
        r.checked = (parseInt(r.value, 10) === decisions.trackAssignment);
      });
    }

    if (decisions.pathway !== undefined) {
      sm.savePathway(decisions.pathway);
      document.querySelectorAll('input[name="venture-pathway"]').forEach(r => {
        r.checked = (r.value === decisions.pathway);
      });
    }

    if (decisions.dualUse !== undefined) {
      sm.saveDualUse(!!decisions.dualUse);
      const dualUse = document.getElementById('venture-dual-use');
      if (dualUse) dualUse.checked = !!decisions.dualUse;
    }

    if (decisions.ecosystemNotes !== undefined) {
      sm.saveEcosystemNotes(decisions.ecosystemNotes || '');
      const notes = document.getElementById('venture-ecosystem-notes');
      if (notes) notes.value = decisions.ecosystemNotes || '';
    }
  }

  /**
   * Set up event handlers for the Final Recommendation section
   */
  setupFinalRecommendation() {
    const section = document.getElementById('final-recommendation-section');
    const textarea = document.getElementById('final-recommendation-text');
    const charCount = document.getElementById('recommendation-char-count');
    const submitBtn = document.getElementById('submit-final-recommendation');

    if (!section || !textarea || !submitBtn) return;

    // Character counter and auto-save
    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      charCount.textContent = `${length} / 2000`;

      // Enable button only if there's content and all scores submitted
      const hasText = length > 0;
      const allSubmitted = this.allScoresSubmitted();
      submitBtn.disabled = !hasText || !allSubmitted;

      // Update button text to indicate what's needed
      if (hasText && !allSubmitted) {
        submitBtn.textContent = 'Submit scores first';
      } else if (!hasText) {
        submitBtn.textContent = 'Enter recommendation';
      } else {
        submitBtn.textContent = 'Submit Final Assessment';
      }

      // Auto-save to state
      window.app?.stateManager?.saveFinalRecommendation(textarea.value);

      // Update unsubmitted reminder
      this._updateUnsubmittedReminder();
    });

    // Submit handler
    submitBtn.addEventListener('click', () => this.submitFinalRecommendation());

    // Load saved recommendation if exists
    const saved = window.app?.stateManager?.getFinalRecommendation();
    if (saved) {
      textarea.value = saved;
      charCount.textContent = `${saved.length} / 2000`;
    }
  }

  /**
   * Check if all 5 dimension scores have been submitted
   */
  allScoresSubmitted() {
    const scores = window.app?.assessmentView?.userScores || {};
    const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];
    return dimensions.every(d => scores[d]?.submitted);
  }

  /**
   * Check if all 5 sections have generated data (AI analysis complete)
   * This is different from allScoresSubmitted - we want to show the recommendation
   * field as soon as the sections have content, not after user submits scores
   */
  allSectionsGenerated() {
    const data = window.app?.assessmentView?.data;
    if (!data) return false;

    // Check if we have data for all 5 sections
    return !!(data.team && data.funding && data.competitive && data.market && data.iprisk);
  }

  /**
   * Submit the final recommendation to Smartsheet
   */
  async submitFinalRecommendation() {
    const textarea = document.getElementById('final-recommendation-text');
    const submitBtn = document.getElementById('submit-final-recommendation');
    const section = document.getElementById('final-recommendation-section');

    if (!textarea?.value.trim()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await window.app.submitFinalAssessmentWithRecommendation(textarea.value);

      section.classList.add('submitted');
      submitBtn.textContent = '✓ Submitted';
      this.recommendationSubmitted = true;
      this._updateUnsubmittedReminder();

      window.app?.toastManager?.success('Final assessment submitted successfully');
    } catch (error) {
      Debug.error('[SummaryView] Failed to submit recommendation:', error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Final Assessment';
      window.app?.toastManager?.error('Failed to submit. Please try again.');
    }
  }

  /**
   * Show or hide the recommendation section based on whether sections have data
   * The section is visible once all AI analyses are complete (sections generated)
   * The submit button is only enabled once all scores are submitted
   */
  showRecommendationSection() {
    const section = document.getElementById('final-recommendation-section');
    if (!section) return;

    // Show section once all sections have generated data OR scores were loaded from Smartsheet
    const hasGeneratedData = this.allSectionsGenerated();
    const hasLoadedScores = this.allScoresSubmitted();
    if (hasGeneratedData || hasLoadedScores) {
      section.classList.remove('hidden');

      // Enable submit button only if all scores submitted AND there's text
      const textarea = document.getElementById('final-recommendation-text');
      const submitBtn = document.getElementById('submit-final-recommendation');
      if (textarea && submitBtn && !this.recommendationSubmitted) {
        const hasText = textarea.value.length > 0;
        const allSubmitted = this.allScoresSubmitted();
        submitBtn.disabled = !hasText || !allSubmitted;

        // Update button text to indicate what's needed
        if (hasText && !allSubmitted) {
          submitBtn.textContent = 'Submit scores first';
        } else if (!hasText) {
          submitBtn.textContent = 'Enter recommendation';
        } else {
          submitBtn.textContent = Auth.isExternal() ? 'Save Assessment' : 'Submit Final Assessment';
        }
      }

      // Show/hide unsubmitted reminder
      this._updateUnsubmittedReminder();
    } else {
      section.classList.add('hidden');
    }
  }

  /**
   * Show or hide the "not yet submitted" reminder below the recommendation textarea.
   * @private
   */
  _updateUnsubmittedReminder() {
    const footer = document.querySelector('.recommendation-footer');
    if (!footer) return;

    let reminder = document.getElementById('unsubmitted-reminder');
    const textarea = document.getElementById('final-recommendation-text');
    const hasText = textarea?.value?.trim();
    const shouldShow = hasText && !this.recommendationSubmitted;

    if (shouldShow) {
      if (!reminder) {
        reminder = document.createElement('div');
        reminder.id = 'unsubmitted-reminder';
        reminder.className = 'unsubmitted-reminder';
        reminder.textContent = 'Your recommendation has not been submitted to the database yet.';
        footer.appendChild(reminder);
      }
      reminder.classList.remove('hidden');
    } else if (reminder) {
      reminder.classList.add('hidden');
    }
  }

  /**
   * Set up event handlers for the Database Sync section
   */
  setupDatabaseSync() {
    const checkBtn = document.getElementById('check-sync-status');
    const forceSyncBtn = document.getElementById('force-sync-btn');

    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkSyncStatus());
    }

    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', () => this.forceSyncAllData());
    }
  }

  /**
   * Check the current sync status and display it
   */
  async checkSyncStatus() {
    const statusContent = document.getElementById('sync-status-content');
    const checkBtn = document.getElementById('check-sync-status');

    if (!statusContent) return;

    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';

    try {
      // Get current row ID if exists
      const rowId = window.SmartsheetIntegration?.getCurrentRowId();

      // Get submitted scores
      const scores = window.app?.assessmentView?.userScores || {};
      const dimensions = ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'];

      const statusItems = dimensions.map(dim => {
        const dimScore = scores[dim];
        const isSubmitted = dimScore?.submitted;
        const label = this.formatDimensionName(dim);

        if (!isSubmitted) {
          return `<li><span class="status-icon pending">○</span> ${label}: Not scored yet</li>`;
        }

        // If we have a row ID, assume it's synced (we can't easily verify without API call)
        if (rowId) {
          return `<li><span class="status-icon synced">✓</span> ${label}: Score ${dimScore.score}/9 - Synced</li>`;
        }

        return `<li><span class="status-icon not-synced">✗</span> ${label}: Score ${dimScore.score}/9 - Not synced</li>`;
      });

      // Check final recommendation
      const finalRec = window.app?.stateManager?.getFinalRecommendation();
      if (finalRec) {
        if (rowId && this.recommendationSubmitted) {
          statusItems.push(`<li><span class="status-icon synced">✓</span> Final Recommendation: Synced</li>`);
        } else {
          statusItems.push(`<li><span class="status-icon not-synced">✗</span> Final Recommendation: Not synced</li>`);
        }
      }

      const rowIdStatus = rowId
        ? `<p style="font-size: 12px; color: var(--slate-500); margin-top: 8px;">Database Row ID: ${rowId}</p>`
        : `<p style="font-size: 12px; color: var(--brand-warning); margin-top: 8px;">No database record found. Click "Force Sync" to create one.</p>`;

      statusContent.innerHTML = `
        <ul class="sync-status-list">
          ${statusItems.join('')}
        </ul>
        ${rowIdStatus}
      `;

    } catch (error) {
      Debug.error('[SummaryView] Error checking sync status:', error.message);
      statusContent.innerHTML = `
        <div class="sync-result error">
          Error checking status: ${error.message}
        </div>
      `;
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check Status';
    }
  }

  /**
   * Force sync all data to the database
   */
  async forceSyncAllData() {
    if (Auth.isExternal()) return;

    const forceSyncBtn = document.getElementById('force-sync-btn');
    const statusContent = document.getElementById('sync-status-content');

    if (!forceSyncBtn) return;

    forceSyncBtn.disabled = true;
    forceSyncBtn.textContent = 'Syncing...';

    try {
      // Get final recommendation if any
      const finalRecommendation = window.app?.stateManager?.getFinalRecommendation() || '';

      // Get context
      const context = window.SmartsheetIntegration.getContext();
      if (finalRecommendation) {
        context.finalRecommendation = finalRecommendation;
      }

      // Gather all score data
      const av = window.app?.assessmentView;
      const allData = {
        team: {
          aiScore: av?.aiScores?.team,
          userScore: av?.userScores?.team?.score,
          justification: av?.userScores?.team?.justification
        },
        funding: {
          aiScore: av?.aiScores?.funding,
          userScore: av?.userScores?.funding?.score,
          justification: av?.userScores?.funding?.justification
        },
        competitive: {
          aiScore: av?.aiScores?.competitive,
          userScore: av?.userScores?.competitive?.score,
          justification: av?.userScores?.competitive?.justification
        },
        market: {
          aiScore: av?.aiScores?.market,
          userScore: av?.userScores?.market?.score,
          justification: av?.userScores?.market?.justification
        },
        iprisk: {
          aiScore: av?.aiScores?.iprisk,
          userScore: av?.userScores?.iprisk?.score,
          justification: av?.userScores?.iprisk?.justification
        },
        solutionvalue: {
          aiScore: null,
          userScore: av?.userScores?.solutionvalue?.score,
          justification: av?.userScores?.solutionvalue?.justification
        }
      };

      // Submit to Smartsheet
      const result = await window.SmartsheetIntegration.submitAllScores(allData, context);

      if (result?.success) {
        statusContent.innerHTML = `
          <div class="sync-result success">
            All data synced successfully!
            ${result.rowId ? `<br>Row ID: ${result.rowId}` : ''}
          </div>
        `;
        window.app?.toastManager?.success('All data synced to database');

        // Refresh status display after a short delay
        setTimeout(() => this.checkSyncStatus(), 1500);
      } else {
        throw new Error(result?.error || 'Sync failed');
      }

    } catch (error) {
      Debug.error('[SummaryView] Force sync failed:', error.message);
      statusContent.innerHTML = `
        <div class="sync-result error">
          Sync failed: ${error.message}<br>
          <small>Please try again or contact support if the issue persists.</small>
        </div>
      `;
      window.app?.toastManager?.error('Sync failed. Please try again.');
    } finally {
      forceSyncBtn.disabled = false;
      forceSyncBtn.textContent = 'Force Sync All Data';
    }
  }

  /**
   * Format dimension name for display
   */
  formatDimensionName(dim) {
    const names = {
      team: 'Researcher Aptitude',
      funding: 'Sector Funding',
      competitive: 'Competitive Winnability',
      market: 'Market Opportunity',
      iprisk: 'IP Landscape',
      solutionvalue: 'Solution Value'
    };
    return names[dim] || dim;
  }

  update(results) {
    this.data = results;
    
    const container = document.getElementById('summary-content');
    if (!container) {
      console.error('Summary container not found');
      return;
    }
    
    const scores = this.calculateScores(results);
    const statusInfo = this.getStatusInfo(results);
    
    container.innerHTML = `
      ${statusInfo.hasFailures ? `
        <div class="summary-warning">
          <span class="warning-icon">⚠️</span>
          <span>${statusInfo.failedCount} assessment(s) failed. Partial results shown below.</span>
        </div>
      ` : ''}
      
      <div class="summary-header">
        <div class="company-summary-info">
          <h3>${this.escape(window.app?.getVentureName() || results.company?.company_overview?.name || 'Unknown Company')}</h3>
          <p>${this.escape(results.company?.company_overview?.one_liner || results.company?.company_overview?.detailed_description || results.company?.company_overview?.company_description || 'No description available.')}</p>
        </div>
        <div class="overall-score-display">
          <div class="overall-score-value ${this.getScoreClass(scores.overall)}">${scores.overall}</div>
          <div class="overall-score-label">Average AI Score</div>
          ${scores.userOverall !== '-' ? `
            <div class="user-overall">
              <span class="user-overall-value">${scores.userOverall}</span>
              <span class="user-overall-label">Your Average</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="summary-scores-grid">
        ${this.renderScoreCard('Researcher Aptitude', 'team', results.team)}
        ${this.renderScoreCard('Sector Funding', 'funding', results.funding)}
        ${this.renderScoreCard('Competitive Winnability', 'competitive', results.competitive)}
        ${this.renderScoreCard('Market Opportunity', 'market', results.market)}
        ${this.renderScoreCard('IP Landscape', 'iprisk', results.iprisk)}
        ${this.renderScoreCard('Solution Value', 'solutionvalue', { _userOnly: true })}
      </div>
      
      <div class="summary-actions">
        <p class="submission-status">
          ${statusInfo.submittedCount} of 6 assessments submitted
          ${statusInfo.submittedCount < 5 && !statusInfo.hasFailures ?
            '<span class="status-hint">• Submit assessments in each tab before exporting</span>' : ''}
        </p>
      </div>
    `;

    // Make score cards clickable — navigate to dimension tab
    container.querySelectorAll('.summary-score-card[data-dimension]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.citation-link')) return; // Don't intercept citation clicks
        const dim = card.dataset.dimension;
        if (dim && dim !== 'solutionvalue' && window.app?.tabManager) {
          window.app.tabManager.activateTab(dim);
        }
      });
    });

    // Show/hide the final recommendation section based on submission status
    this.showRecommendationSection();
  }

  // Extract AI score from various data structures
  getAIScore(data, dimension) {
    if (!data) return null;
    
    // Handle array format (info + scoring)
    if (Array.isArray(data)) {
      const scoringObj = data[1] || data[0];
      if (dimension === 'funding') {
        return scoringObj?.funding_score || scoringObj?.score;
      }
      return scoringObj?.score;
    }
    
    // Handle object format with various score locations
    if (dimension === 'competitive') {
      return data.score || data.assessment?.score;
    }
    if (dimension === 'market') {
      return data.score || data.scoring?.score;
    }
    if (dimension === 'funding') {
      return data.funding_score || data.score;
    }
    
    return data.score;
  }

  calculateScores(results) {
    const aiScores = [
      this.getAIScore(results.team, 'team'),
      this.getAIScore(results.funding, 'funding'),
      this.getAIScore(results.competitive, 'competitive'),
      this.getAIScore(results.market, 'market'),
      this.getAIScore(results.iprisk, 'iprisk')
    ].filter(s => typeof s === 'number');
    
    const userScores = [];
    if (window.assessmentView) {
      const av = window.assessmentView;
      ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'].forEach(dim => {
        if (av.userScores[dim]?.submitted && typeof av.userScores[dim].score === 'number') {
          userScores.push(av.userScores[dim].score);
        }
      });
    }
    
    const overall = aiScores.length > 0 
      ? (aiScores.reduce((a, b) => a + b, 0) / aiScores.length).toFixed(1)
      : '-';
    
    const userOverall = userScores.length > 0 
      ? (userScores.reduce((a, b) => a + b, 0) / userScores.length).toFixed(1)
      : '-';
    
    return { overall, userOverall };
  }

  getStatusInfo(results) {
    let failedCount = 0;
    let submittedCount = 0;
    const av = window.assessmentView;

    // Check for failed phases (don't count as failed if user has scores from Smartsheet load)
    ['team', 'funding', 'competitive', 'market', 'iprisk'].forEach(dim => {
      if (!results[dim] && !av?.userScores[dim]?.submitted) failedCount++;
    });

    // Check submitted assessments
    if (av) {
      ['team', 'funding', 'competitive', 'market', 'iprisk', 'solutionvalue'].forEach(dim => {
        if (av.userScores[dim]?.submitted) submittedCount++;
      });
    }

    return {
      hasFailures: failedCount > 0,
      failedCount,
      submittedCount
    };
  }

  renderScoreCard(label, dimension, data) {
    const isUserOnly = dimension === 'solutionvalue';

    // Check if phase is pending or failed (not applicable for user-only dimensions)
    // Skip this path if user has submitted scores (scores-only restore from Smartsheet)
    const hasUserScore = window.assessmentView?.userScores[dimension]?.submitted;
    if (!data && !isUserOnly && !hasUserScore) {
      const isPending = window.app?.state === 'analyzing';
      return `
        <div class="summary-score-card ${isPending ? 'pending' : 'failed'}" data-dimension="${dimension}">
          <h4>${label}</h4>
          <div class="score-row">
            <div class="ai-score-display">
              <span class="score-label">AI Score</span>
              <span class="score-value ${isPending ? 'pending' : 'failed'}">${isPending ? '...' : '—'}</span>
            </div>
            <div class="user-score-display">
              <span class="score-label">Your Score</span>
              <span class="score-value">—</span>
            </div>
          </div>
          <div class="card-status ${isPending ? 'pending' : 'failed'}">
            ${isPending ? 'Analysis in progress...' : 'Analysis failed'}
          </div>
        </div>
      `;
    }

    // Get AI score using helper (null for user-only dimensions)
    const aiScore = isUserOnly ? null : this.getAIScore(data, dimension);
    
    // Get user score from assessmentView
    let userScore = null;
    let isSubmitted = false;
    let justification = '';
    
    if (window.assessmentView) {
      const userScoreData = window.assessmentView.userScores[dimension];
      if (userScoreData?.submitted) {
        userScore = userScoreData.score;
        isSubmitted = true;
        justification = userScoreData.justification || '';
      }
    }
    
    const aiScoreClass = isUserOnly ? 'na' : this.getScoreClass(aiScore);
    const userScoreClass = this.getScoreClass(userScore);
    const hasDeviation = !isUserOnly && isSubmitted && aiScore !== null && userScore !== null && Math.abs(aiScore - userScore) >= 2;

    return `
      <div class="summary-score-card ${isSubmitted ? 'submitted' : 'pending'}" data-dimension="${dimension}">
        <h4>${label}</h4>
        <div class="score-row">
          <div class="ai-score-display">
            <span class="score-label">${isUserOnly ? 'AI Score' : 'AI Score'}</span>
            <span class="score-value ${aiScoreClass}">${isUserOnly ? 'N/A' : (aiScore !== null ? aiScore : '—')}</span>
          </div>
          <div class="user-score-display">
            <span class="score-label">Your Score</span>
            <span class="score-value ${isSubmitted ? userScoreClass : ''}">${isSubmitted ? userScore : '—'}</span>
          </div>
        </div>
        ${hasDeviation ? `<div class="deviation-note">Differs from AI by ${Math.abs(aiScore - userScore)}</div>` : ''}
        ${isSubmitted && justification ? `
          <div class="justification-preview">
            <strong>Your rationale:</strong> ${this.escape(this.truncate(justification, 100))}
          </div>
        ` : ''}
        <div class="card-status ${isSubmitted ? 'submitted' : 'pending'}">
          ${isSubmitted ? '✓ Submitted' : 'Not submitted'}
        </div>
      </div>
    `;
  }

  getScoreClass(score) {
    if (typeof score !== 'number') return '';
    if (score <= 3) return 'low';
    if (score <= 6) return 'medium';
    return 'high';
  }

  truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

window.SummaryView = SummaryView;
