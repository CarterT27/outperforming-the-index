"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Search, ExternalLink } from "lucide-react"
import * as d3 from "d3"

interface StockData {
  date: string
  price: number
  normalizedPrice: number
}

interface StockDataWithDate extends Omit<StockData, 'date'> {
  date: Date
}

interface ComparisonData {
  target_stock: {
    name: string
    data: StockData[]
  }
  sp500: {
    name: string
    data: StockData[]
  }
}

interface ReturnsDistribution {
  bins: number[]
  counts: number[]
  mean: number
  median: number
  std: number
}

export default function OutperformingIndex() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>(["AAPL", "GOOGL"])
  const [searchTerm, setSearchTerm] = useState("")
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [returnsData, setReturnsData] = useState<ReturnsDistribution | null>(null)

  const chartRef = useRef<HTMLDivElement>(null)
  const histogramRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Attempting to load data...');
        const basePath = process.env.NODE_ENV === 'production' ? '.' : '';
        const [comparisonResponse, returnsResponse] = await Promise.all([
          fetch(`${basePath}/data/comparison_data.json`),
          fetch(`${basePath}/data/returns_distribution.json`)
        ]);
        
        if (!comparisonResponse.ok) {
          throw new Error(`Failed to load comparison data: ${comparisonResponse.status}`);
        }
        if (!returnsResponse.ok) {
          throw new Error(`Failed to load returns data: ${returnsResponse.status}`);
        }
        
        const comparison = await comparisonResponse.json();
        const returns = await returnsResponse.json();
        
        console.log('Data loaded successfully:', {
          comparisonDataSize: comparison.target_stock.data.length,
          returnsDataSize: returns.bins.length
        });
        
        setComparisonData(comparison);
        setReturnsData(returns);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    
    loadData();
  }, []);

  const drawComparisonChart = () => {
    if (!chartRef.current || !comparisonData) return

    // Clear previous chart
    d3.select(chartRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 80, bottom: 60, left: 80 }
    const width = chartRef.current.offsetWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Parse dates
    const parseDate = d3.timeParse("%Y-%m-%d")
    const targetData: StockDataWithDate[] = comparisonData.target_stock.data
      .filter(d => d.normalizedPrice !== null)
      .map(d => ({
        ...d,
        date: parseDate(d.date) as Date
      }))
    const sp500Data: StockDataWithDate[] = comparisonData.sp500.data
      .filter(d => d.normalizedPrice !== null)
      .map(d => ({
        ...d,
        date: parseDate(d.date) as Date
      }))

    // Combine data for scales
    const allData = [...targetData, ...sp500Data]
    const allPrices = allData.map(d => d.normalizedPrice)

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(targetData, d => d.date) as [Date, Date])
      .range([0, width])

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(allPrices) as [number, number])
      .nice()
      .range([height, 0])

    // Line generator
    const line = d3
      .line<StockDataWithDate>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.normalizedPrice))
      .curve(d3.curveMonotoneX)

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-height)
          .tickFormat(() => ""),
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3)

    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => ""),
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3)

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale).tickFormat((d: Date | d3.NumberValue) => {
          if (d instanceof Date) {
            return d3.timeFormat("%Y")(d)
          }
          return ""
        })
      )
      .style("font-size", "12px")

    // Add Y axis
    g.append("g").call(d3.axisLeft(yScale)).style("font-size", "12px")

    // Add X axis label
    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + 45})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Year")

    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Price Index (Normalized to 100)")

    // Add target stock line
    g.append("path")
      .datum(targetData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Add S&P 500 line
    g.append("path")
      .datum(sp500Data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Add final value points
    const targetFinal = targetData[targetData.length - 1]
    const sp500Final = sp500Data[sp500Data.length - 1]

    g.append("circle")
      .attr("cx", xScale(targetFinal.date))
      .attr("cy", yScale(targetFinal.normalizedPrice))
      .attr("r", 6)
      .attr("fill", "#10b981")

    g.append("circle")
      .attr("cx", xScale(sp500Final.date))
      .attr("cy", yScale(sp500Final.normalizedPrice))
      .attr("r", 6)
      .attr("fill", "#3b82f6")

    // Add value labels
    g.append("text")
      .attr("x", xScale(targetFinal.date))
      .attr("y", yScale(targetFinal.normalizedPrice) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(targetFinal.normalizedPrice.toFixed(0))

    g.append("text")
      .attr("x", xScale(sp500Final.date))
      .attr("y", yScale(sp500Final.normalizedPrice) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(sp500Final.normalizedPrice.toFixed(0))

    // Add legend
    const legend = g.append("g").attr("transform", `translate(${width - 120}, 20)`)

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)

    legend.append("text").attr("x", 25).attr("y", 0).attr("dy", "0.35em").style("font-size", "12px").text(comparisonData.target_stock.name)

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 20)
      .attr("y2", 20)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)

    legend.append("text").attr("x", 25).attr("y", 20).attr("dy", "0.35em").style("font-size", "12px").text("S&P 500")

    // Add tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")

    // Add invisible overlay for mouse events
    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", (event: MouseEvent) => {
        const [mouseX] = d3.pointer(event)
        const date = xScale.invert(mouseX)

        // Find closest data points with proper bounds checking
        const bisect = d3.bisector((d: StockDataWithDate) => d.date).left
        const i = bisect(targetData, date, 1)

        // Ensure we have valid indices
        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(targetData.length - 1, i)

        const d0 = targetData[i0]
        const d1 = targetData[i1]

        // Choose the closest point
        let targetPoint: StockDataWithDate
        if (i0 === i1) {
          targetPoint = d0
        } else {
          targetPoint = date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime() ? d1 : d0
        }

        // Find corresponding S&P 500 point
        const targetIndex = targetData.indexOf(targetPoint)
        const sp500Point = sp500Data[targetIndex]

        if (targetPoint && sp500Point) {
          tooltip
            .style("visibility", "visible")
            .html(`
              <div><strong>${d3.timeFormat("%b %Y")(targetPoint.date)}</strong></div>
              <div>${comparisonData.target_stock.name}: ${targetPoint.normalizedPrice.toFixed(1)}</div>
              <div>S&P 500: ${sp500Point.normalizedPrice.toFixed(1)}</div>
            `)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px")
        }
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })
  }

  const drawHistogram = (comparisonData: ComparisonData | null) => {
  if (!histogramRef.current || !returnsData || !comparisonData) return

    // Clear previous chart
    d3.select(histogramRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 40, bottom: 60, left: 80 }
    const width = histogramRef.current.offsetWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const svg = d3
      .select(histogramRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Create histogram bins
    const xScale = d3
      .scaleLinear()
      .domain([-0.5, 0.5])
      .range([0, width])

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(returnsData.counts) as number])
      .nice()
      .range([height, 0])

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-height)
          .tickFormat(() => ""),
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3)

    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => ""),
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3)

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale).tickFormat((d) => `${(d as number * 100).toFixed(0)}%`)
        )
      .style("font-size", "12px")

    // Add Y axis
    g.append("g").call(d3.axisLeft(yScale)).style("font-size", "12px")

    // Add X axis label
    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + 45})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Annual Return (%)")

    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Number of Stocks")

    // Add bars
    g.selectAll(".bar")
      .data(returnsData.bins.map((bin, i) => ({
        bin,
        count: returnsData.counts[i]
      })))
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.bin))
      .attr("width", width / returnsData.bins.length - 1)
      .attr("y", d => yScale(d.count))
      .attr("height", d => height - yScale(d.count))
      .attr("fill", d => d.bin < returnsData.mean ? "#ef4444" : "#10b981")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8)

        // Remove any existing histogram tooltips
        d3.selectAll(".histogram-tooltip").remove()

        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "histogram-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .html(`
            <div><strong>Return Range:</strong> ${(d.bin * 100).toFixed(1)}% to ${((d.bin + 0.05) * 100).toFixed(1)}%</div>
            <div><strong>Number of Stocks:</strong> ${d.count}</div>
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1)
        d3.selectAll(".histogram-tooltip").remove()
      })

    // Add mean line
    g.append("line")
      .attr("x1", xScale(returnsData.mean))
      .attr("x2", xScale(returnsData.mean))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")

    // Add mean label
    g.append("text")
      .attr("x", xScale(returnsData.mean))
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#3b82f6")
      .text(`Market Average (${(returnsData.mean * 100).toFixed(1)}%)`)

    //NVIDIA line
    // Compute annualized NVIDIA return
    const parseDate = d3.timeParse("%Y-%m-%d");
    const startDate = parseDate(comparisonData.target_stock.data[0].date) as Date;
    const endDate = parseDate(comparisonData.target_stock.data.at(-1)!.date) as Date;
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const start = comparisonData.target_stock.data[0].normalizedPrice ?? 100;
    const end = comparisonData.target_stock.data.at(-1)?.normalizedPrice ?? 100;
    const totalReturn = (end - start) / start;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

    //Add NVIDIA Line
    g.append("line")
      .attr("x1", xScale(annualizedReturn))
      .attr("x2", xScale(annualizedReturn))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5");

    //Add NVIDIA Label
    g.append("text")
      .attr("x", xScale(annualizedReturn))
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#f59e0b")
      .text(`NVIDIA (${(annualizedReturn * 100).toFixed(1)}%)`);


  }

  // Draw charts on mount and resize
  useEffect(() => {
    const drawCharts = () => {
      drawComparisonChart()
      drawHistogram(comparisonData)
    }

    drawCharts()
    window.addEventListener("resize", drawCharts)
    return () => {
      window.removeEventListener("resize", drawCharts)
      // Clean up tooltips
      d3.selectAll(".d3-tooltip").remove()
      d3.selectAll(".histogram-tooltip").remove()
    }
  }, [comparisonData, returnsData])

  const addStock = (stock: string) => {
    if (!selectedStocks.includes(stock) && selectedStocks.length < 5) {
      setSelectedStocks([...selectedStocks, stock])
    }
  }

  const removeStock = (stock: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s !== stock))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Section 1: Hero Introduction */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-6xl font-bold text-gray-900">NVIDIA</h1>
                <p className="text-xl text-gray-600">NVDA</p>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Meet NVIDIA: A remarkable investment story</h2>
          <p className="text-xl text-gray-600 mb-8">
            From AI chips to autonomous vehicles, NVIDIA has transformed computing
          </p>
          <div className="text-6xl font-bold text-green-600 mb-4">+2,847%</div>
          <p className="text-lg text-gray-600">$1,000 invested in 2020 became $29,470</p>
        </div>
      </section>

      {/* Section 2: The Impressive Climb */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">The Comparison</h2>
            <p className="text-xl text-gray-600">NVIDIA vs S&P 500: A side-by-side performance comparison</p>
          </div>
          <Card className="p-6">
            <CardContent>
              <div ref={chartRef} className="w-full border rounded-lg bg-white" />
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>NVIDIA (Normalized)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>S&P 500 (Normalized)</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Hover for details • Both normalized to 100 at start</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: One of the Few */}
      <section className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">But NVIDIA was one of the few</h2>
            <p className="text-xl text-gray-600">Distribution of S&P 500 stock returns shows most underperform</p>
          </div>
          <Card className="p-6">
            <CardContent>
              <div ref={histogramRef} className="w-full border rounded-lg bg-white" />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {returnsData && comparisonData
                      ? `${(
                          (returnsData.counts
                            .map((c, i) => (returnsData.bins[i] < returnsData.mean ? c : 0))
                            .reduce((a, b) => a + b, 0) /
                          returnsData.counts.reduce((a, b) => a + b, 0)) *
                          100
                        ).toFixed(0)}%`
                      : "--"}
                </div>
                <div className="text-sm text-gray-600">Underperformed Market</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {returnsData ? `${(returnsData.mean * 100).toFixed(1)}%` : "--"}
                  </div>
                  <div className="text-sm text-gray-600">Market Average Return</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {returnsData && comparisonData
                      ? `${(
                          (returnsData.counts
                            .map((c, i) => (returnsData.bins[i] >= returnsData.mean ? c : 0))
                            .reduce((a, b) => a + b, 0) /
                          returnsData.counts.reduce((a, b) => a + b, 0)) *
                          100
                        ).toFixed(0)}%`
                      : "--"}
                  </div>
                  <div className="text-sm text-gray-600">Outperformed Market</div>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">Hover over bars for detailed information</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 4: Build Your Strategy */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Build Your Strategy</h2>
            <p className="text-xl text-gray-600">Try picking your own stocks and see how you'd perform</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
              <CardContent>
                <h3 className="text-xl font-semibold mb-4">Stock Picker</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search stocks (e.g., AAPL, TSLA, MSFT)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && searchTerm) {
                          addStock(searchTerm.toUpperCase())
                          setSearchTerm("")
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedStocks.map((stock) => (
                      <Badge
                        key={stock}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeStock(stock)}
                      >
                        {stock} ×
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META"].map((stock) => (
                      <Button
                        key={stock}
                        variant="outline"
                        size="sm"
                        onClick={() => addStock(stock)}
                        disabled={selectedStocks.includes(stock)}
                      >
                        {stock}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent>
                <h3 className="text-xl font-semibold mb-4">Your Results</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Your Portfolio</span>
                    <span className="font-bold text-green-600">+14.2%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>S&P 500 Index</span>
                    <span className="font-bold text-blue-600">+10.1%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Difference</span>
                    <span className="font-bold text-gray-900">+4.1%</span>
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Reality Check</h4>
                    <p className="text-sm text-yellow-700">
                      While your picks look good, remember that past performance doesn't guarantee future results. Most
                      professional fund managers fail to beat the market consistently.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: The Lesson */}
      <section className="min-h-screen flex items-center justify-center px-4 bg-gray-900 text-white">
        <div className="max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">The Lesson</h2>
          <p className="text-xl mb-8 text-gray-300">
            While individual stocks can deliver spectacular returns, the majority underperform the market. Index
            investing offers consistent, diversified growth without the need to pick winners.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="p-6 bg-gray-800 rounded-lg">
              <TrendingUp className="w-12 h-12 text-green-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Index Investing</h3>
              <p className="text-gray-300">Consistent returns, low fees, automatic diversification</p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg">
              <TrendingDown className="w-12 h-12 text-red-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Stock Picking</h3>
              <p className="text-gray-300">High risk, requires expertise, most fail to beat the market</p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-lg text-gray-400">
              This is not investment advice. Always consult with a financial advisor.
            </p>
          </div>
        </div>
      </section>

      {/* Footer with dataset reference */}
      <footer className="border-t mt-8 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <span>Data source: </span>
            <a
              href="https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 ml-1 text-primary hover:underline"
            >
              S&P 500 Stocks Dataset
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
