// D3.js Chart Implementations for Investment Analysis Dashboard
// This file contains sample implementations of the charts referenced in the main script

// Chart dimensions and margins
const CHART_CONFIG = {
    margin: { top: 20, right: 30, bottom: 40, left: 50 },
    width: 800,
    height: 400
};

// Sample NVIDIA Performance Chart with Animation
function createNvidiaPerformanceChart(containerId, data, timeframe = '10y') {
    // Clear existing chart
    d3.select(`#${containerId}`).selectAll("*").remove();

    const container = d3.select(`#${containerId}`);
    const width = CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
    const height = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

    // Create SVG
    const svg = container
        .append("svg")
        .attr("width", width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right)
        .attr("height", height + CHART_CONFIG.margin.top + CHART_CONFIG.margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

    // Generate sample data if not provided
    if (!data) {
        data = generateSampleStockData(timeframe);
    }

    // Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.price)])
        .range([height, 0]);

    // Line generator
    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX);

    // Add gradient definition
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "nvidia-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", height)
        .attr("x2", 0).attr("y2", 0);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f59e0b")
        .attr("stop-opacity", 0.1);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#f59e0b")
        .attr("stop-opacity", 0.6);

    // Add area under the line
    const area = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.price))
        .curve(d3.curveMonotoneX);

    const areaPath = g.append("path")
        .datum(data)
        .attr("fill", "url(#nvidia-gradient)")
        .attr("d", area);

    // Add the line
    const path = g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 3)
        .attr("d", line);

    // Add axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y")));

    g.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`));

    // Add axis labels
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - CHART_CONFIG.margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Stock Price ($)");

    g.append("text")
        .attr("transform", `translate(${width / 2}, ${height + CHART_CONFIG.margin.bottom})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Year");

    // Add title
    svg.append("text")
        .attr("x", (width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right) / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#1f2937")
        .text(`NVIDIA Stock Performance (${timeframe})`);

    // Animation function
    function animateChart() {
        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        areaPath
            .attr("opacity", 0)
            .transition()
            .duration(2000)
            .delay(500)
            .attr("opacity", 1);
    }

    return { animateChart };
}

// Sample Returns Distribution Histogram
function createReturnsHistogram(containerId, period = '10y') {
    d3.select(`#${containerId}`).selectAll("*").remove();

    const container = d3.select(`#${containerId}`);
    const width = CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
    const height = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right)
        .attr("height", height + CHART_CONFIG.margin.top + CHART_CONFIG.margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

    // Generate sample returns data
    const returns = generateSampleReturnsData();
    const nvidiaReturn = 28.47; // 10-year return
    const marketReturn = 13.2; // S&P 500 average

    // Create histogram
    const x = d3.scaleLinear()
        .domain(d3.extent(returns))
        .range([0, width]);

    const histogram = d3.histogram()
        .value(d => d)
        .domain(x.domain())
        .thresholds(x.ticks(30));

    const bins = histogram(returns);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([height, 0]);

    // Draw bars
    g.selectAll(".bar")
        .data(bins)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length))
        .attr("fill", "#10b981")
        .attr("opacity", 0.7);

    // Add market return line
    g.append("line")
        .attr("x1", x(marketReturn))
        .attr("x2", x(marketReturn))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#6b7280")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

    g.append("text")
        .attr("x", x(marketReturn) + 5)
        .attr("y", 20)
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("S&P 500 Avg");

    // Add NVIDIA return line
    g.append("line")
        .attr("x1", x(nvidiaReturn))
        .attr("x2", x(nvidiaReturn))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 3);

    g.append("text")
        .attr("x", x(nvidiaReturn) + 5)
        .attr("y", 40)
        .style("font-size", "12px")
        .style("fill", "#f59e0b")
        .style("font-weight", "600")
        .text("NVIDIA");

    // Add axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => `${d}%`));

    g.append("g")
        .call(d3.axisLeft(y));

    // Labels
    g.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 35})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Annualized Return (%)");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - CHART_CONFIG.margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Number of Stocks");

    // Title
    svg.append("text")
        .attr("x", (width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right) / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#1f2937")
        .text(`S&P 500 Returns Distribution (${period})`);
}

