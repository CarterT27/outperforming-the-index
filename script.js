// Investment Analysis Interactive Dashboard
// Main JavaScript file for handling user interactions and D3.js visualizations

// Global configuration
const CONFIG = {
    animationDuration: 1000,
    transitionDuration: 500,
    colors: {
        nvidia: '#f59e0b',
        sp500: '#10b981',
        positive: '#22c55e',
        negative: '#ef4444',
        neutral: '#6b7280'
    },
    // Sample data - in production this would come from your data files
    sampleData: {
        nvidia: {
            symbol: 'NVDA',
            returns: {
                '1y': 0.456,
                '5y': 1.847,
                '10y': 28.47
            },
            priceHistory: generateSamplePriceData('nvidia'),
            dcaResults: {
                totalInvested: 120000,
                finalValue: 347000,
                totalReturn: 1.89
            }
        },
        sp500: {
            returns: {
                '1y': 0.132,
                '5y': 0.734,
                '10y': 1.32
            },
            priceHistory: generateSamplePriceData('sp500'),
            dcaResults: {
                totalInvested: 120000,
                finalValue: 186000,
                totalReturn: 0.55
            }
        }
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Main initialization function
function initializeApp() {
    console.log('Initializing Investment Analysis Dashboard...');
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize all chart placeholders
    initializeCharts();
    
    // Setup interactive controls
    setupInteractiveControls();
    
    // Setup strategy builder
    setupStrategyBuilder();
    
    // Add smooth scrolling
    setupSmoothScrolling();
    
    // Initialize animations
    initializeAnimations();
    
    console.log('Dashboard initialized successfully!');
}

// Navigation functionality
function initializeNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('shadow-md', 'bg-white/98');
            navbar.classList.remove('bg-white/95');
        } else {
            navbar.classList.remove('shadow-md', 'bg-white/98');
            navbar.classList.add('bg-white/95');
        }
    });
    
    // Highlight active nav link based on scroll position
    window.addEventListener('scroll', highlightActiveNavLink);
}

function highlightActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 80;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('text-primary-500');
        link.classList.add('text-gray-600');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('text-primary-500');
            link.classList.remove('text-gray-600');
        }
    });
}

// Chart initialization
function initializeCharts() {
    // Initialize NVIDIA performance chart
    initializeNvidiaChart();
    
    // Initialize returns histogram
    initializeReturnsHistogram();
    
    // Initialize DCA comparison chart
    initializeDCAChart();
    
    // Initialize strategy backtest chart
    initializeBacktestChart();
}

// NVIDIA Performance Chart
function initializeNvidiaChart() {
    const container = document.getElementById('nvidia-chart');
    const playButton = document.getElementById('play-nvidia-animation');
    const timeframeSelect = document.getElementById('nvidia-timeframe');
    
    if (!container) return;
    
    // Setup the chart container
    setupChartContainer(container, 'nvidia-performance');
    
    // Add event listeners
    if (playButton) {
        playButton.addEventListener('click', function() {
            animateNvidiaChart();
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Playing...';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-play"></i> Play Animation';
            }, CONFIG.animationDuration);
        });
    }
    
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', function() {
            updateNvidiaChart(this.value);
        });
    }
    
    // Initial chart render
    renderNvidiaChart('10y');
}

// Returns Distribution Histogram
function initializeReturnsHistogram() {
    const container = document.getElementById('returns-histogram');
    const percentileButton = document.getElementById('show-percentiles');
    const periodSelect = document.getElementById('return-period');
    
    if (!container) return;
    
    setupChartContainer(container, 'returns-distribution');
    
    if (percentileButton) {
        percentileButton.addEventListener('click', function() {
            togglePercentileLines();
            this.classList.toggle('active');
        });
    }
    
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            updateReturnsHistogram(this.value);
        });
    }
    
    renderReturnsHistogram('10y');
}

