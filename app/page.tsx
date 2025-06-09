"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Search, ExternalLink, ChevronDown } from "lucide-react"
import * as d3 from "d3"
import Link from "next/link"

interface StockData {
  date: string
  price: number
  normalizedPrice: number
}

interface StockDataWithDate extends Omit<StockData, 'date'> {
  date: Date
}

interface ComparisonData {
  stocks: {
    [symbol: string]: {
      name: string
      sector: string
      industry: string
      data: StockData[]
      metrics: {
        totalReturn: number
        annualizedReturn: number
        volatility: number
        years: number
        marketCap: number
      }
    }
  }
  sp500: {
    name: string
    data: StockData[]
    metrics: {
      totalReturn: number
      annualizedReturn: number
      volatility: number
      years: number
    }
  }
}

interface NvidiaComparisonData {
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

interface PortfolioStock {
  symbol: string
  investment: number
}

export default function OutperformingIndex() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [nvidiaComparisonData, setNvidiaComparisonData] = useState<NvidiaComparisonData | null>(null)
  const [returnsData, setReturnsData] = useState<ReturnsDistribution | null>(null)
  const [portfolioStocks, setPortfolioStocks] = useState<PortfolioStock[]>([])
  const [portfolioReturn, setPortfolioReturn] = useState<number>(0)
  const [sp500Return, setSp500Return] = useState<number>(0)
  const [isCalculated, setIsCalculated] = useState<boolean>(false)
  const [showScrollArrow, setShowScrollArrow] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [showQuizResults, setShowQuizResults] = useState<boolean>(false)
  const [selectedCharts, setSelectedCharts] = useState<number[]>([])
  const [showChartResults, setShowChartResults] = useState<boolean>(false)

  const chartRef = useRef<HTMLDivElement>(null)
  const histogramRef = useRef<HTMLDivElement>(null)
  const portfolioChartRef = useRef<HTMLDivElement>(null)
  const lossAversionRef = useRef<HTMLDivElement>(null)
  const hindsightChartRef = useRef<HTMLDivElement>(null)
  const treemapRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        console.log('Attempting to load data...');
        const basePath = process.env.NODE_ENV === 'production' ? '.' : '';
        const [comparisonResponse, nvidiaResponse, returnsResponse] = await Promise.all([
          fetch(`${basePath}/data/comparison_data.json`),
          fetch(`${basePath}/data/nvidia_comparison.json`),
          fetch(`${basePath}/data/returns_distribution.json`)
        ]);
        
        if (!comparisonResponse.ok) {
          throw new Error(`Failed to load comparison data: ${comparisonResponse.status}`);
        }
        if (!nvidiaResponse.ok) {
          throw new Error(`Failed to load NVIDIA comparison data: ${nvidiaResponse.status}`);
        }
        if (!returnsResponse.ok) {
          throw new Error(`Failed to load returns data: ${returnsResponse.status}`);
        }
        
        const comparison = await comparisonResponse.json();
        const nvidiaComparison = await nvidiaResponse.json();
        const returns = await returnsResponse.json();
        
        console.log('Data loaded successfully:', {
          comparisonDataSize: Object.keys(comparison.stocks).length,
          nvidiaComparisonDataSize: nvidiaComparison.target_stock.data.length,
          returnsDataSize: returns.bins.length
        });
        
