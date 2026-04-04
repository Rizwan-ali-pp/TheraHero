class AnalyseScene extends Phaser.Scene {
    constructor() {
        super('AnalyseScene');
        this.chartInstance = null;
        this.grouped = {};
        this.gameKeys = [];
        this.currentGame = null;
        this.currentMetricIdx = 0;
        this.domPanel = null;
    }

    /* ═══════════════════════════════════════════════════════
       PHASER LIFECYCLE
    ═══════════════════════════════════════════════════════ */

    create() {
        this.cameras.main.fadeIn(400);
        const { width, height } = this.scale;

        // Reset data state to avoid accumulation when re-entering the scene
        this.grouped = {};
        this.gameKeys = [];
        this.currentGame = null;

        this.drawBackground(width, height);

        this.add.text(width / 2, 46, '📊 Progress Analysis', {
            fontFamily: 'Poppins', fontSize: '36px', color: '#ffffff', fontStyle: '800',
            shadow: { blur: 22, color: '#00e5ff', fill: true }
        }).setOrigin(0.5);

        const backBtn = UIManager.createButton(this, width / 2, height - 38, '⌂ Back to Profile', 0x1a1a3a, () => {
            SceneTransitionManager.transitionTo(this, 'ProfileScene');
        }, 230, 44);
        backBtn.bg.setStrokeStyle(2, 0x9b59b6);
        backBtn.setFontSize(15);

        this.statusText = this.add.text(width / 2, height / 2, '⏳  Loading your session data…', {
            fontFamily: 'Poppins', fontSize: '20px', color: '#a8b2d1'
        }).setOrigin(0.5);

        this.events.once('shutdown', () => this.cleanup());
        this.loadAndBuild();
    }

    drawBackground(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x24243e, 1);
        bg.fillRect(0, 0, width, height);
        bg.fillStyle(0x4a00e0, 0.10);
        bg.fillCircle(width * 0.1, height * 0.25, 260);
        bg.fillStyle(0x00e5ff, 0.05);
        bg.fillCircle(width * 0.92, height * 0.72, 300);
    }

    /* ═══════════════════════════════════════════════════════
       DATA LOADING
    ═══════════════════════════════════════════════════════ */

    async loadAndBuild() {
        await authManager.init();
        const history = await dataManager.getSessionHistory();

        if (!history || history.length === 0) {
            if (this.statusText) {
                this.statusText.setText('No sessions found.\nPlay some games and come back!');
            }
            return;
        }

        history.forEach(s => {
            if (!this.grouped[s.game]) this.grouped[s.game] = [];
            this.grouped[s.game].push(s);
        });

        // Add 'overall' as the first tab
        this.grouped['overall'] = history;
        this.gameKeys = ['overall', ...Object.keys(this.grouped).filter(k => k !== 'overall')];

        if (this.statusText) { this.statusText.destroy(); this.statusText = null; }
        this.buildUI();
    }

    /* ═══════════════════════════════════════════════════════
       DOM PANEL
    ═══════════════════════════════════════════════════════ */

    buildUI() {
        const { width, height } = this.scale;
        const panelW = Math.min(width * 0.92, 980);
        const panelH = height - 150;
        const centerY = 82 + panelH / 2;

        const html = this.buildHTML(panelW, panelH);
        this.domPanel = this.add.dom(width / 2, centerY).createFromHTML(html);
        this.setupDomListeners();
        this.selectGame(this.gameKeys[0], 0);
    }

    buildHTML(w, h) {
        const GAMES = this.getGameDefs();

        const tabsHtml = this.gameKeys.map(key => {
            const g = GAMES[key];
            if (!g) return '';
            return `
                <button class="g-tab" data-game="${key}" style="
                    padding: 7px 18px; border-radius: 20px;
                    border: 2px solid ${g.color}55;
                    background: ${g.color}1a; color: ${g.color};
                    font-family: Poppins, sans-serif; font-size: 13px;
                    font-weight: 700; cursor: pointer; white-space: nowrap;
                    transition: all 0.2s;
                ">${g.label}</button>`;
        }).join('');

        return `
        <div style="
            width:${w}px; height:${h}px;
            background: rgba(13,10,35,0.90);
            border: 1px solid rgba(0,229,255,0.15);
            border-radius: 20px;
            box-shadow: 0 0 60px rgba(0,229,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05);
            display: flex; flex-direction: column;
            overflow: hidden;
            font-family: Poppins, sans-serif;
        ">
            <!-- Game Tabs -->
            <div style="
                padding: 14px 22px 12px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                flex-shrink: 0;
            ">
                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="game-tabs-row">
                    ${tabsHtml}
                </div>
            </div>

            <!-- Chart Area -->
            <div style="flex:1; display:flex; flex-direction:column; padding:14px 22px 10px; min-height:0;">
                <div id="metric-tabs" style="display:flex; gap:7px; margin-bottom:12px; flex-shrink:0;"></div>
                <div style="position:relative; flex:1; min-height:0;">
                    <canvas id="progress-chart"></canvas>
                </div>
            </div>

            <!-- ML Verdict Panel -->
            <div id="ml-verdict" style="
                margin: 0 22px 16px;
                padding: 14px 20px;
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.03);
                display: flex; align-items: center; gap: 18px;
                flex-shrink: 0;
                transition: background 0.4s, border-color 0.4s;
            ">
                <div id="verdict-icon" style="font-size:30px; line-height:1;">⏳</div>
                <div style="flex:1;">
                    <div id="verdict-status" style="
                        font-size:11px; font-weight:700; letter-spacing:2px;
                        color:#a8b2d1; margin-bottom:3px;
                    ">ML TREND ANALYSIS</div>
                    <div id="verdict-title" style="
                        font-size:18px; font-weight:800; color:#ffffff; margin-bottom:3px;
                    ">Analysing…</div>
                    <div id="verdict-desc" style="font-size:12px; color:#a8b2d1; line-height:1.5;"></div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                    <div style="font-size:10px; color:#a8b2d1; letter-spacing:1px; margin-bottom:2px;">CONFIDENCE</div>
                    <div id="verdict-conf" style="font-size:26px; font-weight:800; color:#00e5ff;">—</div>
                    <div id="verdict-slope" style="font-size:11px; color:#a8b2d1; margin-top:2px;"></div>
                </div>
            </div>
        </div>`;
    }

    setupDomListeners() {
        this.domPanel.addListener('click');
        this.domPanel.on('click', e => {
            const gBtn = e.target.closest('[data-game]');
            const mBtn = e.target.closest('[data-metric]');
            if (gBtn) this.selectGame(gBtn.dataset.game, 0);
            if (mBtn) this.selectGame(this.currentGame, parseInt(mBtn.dataset.metric));
        });
    }

    /* ═══════════════════════════════════════════════════════
       RENDERING
    ═══════════════════════════════════════════════════════ */

    selectGame(gameKey, metricIdx = 0) {
        if (!gameKey || !this.grouped[gameKey]) return;
        this.currentGame = gameKey;
        this.currentMetricIdx = metricIdx;
        this.refreshTabStyles(gameKey);
        this.refreshMetricTabs(gameKey, metricIdx);
        this.renderChart(gameKey, metricIdx);
        this.runMLAnalysis(gameKey, metricIdx);
    }

    refreshTabStyles(activeKey) {
        const GAMES = this.getGameDefs();
        const root = this.domPanel.node;
        root.querySelectorAll('.g-tab').forEach(btn => {
            const g = GAMES[btn.dataset.game];
            if (!g) return;
            const active = btn.dataset.game === activeKey;
            btn.style.background = active ? g.color + '40' : g.color + '1a';
            btn.style.borderColor = active ? g.color : g.color + '55';
            btn.style.transform   = active ? 'scale(1.06)' : 'scale(1)';
            btn.style.boxShadow   = active ? `0 0 14px ${g.color}44` : 'none';
        });
    }

    refreshMetricTabs(gameKey, activeIdx) {
        const GAMES = this.getGameDefs();
        const g = GAMES[gameKey];
        if (!g) return;
        const container = this.domPanel.node.querySelector('#metric-tabs');
        if (!container) return;
        container.innerHTML = g.metrics.map((m, i) => `
            <button data-metric="${i}" style="
                padding: 5px 14px; border-radius: 14px;
                border: 1px solid ${m.color}66;
                background: ${i === activeIdx ? m.color + '40' : m.color + '12'};
                color: ${i === activeIdx ? '#ffffff' : m.color};
                font-family: Poppins, sans-serif; font-size: 12px;
                font-weight: 700; cursor: pointer; transition: all 0.2s;
                box-shadow: ${i === activeIdx ? `0 0 10px ${m.color}44` : 'none'};
            ">${m.label}</button>
        `).join('');
    }

    renderChart(gameKey, metricIdx) {
        if (typeof Chart === 'undefined') { console.error('Chart.js not loaded'); return; }
        if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }

        const GAMES  = this.getGameDefs();
        const g      = GAMES[gameKey];
        if (!g) return;
        const metric   = g.metrics[metricIdx];
        
        // Use normalized values for 'overall' or direct data for others
        const sessions = (this.grouped[gameKey] || []).map(s => {
            const val = (gameKey === 'overall') ? this.calculateWellnessScore(s) : Number(s.data[metric.key]) || 0;
            return { val, timestamp: s.timestamp };
        });        const values   = sessions.map(v => v.val);
        const labels   = sessions.map((_, i) => `${i + 1}`); // Just session numbers for clean X-axis
        const trend = this.linearTrendLine(values);

        const ctx = this.domPanel.node.querySelector('#progress-chart');
        if (!ctx) return;

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: metric.label,
                        data: values,
                        borderColor: metric.color,
                        backgroundColor: metric.color + '18',
                        borderWidth: 3,
                        pointBackgroundColor: metric.color,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: values.length > 20 ? 3 : 6,
                        pointHoverRadius: 9,
                        tension: 0.42,
                        fill: true,
                        order: 1
                    },
                    {
                        label: 'Trend',
                        data: trend,
                        borderColor: 'rgba(255,255,255,0.30)',
                        borderWidth: 2,
                        borderDash: [7, 4],
                        pointRadius: 0,
                        tension: 0,
                        fill: false,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500, easing: 'easeInOutQuart' },
                plugins: {
                    legend: {
                        labels: {
                            color: '#a8b2d1',
                            font: { family: 'Poppins', size: 12 },
                            boxWidth: 14, padding: 18
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(13,10,35,0.95)',
                        titleColor: '#00e5ff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(0,229,255,0.25)',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { family: 'Poppins', weight: 'bold', size: 13 },
                        bodyFont: { family: 'Poppins', size: 12 },
                        callbacks: {
                            title: (context) => {
                                const idx = context[0].dataIndex;
                                const s = sessions[idx];
                                if (s && s.timestamp instanceof Date) {
                                    return `Session ${idx + 1} • ${s.timestamp.toLocaleDateString()} ${s.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                }
                                return `Session ${idx + 1}`;
                            },
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1) + (metric.label.includes('%') ? '%' : metric.label.includes('(s)') ? 's' : '');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Session Number', color: '#a8b2d1', font: { family: 'Poppins', size: 11 } },
                        ticks: { color: '#a8b2d1', font: { family: 'Poppins', size: 11 } },
                        grid:  { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(255,255,255,0.08)' }
                    },
                    y: {
                        title: { display: true, text: metric.label, color: '#a8b2d1', font: { family: 'Poppins', size: 11 } },
                        ticks: { 
                            color: '#a8b2d1', 
                            font: { family: 'Poppins', size: 11 },
                            callback: (value) => value + (metric.label.includes('%') ? '%' : metric.label.includes('(s)') ? 's' : '')
                        },
                        grid:  { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(255,255,255,0.08)' }
                    }
                }
            }
        });
    }

    /* ═══════════════════════════════════════════════════════
       ML TREND ANALYSIS
    ═══════════════════════════════════════════════════════ */

    async runMLAnalysis(gameKey, metricIdx) {
        const GAMES   = this.getGameDefs();
        const g       = GAMES[gameKey];
        if (!g) return;
        const metric   = g.metrics[metricIdx];
        const sessions = this.grouped[gameKey] || [];
        
        let values;
        if (gameKey === 'overall') {
            values = sessions.map(s => this.calculateWellnessScore(s));
        } else {
            values = sessions.map(s => Number(s.data[metric.key]) || 0);
        }

        const root = this.domPanel.node;
        const iconEl  = root.querySelector('#verdict-icon');
        const titleEl = root.querySelector('#verdict-title');
        const descEl  = root.querySelector('#verdict-desc');
        const confEl  = root.querySelector('#verdict-conf');
        const slopeEl = root.querySelector('#verdict-slope');
        const panel   = root.querySelector('#ml-verdict');
        if (!iconEl || !titleEl) return;

        // Reset
        iconEl.textContent  = '🤖';
        titleEl.textContent = 'Analysing trend…';
        titleEl.style.color = '#ffffff';
        descEl.textContent  = '';
        confEl.textContent  = '…';
        slopeEl.textContent = '';

        if (values.length < 3) {
            iconEl.textContent  = '📊';
            titleEl.textContent = 'Not Enough Data';
            titleEl.style.color = '#a8b2d1';
            descEl.textContent  = `Play at least 3 sessions of this mode to see your trend. (${values.length} / 3 sessions)`;
            confEl.textContent  = '—';
            if (panel) { panel.style.background = 'rgba(255,255,255,0.03)'; panel.style.borderColor = 'rgba(255,255,255,0.08)'; }
            return;
        }

        // Compute trend (TF.js with JS fallback)
        const result = this.computeTrend(values);

        const { slope, r2 } = result;
        const pct = (r2 * 100);

        // For error-based metrics, a downward slope = improvement
        const effective  = metric.higherIsBetter ? slope : -slope;
        const threshold  = metric.label.includes('%') ? 1.5 : 0.3;
        const slopeLabel = `${slope >= 0 ? '+' : ''}${slope.toFixed(2)} / session`;

        let verdict;
        if (effective > threshold) {
            verdict = {
                icon: '✅', label: 'IMPROVING', color: '#00c853',
                bg: 'rgba(0,200,83,0.10)', border: 'rgba(0,200,83,0.28)',
                desc: `${metric.label} is consistently improving by ~${Math.abs(slope).toFixed(2)} per session. The therapy routine is working — keep it up!`
            };
        } else if (effective < -threshold) {
            verdict = {
                icon: '⚠️', label: 'NEEDS ATTENTION', color: '#ff4444',
                bg: 'rgba(255,68,68,0.09)', border: 'rgba(255,68,68,0.28)',
                desc: `${metric.label} shows a declining trend. Consider reviewing session frequency, difficulty level, or taking a rest day.`
            };
        } else {
            verdict = {
                icon: '🟡', label: 'STABLE', color: '#ffd93d',
                bg: 'rgba(255,217,61,0.08)', border: 'rgba(255,217,61,0.28)',
                desc: `Performance is consistent and holding steady. Try increasing difficulty or session frequency to push further progress.`
            };
        }

        iconEl.textContent  = verdict.icon;
        titleEl.textContent = verdict.label;
        titleEl.style.color = verdict.color;
        descEl.textContent  = verdict.desc;
        confEl.textContent  = `${Math.round(pct)}%`;
        confEl.style.color  = verdict.color;
        slopeEl.textContent = slopeLabel;
        if (panel) {
            panel.style.background   = verdict.bg;
            panel.style.borderColor  = verdict.border;
        }
    }

    /* ═══════════════════════════════════════════════════════
       REGRESSION MATH
    ═══════════════════════════════════════════════════════ */

    computeTrend(values) {
        // Try TF.js first (runs on WebGL for speed), fall back to pure JS
        if (typeof tf !== 'undefined') {
            try {
                return tf.tidy(() => {
                    const n    = values.length;
                    const xs   = tf.tensor1d(Array.from({ length: n }, (_, i) => i), 'float32');
                    const ys   = tf.tensor1d(values.map(Number), 'float32');
                    const xM   = xs.mean();
                    const yM   = ys.mean();
                    const xC   = xs.sub(xM);
                    const yC   = ys.sub(yM);
                    const slope     = xC.mul(yC).sum().div(xC.square().sum());
                    const intercept = yM.sub(slope.mul(xM));
                    const yPred = xs.mul(slope).add(intercept);
                    const ssRes = ys.sub(yPred).square().sum().arraySync();
                    const ssTot = yC.square().sum().arraySync();
                    const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
                    return { slope: slope.arraySync(), r2 };
                });
            } catch (e) {
                console.warn('[AnalyseScene] TF.js failed, using JS fallback:', e.message);
            }
        }
        return this.computeTrendJS(values);
    }

    computeTrendJS(values) {
        const n     = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        values.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
        const slope     = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;
        let ssRes = 0, ssTot = 0;
        values.forEach((y, x) => {
            ssRes += (y - (slope * x + intercept)) ** 2;
            ssTot += (y - yMean) ** 2;
        });
        const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
        return { slope, r2 };
    }

    linearTrendLine(values) {
        if (values.length < 2) return values;
        const { slope } = this.computeTrendJS(values);
        const n     = values.length;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        const xMean = (n - 1) / 2;
        const intercept = yMean - slope * xMean;
        return values.map((_, x) => slope * x + intercept);
    }

    calculateWellnessScore(session) {
        const d = session.data;
        const game = session.game;

        // Normalization logic to get a 0-100 score for any game
        if (game === 'pop_the_balloon' || game === 'four_finger_rush' || game === 'color_sort') {
            const acc = Number(d.accuracy) || 0;
            const scoreVal = Number(d.score) || 0;
            const react = Number(d.avgReaction) || 1.5;
            // Higher accuracy/score is good, lower reaction time is good
            // Reaction score: 1.5s = 0%, 0.5s = 100%
            const reactScore = Math.max(0, Math.min(100, (1.5 - react) * 100));
            // For Balloon Pop, we now favor the session score
            const primaryMetric = (game === 'pop_the_balloon') ? (scoreVal * 10) : acc; 
            return (primaryMetric * 0.7) + (reactScore * 0.3);
        }
        
        if (game === 'trace_path' || game === 'picture_puzzle') {
            const errors = Number(d.errors) || 0;
            const time = Number(d.timeInSeconds) || 60;
            // Fewer errors is good, faster time is good
            const errorScore = Math.max(0, 100 - (errors * 10)); // 10 errors = 0%
            const timeScore = Math.max(0, Math.min(100, (60 - time) * 1.6)); // 60s = 0%, 0s = 100%
            return (errorScore * 0.6) + (timeScore * 0.4);
        }

        return 50; // Fallback
    }

    /* ═══════════════════════════════════════════════════════
       GAME DEFINITIONS
    ═══════════════════════════════════════════════════════ */

    getGameDefs() {
        return {
            overall: {
                label: '🌟 Overall Wellness', color: '#00e5ff',
                metrics: [
                    { key: 'wellness', label: 'Wellness Score %', higherIsBetter: true, color: '#00e5ff' }
                ]
            },
            pop_the_balloon: {
                label: '🎈 Balloon Pop', color: '#ff4757',
                metrics: [
                    { key: 'score',       label: 'Score',            higherIsBetter: true,  color: '#ff4757' },
                    { key: 'accuracy',    label: 'Accuracy %',       higherIsBetter: true,  color: '#ff6b81' },
                    { key: 'avgReaction', label: 'Reaction Time (s)', higherIsBetter: false, color: '#ff9ff3' }
                ]
            },
            four_finger_rush: {
                label: '🖐 8-Finger Rush', color: '#2ed573',
                metrics: [
                    { key: 'accuracy', label: 'Accuracy %', higherIsBetter: true,  color: '#2ed573' },
                    { key: 'score',    label: 'Score',      higherIsBetter: true,  color: '#7bed9f' }
                ]
            },
            color_sort: {
                label: '🎨 Color Sort', color: '#1e90ff',
                metrics: [
                    { key: 'accuracy', label: 'Accuracy %', higherIsBetter: true,  color: '#1e90ff' },
                    { key: 'score',    label: 'Score',      higherIsBetter: true,  color: '#74b9ff' }
                ]
            },
            trace_path: {
                label: '〰️ Trace Path', color: '#ffa502',
                metrics: [
                    { key: 'errors',         label: 'Errors',    higherIsBetter: false, color: '#ffa502' },
                    { key: 'timeInSeconds',  label: 'Time (s)',  higherIsBetter: false, color: '#ffd32a' }
                ]
            },
            picture_puzzle: {
                label: '🖼️ Pic Puzzle', color: '#9b59b6',
                metrics: [
                    { key: 'errors',        label: 'Errors',   higherIsBetter: false, color: '#9b59b6' },
                    { key: 'timeInSeconds', label: 'Time (s)', higherIsBetter: false, color: '#c39bd3' }
                ]
            }
        };
    }

    /* ═══════════════════════════════════════════════════════
       CLEANUP
    ═══════════════════════════════════════════════════════ */

    cleanup() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}