// Sample DCA Comparison Chart
function createDCAComparisonChart(containerId, monthlyAmount = 1000, showBoth = true) {
    d3.select(`#${containerId}`).selectAll("*").remove();

    const container = d3.select(`#${containerId}`);
    const width = CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
    const height = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right)
        .attr("height", height + CHART_CONFIG.margin.top + CHART_CONFIG.margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

    // Generate DCA data
    const dcaData = generateDCAData(monthlyAmount);

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(dcaData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(dcaData, d => Math.max(d.nvidiaValue, d.sp500Value))])
        .range([height, 0]);

    // Line generators
    const nvidiaLine = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.nvidiaValue))
        .curve(d3.curveMonotoneX);

    const sp500Line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.sp500Value))
        .curve(d3.curveMonotoneX);

    // Add area under NVIDIA line
    const nvidiaArea = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.nvidiaValue))
        .curve(d3.curveMonotoneX);

    g.append("path")
        .datum(dcaData)
        .attr("fill", "#f59e0b")
        .attr("fill-opacity", 0.2)
        .attr("d", nvidiaArea);

    // Add lines
    g.append("path")
        .datum(dcaData)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 3)
        .attr("d", nvidiaLine);

    if (showBoth) {
        g.append("path")
            .datum(dcaData)
            .attr("fill", "none")
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("d", sp500Line);
    }

    // Add axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));

    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d => `$${d3.format(".0s")(d)}`));

    // Add legend
    const legend = g.append("g")
        .attr("transform", `translate(${width - 150}, 20)`);

    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 3);

    legend.append("text")
        .attr("x", 25)
        .attr("y", 5)
        .style("font-size", "12px")
        .style("fill", "#374151")
        .text("NVIDIA DCA");

    if (showBoth) {
        legend.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 20)
            .attr("y2", 20)
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 25)
            .style("font-size", "12px")
            .style("fill", "#374151")
            .text("S&P 500 DCA");
    }

    // Labels
    g.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 35})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Year");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - CHART_CONFIG.margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text("Portfolio Value ($)");

    // Title
    svg.append("text")
        .attr("x", (width + CHART_CONFIG.margin.left + CHART_CONFIG.margin.right) / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#1f2937")
        .text(`Dollar Cost Averaging Comparison ($${monthlyAmount}/month)`);
}

// Data generation functions
function generateSampleStockData(timeframe) {
    const dataPoints = timeframe === '5y' ? 60 : timeframe === '10y' ? 120 : 240;
    const data = [];
    let price = 10; // Starting price

    for (let i = 0; i < dataPoints; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (dataPoints - i));

        // Simulate NVIDIA-like growth with volatility
        const monthlyGrowth = 1.035; // ~42% annually
        const volatility = 0.15;
        const randomFactor = 1 + (Math.random() - 0.5) * volatility;

        price *= monthlyGrowth * randomFactor;

        data.push({
            date: date,
            price: Math.round(price * 100) / 100
        });
    }

    return data;
}

function generateSampleReturnsData() {
    // Simulate S&P 500 returns distribution
    const returns = [];
    for (let i = 0; i < 500; i++) {
        // Log-normal distribution approximation
        const random1 = Math.random();
        const random2 = Math.random();
        const normal = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
        const return_ = 13.2 + normal * 15; // Mean 13.2%, std dev 15%
        returns.push(Math.max(-50, Math.min(100, return_))); // Cap between -50% and 100%
    }
    return returns;
}

function generateDCAData(monthlyAmount) {
    const data = [];
    const months = 120; // 10 years

    let nvidiaShares = 0;
    let sp500Shares = 0;
    let nvidiaPrice = 10;
    let sp500Price = 100;

    for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - i));

        // Buy shares with monthly amount
        nvidiaShares += monthlyAmount / nvidiaPrice;
        sp500Shares += monthlyAmount / sp500Price;

        // Update prices
        nvidiaPrice *= 1.035 * (1 + (Math.random() - 0.5) * 0.15); // NVIDIA growth
        sp500Price *= 1.011 * (1 + (Math.random() - 0.5) * 0.08); // S&P 500 growth

        data.push({
            date: date,
            nvidiaValue: nvidiaShares * nvidiaPrice,
            sp500Value: sp500Shares * sp500Price,
            totalInvested: (i + 1) * monthlyAmount
        });
    }

    return data;
}

// Integration with main script
if (typeof window !== 'undefined') {
    // Override placeholder render functions with actual D3 implementations
    window.renderNvidiaChart = function (timeframe) {
        const chart = createNvidiaPerformanceChart('nvidia-chart', null, timeframe);
        // Auto-animate on first load
        setTimeout(chart.animateChart, 500);
    };

    window.renderReturnsHistogram = function (period) {
        createReturnsHistogram('returns-histogram', period);
    };

    window.renderDCAChart = function (monthlyAmount, showBoth) {
        createDCAComparisonChart('dca-chart', monthlyAmount, showBoth);
    };

    window.animateNvidiaChart = function () {
        const chart = createNvidiaPerformanceChart('nvidia-chart', null, '10y');
        chart.animateChart();
    };
}

console.log('D3.js chart implementations loaded successfully!'); 