        setComparisonData(comparison);
        setNvidiaComparisonData(nvidiaComparison);
        setReturnsData(returns);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData();
  }, []);

  // Calculate portfolio returns
  const calculatePortfolioReturns = () => {
    if (!comparisonData) return

    let totalInvestment = 0
    let weightedReturn = 0

    portfolioStocks.forEach(stock => {
      const stockInfo = comparisonData.stocks[stock.symbol]
      if (!stockInfo) {
        console.warn(`No data found for stock ${stock.symbol}`)
        return
      }

      const stockReturn = stockInfo.metrics.totalReturn
      console.log(`Using pre-calculated return for ${stock.symbol}:`, {
        totalReturn: stockReturn,
        annualizedReturn: stockInfo.metrics.annualizedReturn,
        investment: stock.investment
      })

      totalInvestment += stock.investment
      weightedReturn += stockReturn * stock.investment
    })

    // Calculate S&P 500 return using pre-calculated metrics
    if (comparisonData.sp500.metrics) {
      const sp500Return = comparisonData.sp500.metrics.totalReturn * 100
      setSp500Return(sp500Return)
      console.log('Using pre-calculated S&P 500 return:', {
        totalReturn: sp500Return,
        annualizedReturn: comparisonData.sp500.metrics.annualizedReturn
      })
    } else {
      console.warn('Missing S&P 500 metrics')
    }

    if (totalInvestment > 0) {
      const portfolioReturnPercentage = (weightedReturn / totalInvestment) * 100
      console.log('Portfolio calculation:', {
        totalInvestment,
        weightedReturn,
        portfolioReturnPercentage
      })
      setPortfolioReturn(portfolioReturnPercentage)
    }

    setIsCalculated(true)
  }

  // Remove the automatic calculation on portfolio changes
  useEffect(() => {
    setIsCalculated(false)
  }, [portfolioStocks])

  // Show scroll arrow only when at the very top of the page
  useEffect(() => {
    const handleScroll = () => {
      // Show arrow only when at the very top (within 10px to account for small variations)
      setShowScrollArrow(window.scrollY < 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const updateInvestment = (symbol: string, investment: number) => {
    setPortfolioStocks(prev => {
      const existing = prev.find(s => s.symbol === symbol)
      if (existing) {
        return prev.map(s => s.symbol === symbol ? { ...s, investment } : s)
      }
      return [...prev, { symbol, investment }]
    })
  }

  // Key events data
  const keyEvents = [
    { date: "2014-09-01", event: "NVIDIA launches Maxwell GPU architecture (GTX 970/980)", impact: "NVIDIA", description: "Major efficiency gains" },
    { date: "2015-08-24", event: "China Black Monday", impact: "S&P 500", description: "China crash causes global selloff; S&P 500 enters correction" },
    { date: "2016-01-15", event: "Market turmoil over oil and China growth fears", impact: "S&P 500", description: "Global oil price collapse led to market volatility" },
    { date: "2016-05-15", event: "NVIDIA announces Pascal GPUs + blowout earnings", impact: "NVIDIA", description: "Stock surges on major GPU advancement" },
    { date: "2016-06-24", event: "Brexit shock", impact: "S&P 500", description: "S&P 500 drops ~3.6%, then rebounds" },
    { date: "2016-11-08", event: "Trump election win", impact: "S&P 500", description: "Triggers post-election rally" },
    { date: "2017-05-10", event: "NVIDIA unveils Volta for AI", impact: "NVIDIA", description: "Massive AI performance gain (Tesla V100)" },
    { date: "2017-12-22", event: "U.S. tax cuts enacted", impact: "S&P 500", description: "Boosts corporate earnings and market optimism" },
    { date: "2018-02-05", event: "Volmageddon", impact: "S&P 500", description: "Inflation spike triggers correction in tech-heavy indices" },
    { date: "2018-08-20", event: "NVIDIA unveils Turing architecture", impact: "NVIDIA", description: "Real-time ray tracing (RTX 2080)" },
    { date: "2018-11-15", event: "NVIDIA crypto-mining crash", impact: "NVIDIA", description: "Reports excess inventory – stock drops ~28% in 2 days" },
    { date: "2018-12-24", event: "Fed rate hikes and trade war fears", impact: "S&P 500", description: "Near-bear market (~20% S&P decline)" },
    { date: "2019-03-11", event: "NVIDIA announces Mellanox acquisition", impact: "NVIDIA", description: "$6.9B acquisition – expands data center presence" },
    { date: "2019-08-14", event: "Yield curve inverts", impact: "S&P 500", description: "Recession warning causes market pullback" },
    { date: "2019-12-13", event: "U.S.–China Phase One trade deal", impact: "S&P 500", description: "Signed – boosts markets" },
    { date: "2020-03-16", event: "COVID-19 crash", impact: "NVIDIA + S&P 500", description: "S&P 500 falls ~34% in 33 days" },
    { date: "2020-03-23", event: "Fed emergency response", impact: "S&P 500", description: "Slashes rates to zero and launches $700B QE" },
    { date: "2020-09-13", event: "NVIDIA announces ARM acquisition", impact: "NVIDIA", description: "$40B ARM acquisition plan" },
    { date: "2020-11-09", event: "Pfizer vaccine announcement", impact: "S&P 500", description: "Huge rally across cyclical sectors" },
    { date: "2021-07-20", event: "NVIDIA stock split", impact: "NVIDIA", description: "Executes 4-for-1 stock split" },
    { date: "2021-11-10", event: "Inflation surge", impact: "S&P 500", description: "Inflation ~7%; Fed hints at tapering – market hits peak" },
    { date: "2022-01-05", event: "Fed hawkish pivot", impact: "S&P 500", description: "Fed minutes reveal hawkish stance – S&P drops ~2%" },
    { date: "2022-02-07", event: "NVIDIA ARM deal terminated", impact: "NVIDIA", description: "Terminated due to regulatory pressure" },
    { date: "2022-02-24", event: "Russia invades Ukraine", impact: "NVIDIA + S&P 500", description: "Broad global selloff, energy prices spike" },
    { date: "2022-08-31", event: "U.S. bans NVIDIA chip exports to China", impact: "NVIDIA", description: "Bans top AI chips – shares fall ~6–7%" },
    { date: "2022-09-15", event: "Ethereum Merge", impact: "NVIDIA", description: "Kills GPU mining demand" },
    { date: "2023-03-10", event: "SVB collapse", impact: "S&P 500", description: "Banking mini-crisis – brief S&P dip" },
    { date: "2023-05-25", event: "NVIDIA shatters earnings forecasts", impact: "NVIDIA + S&P 500", description: "AI demand drives stock up +24% in one day" },
    { date: "2023-06-08", event: "S&P 500 enters bull market", impact: "S&P 500", description: "20% off Oct 2022 lows" }
  ]

  const drawComparisonChart = () => {
    if (!chartRef.current || !nvidiaComparisonData) return

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
    const targetData: StockDataWithDate[] = nvidiaComparisonData.target_stock.data
      .filter(d => d.normalizedPrice !== null)
      .map(d => ({
        ...d,
        date: parseDate(d.date) as Date
      }))
    const sp500Data: StockDataWithDate[] = nvidiaComparisonData.sp500.data
      .filter(d => d.normalizedPrice !== null)
      .map(d => ({
        ...d,
        date: parseDate(d.date) as Date
      }))

    // Combine data for scales
    const allData = [...targetData, ...sp500Data]
    const allPrices = allData.map(d => d.normalizedPrice)

    // Store original domain for reset functionality
    const originalXDomain = d3.extent(targetData, d => d.date) as [Date, Date]

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(originalXDomain)
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

    // Add clipPath for brushing
    const clip = svg.append("defs").append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0)

    // Add grid lines
    const xAxis = g.append("g")
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

    const yAxis = g.append("g")
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
    const xAxisMain = g.append("g")
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
    const yAxisMain = g.append("g").call(d3.axisLeft(yScale)).style("font-size", "12px")

    // Add X axis label
    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + 45})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Date")

    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Price ($)")

    // Create the line group with clipping
    const lineGroup = g.append('g')
      .attr("clip-path", "url(#clip)")
    
    // Create a separate group for event markers (above brush overlay)
    const markerGroup = g.append('g')
      .attr("clip-path", "url(#clip)")

    // Add target stock line
    const targetLine = lineGroup.append("path")
      .datum(targetData)
      .attr("class", "target-line")
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Add S&P 500 line
    const sp500Line = lineGroup.append("path")
      .datum(sp500Data)
      .attr("class", "sp500-line")
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Get final data points for labels
    const targetFinal = targetData[targetData.length - 1]
    const sp500Final = sp500Data[sp500Data.length - 1]

    // Add value labels to the right
    const targetLabel = g.append("text")
      .attr("class", "target-label")
      .attr("x", xScale(targetFinal.date) + 10)
      .attr("y", yScale(targetFinal.normalizedPrice))
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#10b981")
      .text(`${targetFinal.normalizedPrice.toFixed(0)}`)

    const sp500Label = g.append("text")
      .attr("class", "sp500-label")
      .attr("x", xScale(sp500Final.date) + 10)
      .attr("y", yScale(sp500Final.normalizedPrice))
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#3b82f6")
      .text(`${sp500Final.normalizedPrice.toFixed(0)}`)

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

    legend.append("text").attr("x", 25).attr("y", 0).attr("dy", "0.35em").style("font-size", "12px").text(nvidiaComparisonData.target_stock.name)

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 20)
      .attr("y2", 20)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)

    legend.append("text").attr("x", 25).attr("y", 20).attr("dy", "0.35em").style("font-size", "12px").text("S&P 500")

    // Add event markers
    const parseEventDate = d3.timeParse("%Y-%m-%d")
    const validEvents = keyEvents
      .map(event => ({
        ...event,
        parsedDate: parseEventDate(event.date)
      }))
      .filter(event => {
        if (!event.parsedDate) return false
        const eventDate = event.parsedDate
        const dataStart = targetData[0]?.date
        const dataEnd = targetData[targetData.length - 1]?.date
        return eventDate >= dataStart && eventDate <= dataEnd
      })

    // Add event markers for each line
    validEvents.forEach(event => {
      const eventDate = event.parsedDate!
      
      // Find closest data point for positioning
      const bisect = d3.bisector((d: StockDataWithDate) => d.date).left
      const i = bisect(targetData, eventDate, 1)
      const i0 = Math.max(0, i - 1)
      const i1 = Math.min(targetData.length - 1, i)
      
      const d0 = targetData[i0]
      const d1 = targetData[i1]
      let targetPoint = d0
      if (i0 !== i1) {
        targetPoint = eventDate.getTime() - d0.date.getTime() > d1.date.getTime() - eventDate.getTime() ? d1 : d0
      }
      
      const sp500Point = sp500Data[targetData.indexOf(targetPoint)]
      
      if (targetPoint && sp500Point) {
        // Determine which line(s) to mark based on impact
        const shouldMarkNvidia = event.impact.includes("NVIDIA")
        const shouldMarkSP500 = event.impact.includes("S&P 500")
        
        // Add markers - always place them on their respective lines
        if (shouldMarkNvidia) {
          const marker = markerGroup.append("circle")
            .attr("class", "event-marker nvidia-event")
            .attr("data-event-date", event.date) // Store original date for filtering
            .attr("cx", xScale(targetPoint.date))
            .attr("cy", yScale(targetPoint.normalizedPrice))
            .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5) // Slightly smaller if both
            .style("fill", "#10b981")
            .style("stroke", "white")
            .style("stroke-width", 2)
            .style("opacity", 0.8)
            .style("cursor", "pointer")
        }
        
        if (shouldMarkSP500) {
          const marker = markerGroup.append("circle")
            .attr("class", "event-marker sp500-event")
            .attr("data-event-date", event.date) // Store original date for filtering
            .attr("cx", xScale(sp500Point.date))
            .attr("cy", yScale(sp500Point.normalizedPrice))
            .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5) // Slightly smaller if both
            .style("fill", "#3b82f6")
            .style("stroke", "white")
            .style("stroke-width", 2)
            .style("opacity", 0.8)
            .style("cursor", "pointer")
        }
      }
    })

    // Add event tooltip
    const eventTooltip = d3
      .select("body")
      .append("div")
      .attr("class", "event-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1001")
      .style("max-width", "300px")
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")

    // Add hover events to markers
    markerGroup.selectAll(".event-marker")
      .on("mouseover", function(event, d) {
        // Only show tooltip when not actively brushing
        if (!isBrushing) {
          // Find the event data for this marker
          const marker = d3.select(this)
          const cx = parseFloat(marker.attr("cx"))
          const markerDate = xScale.invert(cx)
          
          // Find closest event
          const closestEvent = validEvents.reduce((closest, current) => {
            const currentDiff = Math.abs(current.parsedDate!.getTime() - markerDate.getTime())
            const closestDiff = Math.abs(closest.parsedDate!.getTime() - markerDate.getTime())
            return currentDiff < closestDiff ? current : closest
          })
          
          marker.style("opacity", 1).attr("r", parseFloat(marker.attr("r")) + 2)
          
          eventTooltip
            .style("visibility", "visible")
            .html(`
              <div style="font-weight: bold; margin-bottom: 8px; color: #f59e0b;">${d3.timeFormat("%B %d, %Y")(closestEvent.parsedDate!)}</div>
              <div style="font-weight: bold; margin-bottom: 6px;">${closestEvent.event}</div>
              <div style="margin-bottom: 6px; color: #d1d5db;">${closestEvent.description}</div>
              <div style="font-size: 11px; color: #9ca3af;">Impact: ${closestEvent.impact}</div>
            `)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 10 + "px")
        }
      })
      .on("mouseout", function() {
        const marker = d3.select(this)
        const isNvidia = marker.classed("nvidia-event")
        const isSP500 = marker.classed("sp500-event")
        
        // Get the original radius by checking the event data
        const eventDate = marker.attr("data-event-date")
        const eventData = validEvents.find(e => e.date === eventDate)
        const shouldBeBoth = eventData ? eventData.impact.includes("NVIDIA") && eventData.impact.includes("S&P 500") : false
        
        marker
          .style("opacity", 0.8)
          .attr("r", shouldBeBoth ? 4 : 5)
        
        eventTooltip.style("visibility", "hidden")
      })

        // Add brushing functionality
    let idleTimeout: NodeJS.Timeout | null = null
    let isBrushing = false
    const idled = () => { idleTimeout = null }

    const updateChart = (event: any) => {
      const extent = event.selection

      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      if (!extent) {
        if (!idleTimeout) {
          idleTimeout = setTimeout(idled, 350)
          return
        }
        xScale.domain(originalXDomain)
        isBrushing = false
      } else {
        xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
        // Remove brush selection
        const brushGroup = lineGroup.select(".brush") as d3.Selection<SVGGElement, unknown, any, any>
        brushGroup.call(brush.move, null)
        isBrushing = false
      }

      // Filter data based on current x-axis domain for y-axis scaling
      const currentDomain = xScale.domain()
      const visibleTargetData = targetData.filter(d => d.date >= currentDomain[0] && d.date <= currentDomain[1])
      const visibleSp500Data = sp500Data.filter(d => d.date >= currentDomain[0] && d.date <= currentDomain[1])
      const visiblePrices = [...visibleTargetData, ...visibleSp500Data].map(d => d.normalizedPrice)

      // Update y-axis domain based on visible data
      if (visiblePrices.length > 0) {
        yScale.domain(d3.extent(visiblePrices) as [number, number]).nice()
      }

      // Determine appropriate date format based on time span
      const timeSpan = currentDomain[1].getTime() - currentDomain[0].getTime()
      const dayInMs = 24 * 60 * 60 * 1000
      const monthInMs = dayInMs * 30
      const yearInMs = dayInMs * 365

      let dateFormatter: (d: Date) => string
      if (timeSpan > 2 * yearInMs) {
        dateFormatter = d3.timeFormat("%Y")
      } else if (timeSpan > 6 * monthInMs) {
        dateFormatter = d3.timeFormat("%b %Y")
      } else if (timeSpan > monthInMs) {
        dateFormatter = d3.timeFormat("%b %d")
      } else {
        dateFormatter = d3.timeFormat("%m/%d")
      }

      // Update axis and line positions with smooth transition
      xAxisMain.transition().duration(1000).call(
        d3.axisBottom(xScale).tickFormat((d: Date | d3.NumberValue) => {
          if (d instanceof Date) {
            return dateFormatter(d)
          }
          return ""
        })
      )

      // Update y-axis
      yAxisMain.transition().duration(1000).call(d3.axisLeft(yScale))

      // Update grid
      xAxis.transition().duration(1000).call(
        d3.axisBottom(xScale).tickSize(-height).tickFormat(() => "")
      )

      yAxis.transition().duration(1000).call(
        d3.axisLeft(yScale).tickSize(-width).tickFormat(() => "")
      )

      // Update lines
      targetLine
        .transition()
        .duration(1000)
        .attr("d", line)

      sp500Line
        .transition()
        .duration(1000)
        .attr("d", line)

      // Update labels - only show if they're within the current domain
      const targetInView = targetFinal.date >= currentDomain[0] && targetFinal.date <= currentDomain[1]
      const sp500InView = sp500Final.date >= currentDomain[0] && sp500Final.date <= currentDomain[1]

      targetLabel
        .transition()
        .duration(1000)
        .attr("x", xScale(targetFinal.date) + 10)
        .attr("y", yScale(targetFinal.normalizedPrice))
        .style("opacity", targetInView ? 1 : 0)

      sp500Label
        .transition()
        .duration(1000)
        .attr("x", xScale(sp500Final.date) + 10)
        .attr("y", yScale(sp500Final.normalizedPrice))
        .style("opacity", sp500InView ? 1 : 0)

      // Update event markers with smooth animation
      validEvents.forEach(event => {
        const eventDate = event.parsedDate!
        const eventInView = eventDate >= currentDomain[0] && eventDate <= currentDomain[1]
        
        // Find closest data point for positioning
        const bisect = d3.bisector((d: StockDataWithDate) => d.date).left
        const i = bisect(targetData, eventDate, 1)
        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(targetData.length - 1, i)
        
        const d0 = targetData[i0]
        const d1 = targetData[i1]
        let targetPoint = d0
        if (i0 !== i1) {
          targetPoint = eventDate.getTime() - d0.date.getTime() > d1.date.getTime() - eventDate.getTime() ? d1 : d0
        }
        
        const sp500Point = sp500Data[targetData.indexOf(targetPoint)]
        
        if (targetPoint && sp500Point) {
          const shouldMarkNvidia = event.impact.includes("NVIDIA")
          const shouldMarkSP500 = event.impact.includes("S&P 500")
          
          // Update NVIDIA markers for this specific event
          if (shouldMarkNvidia) {
            markerGroup.selectAll(`.nvidia-event`)
              .filter(function() {
                return d3.select(this).attr("data-event-date") === event.date
              })
              .transition()
              .duration(1000)
              .ease(d3.easeQuadInOut)
              .attr("cx", xScale(targetPoint.date))
              .attr("cy", yScale(targetPoint.normalizedPrice))
              .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5)
              .style("opacity", eventInView ? 0.8 : 0)
          }
          
          // Update S&P 500 markers for this specific event  
          if (shouldMarkSP500) {
            markerGroup.selectAll(`.sp500-event`)
              .filter(function() {
                return d3.select(this).attr("data-event-date") === event.date
              })
              .transition()
              .duration(1000)
              .ease(d3.easeQuadInOut)
              .attr("cx", xScale(sp500Point.date))
              .attr("cy", yScale(sp500Point.normalizedPrice))
              .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5)
              .style("opacity", eventInView ? 0.8 : 0)
          }
        } else {
          // If we can't find proper data points, just hide the markers
          markerGroup.selectAll(`.event-marker`)
            .filter(function() {
              return d3.select(this).attr("data-event-date") === event.date
            })
            .transition()
            .duration(1000)
            .ease(d3.easeQuadInOut)
            .style("opacity", 0)
        }
      })
    }

    const brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on("start", () => { isBrushing = true })
      .on("end", updateChart)

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

    // Add the brush with integrated tooltip functionality
    const brushGroup = lineGroup
      .append("g")
      .attr("class", "brush")
      .call(brush)

    // Add tooltip functionality to the brush overlay
    brushGroup.select(".overlay")
      .on("mousemove", (event: MouseEvent) => {
        // Only show tooltip when not actively brushing
        if (!isBrushing) {
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
                <div>${nvidiaComparisonData.target_stock.name}: ${targetPoint.normalizedPrice.toFixed(1)}</div>
                <div>S&P 500: ${sp500Point.normalizedPrice.toFixed(1)}</div>
              `)
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 10 + "px")
          }
        }
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden")
      })

    // Add double-click to reset
    svg.on("dblclick", () => {
      xScale.domain(originalXDomain)
      // Reset y-axis to original domain
      yScale.domain(d3.extent(allPrices) as [number, number]).nice()
      
      xAxisMain.transition().call(
        d3.axisBottom(xScale).tickFormat((d: Date | d3.NumberValue) => {
          if (d instanceof Date) {
            return d3.timeFormat("%Y")(d)
          }
          return ""
        })
      )

      // Reset y-axis
      yAxisMain.transition().call(d3.axisLeft(yScale))

      // Reset grids
      xAxis.transition().call(
        d3.axisBottom(xScale).tickSize(-height).tickFormat(() => "")
      )

      yAxis.transition().call(
        d3.axisLeft(yScale).tickSize(-width).tickFormat(() => "")
      )

      targetLine
        .transition()
        .attr("d", line)

      sp500Line
        .transition()
        .attr("d", line)

      targetLabel
        .transition()
        .attr("x", xScale(targetFinal.date) + 10)
        .attr("y", yScale(targetFinal.normalizedPrice))
        .style("opacity", 1)

      sp500Label
        .transition()
        .attr("x", xScale(sp500Final.date) + 10)
        .attr("y", yScale(sp500Final.normalizedPrice))
        .style("opacity", 1)

      // Reset event markers with smooth animation
      validEvents.forEach(event => {
        const eventDate = event.parsedDate!
        
        // Find closest data point for positioning
        const bisect = d3.bisector((d: StockDataWithDate) => d.date).left
        const i = bisect(targetData, eventDate, 1)
        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(targetData.length - 1, i)
        
        const d0 = targetData[i0]
        const d1 = targetData[i1]
        let targetPoint = d0
        if (i0 !== i1) {
          targetPoint = eventDate.getTime() - d0.date.getTime() > d1.date.getTime() - eventDate.getTime() ? d1 : d0
        }
        
        const sp500Point = sp500Data[targetData.indexOf(targetPoint)]
        
        if (targetPoint && sp500Point) {
          const shouldMarkNvidia = event.impact.includes("NVIDIA")
          const shouldMarkSP500 = event.impact.includes("S&P 500")
          
          // Reset NVIDIA markers with smooth animation
          if (shouldMarkNvidia) {
            markerGroup.selectAll(`.nvidia-event`)
              .filter(function() {
                return d3.select(this).attr("data-event-date") === event.date
              })
              .transition()
              .duration(750)
              .ease(d3.easeQuadInOut)
              .attr("cx", xScale(targetPoint.date))
              .attr("cy", yScale(targetPoint.normalizedPrice))
              .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5)
              .style("opacity", 0.8)
          }
          
          // Reset S&P 500 markers with smooth animation
          if (shouldMarkSP500) {
            markerGroup.selectAll(`.sp500-event`)
              .filter(function() {
                return d3.select(this).attr("data-event-date") === event.date
              })
              .transition()
              .duration(750)
              .ease(d3.easeQuadInOut)
              .attr("cx", xScale(sp500Point.date))
              .attr("cy", yScale(sp500Point.normalizedPrice))
              .attr("r", shouldMarkNvidia && shouldMarkSP500 ? 4 : 5)
              .style("opacity", 0.8)
          }
        }
      })
    })
  }

  const drawHistogram = (comparisonData: NvidiaComparisonData | null) => {
    if (!histogramRef.current || !returnsData || !nvidiaComparisonData) return

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
    const startDate = parseDate(nvidiaComparisonData.target_stock.data[0].date) as Date;
    const endDate = parseDate(nvidiaComparisonData.target_stock.data.at(-1)!.date) as Date;
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const start = nvidiaComparisonData.target_stock.data[0].normalizedPrice ?? 100;
    const end = nvidiaComparisonData.target_stock.data.at(-1)?.normalizedPrice ?? 100;
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
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0.8);

    //Add NVIDIA Label with background for better visibility
    g.append("rect")
      .attr("x", xScale(annualizedReturn) - 60)
      .attr("y", -25)
      .attr("width", 120)
      .attr("height", 20)
      .attr("fill", "white")
      .attr("opacity", 0.9);

          g.append("text")
        .attr("x", xScale(annualizedReturn))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#f59e0b")
        .text(`NVIDIA (${(annualizedReturn * 100).toFixed(1)}%)`);

  }

  const drawTreemap = () => {
    if (!treemapRef.current || !comparisonData) return

    // Clear previous chart
    d3.select(treemapRef.current).selectAll("*").remove()

    const margin = { top: 40, right: 10, bottom: 10, left: 10 }
    const width = treemapRef.current.offsetWidth - margin.left - margin.right
    const height = 600 - margin.top - margin.bottom

    // Get S&P 500 annualized return for comparison
    const sp500AnnualizedReturn = comparisonData.sp500.metrics.annualizedReturn * 100 // Convert to percentage

    // Process all stocks from comparison data
    const processedStocks = Object.entries(comparisonData.stocks)
      .map(([symbol, stockData]) => {
        // Use annualized returns instead of total returns
        const annualizedReturn = stockData.metrics.annualizedReturn * 100 // Convert to percentage
        const volatility = stockData.metrics.volatility * 100 // Convert to percentage
        const marketCap = stockData.metrics.marketCap || 1e9 // Default to 1B if missing

        return {
          name: symbol,
          sector: stockData.sector,
          industry: stockData.industry,
          return: annualizedReturn,
          volatility: volatility,
          marketCap: marketCap,
          size: Math.log(marketCap) // Use log scale for market cap to prevent extreme differences
        }
      })
      .sort((a, b) => b.marketCap - a.marketCap) // Sort by market cap for better visual hierarchy

    // Group stocks by sector and industry for hierarchical visualization
    const stocksBySectorAndIndustry = processedStocks.reduce((acc, stock) => {
      if (!acc[stock.sector]) {
        acc[stock.sector] = {}
      }
      if (!acc[stock.sector][stock.industry]) {
        acc[stock.sector][stock.industry] = []
      }
      acc[stock.sector][stock.industry].push(stock)
      return acc
    }, {} as Record<string, Record<string, Array<typeof processedStocks[0]>>>)

    // Create hierarchical data structure
    const hierarchicalData = {
      name: "S&P 500",
      children: Object.entries(stocksBySectorAndIndustry).map(([sectorName, industries]) => ({
        name: sectorName,
        children: Object.entries(industries).map(([industryName, stocks]) => ({
          name: industryName,
          children: stocks
        }))
      }))
    }

    // Create treemap with hierarchical padding
    const treemap = d3.treemap()
      .size([width, height])
      .paddingInner(2)    // Padding between groups
      .paddingOuter(6)    // Padding around the edge
      .paddingTop(25)     // Extra padding for labels (sectors and industries)
      .round(true)

    const root = d3.hierarchy(hierarchicalData)
      .sum((d: any) => d.size || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    treemap(root as any)

    // Color scale for returns relative to S&P 500
    const allReturns = processedStocks.map(d => d.return - sp500AnnualizedReturn) // Relative to S&P 500
    const maxDifference = d3.max(allReturns.map(r => Math.abs(r))) || 10
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([-maxDifference, maxDifference])

    // Create container
    const container = d3.select(treemapRef.current)
      .append("div")
      .style("position", "relative")
      .style("width", (width + margin.left + margin.right) + "px")
      .style("height", (height + margin.top + margin.bottom) + "px")
      .style("margin-left", margin.left + "px")
      .style("margin-top", margin.top + "px")

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "treemap-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1001")
      .style("max-width", "300px")
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")

    // Add sector group backgrounds
    container.selectAll(".sector")
      .data(root.children || [])
      .enter().append("div")
      .attr("class", "sector")
      .style("position", "absolute")
      .style("left", (d: any) => d.x0 + "px")
      .style("top", (d: any) => d.y0 + "px")
      .style("width", (d: any) => Math.max(0, d.x1 - d.x0) + "px")
      .style("height", (d: any) => Math.max(0, d.y1 - d.y0) + "px")
      .style("border", "2px solid #333")
      .style("border-radius", "4px")
      .style("background", "rgba(0,0,0,0.05)")
      .style("box-sizing", "border-box")

    // Add sector labels
    container.selectAll(".sector-label")
      .data(root.children || [])
      .enter().append("div")
      .attr("class", "sector-label")
      .style("position", "absolute")
      .style("left", (d: any) => d.x0 + 4 + "px")
      .style("top", (d: any) => d.y0 + 2 + "px")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("color", "#333")
      .style("pointer-events", "none")
      .style("z-index", "2")
      .text((d: any) => d.data.name)

    // Add industry group backgrounds
    const industryNodes = root.children ? root.children.flatMap(sector => sector.children || []) : []
    container.selectAll(".industry")
      .data(industryNodes)
      .enter().append("div")
      .attr("class", "industry")
      .style("position", "absolute")
      .style("left", (d: any) => d.x0 + "px")
      .style("top", (d: any) => d.y0 + "px")
      .style("width", (d: any) => Math.max(0, d.x1 - d.x0) + "px")
      .style("height", (d: any) => Math.max(0, d.y1 - d.y0) + "px")
      .style("border", "1px solid #666")
      .style("border-radius", "2px")
      .style("background", "rgba(0,0,0,0.02)")
      .style("box-sizing", "border-box")

    // Add industry labels
    container.selectAll(".industry-label")
      .data(industryNodes)
      .enter().append("div")
      .attr("class", "industry-label")
      .style("position", "absolute")
      .style("left", (d: any) => d.x0 + 2 + "px")
      .style("top", (d: any) => d.y0 + 1 + "px")
      .style("font-size", "9px")
      .style("font-weight", "600")
      .style("color", "#666")
      .style("pointer-events", "none")
      .style("z-index", "1")
      .style("max-width", (d: any) => Math.max(0, d.x1 - d.x0 - 4) + "px")
      .style("overflow", "hidden")
      .style("white-space", "nowrap")
      .style("text-overflow", "ellipsis")
      .text((d: any) => {
        const width = d.x1 - d.x0
        // Only show industry label if there's enough space
        if (width > 80) {
          return d.data.name
        }
        return ""
      })

    // Add leaf nodes (individual stocks)
    container.selectAll(".leaf")
      .data(root.leaves())
      .enter().append("div")
      .attr("class", "leaf")
      .style("position", "absolute")
      .style("left", (d: any) => d.x0 + "px")
      .style("top", (d: any) => d.y0 + "px")
      .style("width", (d: any) => Math.max(0, d.x1 - d.x0) + "px")
      .style("height", (d: any) => Math.max(0, d.y1 - d.y0) + "px")
      .style("background", (d: any) => colorScale((d.data.return || 0) - sp500AnnualizedReturn))
      .style("border", "1px solid white")
      .style("box-sizing", "border-box")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("font-size", (d: any) => {
        const area = (d.x1 - d.x0) * (d.y1 - d.y0)
        return Math.min(11, Math.max(6, Math.sqrt(area) / 12)) + "px"
      })
      .style("font-weight", "bold")
      .style("color", (d: any) => {
        const relativeReturn = (d.data.return || 0) - sp500AnnualizedReturn
        return Math.abs(relativeReturn) > 10 ? "white" : "black"
      })
      .style("text-shadow", (d: any) => {
        const relativeReturn = (d.data.return || 0) - sp500AnnualizedReturn
        return Math.abs(relativeReturn) > 10 ? "1px 1px 2px rgba(0,0,0,0.5)" : "none"
      })
      .style("cursor", "pointer")
      .text((d: any) => {
        const area = (d.x1 - d.x0) * (d.y1 - d.y0)
        return area > 400 ? d.data.name : ""
      })
      .on("mouseover", function(event: MouseEvent, d: any) {
        d3.select(this).style("opacity", 0.8)
        
        const stockData = d.data
        
        const formatMarketCap = (cap: number) => {
          if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`
          if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`
          if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`
          return `$${cap.toFixed(0)}`
        }

        const relativeReturn = stockData.return - sp500AnnualizedReturn
        const outperformance = relativeReturn > 0 ? "outperformed" : "underperformed"
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <div style="font-weight: bold; margin-bottom: 8px; color: #f59e0b;">${stockData.name}</div>
            <div style="margin-bottom: 4px;"><strong>Sector:</strong> ${stockData.sector}</div>
            <div style="margin-bottom: 4px;"><strong>Industry:</strong> ${stockData.industry}</div>
            <div style="margin-bottom: 4px;"><strong>Market Cap:</strong> ${formatMarketCap(stockData.marketCap)}</div>
            <div style="margin-bottom: 4px;"><strong>Annualized Return:</strong> ${stockData.return.toFixed(1)}%</div>
            <div style="margin-bottom: 4px;"><strong>S&P 500 Annualized:</strong> ${sp500AnnualizedReturn.toFixed(1)}%</div>
            <div style="margin-bottom: 4px; color: ${relativeReturn > 0 ? '#10b981' : '#ef4444'};"><strong>${outperformance} by:</strong> ${Math.abs(relativeReturn).toFixed(1)}%</div>
            <div style="margin-bottom: 4px;"><strong>Volatility:</strong> ${stockData.volatility.toFixed(1)}%</div>
          `)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 10 + "px")
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1)
        tooltip.style("visibility", "hidden")
      })
  }

  const drawPortfolioChart = () => {
    if (!portfolioChartRef.current || !comparisonData || !isCalculated) return

    // Clear previous chart
    d3.select(portfolioChartRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 80, bottom: 60, left: 80 }
    const width = portfolioChartRef.current.offsetWidth - margin.left - margin.right
    const height = 300 - margin.top - margin.bottom

    const svg = d3
      .select(portfolioChartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Create data points
    const data = [
      { label: "Your Portfolio", value: portfolioReturn },
      { label: "S&P 500", value: sp500Return }
    ]

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.3)

    // Calculate y-axis domain with padding
    const minValue = Math.min(0, d3.min(data, d => d.value) as number)
    const maxValue = Math.max(0, d3.max(data, d => d.value) as number)
    const padding = Math.max(Math.abs(minValue), Math.abs(maxValue)) * 0.2 // Add 20% padding

    const yScale = d3
      .scaleLinear()
      .domain([
        minValue - padding,
        maxValue + padding
      ])
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
      .call(d3.axisBottom(xScale))
      .style("font-size", "12px")

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .style("font-size", "12px")

    // Add zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")

    // Add bars with animation
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.label) as number)
      .attr("width", xScale.bandwidth())
      .attr("y", yScale(0)) // Start from zero line
      .attr("height", 0) // Start with 0 height
      .attr("fill", d => {
        if (d.label === "Your Portfolio") {
          return d.value >= 0 ? "#10b981" : "#ef4444" // Green for positive, red for negative
        }
        return "#3b82f6" // Blue for S&P 500
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8)
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1)
      })
      .transition()
      .duration(2000)
      .ease(d3.easeQuadInOut)
      .attr("y", d => d.value >= 0 ? yScale(d.value) : yScale(0))
      .attr("height", d => Math.abs(yScale(d.value) - yScale(0)))

    // Add value labels with animation
    g.selectAll(".value-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", d => (xScale(d.label) as number) + xScale.bandwidth() / 2)
      .attr("y", yScale(0)) // Start from zero line
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("opacity", 0) // Start invisible
      .text(d => `${d.value.toFixed(2)}%`)
      .transition()
      .duration(2000)
      .ease(d3.easeQuadInOut)
      .attr("y", d => d.value >= 0 ? yScale(d.value) - 10 : yScale(d.value) + 20) // Position label above or below bar
      .style("opacity", 1)
  }

  // Draw charts on mount and resize
  useEffect(() => {
    const drawCharts = () => {
      drawComparisonChart()
      drawHistogram(nvidiaComparisonData)
      drawTreemap()
      drawLossAversionChart()
      drawHindsightCharts()
      if (isCalculated) {
        drawPortfolioChart()
      }
    }

    drawCharts()
    window.addEventListener("resize", drawCharts)
    return () => {
      window.removeEventListener("resize", drawCharts)
      // Clean up tooltips
      d3.selectAll(".d3-tooltip").remove()
      d3.selectAll(".histogram-tooltip").remove() 
      d3.selectAll(".event-tooltip").remove()
      d3.selectAll(".treemap-tooltip").remove()
    }
  }, [nvidiaComparisonData, returnsData, isCalculated, portfolioReturn, sp500Return, comparisonData, selectedCharts, showChartResults])

  const addStock = (stock: string) => {
    if (!selectedStocks.includes(stock) && selectedStocks.length < 5) {
      setSelectedStocks([...selectedStocks, stock])
    }
  }

  const removeStock = (stock: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s !== stock))
  }

  // Quiz questions and answers for overconfidence bias
  interface QuizQuestion {
    question: string;
    options: number[];
    correct: number;
    explanation: string;
    source: string;
  }

  const quizQuestions: QuizQuestion[] = [
    {
      question: "What percentage of actively managed funds beat the S&P 500 over 15 years?",
      options: [10, 25, 50, 75],
      correct: 0, // ~10%
      explanation: "According to S&P Dow Jones Indices SPIVA Scorecard (2023), only about 10% of actively managed U.S. equity funds outperformed the S&P 500 over the 15-year period ending December 2022.",
      source: "S&P Dow Jones Indices SPIVA U.S. Scorecard, 2023"
    },
    {
      question: "What percentage of individual day traders are consistently profitable?",
      options: [13, 25, 40, 60],
      correct: 0, // ~13%
      explanation: "Analysis of day trading performance shows that only 13% of day traders remain consistently profitable over a 6-month period, with the vast majority losing money.",
      source: "Quantified Strategies - Day Trading Statistics (https://www.quantifiedstrategies.com/day-trading-statistics/)"
    },
    {
      question: "By how much do individual investors typically underperform the market annually?",
      options: [1, 3, 6, 10],
      correct: 1, // ~3%
      explanation: "Dalbar's Quantitative Analysis of Investor Behavior (QAIB) consistently shows individual investors underperform market indices by 2-4% annually due to poor market timing and emotional decision-making.",
      source: "Dalbar QAIB Study, 2023 Edition"
    }
  ]

  // Loss Aversion Demo
  const drawLossAversionChart = () => {
    if (!lossAversionRef.current) return

    d3.select(lossAversionRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 80, bottom: 60, left: 80 }
    const width = lossAversionRef.current.offsetWidth - margin.left - margin.right
    const height = 300 - margin.top - margin.bottom

    const svg = d3
      .select(lossAversionRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Generate two portfolios using Brownian motion with same 8% annual return
    const months = 60 // 5 years
    const dt = 1/12 // Monthly time step
    const annualReturn = 0.08
    const monthlyDrift = annualReturn / 12
    const finalValue = 100 * Math.pow(1 + annualReturn, 5) // Target final value
    
    // Seeded random number generator for consistent results
    let seed = 12345
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    
    // Box-Muller transform for normal distribution
    const gaussianRandom = () => {
      const u1 = random()
      const u2 = random()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }
    
    // Generate Brownian motion paths
    const generateBrownianPath = (volatility: number, driftAdjustment: number = 0) => {
      const path = [{ month: 0, value: 100 }]
      let currentValue = 100
      
      for (let i = 1; i < months; i++) {
        // Geometric Brownian Motion: dS/S = μdt + σdW
        const drift = monthlyDrift + driftAdjustment
        const diffusion = volatility * Math.sqrt(dt) * gaussianRandom()
        const monthlyReturn = drift + diffusion
        
        currentValue = currentValue * Math.exp(monthlyReturn)
        path.push({ month: i, value: currentValue })
      }
      
      // Adjust final value to match target (normalize the path)
      const currentFinal = path[path.length - 1].value
      const scaleFactor = finalValue / currentFinal
      
      return path.map((point, index) => {
        if (index === 0) return point
        // Apply logarithmic scaling to maintain path shape
        const progress = index / (months - 1)
        const adjustmentFactor = Math.pow(scaleFactor, progress)
        return {
          month: point.month,
          value: point.value * adjustmentFactor
        }
      })
    }
    
    // Smooth portfolio: Low volatility Brownian motion (5% annual volatility)
    seed = 12345 // Reset seed for consistency
    const smoothData = generateBrownianPath(0.05)
    
    // Volatile portfolio: High volatility Brownian motion (25% annual volatility)
    seed = 54321 // Different seed for different path
    const volatileData = generateBrownianPath(0.20)

    // Scales
    const xScale = d3.scaleLinear().domain([0, months - 1]).range([0, width])
    
    // Calculate dynamic y-axis based on actual data range with some padding
    const allValues = [...smoothData.map(d => d.value), ...volatileData.map(d => d.value)]
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const padding = (maxValue - minValue) * 0.1 // 10% padding
    
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, minValue - padding), maxValue + padding])
      .range([height, 0])

    // Line generator
    const line = d3.line<{month: number, value: number}>()
      .x(d => xScale(d.month))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `Year ${Math.floor((d as number) / 12) + 1}`))

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`))

    // Add lines
    g.append("path")
      .datum(smoothData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line)

    g.append("path")
      .datum(volatileData)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Add legend
    const legend = g.append("g").attr("transform", `translate(${width - 150}, 20)`)
    
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("stroke", "#10b981").attr("stroke-width", 3)
    legend.append("text")
      .attr("x", 25).attr("y", 4)
      .text("Smooth Growth")
      .style("font-size", "12px")

    legend.append("line")
      .attr("x1", 0).attr("x2", 20).attr("y1", 20).attr("y2", 20)
      .attr("stroke", "#ef4444").attr("stroke-width", 3)
    legend.append("text")
      .attr("x", 25).attr("y", 24)
      .text("Volatile Growth")
      .style("font-size", "12px")
  }

  // Hindsight Bias Demo
  const drawHindsightCharts = () => {
    if (!hindsightChartRef.current || !comparisonData) return

    d3.select(hindsightChartRef.current).selectAll("*").remove()

    // Select 5 stocks for the demo
    const stockSymbols = ["AAPL", "TSLA", "INTC", "GE", "AMZN"]
    const stocksWithData = stockSymbols.filter(symbol => 
      comparisonData.stocks[symbol] && comparisonData.stocks[symbol].data.length > 0
    ).slice(0, 5)

    if (stocksWithData.length === 0) return

    const chartsPerRow = 5
    const chartWidth = (hindsightChartRef.current.offsetWidth - 40) / chartsPerRow
    const chartHeight = 150
    const margin = { top: 10, right: 10, bottom: 30, left: 30 }
    const innerWidth = chartWidth - margin.left - margin.right
    const innerHeight = chartHeight - margin.top - margin.bottom

    const container = d3.select(hindsightChartRef.current)
      .append("div")
      .style("display", "flex")
      .style("flex-wrap", "wrap")
      .style("gap", "10px")
      .style("justify-content", "center")

    stocksWithData.forEach((symbol, index) => {
      const stockInfo = comparisonData.stocks[symbol]
      const parseDate = d3.timeParse("%Y-%m-%d")
      
      // Create simple two-point line from start to end
      const processedData = stockInfo.data
        .filter(d => d.normalizedPrice !== null)
        .map(d => ({
          date: parseDate(d.date) as Date,
          price: d.normalizedPrice
        }))

      if (processedData.length < 2) return

      const chartDiv = container
        .append("div")
        .style("border", selectedCharts.includes(index) ? "3px solid #10b981" : "1px solid #ccc")
        .style("border-radius", "8px")
        .style("padding", "5px")
        .style("background", "white")
        .style("cursor", "pointer")
        .on("click", () => {
          if (!showChartResults) {
            setSelectedCharts(prev => 
              prev.includes(index) 
                ? prev.filter(i => i !== index)
                : prev.length < 3 ? [...prev, index] : prev
            )
          }
        })

      const svg = chartDiv
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

      // Scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(processedData, d => d.date) as [Date, Date])
        .range([0, innerWidth])

      const yScale = d3.scaleLinear()
        .domain(d3.extent(processedData, d => d.price) as [number, number])
        .nice()
        .range([innerHeight, 0])

      // Line
      const line = d3.line<{date: Date, price: number}>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX)

      g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2)
        .attr("d", line)

      // Axes
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(3).tickFormat((d: Date | d3.NumberValue) => {
          if (d instanceof Date) {
            return d3.timeFormat("%Y")(d)
          }
          return ""
        }))
        .style("font-size", "10px")

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(3))
        .style("font-size", "10px")

      // Title (show stock name only after results are revealed)
      chartDiv.append("div")
        .style("text-align", "center")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("margin-top", "5px")
        .text(showChartResults ? symbol : `Stock ${String.fromCharCode(65 + index)}`)

      // Performance indicator (only show after results)
      if (showChartResults) {
        const finalPrice = processedData[processedData.length - 1].price
        const totalReturn = stockInfo.metrics.totalReturn * 100
        const performance = totalReturn > 50 ? "Winner" : "Underperformed"
        const color = totalReturn > 50 ? "#10b981" : "#ef4444"
        
        chartDiv.append("div")
          .style("text-align", "center")
          .style("font-size", "10px")
          .style("color", color)
          .style("font-weight", "bold")
          .text(`${performance} (${totalReturn.toFixed(0)}%)`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-0">
        {/* Section 1: Hero Introduction */}
        <section className="relative min-h-screen flex items-center justify-center px-4 pt-0">
          <div className="text-center max-w-4xl">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6">The Illusion of Outperformance: What Looks Like a Win, Rarely Lasts</h1>
            <p className="text-xl text-gray-600 mb-4">
              Explore real S&P 500 data and see why index investing is often the smartest choice.
            </p>
            <p className="text-lg text-gray-500 mb-12 font-medium">
              By Carter Tran, April Huang, and Cheryl Xiang
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  const nextSection = document.querySelector('#comparison-section');
                  nextSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Start Exploring
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                asChild
              >
                <Link href="/about">View Writeup</Link>
              </Button>
            </div>
            
            {/* Bouncing scroll arrow */}
            {showScrollArrow && (
              <div 
                className="fixed bottom-8 left-0 right-0 flex justify-center cursor-pointer animate-bounce"
                onClick={() => {
                  const nextSection = document.querySelector('#comparison-section');
                  nextSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-sm mb-2">Scroll to explore</span>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: The Allure of Stock Picking */}
        <section id="comparison-section" className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">The Allure of Stock Picking</h2>
              <p className="text-xl text-gray-600 mb-8">
                Imagine you had perfect foresight. You invest in NVIDIA in{" "}
                {nvidiaComparisonData ? (
                  <span className="font-semibold">
                    {(() => {
                      const nvidiaStart = new Date(nvidiaComparisonData.target_stock.data[0].date);
                      const sp500Start = new Date(nvidiaComparisonData.sp500.data[0].date);
                      return new Date(Math.max(nvidiaStart.getTime(), sp500Start.getTime())).getFullYear();
                    })()}
                  </span>
                ) : (
                  "--"
                )} and hold through{" "}
                {nvidiaComparisonData ? (
                  <span className="font-semibold">
                    {(() => {
                      const nvidiaEnd = new Date(nvidiaComparisonData.target_stock.data[nvidiaComparisonData.target_stock.data.length - 1].date);
                      const sp500End = new Date(nvidiaComparisonData.sp500.data[nvidiaComparisonData.sp500.data.length - 1].date);
                      return new Date(Math.min(nvidiaEnd.getTime(), sp500End.getTime())).getFullYear();
                    })()}
                  </span>
                ) : (
                  "--"
                )} — your money grows by more than{" "}
                {nvidiaComparisonData ? (
                  <span className="font-semibold text-green-600">
                    {((nvidiaComparisonData.target_stock.data[nvidiaComparisonData.target_stock.data.length - 1].normalizedPrice - 100) / 100 * 100).toFixed(0)}%
                  </span>
                ) : (
                  "--"
                )}. 
                It's a dream outcome — and it really happened.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-xl font-semibold text-blue-800">
                  "Wouldn't it be great to pick the next NVIDIA?"
                </p>
              </div>
            </div>
            <Card className="p-6">
              <CardContent>
                {isLoading ? (
                  <div className="w-full h-[400px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <>
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
                      <div className="text-sm text-gray-500">Drag to zoom • Double-click to reset • Hover markers for key events • Both normalized to 100 at start</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

      {/* Section 3: The Harsh Reality */}
      <section className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">📉 The Harsh Reality</h2>
            <p className="text-xl text-gray-600 mb-8">
              But here's the catch: most stocks don't beat the market. In fact, research shows that 66% of S&P 500 stocks underperform the index over time.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-xl font-semibold text-yellow-800">
                "The few big winners carry the whole index."
              </p>
            </div>
          </div>
          <Card className="p-6">
            <CardContent>
              {isLoading ? (
                <div className="w-full h-[400px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                  <div className="text-gray-400">Loading distribution data...</div>
                </div>
              ) : (
                <>
                  <div ref={histogramRef} className="w-full border rounded-lg bg-white" />
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {returnsData && nvidiaComparisonData
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
                        {returnsData && nvidiaComparisonData
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

        {/* Section 4: Try Your Luck */}
        <section className="min-h-screen flex items-center justify-center px-4 pt-32">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">🎯 Try Your Luck</h2>
              <p className="text-xl text-gray-600 mb-8">
                Think you can beat the odds? Pick any stock and see how it would've performed from 2014 to 2024.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-xl font-semibold text-red-800">
                  "Would you bet your retirement on one guess?"
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-4">Stock Picker</h3>
                  <div className="space-y-4">
                    <div className="space-y-4">
                      {selectedStocks.length === 0 ? (
                        <div className="text-center p-4 text-gray-500">
                          Select a stock to begin
                        </div>
                      ) : (
                        selectedStocks.map((stock) => (
                          <div key={stock} className="flex items-center justify-between gap-4">
                            <Badge
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeStock(stock)}
                            >
                              {stock} ×
                            </Badge>
                            <select
                              className="border rounded p-2"
                              value={portfolioStocks.find(s => s.symbol === stock)?.investment || 0}
                              onChange={(e) => updateInvestment(stock, Number(e.target.value))}
                            >
                              <option value="0">Select investment</option>
                              {Array.from({ length: 21 }, (_, i) => i * 100).map((amount) => (
                                <option key={amount} value={amount}>
                                  ${amount}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {["AAPL", "MSFT", "INTC", "AMZN", "TSLA", "MRNA", "PFE"].map((stock) => (
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

                    <Button 
                      className="w-full mt-4" 
                      onClick={calculatePortfolioReturns}
                      disabled={portfolioStocks.length === 0}
                    >
                      Calculate Returns
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-4">Your Results</h3>
                  <div className="space-y-4">
                    {isCalculated ? (
                      <>
                        {isLoading ? (
                          <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                            <div className="text-gray-400">Loading portfolio data...</div>
                          </div>
                        ) : (
                          <>
                            <div ref={portfolioChartRef} className="w-full border rounded-lg bg-white mb-4" />
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <span>Your Portfolio Return</span>
                              <span className="font-bold text-green-600">{portfolioReturn.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                              <span>S&P 500 Return</span>
                              <span className="font-bold text-blue-600">{sp500Return.toFixed(2)}%</span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-lg ${
                              portfolioReturn > sp500Return 
                                ? 'bg-gray-50' 
                                : 'bg-red-100'
                            }`}>
                              <span>Difference</span>
                              <span className={`font-bold ${portfolioReturn > sp500Return ? 'text-green-600' : 'text-red-600'}`}>
                                {(portfolioReturn - sp500Return).toFixed(2)}%
                              </span>
                            </div>

                            <div className={`mt-6 p-4 rounded-lg ${
                              portfolioReturn > sp500Return 
                                ? 'bg-green-50' 
                                : 'bg-yellow-50'
                            }`}>
                              <h4 className={`font-semibold mb-2 ${
                                portfolioReturn > sp500Return 
                                  ? 'text-green-800' 
                                  : 'text-yellow-800'
                              }`}>
                                {portfolioReturn > sp500Return ? 'Nice job!' : 'Reality Check'}
                              </h4>
                              <p className={`text-sm ${
                                portfolioReturn > sp500Return 
                                  ? 'text-green-700' 
                                  : 'text-yellow-700'
                              }`}>
                                {portfolioReturn > sp500Return 
                                  ? "You've outperformed the market this time! But remember, even the best investors can't consistently beat the market. This might be luck rather than skill - most professional fund managers fail to beat the market over the long term."
                                  : "While your picks didn't beat the market this time, that's actually quite normal. Most professional fund managers fail to beat the market consistently. This is why many experts recommend index investing for long-term success."}
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        Select stocks and investment amounts, then click "Calculate Returns" to see your results
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 5: The Bigger Picture */}
        <section className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">🌳 The Bigger Picture</h2>
              <p className="text-xl text-gray-600 mb-8">
                The market is a complex ecosystem — made up of diverse sectors and thousands of companies. 
                Some thrive. Most don't.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-xl font-semibold text-green-800">
                  "Understanding the forest, not just the trees."
                </p>
              </div>
            </div>

            <Card className="p-6">
              <CardContent>
                {isLoading ? (
                  <div className="w-full h-[500px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">Loading market structure...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-2">S&P 500 Market Structure: All Available Stocks by Sector & Industry</h3>
                      <p className="text-gray-600">Rectangle size = market cap (log scale) • Color = annualized return vs. S&P 500 • Hierarchical: Sector → Industry → Stock</p>
                    </div>
                    <div ref={treemapRef} className="w-full border rounded-lg bg-white" />
                    <div className="mt-4 flex justify-center items-center gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-400 rounded"></div>
                        <span className="text-sm">Underperformed S&P 500</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                        <span className="text-sm">Similar to S&P 500</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-400 rounded"></div>
                        <span className="text-sm">Outperformed S&P 500</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Hover over rectangles for detailed information • Data from 2010-2024 (annualized returns compared to S&P 500)
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Key Insight</h3>
                <p className="text-blue-700">
                  Even within the same sector, individual stocks can have wildly different outcomes. 
                  Technology stocks like NVIDIA soared while Intel struggled. This unpredictability 
                  is why diversification through index funds is so powerful — you capture the 
                  winners without having to predict which ones they'll be.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Behavioral Finance */}
        <section className="min-h-screen py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">🧠 Why We Still Try to Beat the Market</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Even with the data staring us in the face, many investors still try to pick the next big winner. Why?
                Behavioral finance reveals the hidden biases that lead us astray.
              </p>
            </div>

            {/* Loss Aversion */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">📉 Loss Aversion</h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  We feel the pain of losses twice as strongly as the joy of gains.
                  This leads to overly conservative behavior after losses — or holding losers too long, hoping they'll rebound.
                </p>
              </div>
              
              <Card className="p-6">
                <CardContent>
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-semibold">Two Portfolios, Same 8% Annual Return</h4>
                    <p className="text-gray-600">Which would you prefer?</p>
                  </div>
                  {isLoading ? (
                    <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Loading chart...</div>
                    </div>
                  ) : (
                    <div ref={lossAversionRef} className="w-full border rounded-lg bg-white" />
                  )}
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      <strong>Reality Check:</strong> Most people say they want growth, but feel losses more deeply in practice.
                      The volatile portfolio's dips would cause many investors to panic and sell at the worst times.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overconfidence Bias */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">🚀 Overconfidence Bias</h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Most investors believe they're above average. But in investing, confidence without accuracy is costly.
                </p>
              </div>
              
              <Card className="p-6">
                <CardContent>
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold">Quick Knowledge Check</h4>
                    <p className="text-gray-600">Test your investing knowledge</p>
                  </div>
                  
                  {!showQuizResults ? (
                    <div className="space-y-6">
                      {quizQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="border rounded-lg p-4">
                          <h5 className="font-semibold mb-3">{q.question}</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((option, oIndex) => (
                              <Button
                                key={oIndex}
                                variant={quizAnswers[qIndex] === oIndex ? "default" : "outline"}
                                onClick={() => {
                                  const newAnswers = [...quizAnswers]
                                  newAnswers[qIndex] = oIndex
                                  setQuizAnswers(newAnswers)
                                }}
                                className="justify-start"
                              >
                                {option}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button 
                        className="w-full" 
                        onClick={() => setShowQuizResults(true)}
                        disabled={quizAnswers.length !== quizQuestions.length}
                      >
                        See Results
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizQuestions.map((q, qIndex) => (
                        <div key={qIndex} className={`border rounded-lg p-4 ${
                          quizAnswers[qIndex] === q.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <h5 className="font-semibold mb-2">{q.question}</h5>
                          <p className={`text-sm ${
                            quizAnswers[qIndex] === q.correct ? 'text-green-700' : 'text-red-700'
                          }`}>
                            Your answer: {q.options[quizAnswers[qIndex]]}% 
                            {quizAnswers[qIndex] === q.correct ? ' ✓ Correct!' : ` ✗ Correct answer: ${q.options[q.correct]}%`}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">{q.explanation}</p>
                          <p className="text-xs text-gray-500 mt-1 italic">Source: {q.source}</p>
                        </div>
                      ))}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <p className="text-blue-800">
                          <strong>Research shows:</strong> Individual investors underperform the market by ~2–4% annually, 
                          mostly due to poor timing and overconfidence.
                          <br/>
                          <span className="text-sm">Sources: Dalbar QAIB Study, SPIVA Scorecard</span>
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hindsight Bias */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">🔮 Hindsight / Lookahead Bias</h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  "Of course NVIDIA went up — AI was the future."
                  That logic only works after the fact.
                </p>
              </div>
              
              <Card className="p-6">
                <CardContent>
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold">Pick the Winners</h4>
                    <p className="text-gray-600">
                      {!showChartResults 
                        ? `Select up to 3 charts that you think performed best (ticker names hidden)`
                        : "Results revealed - see how hindsight makes everything seem obvious"
                      }
                    </p>
                  </div>
                  
                  {isLoading ? (
                    <div className="w-full h-[200px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Loading stock charts...</div>
                    </div>
                  ) : (
                    <>
                      <div ref={hindsightChartRef} className="w-full mb-4" />
                      {!showChartResults ? (
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-4">
                            Selected: {selectedCharts.length}/3 charts
                          </p>
                          <Button 
                            onClick={() => setShowChartResults(true)}
                            disabled={selectedCharts.length === 0}
                          >
                            Reveal Results
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">
                            <strong>The future is never as obvious as it feels in hindsight.</strong>
                            <br/>
                            In 2023, everyone "knew" AI stocks would soar. But in 2018, everyone "knew" 
                            Intel and GE were solid picks. Yesterday's winners often become tomorrow's losers.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recap */}
            <div className="text-center">
              <div className="bg-gray-900 text-white rounded-lg p-8 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-white">🧾 The Takeaway</h3>
                <p className="text-xl mb-6 text-gray-100">
                  "Your brain isn't wired for investing. That's why index funds work."
                </p>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                  asChild
                >
                  <a 
                    href="https://www.investopedia.com/terms/b/behavioralfinance.asp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Explore More Biases
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: The Lesson */}
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
    </div>
  )
}