// DCA Comparison Chart
function initializeDCAChart() {
    const container = document.getElementById('dca-chart');
    const toggleSwitch = document.getElementById('show-both-strategies');
    const amountSelect = document.getElementById('monthly-amount');
    
    if (!container) return;
    
    setupChartContainer(container, 'dca-comparison');
    
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', function() {
            toggleDCAStrategies(this.checked);
        });
    }
    
    if (amountSelect) {
        amountSelect.addEventListener('change', function() {
            updateDCAAmount(this.value);
        });
    }
    
    renderDCAChart(1000, true);
}

// Strategy Backtest Chart
function initializeBacktestChart() {
    const container = document.getElementById('backtest-chart');
    const benchmarkToggle = document.getElementById('show-benchmark');
    
    if (!container) return;
    
    setupChartContainer(container, 'strategy-backtest');
    
    if (benchmarkToggle) {
        benchmarkToggle.addEventListener('change', function() {
            toggleBenchmark(this.checked);
        });
    }
}

// Chart rendering functions (placeholders for actual D3.js implementations)
function renderNvidiaChart(timeframe) {
    console.log(`Rendering NVIDIA chart for timeframe: ${timeframe}`);
    // TODO: Implement D3.js line chart with animation
    const container = document.getElementById('nvidia-chart');
    if (container) {
        updatePlaceholderText(container, `NVIDIA ${timeframe} Performance Chart`);
    }
}

function renderReturnsHistogram(period) {
    console.log(`Rendering returns histogram for period: ${period}`);
    // TODO: Implement D3.js histogram with vertical lines
    const container = document.getElementById('returns-histogram');
    if (container) {
        updatePlaceholderText(container, `S&P 500 Returns Distribution (${period})`);
    }
}

function renderDCAChart(monthlyAmount, showBoth) {
    console.log(`Rendering DCA chart: $${monthlyAmount}/month, show both: ${showBoth}`);
    // TODO: Implement D3.js area chart comparing strategies
    const container = document.getElementById('dca-chart');
    if (container) {
        updatePlaceholderText(container, `DCA Comparison ($${monthlyAmount}/month)`);
    }
}

function renderBacktestChart(strategy, showBenchmark) {
    console.log(`Rendering backtest chart for strategy, benchmark: ${showBenchmark}`);
    // TODO: Implement D3.js multi-line chart for strategy performance
    const container = document.getElementById('backtest-chart');
    if (container) {
        updatePlaceholderText(container, 'Strategy Backtest Results');
    }
}

// Interactive controls setup
function setupInteractiveControls() {
    // Setup all toggle switches
    setupToggleSwitches();
    
    // Setup form controls
    setupFormControls();
    
    // Setup button interactions
    setupButtonInteractions();
}

function setupToggleSwitches() {
    const toggles = document.querySelectorAll('.toggle-switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const label = this.parentElement.querySelector('.toggle-label');
            if (label) {
                console.log(`Toggle ${label.textContent}: ${this.checked}`);
            }
        });
    });
}

function setupFormControls() {
    // Number inputs with validation
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('change', function() {
            validateNumberInput(this);
        });
    });
    
    // Select dropdowns
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', function() {
            console.log(`${this.id} changed to: ${this.value}`);
        });
    });
}

function setupButtonInteractions() {
    // Add hover effects and loading states to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.disabled) {
                addButtonLoadingState(this);
            }
        });
    });
}

// Strategy Builder functionality
function setupStrategyBuilder() {
    const runBacktestBtn = document.getElementById('run-backtest');
    const resetStrategyBtn = document.getElementById('reset-strategy');
    const investmentTypeRadios = document.querySelectorAll('input[name="investment-type"]');
    const stockSearchInput = document.getElementById('stock-search-input');
    
    // Investment type selection
    investmentTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            handleInvestmentTypeChange(this.value);
        });
    });
    
    // Stock search functionality
    if (stockSearchInput) {
        setupStockSearch(stockSearchInput);
    }
    
    // Run backtest
    if (runBacktestBtn) {
        runBacktestBtn.addEventListener('click', function() {
            runStrategyBacktest();
        });
    }
    
    // Reset strategy
    if (resetStrategyBtn) {
        resetStrategyBtn.addEventListener('click', function() {
            resetStrategyBuilder();
        });
    }
    
    // Setup stock tag removal
    setupStockTagRemoval();
}

function handleInvestmentTypeChange(type) {
    const stockPicker = document.getElementById('stock-picker');
    console.log(`Investment type changed to: ${type}`);
    
    // Show/hide stock picker based on selection
    if (stockPicker) {
        stockPicker.style.display = type === 'individual-stocks' ? 'block' : 'none';
    }
}

function setupStockSearch(input) {
    // Sample stock symbols for autocomplete
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
    
    input.addEventListener('input', function() {
        const value = this.value.toUpperCase();
        if (value.length >= 1) {
            showStockSuggestions(value, stockSymbols);
        } else {
            hideStockSuggestions();
        }
    });
    
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSelectedStock(this.value.toUpperCase());
            this.value = '';
            hideStockSuggestions();
        }
    });
}

function showStockSuggestions(query, symbols) {
    const matches = symbols.filter(symbol => symbol.includes(query));
    // TODO: Implement dropdown with suggestions
    console.log(`Showing suggestions for "${query}":`, matches);
}

function hideStockSuggestions() {
    // TODO: Hide suggestion dropdown
    console.log('Hiding stock suggestions');
}

function addSelectedStock(symbol) {
    const selectedStocks = document.querySelector('#stock-picker .flex');
    if (!selectedStocks || !symbol) return;
    
    // Check if stock already exists
    const existingStocks = Array.from(selectedStocks.children).map(tag => 
        tag.textContent.trim().split(' ')[0]
    );
    
    if (existingStocks.includes(symbol)) {
        console.log(`Stock ${symbol} already selected`);
        return;
    }
    
    // Create new stock tag
    const stockTag = document.createElement('div');
    stockTag.className = 'bg-primary-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2';
    stockTag.innerHTML = `${symbol} <span class="remove-stock cursor-pointer font-bold opacity-80 hover:opacity-100">×</span>`;
    
    // Add remove functionality
    const removeBtn = stockTag.querySelector('.remove-stock');
    removeBtn.addEventListener('click', function() {
        stockTag.remove();
    });
    
    selectedStocks.appendChild(stockTag);
    console.log(`Added stock: ${symbol}`);
}

function setupStockTagRemoval() {
    const stockTags = document.querySelectorAll('.remove-stock');
    stockTags.forEach(removeBtn => {
        removeBtn.addEventListener('click', function() {
            this.parentElement.remove();
        });
    });
}

function runStrategyBacktest() {
    console.log('Running strategy backtest...');
    
    // Collect form data
    const strategyData = collectStrategyData();
    
    // Show loading state
    const runButton = document.getElementById('run-backtest');
    if (runButton) {
        runButton.disabled = true;
        runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Backtest...';
    }
    
    // Simulate backtest (replace with actual calculation)
    setTimeout(() => {
        const results = simulateBacktest(strategyData);
        displayBacktestResults(results);
        
        // Reset button
        if (runButton) {
            runButton.disabled = false;
            runButton.innerHTML = '<i class="fas fa-play"></i> Run Backtest';
        }
    }, 2000);
}

function collectStrategyData() {
    const investmentType = document.querySelector('input[name="investment-type"]:checked')?.value;
    const initialInvestment = document.getElementById('initial-investment')?.value;
    const monthlyContribution = document.getElementById('monthly-contribution')?.value;
    const rebalanceFrequency = document.getElementById('rebalance-frequency')?.value;
    
    const selectedStocks = Array.from(document.querySelectorAll('#stock-picker .bg-primary-500')).map(tag => 
        tag.textContent.trim().split(' ')[0]
    );
    
    return {
        investmentType,
        initialInvestment: parseFloat(initialInvestment) || 10000,
        monthlyContribution: parseFloat(monthlyContribution) || 1000,
        rebalanceFrequency,
        selectedStocks
    };
}

function simulateBacktest(strategyData) {
    // Simulate backtest results (replace with actual calculations)
    const randomMultiplier = 0.8 + Math.random() * 0.6; // Random between 0.8 and 1.4
    
    return {
        totalReturn: randomMultiplier * 1.27,
        annualizedReturn: Math.pow(randomMultiplier * 2.27, 1/10) - 1,
        volatility: 0.15 + Math.random() * 0.15,
        maxDrawdown: -(0.15 + Math.random() * 0.25),
        sharpeRatio: 1.0 + Math.random() * 1.0,
        winRate: 0.55 + Math.random() * 0.25,
        finalValue: strategyData.initialInvestment * (1 + randomMultiplier * 1.27)
    };
}

function displayBacktestResults(results) {
    // Update summary cards
    updateSummaryCard('Your Strategy', `+${(results.totalReturn * 100).toFixed(0)}%`);
    updateSummaryCard('Outperformance', `+${((results.totalReturn - 0.89) * 100).toFixed(0)}%`);
    
    // Update risk metrics
    updateRiskMetric('Volatility', `${(results.volatility * 100).toFixed(1)}%`);
    updateRiskMetric('Max Drawdown', `${(results.maxDrawdown * 100).toFixed(1)}%`);
    updateRiskMetric('Sharpe Ratio', results.sharpeRatio.toFixed(2));
    updateRiskMetric('Win Rate', `${(results.winRate * 100).toFixed(0)}%`);
    
    // Render the backtest chart
    renderBacktestChart(results, true);
    
    console.log('Backtest results displayed:', results);
}

function updateSummaryCard(cardName, value) {
    const cards = document.querySelectorAll('#backtest-chart').parentElement.querySelectorAll('.bg-gray-50');
    cards.forEach(card => {
        const header = card.querySelector('.text-xs');
        if (header && header.textContent.includes(cardName)) {
            const valueElement = card.querySelector('.text-xl');
            if (valueElement) {
                valueElement.textContent = value;
            }
        }
    });
}

function updateRiskMetric(metricName, value) {
    const metrics = document.querySelectorAll('.grid .flex-col');
    metrics.forEach(metric => {
        const nameElement = metric.querySelector('.text-sm');
        if (nameElement && nameElement.textContent === metricName) {
            const valueElement = metric.querySelector('.metric-val');
            if (valueElement) {
                valueElement.textContent = value;
            }
        }
    });
}

function resetStrategyBuilder() {
    console.log('Resetting strategy builder...');
    
    // Reset form inputs
    const form = document.querySelector('#strategy-builder');
    if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'radio') {
                input.checked = input.value === 'individual-stocks';
            } else if (input.type === 'number') {
                input.value = input.defaultValue;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }
    
    // Reset stock selection (keep default stocks)
    const stockContainer = document.querySelector('#stock-picker .flex');
    if (stockContainer) {
        stockContainer.innerHTML = `
            <div class="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                AAPL <span class="remove-stock cursor-pointer font-bold opacity-80 hover:opacity-100">×</span>
            </div>
            <div class="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                GOOGL <span class="remove-stock cursor-pointer font-bold opacity-80 hover:opacity-100">×</span>
            </div>
            <div class="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                TSLA <span class="remove-stock cursor-pointer font-bold opacity-80 hover:opacity-100">×</span>
            </div>
        `;
        setupStockTagRemoval();
    }
    
    // Reset backtest chart
    const chartContainer = document.getElementById('backtest-chart');
    if (chartContainer) {
        updatePlaceholderText(chartContainer, 'Run a backtest to see your strategy\'s performance');
    }
}

// Animation functions
function animateNvidiaChart() {
    console.log('Animating NVIDIA chart...');
    // TODO: Implement D3.js path animation
    const container = document.getElementById('nvidia-chart');
    if (container) {
        container.classList.add('animate-pulse');
        setTimeout(() => {
            container.classList.remove('animate-pulse');
        }, CONFIG.animationDuration);
    }
}

function togglePercentileLines() {
    console.log('Toggling percentile lines...');
    // TODO: Show/hide percentile lines in histogram
}

function toggleDCAStrategies(showBoth) {
    console.log(`Toggle DCA strategies: ${showBoth}`);
    // TODO: Show/hide strategy lines in chart
}

function toggleBenchmark(showBenchmark) {
    console.log(`Toggle benchmark: ${showBenchmark}`);
    // TODO: Show/hide benchmark line in backtest chart
}

// Update functions for chart interactions
function updateNvidiaChart(timeframe) {
    console.log(`Updating NVIDIA chart to ${timeframe}`);
    renderNvidiaChart(timeframe);
}

function updateReturnsHistogram(period) {
    console.log(`Updating returns histogram to ${period}`);
    renderReturnsHistogram(period);
}

function updateDCAAmount(amount) {
    console.log(`Updating DCA amount to $${amount}`);
    const showBoth = document.getElementById('show-both-strategies')?.checked ?? true;
    renderDCAChart(parseInt(amount), showBoth);
    
    // Update strategy cards with new amounts
    updateDCAResults(parseInt(amount));
}

function updateDCAResults(monthlyAmount) {
    // Calculate new results based on monthly amount
    const months = 120; // 10 years
    const totalInvested = monthlyAmount * months;
    
    // Update NVIDIA strategy card
    const nvidiaCard = document.querySelector('.nvidia-strategy');
    if (nvidiaCard) {
        updateStrategyCard(nvidiaCard, {
            totalInvested,
            finalValue: totalInvested * 2.89,
            totalReturn: 1.89
        });
    }
    
    // Update S&P 500 strategy card
    const sp500Card = document.querySelector('.sp500-strategy');
    if (sp500Card) {
        updateStrategyCard(sp500Card, {
            totalInvested,
            finalValue: totalInvested * 1.55,
            totalReturn: 0.55
        });
    }
}

function updateStrategyCard(card, data) {
    const metrics = card.querySelectorAll('.metric-value');
    if (metrics.length >= 3) {
        metrics[0].textContent = `$${data.totalInvested.toLocaleString()}`;
        metrics[1].textContent = `$${Math.round(data.finalValue).toLocaleString()}`;
        metrics[2].textContent = `+${Math.round(data.totalReturn * 100)}%`;
    }
}

// Utility functions
function setupChartContainer(container, chartId) {
    container.setAttribute('data-chart-id', chartId);
    container.style.minHeight = '400px';
}

function updatePlaceholderText(container, text) {
    const placeholder = container.querySelector('.text-center p');
    if (placeholder) {
        placeholder.textContent = text;
    }
}

function addButtonLoadingState(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1000);
}

function validateNumberInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    
    if (isNaN(value) || value < min || value > max) {
        input.style.borderColor = '#ef4444';
        return false;
    } else {
        input.style.borderColor = '#d1d5db';
        return true;
    }
}

function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.chart-container, .strategy-card, .insight-card');
    animatedElements.forEach(el => observer.observe(el));
}

// Sample data generation functions
function generateSamplePriceData(type) {
    const dataPoints = 120; // 10 years of monthly data
    const data = [];
    let price = type === 'nvidia' ? 10 : 1000; // Starting prices
    
    for (let i = 0; i < dataPoints; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (dataPoints - i));
        
        // Simulate price movement
        const growth = type === 'nvidia' ? 1.035 : 1.011; // Monthly growth rates
        const volatility = type === 'nvidia' ? 0.15 : 0.08;
        const randomFactor = 1 + (Math.random() - 0.5) * volatility;
        
        price *= growth * randomFactor;
        
        data.push({
            date: date,
            price: Math.round(price * 100) / 100,
            return: i > 0 ? (price / data[i-1].price - 1) : 0
        });
    }
    
    return data;
}

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        initializeApp,
        generateSamplePriceData
    };
}

console.log('Investment Analysis Dashboard script loaded successfully!'); 