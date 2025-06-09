"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Search, ExternalLink, ChevronDown } from "lucide-react"
import * as d3 from "d3"
import Link from "next/link"
import { getDataPath } from "@/lib/config"
import { CountUp } from "countup.js"

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

interface HindsightStocksData {
  [symbol: string]: {
    name: string
    sector: string
    industry: string
    data: StockData[]
    metrics: {
      totalReturn: number
      annualizedReturn: number
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
  investment: number | ""
}

interface PieChartData {
  symbol: string
  investment: number
  originalValue: number | null | undefined
  return: number | null | undefined
}

interface FilteredStock {
  symbol: string
  name: string
  sector: string
  searchText: string
}

export default function OutperformingIndex() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [nvidiaComparisonData, setNvidiaComparisonData] = useState<NvidiaComparisonData | null>(null)
  const [hindsightStocksData, setHindsightStocksData] = useState<HindsightStocksData | null>(null)
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
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("")
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false)
  const [scrollProgress, setScrollProgress] = useState<number>(0)

  const chartRef = useRef<HTMLDivElement>(null)
  const histogramRef = useRef<HTMLDivElement>(null)
  const portfolioChartRef = useRef<HTMLDivElement>(null)
  const lossAversionRef = useRef<HTMLDivElement>(null)
  const hindsightChartRef = useRef<HTMLDivElement>(null)
  const treemapRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const parallaxCandlestickRef = useRef<HTMLDivElement>(null)

  // Refs for animated counting numbers
  const underperformanceRef = useRef<HTMLSpanElement>(null)
  const sp500ReturnRef = useRef<HTMLSpanElement>(null)
  const outperformanceRef = useRef<HTMLSpanElement>(null)
  const portfolioReturnValueRef = useRef<HTMLSpanElement>(null)
  const sp500ReturnValueRef = useRef<HTMLSpanElement>(null)
  const differenceValueRef = useRef<HTMLSpanElement>(null)
  const totalPortfolioValueRef = useRef<HTMLSpanElement>(null)

  // Helper function to get date range from data
  const getDataDateRange = () => {
    if (!comparisonData) return { startYear: null, endYear: null }
    
    let allDates: Date[] = []
    
    // Get dates from all stocks
    Object.values(comparisonData.stocks).forEach(stock => {
      stock.data.forEach(dataPoint => {
        const date = new Date(dataPoint.date)
        if (!isNaN(date.getTime())) {
          allDates.push(date)
        }
      })
    })
    
    // Get dates from S&P 500 data
    comparisonData.sp500.data.forEach(dataPoint => {
      const date = new Date(dataPoint.date)
      if (!isNaN(date.getTime())) {
        allDates.push(date)
      }
    })
    
    if (allDates.length === 0) return { startYear: null, endYear: null }
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    return {
      startYear: minDate.getFullYear(),
      endYear: maxDate.getFullYear()
    }
  }

  // Generate random candlestick data with fat-tailed distribution
  const generateCandlestickData = () => {
    // Reduce candles on low-end devices for better performance
    const numCandles = isLowEndDevice ? 150 : 300
    const data = []
    let currentPrice = 150 + Math.random() * 100 // Start between 150-250
    
    // Seeded random for consistent generation
    let seed = 42
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    
    // Box-Muller transform for normal distribution
    const normalRandom = () => {
      const u1 = seededRandom()
      const u2 = seededRandom()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }
    
    // Student's t-distribution for fat tails (approximation)
    const fatTailedRandom = () => {
      const normal = normalRandom()
      const chi2 = Math.pow(normalRandom(), 2) + Math.pow(normalRandom(), 2) + Math.pow(normalRandom(), 2)
      const df = 3 // degrees of freedom for fat tails
      return normal / Math.sqrt(chi2 / df)
    }
    
    for (let i = 0; i < numCandles; i++) {
      const open = currentPrice
      
      // Fat-tailed distribution for returns with occasional large movements
      const baseVolatility = 0.008 // 0.8% base volatility
      let changePercent
      
      // 5% chance of large movement (fat tail event)
      if (seededRandom() < 0.05) {
        changePercent = fatTailedRandom() * baseVolatility * 5 // 5x larger movements
      } else {
        changePercent = normalRandom() * baseVolatility
      }
      
      // Add some drift and mean reversion
      const drift = 0.0001 // Slight upward bias
      const meanReversion = (200 - currentPrice) / currentPrice * 0.001 // Pull toward $200
      
      changePercent += drift + meanReversion
      
      const close = open * (1 + changePercent)
      
      // Realistic intraday high/low with fat-tailed wick movements
      const [minPrice, maxPrice] = [Math.min(open, close), Math.max(open, close)]
      const wickVolatility = baseVolatility * 0.5
      
      let highWick = seededRandom() < 0.1 ? Math.abs(fatTailedRandom()) * wickVolatility : Math.abs(normalRandom()) * wickVolatility
      let lowWick = seededRandom() < 0.1 ? Math.abs(fatTailedRandom()) * wickVolatility : Math.abs(normalRandom()) * wickVolatility
      
      const high = maxPrice * (1 + highWick)
      const low = minPrice * (1 - lowWick)
      
      // Ensure price doesn't go negative
      const finalLow = Math.max(low, currentPrice * 0.8)
      
      data.push({
        x: i,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(finalLow * 100) / 100,
        close: Math.round(close * 100) / 100,
        isGreen: close > open,
        volume: Math.floor(1000 + seededRandom() * 9000) // Random volume for realism
      })
      
      currentPrice = close
    }
    
    return data
  }

  // Draw complete candlestick chart with CSS masking for reveal
  const drawParallaxCandlesticks = () => {
    if (!parallaxCandlestickRef.current) return

    // Clear previous chart
    d3.select(parallaxCandlestickRef.current).selectAll("*").remove()

    const width = window.innerWidth
    const height = window.innerHeight
    const margin = { top: 30, right: 30, bottom: 60, left: 80 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(parallaxCandlestickRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0")

    // Add clip path for progressive reveal
    const candlestickDefs = svg.append("defs")
    const clipPath = candlestickDefs.append("clipPath")
      .attr("id", "revealClip")
    
    const revealRect = clipPath.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 0) // Start with 0 width
      .attr("height", height)

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("clip-path", "url(#revealClip)")
      
    // No need to store reference - we'll find it via selector

    // Generate all candlestick data at once
    const candleData = generateCandlestickData()

    // Scales based on all data
    const xScale = d3
      .scaleBand()
      .domain(candleData.map(d => d.x.toString()))
      .range([0, chartWidth])
      .padding(0.15)

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(candleData.flatMap(d => [d.high, d.low])) as [number, number])
      .nice()
      .range([chartHeight, 0])

    const candleWidth = xScale.bandwidth()

    // Add background for better visibility on dark sections
    g.append("rect")
      .attr("x", -margin.left)
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "rgba(255, 255, 255, 0.01)")
      .attr("stroke", "rgba(255, 255, 255, 0.05)")
      .attr("stroke-width", 1)
      .attr("rx", 8)

    // Add subtle grid lines with better visibility
    const yAxisGrid = g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale)
          .tickSize(-chartWidth)
          .tickFormat(() => "")
          .ticks(6)
      )
      .style("stroke", "#ffffff")
      .style("stroke-dasharray", "2,4")
      .style("opacity", 0.08)

    // Add price axis labels
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `$${d}`))
      .selectAll("text")
      .style("fill", "rgba(255, 255, 255, 0.4)")
      .style("font-size", "11px")
      .style("font-weight", "500")

    // Add candlesticks with improved visibility
    const candles = g.selectAll(".candlestick")
      .data(candleData)
      .enter()
      .append("g")
      .attr("class", "candlestick")
      .attr("transform", d => `translate(${xScale(d.x.toString())}, 0)`)

    // High-low lines (wicks) with better contrast
    candles.append("line")
      .attr("x1", candleWidth / 2)
      .attr("x2", candleWidth / 2)
      .attr("y1", d => yScale(d.high))
      .attr("y2", d => yScale(d.low))
      .attr("stroke", d => d.isGreen ? "#22c55e" : "#ef4444")
      .attr("stroke-width", Math.max(1.5, candleWidth * 0.12))
      .attr("opacity", 0.6)
      .attr("stroke-linecap", "round")

    // Candle bodies with enhanced visibility
    candles.append("rect")
      .attr("x", candleWidth * 0.05)
      .attr("y", d => yScale(Math.max(d.open, d.close)))
      .attr("width", candleWidth * 0.9)
      .attr("height", d => Math.max(2, Math.abs(yScale(d.open) - yScale(d.close))))
      .attr("fill", d => d.isGreen ? "#22c55e" : "#ef4444")
      .attr("opacity", 0.5)
      .attr("stroke", d => d.isGreen ? "#16a34a" : "#dc2626")
      .attr("stroke-width", 1)
      .attr("rx", candleWidth * 0.08)

    // Add glow effect for better visibility (skip on low-end devices)
    if (!isLowEndDevice) {
      candles.append("rect")
        .attr("x", candleWidth * 0.05)
        .attr("y", d => yScale(Math.max(d.open, d.close)))
        .attr("width", candleWidth * 0.9)
        .attr("height", d => Math.max(2, Math.abs(yScale(d.open) - yScale(d.close))))
        .attr("fill", "none")
        .attr("stroke", d => d.isGreen ? "#22c55e" : "#ef4444")
        .attr("stroke-width", 3)
        .attr("opacity", 0.15)
        .attr("rx", candleWidth * 0.08)
        .style("filter", "blur(1px)")
    }

    // Current price indicator removed for less distraction

    // Add progress indicator
    const progressWidth = (scrollProgress * chartWidth)
    g.append("rect")
      .attr("x", 0)
      .attr("y", chartHeight + 10)
      .attr("width", progressWidth)
      .attr("height", 4)
      .attr("fill", "url(#progressGradient)")
      .attr("opacity", 0.8)
      .attr("rx", 2)

    // Define gradient for progress bar (use existing defs)
    const progressGradient = candlestickDefs.append("linearGradient")
      .attr("id", "progressGradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%")

    progressGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#22c55e")
      .attr("stop-opacity", 1)

    progressGradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 1)

    progressGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 1)
  }

  // Helper function to get NVIDIA comparison date range
  const getNvidiaDateRange = () => {
    if (!nvidiaComparisonData) return { startYear: null, endYear: null }
    
    const nvidiaStart = new Date(nvidiaComparisonData.target_stock.data[0].date)
    const nvidiaEnd = new Date(nvidiaComparisonData.target_stock.data[nvidiaComparisonData.target_stock.data.length - 1].date)
    const sp500Start = new Date(nvidiaComparisonData.sp500.data[0].date)
    const sp500End = new Date(nvidiaComparisonData.sp500.data[nvidiaComparisonData.sp500.data.length - 1].date)
    
    const actualStart = new Date(Math.max(nvidiaStart.getTime(), sp500Start.getTime()))
    const actualEnd = new Date(Math.min(nvidiaEnd.getTime(), sp500End.getTime()))
    
    return {
      startYear: actualStart.getFullYear(),
      endYear: actualEnd.getFullYear()
    }
  }

  // Helper function to get percentage of stocks that underperformed the market
  const getUnderperformancePercentage = () => {
    if (!comparisonData) return null
    
    const sp500Return = comparisonData.sp500.metrics.annualizedReturn
    const stocks = Object.values(comparisonData.stocks)
    const underperformingCount = stocks.filter(stock => stock.metrics.annualizedReturn < sp500Return).length
    
    return stocks.length > 0 ? Math.round((underperformingCount / stocks.length) * 100) : null
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        console.log('Attempting to load data...');
        const [comparisonResponse, nvidiaResponse, hindsightResponse] = await Promise.all([
          fetch(getDataPath('comparison_data.json')),
          fetch(getDataPath('nvidia_comparison.json')),
          fetch(getDataPath('hindsight_stocks.json')),
        ]);
        
        if (!comparisonResponse.ok) {
          throw new Error(`Failed to load comparison data: ${comparisonResponse.status}`);
        }
        if (!nvidiaResponse.ok) {
          throw new Error(`Failed to load NVIDIA comparison data: ${nvidiaResponse.status}`);
        }
        if (!hindsightResponse.ok) {
          throw new Error(`Failed to load hindsight stocks data: ${hindsightResponse.status}`);
        }
        
        const comparison = await comparisonResponse.json();
        const nvidiaComparison = await nvidiaResponse.json();
        const hindsightStocks = await hindsightResponse.json();
        
        console.log('Data loaded successfully:', {
          comparisonDataSize: Object.keys(comparison.stocks).length,
          nvidiaComparisonDataSize: nvidiaComparison.target_stock.data.length,
          hindsightStocksSize: Object.keys(hindsightStocks).length,
        });
        
        setComparisonData(comparison);
        setNvidiaComparisonData(nvidiaComparison);
        setHindsightStocksData(hindsightStocks);
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

      const investment = typeof stock.investment === "number" ? stock.investment : 100 // Treat empty as $100
      const stockReturn = stockInfo.metrics.totalReturn
      console.log(`Using pre-calculated return for ${stock.symbol}:`, {
        totalReturn: stockReturn,
        annualizedReturn: stockInfo.metrics.annualizedReturn,
        investment: investment
      })

      totalInvestment += investment
      weightedReturn += stockReturn * investment
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

  // Performance detection
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)
  
  useEffect(() => {
    // Detect low-end devices
    const detectPerformance = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      let isLowEnd = false
      
      // Check for various performance indicators
      if (!gl) isLowEnd = true
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) isLowEnd = true
      
      // Check device memory if available (experimental API)
      try {
        const deviceMemory = (navigator as any).deviceMemory
        if (deviceMemory && deviceMemory < 4) isLowEnd = true
      } catch (e) {
        // deviceMemory not supported, continue
      }
      
      // Check for mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) isLowEnd = true
      
      setIsLowEndDevice(isLowEnd)
    }
    
    detectPerformance()
  }, [])

  // Throttled scroll handler with requestAnimationFrame
  useEffect(() => {
    let ticking = false
    let lastScrollTime = 0
    
    const handleScroll = () => {
      const now = performance.now()
      
      // Throttle to 60fps max, or 30fps on low-end devices
      const throttleDelay = isLowEndDevice ? 33 : 16
      
      if (now - lastScrollTime < throttleDelay) return
      
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = Math.min(scrollTop / scrollHeight, 1)
          
          // Show arrow only when at the very top (within 10px to account for small variations)
          setShowScrollArrow(scrollTop < 10)
          setScrollProgress(progress)
          
          ticking = false
          lastScrollTime = now
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLowEndDevice])

    // Animate harsh reality statistics when they come into view
  useEffect(() => {
    if (!comparisonData || isLoading) return

    const underperformancePercentage = getUnderperformancePercentage()
    const sp500AnnualizedReturn = comparisonData.sp500.metrics.annualizedReturn * 100
    const outperformancePercentage = underperformancePercentage ? 100 - underperformancePercentage : 0

    // Create intersection observer to trigger animations when elements come into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            
            // Reduce animation duration on low-end devices
            const animationDuration = isLowEndDevice ? 1 : 2
            
            // Animate underperformance percentage
            if (target === underperformanceRef.current && underperformancePercentage !== null) {
              const countUp1 = new CountUp(target, underperformancePercentage, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice, // Disable easing on low-end devices
                useGrouping: false
              })
              countUp1.start()
              observer.unobserve(target) // Only animate once
            }

            // Animate S&P 500 return
            if (target === sp500ReturnRef.current) {
              const countUp2 = new CountUp(target, sp500AnnualizedReturn, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice,
                useGrouping: false,
                decimalPlaces: 1
              })
              countUp2.start()
              observer.unobserve(target) // Only animate once
            }

            // Animate outperformance percentage
            if (target === outperformanceRef.current) {
              const countUp3 = new CountUp(target, outperformancePercentage, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice,
                useGrouping: false
              })
              countUp3.start()
              observer.unobserve(target) // Only animate once
            }
          }
        })
      },
      {
        threshold: isLowEndDevice ? 0.3 : 0.5, // Lower threshold for low-end devices
        rootMargin: isLowEndDevice ? '0px 0px -50px 0px' : '0px 0px -100px 0px'
      }
    )

    // Observe all the elements
    if (underperformanceRef.current) {
      observer.observe(underperformanceRef.current)
    }
    if (sp500ReturnRef.current) {
      observer.observe(sp500ReturnRef.current)
    }
    if (outperformanceRef.current) {
      observer.observe(outperformanceRef.current)
    }

    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [comparisonData, isLoading, isLowEndDevice])

  // Animate portfolio results when calculated and when they come into view
  useEffect(() => {
    if (!isCalculated) return

    const difference = portfolioReturn - sp500Return
    const totalValue = (() => {
      if (isCalculated) {
        const updatedValues = getUpdatedPortfolioValues()
        return updatedValues.reduce((sum, stock) => sum + stock.value, 0)
      }
      return getTotalPortfolioValue()
    })()

    // Create intersection observer to trigger animations when elements come into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            
            // Reduce animation duration on low-end devices
            const animationDuration = isLowEndDevice ? 1 : 2

            // Animate portfolio return
            if (target === portfolioReturnValueRef.current) {
              const countUp1 = new CountUp(target, portfolioReturn, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice,
                useGrouping: false,
                decimalPlaces: 2
              })
              countUp1.start()
              observer.unobserve(target) // Only animate once
            }

            // Animate S&P 500 return
            if (target === sp500ReturnValueRef.current) {
              const countUp2 = new CountUp(target, sp500Return, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice,
                useGrouping: false,
                decimalPlaces: 2
              })
              countUp2.start()
              observer.unobserve(target) // Only animate once
            }

            // Animate difference
            if (target === differenceValueRef.current) {
              const countUp3 = new CountUp(target, difference, {
                duration: animationDuration,
                suffix: '%',
                useEasing: !isLowEndDevice,
                useGrouping: false,
                decimalPlaces: 2
              })
              countUp3.start()
              observer.unobserve(target) // Only animate once
            }

            // Animate total portfolio value
            if (target === totalPortfolioValueRef.current) {
              const countUp4 = new CountUp(target, totalValue, {
                duration: animationDuration,
                prefix: '$',
                useEasing: !isLowEndDevice,
                useGrouping: true,
                decimalPlaces: 0
              })
              countUp4.start()
              observer.unobserve(target) // Only animate once
            }
          }
        })
      },
      {
        threshold: 0.3, // Trigger when 30% of element is visible (earlier for results section)
        rootMargin: '0px 0px -50px 0px' // Start animation a bit before element is fully visible
      }
    )

    // Observe all the portfolio result elements
    if (portfolioReturnValueRef.current) {
      observer.observe(portfolioReturnValueRef.current)
    }
    if (sp500ReturnValueRef.current) {
      observer.observe(sp500ReturnValueRef.current)
    }
    if (differenceValueRef.current) {
      observer.observe(differenceValueRef.current)
    }
    if (totalPortfolioValueRef.current) {
      observer.observe(totalPortfolioValueRef.current)
    }

    // Cleanup observer on unmount or when isCalculated changes
    return () => {
      observer.disconnect()
    }
  }, [isCalculated, portfolioReturn, sp500Return])

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 200) // 200ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateInvestment = (symbol: string, investment: number | "") => {
    setPortfolioStocks(prev => {
      const existing = prev.find(s => s.symbol === symbol)
      if (existing) {
        return prev.map(s => s.symbol === symbol ? { ...s, investment } : s)
      }
      return [...prev, { symbol, investment }]
    })
  }

  // Memoized available stocks list for better performance
  const availableStocks = useMemo((): FilteredStock[] => {
    if (!comparisonData) return []
    return Object.entries(comparisonData.stocks).map(([symbol, data]) => ({
      symbol,
      name: data.name,
      sector: data.sector,
      // Pre-compute lowercase versions for faster searching
      searchText: `${symbol} ${data.name} ${data.sector}`.toLowerCase()
    })).sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [comparisonData])

  // Optimized filtered stocks with debounced search
  const filteredStocks = useMemo((): FilteredStock[] => {
    if (!debouncedSearchQuery.trim()) {
      // Show top 8 most popular stocks when no search query
      const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX']
      return availableStocks
        .filter((stock: FilteredStock) => popularStocks.includes(stock.symbol))
        .slice(0, 8)
    }
    
    const query = debouncedSearchQuery.toLowerCase()
    const maxResults = isLowEndDevice ? 10 : 15 // Show fewer results on low-end devices
    
    // Fast filtering using pre-computed search text
    return availableStocks
      .filter((stock: FilteredStock) => stock.searchText.includes(query))
      .slice(0, maxResults)
  }, [availableStocks, debouncedSearchQuery, isLowEndDevice])

  // Add stock to portfolio
  const addStockToPortfolio = (symbol: string) => {
    const existing = portfolioStocks.find(s => s.symbol === symbol)
    if (!existing) {
      setPortfolioStocks(prev => [...prev, { symbol, investment: 100 }]) // Default to $100
    }
    setSearchQuery("")
    setDebouncedSearchQuery("") // Clear debounced query too
    setShowSearchResults(false)
  }

  // Remove stock from portfolio
  const removeStockFromPortfolio = (symbol: string) => {
    setPortfolioStocks(prev => prev.filter(s => s.symbol !== symbol))
  }

  // Get total portfolio value
  const getTotalPortfolioValue = () => {
    return portfolioStocks.reduce((total, stock) => total + (typeof stock.investment === "number" ? stock.investment : 100), 0)
  }

  // Get consistent color for a stock symbol
  const getStockColor = (symbol: string, allSymbols: string[]) => {
    const sortedSymbols = [...allSymbols].sort() // Ensure consistent order
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(sortedSymbols)
    return colorScale(symbol)
  }

  // Calculate updated portfolio values after returns
  const getUpdatedPortfolioValues = () => {
    if (!comparisonData || !isCalculated) return []
    
    return portfolioStocks
      .map(stock => {
        const stockInfo = comparisonData.stocks[stock.symbol]
        const investment = typeof stock.investment === "number" ? stock.investment : 100 // Treat empty as $100
        if (!stockInfo) return { 
          symbol: stock.symbol, 
          value: investment,
          originalValue: investment,
          return: 0
        }
        
        const totalReturn = stockInfo.metrics.totalReturn
        const updatedValue = investment * (1 + totalReturn)
        return {
          symbol: stock.symbol,
          value: updatedValue,
          originalValue: investment,
          return: totalReturn
        }
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

    // Add legend with background
    const legend = g.append("g").attr("transform", `translate(${width - 180}, 20)`)
    
    // Add background rectangle for legend
    legend.append("rect")
      .attr("x", -5)
      .attr("y", -10)
      .attr("width", 170)
      .attr("height", 45)
      .attr("fill", "white")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.9)

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

      // Use shorter animations on low-end devices
      const transitionDuration = isLowEndDevice ? 300 : 1000

      // Update axis and line positions with smooth transition
      xAxisMain.transition().duration(transitionDuration).call(
        d3.axisBottom(xScale).tickFormat((d: Date | d3.NumberValue) => {
          if (d instanceof Date) {
            return dateFormatter(d)
          }
          return ""
        })
      )

      // Update y-axis
      yAxisMain.transition().duration(transitionDuration).call(d3.axisLeft(yScale))

      // Update grid
      xAxis.transition().duration(transitionDuration).call(
        d3.axisBottom(xScale).tickSize(-height).tickFormat(() => "")
      )

      yAxis.transition().duration(transitionDuration).call(
        d3.axisLeft(yScale).tickSize(-width).tickFormat(() => "")
      )

      // Update lines
      targetLine
        .transition()
        .duration(transitionDuration)
        .attr("d", line)

      sp500Line
        .transition()
        .duration(transitionDuration)
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

  const drawHistogram = () => {
    if (!histogramRef.current || !comparisonData || !nvidiaComparisonData) return

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

    // Extract annualized returns from comparison data
    const sp500Return = comparisonData.sp500.metrics.annualizedReturn
    const stockReturns = Object.values(comparisonData.stocks).map(stock => stock.metrics.annualizedReturn)
    
    // Create histogram bins with consistent width
    const minReturn = Math.min(...stockReturns)
    const maxReturn = Math.max(...stockReturns)
    const binWidth = 0.02 // 2% bins
    
    // Extend the range slightly to ensure all data fits properly
    const extendedMin = Math.floor(minReturn / binWidth) * binWidth
    const extendedMax = Math.ceil(maxReturn / binWidth) * binWidth
    const numBins = Math.round((extendedMax - extendedMin) / binWidth)
    
    // Generate consistent bins
    const bins = d3.range(numBins + 1).map(i => extendedMin + i * binWidth)
    const histogram = d3.histogram()
      .domain([extendedMin, extendedMax])
      .thresholds(bins)
      
    const binData = histogram(stockReturns)

    // Create dynamic x-axis scale
    const xScale = d3
      .scaleLinear()
      .domain([extendedMin, extendedMax])
      .nice()
      .range([0, width])

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(binData, (d: any) => d.length) as number])
      .nice()
      .range([height, 0])

    // Create color scale based on performance delta from S&P 500
    const maxDelta = Math.max(
      Math.abs(minReturn - sp500Return),
      Math.abs(maxReturn - sp500Return)
    )
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([-maxDelta, maxDelta])

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
      .text("Annualized Return (%)")

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
      .data(binData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d: any) => xScale(d.x0))
      .attr("width", (d: any) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
      .attr("y", (d: any) => yScale(d.length))
      .attr("height", (d: any) => height - yScale(d.length))
      .attr("fill", (d: any) => {
        const binMidpoint = (d.x0 + d.x1) / 2
        const delta = binMidpoint - sp500Return
        return colorScale(delta)
      })
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr("opacity", 0.8)

        // Remove any existing histogram tooltips
        d3.selectAll(".histogram-tooltip").remove()

        // Find stocks that fall within this bin range
        const stocksInBin = Object.entries(comparisonData.stocks)
          .filter(([symbol, stockData]) => {
            const annualizedReturn = stockData.metrics.annualizedReturn
            return annualizedReturn >= d.x0 && annualizedReturn < d.x1
          })
          .map(([symbol, stockData]) => ({
            symbol,
            return: (stockData.metrics.annualizedReturn * 100).toFixed(1)
          }))
          .sort((a, b) => parseFloat(b.return) - parseFloat(a.return)) // Sort by return descending

        // Create tooltip content
        let tooltipContent = `
          <div><strong>Return Range:</strong> ${(d.x0 * 100).toFixed(1)}% to ${(d.x1 * 100).toFixed(1)}%</div>
          <div><strong>Number of Stocks:</strong> ${d.length}</div>
          <div><strong>vs S&P 500:</strong> ${(((d.x0 + d.x1) / 2 - sp500Return) * 100).toFixed(1)}% difference</div>
        `

        if (stocksInBin.length > 0) {
          tooltipContent += `<div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 8px;"><strong>Stocks in this range:</strong></div>`
          
          // Show up to 10 stocks to avoid tooltip getting too long
          const stocksToShow = stocksInBin.slice(0, 10)
          stocksToShow.forEach(stock => {
            tooltipContent += `<div style="font-size: 11px;">${stock.symbol}: ${stock.return}%</div>`
          })
          
          if (stocksInBin.length > 10) {
            tooltipContent += `<div style="font-size: 11px; color: #ccc;">...and ${stocksInBin.length - 10} more</div>`
          }
        }

        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "histogram-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "12px")
          .style("border-radius", "6px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("max-width", "250px")
          .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
          .html(tooltipContent)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 10 + "px")
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1)
        d3.selectAll(".histogram-tooltip").remove()
      })

    // Add S&P 500 line
    g.append("line")
      .attr("x1", xScale(sp500Return))
      .attr("x2", xScale(sp500Return))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")

    // Add S&P 500 label
    g.append("text")
      .attr("x", xScale(sp500Return))
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#3b82f6")
      .text(`S&P 500 (${(sp500Return * 100).toFixed(1)}%)`)

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
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0.9);

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

  // State for treemap navigation
  const [currentTreemapNode, setCurrentTreemapNode] = useState<any>(null)
  const [treemapBreadcrumbs, setTreemapBreadcrumbs] = useState<any[]>([])

  const drawTreemap = () => {
    if (!treemapRef.current || !comparisonData) return

    // Clear previous chart
    d3.select(treemapRef.current).selectAll("*").remove()

    const margin = { top: 80, right: 10, bottom: 10, left: 10 }
    const width = treemapRef.current.offsetWidth - margin.left - margin.right
    const height = 600 - margin.top - margin.bottom

    // Get S&P 500 annualized return for comparison
    const sp500AnnualizedReturn = comparisonData.sp500.metrics.annualizedReturn * 100

    // Process all stocks from comparison data
    const processedStocks = Object.entries(comparisonData.stocks)
      .map(([symbol, stockData]) => {
        const annualizedReturn = stockData.metrics.annualizedReturn * 100
        const volatility = stockData.metrics.volatility * 100
        const marketCap = stockData.metrics.marketCap || 1e9

        return {
          name: symbol,
          sector: stockData.sector,
          industry: stockData.industry,
          return: annualizedReturn,
          volatility: volatility,
          marketCap: marketCap,
          value: Math.log(marketCap) // Use log scale for market cap
        }
      })
      .sort((a, b) => b.marketCap - a.marketCap)

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

    // Helper function to calculate average return for a group
    const calculateAverageReturn = (items: any[]): number => {
      if (!items.length) return 0
      return items.reduce((sum, item) => sum + (item.return || 0), 0) / items.length
    }

    // Create hierarchical data structure with average returns
    const hierarchicalData = {
      name: "S&P 500",
      averageReturn: calculateAverageReturn(processedStocks),
      children: Object.entries(stocksBySectorAndIndustry).map(([sectorName, industries]) => {
        const sectorStocks = Object.values(industries).flat()
        return {
          name: sectorName,
          averageReturn: calculateAverageReturn(sectorStocks),
          children: Object.entries(industries).map(([industryName, stocks]) => ({
            name: industryName,
            averageReturn: calculateAverageReturn(stocks),
            children: stocks
          }))
        }
      })
    }

    // Custom tiling function for zoom behavior
    function tile(node: any, x0: number, y0: number, x1: number, y1: number) {
      d3.treemapBinary(node, 0, 0, width, height)
      for (const child of node.children) {
        child.x0 = x0 + child.x0 / width * (x1 - x0)
        child.x1 = x0 + child.x1 / width * (x1 - x0)
        child.y0 = y0 + child.y0 / height * (y1 - y0)
        child.y1 = y0 + child.y1 / height * (y1 - y0)
      }
    }

         // Compute the layout
     const hierarchy = d3.hierarchy(hierarchicalData as any)
       .sum((d: any) => d.value || 0)
       .sort((a, b) => (b.value || 0) - (a.value || 0))

     const root = d3.treemap().tile(tile)(hierarchy) as any

    // Create scales
    const x = d3.scaleLinear().rangeRound([0, width])
    const y = d3.scaleLinear().rangeRound([0, height])

    // Color scale for returns relative to S&P 500
    const maxDifference = 15 // Max difference from S&P 500 for color scale
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([-maxDifference, maxDifference])

         // Get node color based on average return
     const getNodeColor = (d: any) => {
       const avgReturn = d.data.averageReturn || d.data.return || 0
       const difference = avgReturn - sp500AnnualizedReturn
       return colorScale(difference)
     }

         // Create SVG container
     const svg = d3.select(treemapRef.current)
       .append("svg")
       .attr("viewBox", [0, 0, width, height])
       .attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom)
       .style("max-width", "100%")
       .style("height", "auto")
       .style("font", "10px sans-serif")

    // Add breadcrumb container
    const breadcrumbContainer = d3.select(treemapRef.current)
      .insert("div", "svg")
      .attr("class", "treemap-breadcrumbs")
      .style("margin-bottom", "10px")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "8px")

    // Add reset button
    const resetButton = breadcrumbContainer
      .append("button")
      .attr("class", "treemap-reset-btn")
      .style("padding", "6px 12px")
      .style("background", "#3b82f6")
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer")
      .style("font-size", "12px")
      .text("Reset View")
      .on("click", () => zoomToNode(root))

    // Add breadcrumb navigation
    const breadcrumbNav = breadcrumbContainer
      .append("div")
      .attr("class", "breadcrumb-nav")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "4px")

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

    // Display the root initially
    let group = svg.append("g")

         // Render function
     function render(group: any, root: any) {
       const node = group
         .selectAll("g")
         .data(root.children || [])
         .join("g")

       // Add click handlers for zoom and external links
       node.attr("cursor", "pointer")
         .on("click", (event: any, d: any) => {
           if (d.children) {
             // Has children - zoom in
             zoomToNode(d)
           } else {
             // Leaf node (individual stock) - open Yahoo Finance
             const symbol = d.data.name
             const yahooFinanceUrl = `https://finance.yahoo.com/quote/${symbol}/`
             window.open(yahooFinanceUrl, '_blank')
           }
         })

             // Add tooltips
       node.on("mouseover", function(event: MouseEvent, d: any) {
        
        const nodeData = d.data
        let tooltipContent = ""
        
        if (nodeData.sector && nodeData.industry && nodeData.name && nodeData.marketCap) {
          // Individual stock
          const formatMarketCap = (cap: number) => {
            if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`
            if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`
            if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`
            return `$${cap.toFixed(0)}`
          }

          const relativeReturn = nodeData.return - sp500AnnualizedReturn
          const outperformance = relativeReturn > 0 ? "outperformed" : "underperformed"
          
                     tooltipContent = `
             <div style="font-weight: bold; margin-bottom: 8px; color: #f59e0b;">${nodeData.name}</div>
             <div style="margin-bottom: 4px;"><strong>Sector:</strong> ${nodeData.sector}</div>
             <div style="margin-bottom: 4px;"><strong>Industry:</strong> ${nodeData.industry}</div>
             <div style="margin-bottom: 4px;"><strong>Market Cap:</strong> ${formatMarketCap(nodeData.marketCap)}</div>
             <div style="margin-bottom: 4px;"><strong>Annualized Return:</strong> ${nodeData.return.toFixed(1)}%</div>
             <div style="margin-bottom: 4px;"><strong>S&P 500 Annualized:</strong> ${sp500AnnualizedReturn.toFixed(1)}%</div>
             <div style="margin-bottom: 4px; color: ${relativeReturn > 0 ? '#10b981' : '#ef4444'};"><strong>${outperformance} by:</strong> ${Math.abs(relativeReturn).toFixed(1)}%</div>
             <div style="margin-bottom: 4px;"><strong>Volatility:</strong> ${nodeData.volatility.toFixed(1)}%</div>
             <div style="font-size: 10px; color: #ccc; margin-top: 6px;">Click to view on Yahoo Finance</div>
           `
        } else {
          // Sector or industry group
          const avgReturn = nodeData.averageReturn || 0
          const relativeReturn = avgReturn - sp500AnnualizedReturn
          const outperformance = relativeReturn > 0 ? "outperformed" : "underperformed"
          const childCount = d.children ? d.children.length : 0
          
          tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #f59e0b;">${nodeData.name}</div>
            <div style="margin-bottom: 4px;"><strong>Average Return:</strong> ${avgReturn.toFixed(1)}%</div>
            <div style="margin-bottom: 4px;"><strong>S&P 500 Annualized:</strong> ${sp500AnnualizedReturn.toFixed(1)}%</div>
            <div style="margin-bottom: 4px; color: ${relativeReturn > 0 ? '#10b981' : '#ef4444'};"><strong>Average ${outperformance} by:</strong> ${Math.abs(relativeReturn).toFixed(1)}%</div>
            <div style="margin-bottom: 4px;"><strong>Items:</strong> ${childCount}</div>
            ${d.children ? '<div style="font-size: 10px; color: #ccc;">Click to zoom in</div>' : ''}
          `
        }
        
        tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 10 + "px")
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden")
      })

      // Add rectangles
      node.append("rect")
        .attr("fill", getNodeColor)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)

             // Add text labels
       node.append("text")
         .attr("font-weight", "bold")
         .attr("font-size", "10px")
         .attr("fill", (d: any) => {
           const avgReturn = d.data.averageReturn || d.data.return || 0
           const difference = Math.abs(avgReturn - sp500AnnualizedReturn)
           return difference > 10 ? "white" : "black"
         })
         .attr("text-shadow", (d: any) => {
           const avgReturn = d.data.averageReturn || d.data.return || 0
           const difference = Math.abs(avgReturn - sp500AnnualizedReturn)
           return difference > 10 ? "1px 1px 2px rgba(0,0,0,0.5)" : "none"
         })
         .selectAll("tspan")
         .data((d: any) => {
           const name = d.data.name
           const words = name.split(/(?=[A-Z][^A-Z])/g)
           return words
         })
         .join("tspan")
         .attr("x", 3)
         .attr("y", (d: any, i: number) => `${1.1 + i * 0.9}em`)
         .text((d: any) => d)

      group.call(position, root)
    }

         // Position function
     function position(group: any, root: any) {
       group.selectAll("g")
         .attr("transform", (d: any) => `translate(${x(d.x0)},${y(d.y0)})`)
         .select("rect")
         .attr("width", (d: any) => x(d.x1) - x(d.x0))
         .attr("height", (d: any) => y(d.y1) - y(d.y0))
     }

    // Zoom to node function
    function zoomToNode(d: any) {
      const group0 = group.attr("pointer-events", "none")
      const group1 = group = svg.append("g").call(render, d)

      x.domain([d.x0, d.x1])
      y.domain([d.y0, d.y1])

      // Update breadcrumbs
      updateBreadcrumbs(d)

      svg.transition()
        .duration(750)
        .call((t: any) => group0.transition(t).remove()
          .call(position, d.parent || d))
                 .call((t: any) => group1.transition(t)
           .attrTween("opacity", () => d3.interpolate(0, 1) as any)
           .call(position, d))
    }

         // Update breadcrumbs function
     function updateBreadcrumbs(node: any) {
       const path = node.ancestors().reverse()
       
       // Clear all breadcrumb content
       breadcrumbNav.selectAll("*").remove()
       
       path.forEach((d: any, i: number) => {
         if (i > 0) {
           breadcrumbNav.append("span")
             .attr("class", "breadcrumb-separator")
             .style("color", "#666")
             .style("margin", "0 4px")
             .text(">")
         }
         
         breadcrumbNav.append("span")
           .attr("class", "breadcrumb-item")
           .style("cursor", i < path.length - 1 ? "pointer" : "default")
           .style("color", i < path.length - 1 ? "#3b82f6" : "#333")
           .style("text-decoration", i < path.length - 1 ? "underline" : "none")
           .style("font-weight", i === path.length - 1 ? "bold" : "normal")
           .style("padding", "2px 4px")
           .style("border-radius", "2px")
           .style("background", i === path.length - 1 ? "#f3f4f6" : "transparent")
           .text(d.data.name)
           .on("click", () => {
             if (i < path.length - 1) {
               zoomToNode(d)
             }
           })
           .on("mouseover", function() {
             if (i < path.length - 1) {
               d3.select(this).style("background", "#dbeafe")
             }
           })
           .on("mouseout", function() {
             d3.select(this).style("background", i === path.length - 1 ? "#f3f4f6" : "transparent")
           })
       })
     }

    // Initialize with root
    render(group, root)
    updateBreadcrumbs(root)
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
      .duration(isLowEndDevice ? 1000 : 2000)
      .ease(isLowEndDevice ? d3.easeLinear : d3.easeQuadInOut)
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
      .duration(isLowEndDevice ? 1000 : 2000)
      .ease(isLowEndDevice ? d3.easeLinear : d3.easeQuadInOut)
      .attr("y", d => d.value >= 0 ? yScale(d.value) - 10 : yScale(d.value) + 20) // Position label above or below bar
      .style("opacity", 1)
  }

  const drawPieChart = () => {
    if (!pieChartRef.current || portfolioStocks.length === 0) return

    // Clear previous chart
    d3.select(pieChartRef.current).selectAll("*").remove()

    const width = pieChartRef.current.offsetWidth
    const height = 300
    const margin = 40
    const radius = Math.min(width, height) / 2 - margin

    const svg = d3
      .select(pieChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)

    // Get all symbols for consistent colors
    const allSymbols = portfolioStocks.map(s => s.symbol)

    // Pie generator
    const pie = d3.pie<PieChartData>()
      .value(d => d.investment)
      .sort(null)

    // Arc generator
    const arc = d3.arc<d3.PieArcDatum<PortfolioStock>>()
      .innerRadius(0)
      .outerRadius(radius)

    // Label arc
    const labelArc = d3.arc<d3.PieArcDatum<PortfolioStock>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6)

    // Generate the pie data - use updated values if calculated, otherwise use original investments
    let portfolioData, pieTotal, isShowingReturns
    
    if (isCalculated) {
      // Show updated values after returns
      const updatedValues = getUpdatedPortfolioValues()
      portfolioData = updatedValues.map(stock => ({
        symbol: stock.symbol,
        investment: stock.value,
        originalValue: stock.originalValue || null,
        return: stock.return || null
      }))
      pieTotal = updatedValues.reduce((sum, stock) => sum + stock.value, 0)
      isShowingReturns = true
    } else {
      // Show original investment amounts
                    portfolioData = portfolioStocks.map(stock => ({
                symbol: stock.symbol,
                investment: typeof stock.investment === "number" ? stock.investment : 100,
                originalValue: null,
                return: null
              }))
      pieTotal = getTotalPortfolioValue()
      isShowingReturns = false
    }
    
    const pieData = pie(portfolioData)

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "pie-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")

    // Add pie slices
    const slices = g.selectAll(".arc")
      .data(pieData)
      .enter().append("g")
      .attr("class", "arc")

    slices.append("path")
      .attr("d", arc)
      .style("fill", d => getStockColor(d.data.symbol, allSymbols))
      .style("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1)
        const percentage = ((d.data.investment / pieTotal) * 100).toFixed(1)
        
        let tooltipContent = `
          <div><strong>${d.data.symbol}</strong></div>
          <div>$${d.data.investment.toLocaleString()}</div>
          <div>${percentage}% of portfolio</div>
        `
        
        if (isShowingReturns && d.data.originalValue && d.data.return !== null && d.data.return !== undefined) {
          const returnPct = (d.data.return * 100).toFixed(1)
          const gain = d.data.investment - d.data.originalValue
          tooltipContent = `
            <div><strong>${d.data.symbol}</strong></div>
            <div>Original: $${d.data.originalValue.toLocaleString()}</div>
            <div>Current: $${d.data.investment.toLocaleString()}</div>
            <div>Return: ${returnPct}% (${gain >= 0 ? '+' : ''}$${gain.toLocaleString()})</div>
            <div>${percentage}% of portfolio</div>
          `
        }
        
        tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.8)
        tooltip.style("visibility", "hidden")
      })
      .transition()
      .duration(isLowEndDevice ? 500 : 1000)
      .attrTween("d", function(d: any) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
        return function(t: number) {
          return arc(interpolate(t)) || ""
        }
      })

    // Add labels for larger slices
    slices.append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
      .text(d => {
        const percentage = (d.data.investment / pieTotal) * 100
        return percentage > 8 ? d.data.symbol : "" // Only show label if slice is > 8%
      })
      .style("opacity", 0)
      .transition()
      .delay(500)
      .duration(500)
      .style("opacity", 1)

    // Add center text showing total
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(isShowingReturns ? "After Returns" : "Portfolio")

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(`$${pieTotal.toLocaleString()}`)
  }



  // Draw parallax candlestick chart on mount and resize
  useEffect(() => {
    if (!isLoading) {
      drawParallaxCandlesticks()
      
      const handleResize = () => {
        drawParallaxCandlesticks()
      }
      
      window.addEventListener("resize", handleResize)
      return () => {
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [isLoading])

  // Update candlestick visibility based on scroll progress with performance optimization
  useEffect(() => {
    if (parallaxCandlestickRef.current && !isLoading) {
      // Use requestAnimationFrame for smooth updates, or skip on low-end devices
      const updateReveal = () => {
        const svg = d3.select(parallaxCandlestickRef.current).select("svg")
        const revealRect = svg.select("#revealClip rect")
        if (!revealRect.empty()) {
          const revealWidth = scrollProgress * window.innerWidth
          revealRect.attr("width", revealWidth)
        }
      }
      
      if (isLowEndDevice) {
        // On low-end devices, update less frequently
        updateReveal()
      } else {
        requestAnimationFrame(updateReveal)
      }
    }
  }, [scrollProgress, isLoading, isLowEndDevice])

  // Draw charts on mount and resize
  useEffect(() => {
    const drawCharts = () => {
      drawComparisonChart()
      drawHistogram()
      drawTreemap()
      drawLossAversionChart()
      drawHindsightCharts()
      drawPieChart()
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
      d3.selectAll(".pie-tooltip").remove()
    }
  }, [nvidiaComparisonData, isCalculated, portfolioReturn, sp500Return, comparisonData, hindsightStocksData, selectedCharts, showChartResults, portfolioStocks])



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
      .call(d3.axisBottom(xScale).tickFormat((d, i) => {
        const month = d as number
        const year = Math.floor(month / 12) + 1
        return (i % 2 === 1) ? `Year ${year}` : ""
      }))
      .style("font-size", "12px")

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`))
      .style("font-size", "12px")

    // Add X axis label
    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + 45})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Time")

    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .text("Portfolio Value ($)")

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

    // Add legend with background
    const legend = g.append("g").attr("transform", `translate(${width - 150}, 20)`)
    
    // Add background rectangle for legend
    legend.append("rect")
      .attr("x", -5)
      .attr("y", -5)
      .attr("width", 140)
      .attr("height", 35)
      .attr("fill", "white")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.9)
    
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
    if (!hindsightChartRef.current || !hindsightStocksData || !comparisonData) return

    d3.select(hindsightChartRef.current).selectAll("*").remove()

    // Get all available stocks from the data file
    const stockSymbols = Object.keys(hindsightStocksData)
    const stocksWithData = stockSymbols.filter(symbol => 
      hindsightStocksData[symbol] && hindsightStocksData[symbol].data.length > 2
    )

    if (stocksWithData.length === 0) return

    const chartsPerRow = Math.min(5, stocksWithData.length) // Adapt to number of stocks available
    const chartWidth = (hindsightChartRef.current.offsetWidth - 40) / chartsPerRow
    const chartHeight = 150
    const margin = { top: 10, right: 10, bottom: 30, left: 45 }
    const innerWidth = chartWidth - margin.left - margin.right
    const innerHeight = chartHeight - margin.top - margin.bottom

    const container = d3.select(hindsightChartRef.current)
      .append("div")
      .style("display", "flex")
      .style("flex-wrap", "wrap")
      .style("gap", "10px")
      .style("justify-content", "center")

    // Define training and test periods
    const parseDate = d3.timeParse("%Y-%m-%d")
    const trainEndDate = new Date("2018-12-31")
    
    stocksWithData.forEach((symbol, index) => {
      const stockInfo = hindsightStocksData[symbol]
      
      // Process the time series data
      const fullData = stockInfo.data
        .filter(d => d.normalizedPrice !== null && parseDate(d.date))
        .map(d => ({
          date: parseDate(d.date) as Date,
          price: d.normalizedPrice
        }))
        .filter(d => d.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      if (fullData.length < 2) return

      // Split data into training (2010-2018) and full timeline
      const trainingData = fullData.filter(d => d.date <= trainEndDate)
      const testData = fullData.filter(d => d.date > trainEndDate)

      // Calculate test period performance vs S&P 500
      let testPerformanceColor = "#3b82f6" // Default blue
      let outperformedSP500 = false
      
      if (showChartResults && testData.length > 0 && trainingData.length > 0) {
        // Get stock performance from end of training to end of test
        const trainEndPrice = trainingData[trainingData.length - 1].price
        const testEndPrice = testData[testData.length - 1].price
        const stockTestReturn = (testEndPrice - trainEndPrice) / trainEndPrice
        
        // Get S&P 500 test period return from comparison data
        const sp500Data = comparisonData.sp500.data
          .filter(d => parseDate(d.date))
          .map(d => ({
            date: parseDate(d.date) as Date,
            price: d.normalizedPrice
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        const sp500TrainEnd = sp500Data.find(d => d.date <= trainEndDate && 
          sp500Data.find(sp => sp.date > d.date && sp.date <= trainEndDate) === undefined)
        const sp500TestEnd = sp500Data[sp500Data.length - 1]
        
        if (sp500TrainEnd && sp500TestEnd) {
          const sp500TestReturn = (sp500TestEnd.price - sp500TrainEnd.price) / sp500TrainEnd.price
          outperformedSP500 = stockTestReturn > sp500TestReturn
          testPerformanceColor = outperformedSP500 ? "#10b981" : "#ef4444"
        }
      }

      const chartDiv = container
        .append("div")
        .style("border", selectedCharts.includes(index) ? "3px solid #10b981" : "1px solid #ccc")
        .style("border-radius", "8px")
        .style("padding", "5px")
        .style("background", "white")
        .style("cursor", "pointer")
        .style("transition", "all 0.3s ease")
        .on("click", () => {
          if (!showChartResults) {
            setSelectedCharts(prev => 
              prev.includes(index) 
                ? prev.filter(i => i !== index)
                : prev.length < 3 ? [...prev, index] : prev
            )
          }
        })
        .on("mouseover", function() {
          d3.select(this)
            .style("transform", "scale(1.05)")
            .style("box-shadow", "0 10px 25px rgba(0,0,0,0.15)")
        })
        .on("mouseout", function() {
          d3.select(this)
            .style("transform", "scale(1)")
            .style("box-shadow", "none")
        })

      const svg = chartDiv
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

      // Choose data to display based on results state
      const displayData = showChartResults ? fullData : trainingData
      
      // Scales
      const xScale = d3.scaleTime()
        .domain(d3.extent(displayData, d => d.date) as [Date, Date])
        .range([0, innerWidth])

      const yScale = d3.scaleLinear()
        .domain(d3.extent(displayData, d => d.price) as [number, number])
        .nice()
        .range([innerHeight, 0])

      // Line generator
      const line = d3.line<{date: Date, price: number}>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX)

      // Add training period line
      const trainingLine = g.append("path")
        .datum(trainingData)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2)
        .attr("d", line)

      // Add test period line (only if showing results)
      if (showChartResults && testData.length > 0) {
        // Connect training end to test start
        const connectionData = [trainingData[trainingData.length - 1], testData[0]]
        
        g.append("path")
          .datum(connectionData)
          .attr("fill", "none")
          .attr("stroke", testPerformanceColor)
          .attr("stroke-width", 2)
          .attr("d", line)
        
        g.append("path")
          .datum(testData)
          .attr("fill", "none")
          .attr("stroke", testPerformanceColor)
          .attr("stroke-width", 2)
          .attr("d", line)
        
        // Add vertical line to separate training and test periods
        const trainEndX = xScale(trainEndDate)
        g.append("line")
          .attr("x1", trainEndX)
          .attr("x2", trainEndX)
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .attr("stroke", "#666")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3")
          .attr("opacity", 0.7)
      }

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

      // Title
      chartDiv.append("div")
        .style("text-align", "center")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("margin-top", "5px")
        .text(showChartResults ? symbol : `Stock ${String.fromCharCode(65 + index)}`)

      // Performance indicator (only show after results)
      if (showChartResults) {
        const performance = outperformedSP500 ? "Beat S&P 500" : "Underperformed"
        
        chartDiv.append("div")
          .style("text-align", "center")
          .style("font-size", "10px")
          .style("color", testPerformanceColor)
          .style("font-weight", "bold")
          .text(`${performance} (Test Period)`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Performance optimizations for CSS animations */}
      <style jsx>{`
        .parallax-container {
          will-change: transform;
          transform: translateZ(0);
        }
        .chart-container {
          will-change: auto;
          contain: layout style paint;
        }
        .animate-element {
          will-change: ${isLowEndDevice ? 'auto' : 'transform, opacity'};
        }
        .scroll-container {
          overscroll-behavior: contain;
        }
      `}</style>
      {/* Progressive Candlestick Chart Background */}
      <div
        ref={parallaxCandlestickRef}
        className="fixed inset-0 pointer-events-none z-0 parallax-container"
        style={{
          opacity: isLowEndDevice ? 0.2 : 0.35,
          overflow: 'hidden'
        }}
      />
      
      {/* Progress Indicator */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gray-200 pointer-events-none z-50">
        <div 
          className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-100 ease-out"
          style={{
            width: `${scrollProgress * 100}%`
          }}
        />
      </div>
      
      {/* Bouncing scroll arrow - positioned at bottom of viewport */}
      {showScrollArrow && (
        <div 
          className="fixed bottom-8 left-0 right-0 flex justify-center cursor-pointer animate-bounce z-50"
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

      <div className="pt-0 relative z-10 scroll-container">
        {/* Section 1: Hero Introduction */}
        <section className="relative min-h-screen flex items-center justify-center px-4 pt-0 overflow-hidden">
          {/* Scrolling Ticker Background - Hidden on mobile */}
          {comparisonData && (
            <div className="absolute inset-0 pointer-events-none hidden md:block">
              {/* Top ticker */}
              <div className="absolute top-8 left-0 w-full overflow-hidden opacity-40">
                <div className="flex animate-scroll-left whitespace-nowrap">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-8 text-sm font-mono text-gray-400">
                      {Object.entries(comparisonData.stocks).map(([symbol, data]) => (
                        <div key={`${i}-${symbol}`} className="flex items-center space-x-2">
                          <span className="font-semibold">{symbol}</span>
                          <span className={data.metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500'}>
                            {data.metrics.totalReturn > 0 ? '+' : ''}{(data.metrics.totalReturn * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Middle ticker (opposite direction) */}
              <div className="absolute top-1/3 left-0 w-full overflow-hidden opacity-30">
                <div className="flex animate-scroll-right whitespace-nowrap">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-8 text-xs font-mono text-gray-300">
                      {Object.entries(comparisonData.stocks).slice().reverse().map(([symbol, data]) => (
                        <div key={`${i}-${symbol}`} className="flex items-center space-x-2">
                          <span className="font-semibold">{symbol}</span>
                          <span className={data.metrics.annualizedReturn > 0.08 ? 'text-green-400' : 'text-red-400'}>
                            {(data.metrics.annualizedReturn * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bottom ticker */}
              <div className="absolute bottom-1/4 left-0 w-full overflow-hidden opacity-20">
                <div className="flex animate-scroll-left whitespace-nowrap">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-8 text-xs font-mono text-gray-300">
                      {Object.entries(comparisonData.stocks).filter((_, index) => index % 2 === 0).map(([symbol, data]) => (
                        <div key={`${i}-${symbol}`} className="flex items-center space-x-2">
                          <span className="font-semibold">{symbol}</span>
                          <span className="text-gray-400">
                            ${(data.metrics.marketCap / 1e9).toFixed(1)}B
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-center max-w-4xl relative z-10 bg-white/90 backdrop-blur-md rounded-2xl p-4 md:p-8 shadow-2xl mx-2">
            <div className="mb-6 md:mb-8">
              <div className="inline-flex items-center justify-center gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">The Illusion of Outperformance: What Looks Like a Win, Rarely Lasts</h1>
            <p className="text-lg md:text-xl text-gray-600 mb-4 leading-relaxed">
              Explore{" "}
              <a 
                href="https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                real S&P 500 data
              </a>
              {" "}and see why{" "}
              <a 
                href="https://www.bogleheads.org/wiki/Bogleheads%C2%AE_investment_philosophy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                index investing
              </a>
              {" "}is often the smartest choice.
            </p>
            <p className="text-base md:text-lg text-gray-500 mb-8 md:mb-12 font-medium">
              By{" "}
              <a 
                href="https://github.com/CarterT27" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                Carter Tran
              </a>
              ,{" "}
              <a 
                href="https://github.com/aprilhuang39" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                April Huang
              </a>
              , and{" "}
              <a 
                href="https://github.com/cheryl-xiang" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                Cheryl Xiang
              </a>
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="text-base md:text-lg px-6 py-3 md:px-8 md:py-4 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 hover:scale-110 hover:shadow-lg"
                onClick={() => {
                  const nextSection = document.querySelector('#comparison-section');
                  nextSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Start Exploring
              </Button>
            </div>
          </div>
        </section>

        {/* Section 2: The Allure of Stock Picking */}
        <section id="comparison-section" className="min-h-screen flex items-center justify-center px-4 pt-32">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-8 md:mb-12 bg-white/90 backdrop-blur-md rounded-xl p-4 md:p-6 shadow-lg mx-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 mt-8 md:mt-16">The Allure of Stock Picking</h2>
              <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 leading-relaxed">
                Imagine you had perfect foresight. You invest in NVIDIA in{" "}
                {(() => {
                  const { startYear } = getNvidiaDateRange();
                  return startYear ? <span className="font-semibold">{startYear}</span> : "--";
                })()} and hold through{" "}
                {(() => {
                  const { endYear } = getNvidiaDateRange();
                  return endYear ? <span className="font-semibold">{endYear}</span> : "--";
                })()} — your money grows by more than{" "}
                {nvidiaComparisonData ? (
                  <span className="font-semibold text-green-600">
                    {((nvidiaComparisonData.target_stock.data[nvidiaComparisonData.target_stock.data.length - 1].normalizedPrice - 100) / 100 * 100).toFixed(0)}%
                  </span>
                ) : (
                  "--"
                )}. 
                It's a dream outcome — and it really happened.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 max-w-2xl mx-auto transition-all duration-300 hover:bg-blue-100 hover:shadow-md hover:scale-105">
                <p className="text-lg md:text-xl font-semibold text-blue-800">
                  "Wouldn't it be great to pick the next NVIDIA?"
                </p>
              </div>
            </div>
            {/* Chart - Hidden on mobile */}
            <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-blue-200 bg-white/95 backdrop-blur-sm mx-2 hidden md:block">
              <CardContent>
                {isLoading ? (
                  <div className="w-full h-[400px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <>
                    <div ref={chartRef} className="w-full border rounded-lg bg-white chart-container" />
                    <div className="mt-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-sm md:text-base">NVIDIA (Normalized)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-sm md:text-base">S&P 500 (Normalized)</span>
                        </div>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">Drag to zoom • Double-click to reset • Hover markers for key events • Both normalized to 100 at start</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            {/* Mobile-only explanation */}
            <div className="md:hidden mx-2">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <CardContent>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    📊 <strong>Interactive Chart Available on Desktop:</strong> The full interactive chart showing NVIDIA vs S&P 500 performance with key market events is available when viewing on a larger screen.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

              {/* Section 3: The Harsh Reality */}
        <section className="min-h-screen flex items-center justify-center px-4 pt-32">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-8 md:mb-12 bg-white/90 backdrop-blur-md rounded-xl p-4 md:p-6 shadow-lg mx-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 mt-8 md:mt-16">📉 The Harsh Reality</h2>
              <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 leading-relaxed">
                But here's the catch: most stocks don't beat the market. In fact, our data shows that{" "}
                {(() => {
                  const underperformanceRate = getUnderperformancePercentage();
                  return underperformanceRate !== null ? `${underperformanceRate}%` : "the majority";
                })()} of S&P 500 stocks underperform the S&P 500 index on an annualized basis.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 max-w-2xl mx-auto transition-all duration-300 hover:bg-yellow-100 hover:shadow-md hover:scale-105">
                <p className="text-lg md:text-xl font-semibold text-yellow-800">
                  "The few big winners carry the whole index."
                </p>
              </div>
            </div>
            
            {/* Statistics Cards - Always visible */}
            <div className="mb-6 md:mb-8 mx-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg transition-all duration-200 hover:bg-red-100 hover:scale-105">
                  <div className="text-xl md:text-2xl font-bold text-red-600">
                    {comparisonData ? (
                      <span ref={underperformanceRef}>--</span>
                    ) : (
                      "--"
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Underperformed S&P 500</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg transition-all duration-200 hover:bg-blue-100 hover:scale-105">
                  <div className="text-xl md:text-2xl font-bold text-blue-600">
                    {comparisonData ? (
                      <span ref={sp500ReturnRef}>--</span>
                    ) : (
                      "--"
                    )}
                  </div>
                  <div className="text-sm text-gray-600">S&P 500 Annualized Return</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg transition-all duration-200 hover:bg-green-100 hover:scale-105">
                  <div className="text-xl md:text-2xl font-bold text-green-600">
                    {comparisonData ? (
                      <span ref={outperformanceRef}>--</span>
                    ) : (
                      "--"
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Outperformed S&P 500</div>
                </div>
              </div>
            </div>

            {/* Chart - Hidden on mobile */}
            <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-blue-200 bg-white/95 backdrop-blur-sm mx-2 hidden md:block">
              <CardContent>
                {isLoading ? (
                  <div className="w-full h-[400px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">Loading distribution data...</div>
                  </div>
                ) : (
                  <>
                    <div ref={histogramRef} className="w-full border rounded-lg bg-white chart-container" />
                    <div className="mt-4 text-center text-sm text-gray-500">Hover over bars for detailed information</div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Mobile-only explanation */}
            <div className="md:hidden mx-2">
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <CardContent>
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    📊 <strong>Interactive Histogram Available on Desktop:</strong> A detailed histogram showing the distribution of stock returns vs the S&P 500 is available when viewing on a larger screen.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 4: The Bigger Picture */}
        <section className="min-h-screen flex items-center justify-center px-4 pt-32">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-8 md:mb-12 mx-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 mt-8 md:mt-16">🌳 The Bigger Picture</h2>
              <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 leading-relaxed">
                The market is a complex ecosystem — made up of diverse sectors and thousands of companies. 
                Some thrive. Most don't.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6 max-w-2xl mx-auto transition-all duration-300 hover:bg-green-100 hover:shadow-md hover:scale-105">
                <p className="text-lg md:text-xl font-semibold text-green-800">
                  "Understanding the forest, not just the trees."
                </p>
              </div>
            </div>

            {/* Chart - Hidden on mobile */}
            <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-indigo-200 bg-white/95 backdrop-blur-sm mx-2 hidden md:block">
              <CardContent>
                {isLoading ? (
                  <div className="w-full h-[500px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">Loading market structure...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="text-lg md:text-xl font-semibold mb-2">Interactive S&P 500 Market Structure</h3>
                      <p className="text-sm md:text-base text-gray-600">Rectangle size = market cap (log scale) • Color = average return vs. S&P 500 • Click to zoom into sectors/industries • Use breadcrumbs to navigate</p>
                    </div>
                    <div ref={treemapRef} className="w-full border rounded-lg bg-white" />
                    <div className="mt-4 flex flex-wrap justify-center items-center gap-4 md:gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-400 rounded"></div>
                        <span className="text-xs md:text-sm">Underperformed S&P 500</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                        <span className="text-xs md:text-sm">Similar to S&P 500</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-400 rounded"></div>
                        <span className="text-xs md:text-sm">Outperformed S&P 500</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-xs md:text-sm text-gray-500">
                      Click sectors/industries to zoom in • Hover for details • Use reset button or breadcrumbs to navigate • Data from{" "}
                      {(() => {
                        const { startYear, endYear } = getDataDateRange();
                        return startYear && endYear ? `${startYear}-${endYear}` : "available period";
                      })()} (average returns by level)
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mobile-only explanation */}
            <div className="md:hidden mx-2 mb-6">
              <Card className="p-4 bg-green-50 border-green-200">
                <CardContent>
                  <p className="text-sm text-green-800 leading-relaxed">
                    📊 <strong>Interactive Market Structure Available on Desktop:</strong> An interactive treemap showing S&P 500 companies organized by sector and industry is available when viewing on a larger screen.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 md:mt-8 text-center mx-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 max-w-3xl mx-auto transition-all duration-300 hover:bg-blue-100 hover:shadow-lg hover:scale-[1.02]">
                <h3 className="text-base md:text-lg font-semibold text-blue-800 mb-2">Key Insight</h3>
                <p className="text-sm md:text-base text-blue-700 leading-relaxed">
                  Even within the same sector, individual stocks can have wildly different outcomes. 
                  Technology stocks like NVIDIA soared while Intel struggled. This unpredictability 
                  is why diversification through index funds is so powerful — you capture the 
                  winners without having to predict which ones they'll be.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Try Your Luck */}
        <section className="min-h-screen flex items-center justify-center px-4 pt-40">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-8 md:mb-12 mx-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 mt-12 md:mt-20">🎯 Try Your Luck</h2>
              <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 leading-relaxed">
                Think you can beat the odds? Pick any stock and see how it would've performed from{" "}
                {(() => {
                  const { startYear, endYear } = getDataDateRange();
                  return startYear && endYear ? `${startYear} to ${endYear}` : "the available data period";
                })()}.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 max-w-2xl mx-auto transition-all duration-300 hover:bg-red-100 hover:shadow-md hover:scale-105">
                <p className="text-lg md:text-xl font-semibold text-red-800">
                  "Would you bet your retirement on one guess?"
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mx-2">
              <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-green-200 bg-white/95 backdrop-blur-sm">
                <CardContent>
                  <h3 className="text-lg md:text-xl font-semibold mb-4">Stock Picker</h3>
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative search-container">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Search stocks by symbol, name, or sector..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setShowSearchResults(e.target.value.length > 0 || !e.target.value.trim())
                          }}
                          onFocus={() => setShowSearchResults(true)}
                          className="pl-10"
                        />
                      </div>
                      
                      {/* Search Results Dropdown */}
                      {showSearchResults && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                          {searchQuery !== debouncedSearchQuery && searchQuery.length > 0 ? (
                            <div className="px-4 py-2 text-gray-500 text-center">
                              <div className="animate-pulse">Searching...</div>
                            </div>
                          ) : (
                            <>
                              {filteredStocks.map((stock) => {
                            const isAlreadySelected = portfolioStocks.some(p => p.symbol === stock.symbol)
                            return (
                              <div
                                key={stock.symbol}
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                                  isAlreadySelected ? 'bg-gray-100 text-gray-500' : ''
                                }`}
                                onClick={() => !isAlreadySelected && addStockToPortfolio(stock.symbol)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-semibold">{stock.symbol}</div>
                                    <div className="text-sm text-gray-600">{stock.name}</div>
                                  </div>
                                  <div className="text-xs text-gray-500">{stock.sector}</div>
                                </div>
                                {isAlreadySelected && (
                                  <div className="text-xs text-gray-400 mt-1">Already selected</div>
                                )}
                              </div>
                            )
                          })}
                              {filteredStocks.length === 0 && (
                                <div className="px-4 py-2 text-gray-500 text-center">No stocks found</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Portfolio Stocks */}
                    <div className="space-y-3">
                      {portfolioStocks.length === 0 ? (
                        <div className="text-center p-6 text-gray-500 border border-dashed border-gray-200 rounded-lg">
                          <div className="mb-2">🔍</div>
                          <div>Search and select stocks to build your portfolio</div>
                        </div>
                      ) : (
                        portfolioStocks.map((stock) => {
                          const stockData = comparisonData?.stocks[stock.symbol]
                          return (
                            <div key={stock.symbol} className="border rounded-lg p-4 bg-gray-50 transition-all duration-200 hover:bg-gray-100 hover:shadow-md hover:scale-[1.02]">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{stock.symbol}</Badge>
                                  <span className="text-sm text-gray-600">
                                    {stockData?.name || stock.symbol}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStockFromPortfolio(stock.symbol)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Investment:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    placeholder="100"
                                    value={stock.investment === "" ? "" : stock.investment}
                                    onChange={(e) => {
                                      const value = e.target.value === "" ? "" : parseFloat(e.target.value) || ""
                                      updateInvestment(stock.symbol, typeof value === "number" ? Math.max(0, value) : "")
                                    }}
                                    className="w-24 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
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

              <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-blue-200 bg-white/95 backdrop-blur-sm">
                <CardContent>
                  <h3 className="text-lg md:text-xl font-semibold mb-4">Portfolio Allocation</h3>
                  <div className="space-y-4">
                    {portfolioStocks.length === 0 ? (
                      <div className="text-center p-6 md:p-8 text-gray-500">
                        <div className="mb-4">📊</div>
                        <div className="text-sm md:text-base">Add stocks and set investments to see your portfolio allocation</div>
                      </div>
                    ) : (
                      <>
                        {isLoading ? (
                          <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                            <div className="text-gray-400">Loading chart...</div>
                          </div>
                        ) : (
                          <div ref={pieChartRef} className="w-full border rounded-lg bg-white hidden md:block" />
                        )}
                        
                        {/* Mobile-only message for pie chart */}
                        <div className="md:hidden">
                          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-800">
                              📊 Interactive pie chart available on desktop
                            </div>
                          </div>
                        </div>
                        
                        {/* Portfolio Summary */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg transition-all duration-300 hover:bg-blue-100 hover:scale-105 hover:shadow-md cursor-pointer">
                            <span className="font-medium">Total Portfolio Value</span>
                            <span className="font-bold text-blue-600">
                              <span ref={totalPortfolioValueRef}>
                                ${(() => {
                                  if (isCalculated) {
                                    const updatedValues = getUpdatedPortfolioValues()
                                    return updatedValues.reduce((sum, stock) => sum + stock.value, 0).toLocaleString()
                                  }
                                  return getTotalPortfolioValue().toLocaleString()
                                })()}
                              </span>
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 text-center">
                            {portfolioStocks.length === 1 ? "1 stock selected" : `${portfolioStocks.length} stocks selected`}
                          </div>
                        </div>

                        {/* Stock List with Percentages */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700">Portfolio Breakdown:</h4>
                          {(() => {
                            if (isCalculated) {
                              // Show updated values after returns
                              const updatedValues = getUpdatedPortfolioValues()
                              const totalValue = updatedValues.reduce((sum, stock) => sum + stock.value, 0)
                              return updatedValues
                                .sort((a, b) => b.value - a.value)
                                .map((stock) => {
                                  const percentage = ((stock.value / totalValue) * 100).toFixed(1)
                                  const gain = stock.value - (stock.originalValue || 0)
                                  const returnPct = ((stock.return || 0) * 100).toFixed(1)
                                  return (
                                    <div key={stock.symbol} className="flex justify-between items-center text-sm py-1 px-2 rounded transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] cursor-pointer">
                                      <span className="font-medium">{stock.symbol}</span>
                                      <div className="text-right">
                                        <div>${stock.value.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">
                                          {percentage}% • {returnPct}% return
                                        </div>
                                        <div className={`text-xs ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {gain >= 0 ? '+' : ''}${gain.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                            } else {
                              // Show original investment amounts
                              return portfolioStocks
                                .sort((a, b) => {
                                  const aInvestment = typeof a.investment === "number" ? a.investment : 100
                                  const bInvestment = typeof b.investment === "number" ? b.investment : 100
                                  return bInvestment - aInvestment
                                })
                                .map((stock) => {
                                  const investment = typeof stock.investment === "number" ? stock.investment : 100
                                  const percentage = ((investment / getTotalPortfolioValue()) * 100).toFixed(1)
                                  return (
                                    <div key={stock.symbol} className="flex justify-between items-center text-sm py-1 px-2 rounded transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] cursor-pointer">
                                      <span className="font-medium">{stock.symbol}</span>
                                      <div className="text-right">
                                        <div>${investment.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{percentage}%</div>
                                      </div>
                                    </div>
                                  )
                                })
                            }
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Results Section - Only shown after calculation */}
              {isCalculated && (
                <div className="lg:col-span-2 mt-6 md:mt-8">
                  <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-purple-200">
                    <CardContent>
                      <h3 className="text-lg md:text-xl font-semibold mb-4">Your Results</h3>
                      <div className="space-y-4">
                        {isLoading ? (
                          <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                            <div className="text-gray-400">Loading portfolio data...</div>
                          </div>
                        ) : (
                          <>
                            {/* Chart - Hidden on mobile */}
                            <div ref={portfolioChartRef} className="w-full border rounded-lg bg-white mb-4 hidden md:block" />
                            
                            {/* Mobile-only message for portfolio chart */}
                            <div className="md:hidden mb-4">
                              <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="text-sm text-purple-800">
                                  📊 Interactive portfolio comparison chart available on desktop
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-green-50 rounded-lg transition-all duration-200 hover:bg-green-100 hover:scale-105 cursor-pointer">
                                <span className="text-sm md:text-base">Your Portfolio Return</span>
                                <span className="font-bold text-green-600 text-lg md:text-xl">
                                  <span ref={portfolioReturnValueRef}>--</span>
                                </span>
                              </div>
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-blue-50 rounded-lg transition-all duration-200 hover:bg-blue-100 hover:scale-105 cursor-pointer">
                                <span className="text-sm md:text-base">S&P 500 Return</span>
                                <span className="font-bold text-blue-600 text-lg md:text-xl">
                                  <span ref={sp500ReturnValueRef}>--</span>
                                </span>
                              </div>
                              <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer ${
                                portfolioReturn > sp500Return 
                                  ? 'bg-gray-50 hover:bg-gray-100' 
                                  : 'bg-red-100 hover:bg-red-200'
                              }`}>
                                <span className="text-sm md:text-base">Difference</span>
                                <span className={`font-bold text-lg md:text-xl ${portfolioReturn > sp500Return ? 'text-green-600' : 'text-red-600'}`}>
                                  <span ref={differenceValueRef}>--</span>
                                </span>
                              </div>
                            </div>

                            <div className={`mt-6 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                              portfolioReturn > sp500Return 
                                ? 'bg-green-50 hover:bg-green-100' 
                                : 'bg-yellow-50 hover:bg-yellow-100'
                            }`}>
                              <h4 className={`font-semibold mb-2 text-base md:text-lg ${
                                portfolioReturn > sp500Return 
                                  ? 'text-green-800' 
                                  : 'text-yellow-800'
                              }`}>
                                {portfolioReturn > sp500Return ? 'Nice job!' : 'Reality Check'}
                              </h4>
                              <p className={`text-sm md:text-base leading-relaxed ${
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
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 6: Behavioral Finance */}
        <section className="min-h-screen py-16 px-4 pt-40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16 mx-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 mt-12 md:mt-20">🧠 Why We Still Try to Beat the Market</h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Even with the data staring us in the face, many investors still try to pick the next big winner. Why?
                Behavioral finance reveals the hidden biases that lead us astray.
              </p>
            </div>

            {/* Loss Aversion */}
            <div className="mb-12 md:mb-16 mx-2">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4 mt-6 md:mt-8">📉 Loss Aversion</h3>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  We feel the pain of losses twice as strongly as the joy of gains.
                  This leads to overly conservative behavior after losses — or holding losers too long, hoping they'll rebound.
                </p>
              </div>
              
              <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-yellow-200 bg-white/95 backdrop-blur-sm">
                <CardContent>
                  <div className="text-center mb-4">
                    <h4 className="text-lg md:text-xl font-semibold">Two Portfolios, Same 8% Annual Return</h4>
                    <p className="text-sm md:text-base text-gray-600">Which would you prefer?</p>
                  </div>
                  {isLoading ? (
                    <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Loading chart...</div>
                    </div>
                  ) : (
                    <>
                      {/* Chart - Hidden on mobile */}
                      <div ref={lossAversionRef} className="w-full border rounded-lg bg-white hidden md:block" />
                      
                      {/* Mobile-only explanation */}
                      <div className="md:hidden mb-4">
                        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="text-sm text-yellow-800">
                            📊 Interactive portfolio comparison chart available on desktop
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg transition-colors duration-200 hover:bg-yellow-100">
                    <p className="text-sm md:text-base text-yellow-700 leading-relaxed">
                      <strong>Reality Check:</strong> Most people say they want growth, but feel losses more deeply in practice.
                      The volatile portfolio's dips would cause many investors to panic and sell at the worst times.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overconfidence Bias */}
            <div className="mb-12 md:mb-16 mx-2">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4 mt-6 md:mt-8">🚀 Overconfidence Bias</h3>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Most investors believe they're above average. But in investing, confidence without accuracy is costly.
                </p>
              </div>
              
              <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-orange-200 bg-white/95 backdrop-blur-sm">
                <CardContent>
                  <div className="text-center mb-6">
                    <h4 className="text-lg md:text-xl font-semibold">Quick Knowledge Check</h4>
                    <p className="text-sm md:text-base text-gray-600">Test your investing knowledge</p>
                  </div>
                  
                  {!showQuizResults ? (
                    <div className="space-y-4 md:space-y-6">
                      {quizQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="border rounded-lg p-3 md:p-4 transition-all duration-200 hover:shadow-md hover:border-blue-300">
                          <h5 className="font-semibold mb-3 text-sm md:text-base">{q.question}</h5>
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
                                className="justify-start transition-all duration-200 hover:scale-105 text-xs md:text-sm"
                                size="sm"
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
            <div className="mb-12 md:mb-16 mx-2">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4 mt-6 md:mt-8">🔮 Hindsight Bias</h3>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  "Of course that stock was going to win — the trend was so obvious!"
                  But was it really predictable, or are you just seeing patterns after the fact?
                </p>
              </div>
              
              <Card className="p-4 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-purple-200 bg-white/95 backdrop-blur-sm">
                <CardContent>
                  <div className="text-center mb-6">
                    <h4 className="text-lg md:text-xl font-semibold">The Holdout Test</h4>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      {!showChartResults 
                        ? `Based on 2010-2018 performance, select up to 3 stocks you think will outperform the S&P 500 going forward`
                        : "Results revealed - see how your 'obvious' picks performed from 2019 onwards"
                      }
                    </p>
                  </div>
                  
                  {isLoading ? (
                    <div className="w-full h-[200px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Loading stock charts...</div>
                    </div>
                  ) : (
                    <>
                      {/* Charts - Hidden on mobile */}
                      <div ref={hindsightChartRef} className="w-full mb-4 hidden md:block" />
                      
                      {/* Mobile-only explanation */}
                      <div className="md:hidden mb-4">
                        <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="text-sm text-purple-800">
                            📊 Interactive stock selection charts available on desktop
                          </div>
                        </div>
                      </div>
                      
                      {!showChartResults ? (
                        <div className="text-center">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 max-w-2xl mx-auto transition-all duration-300 hover:bg-blue-100 hover:shadow-md hover:scale-[1.02]">
                            <p className="text-blue-800 text-xs md:text-sm leading-relaxed">
                              <strong>Instructions:</strong> You can see each stock's performance from 2010-2018. 
                              Pick up to 3 stocks that you think will continue to outperform the S&P 500 from 2019 onwards.
                              Stock names are hidden to prevent bias.
                            </p>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Selected: {selectedCharts.length}/3 charts
                          </p>
                          <Button 
                            onClick={() => setShowChartResults(true)}
                            disabled={selectedCharts.length === 0}
                            className="transition-all duration-300 hover:scale-110 hover:shadow-lg text-sm md:text-base"
                            size="sm"
                          >
                            See How My Picks Did (2019-2024)
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 transition-all duration-300 hover:bg-yellow-100 hover:shadow-md hover:scale-[1.02]">
                            <p className="text-yellow-800 text-sm md:text-base leading-relaxed">
                              <strong>The Hindsight Trap:</strong> Now that you see the full timeline, the results might seem "obvious."
                              But remember — you made your picks based only on 2010-2018 data!
                              <br/><br/>
                              <span className="text-xs md:text-sm">
                                🔵 Blue = Training period (2010-2018) • 🟢 Green = Beat S&P 500 in test period (2019+) • 🔴 Red = Underperformed S&P 500 in test period
                              </span>
                            </p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:bg-gray-100 hover:shadow-md hover:scale-[1.02]">
                            <p className="text-gray-700 text-xs md:text-sm leading-relaxed">
                              <strong>Key Lesson:</strong> Past performance doesn't predict future results. 
                              What looked like clear winners in 2018 may have become losers by 2024. 
                              This is why professional investors use techniques like cross-validation and why 
                              index funds remain a robust choice — they don't rely on predicting individual winners.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recap */}
            <div className="text-center mx-2">
              <div className="bg-gray-900 text-white rounded-lg p-6 md:p-8 max-w-2xl mx-auto transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:shadow-2xl">
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-white">🧾 The Takeaway</h3>
                <p className="text-lg md:text-xl mb-6 text-gray-100 leading-relaxed">
                  "Your brain isn't wired for investing. That's why index funds work."
                </p>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-300 hover:scale-110 hover:shadow-lg text-sm md:text-base"
                  asChild
                  size="sm"
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
        <section className="min-h-screen flex items-center justify-center px-4 pt-32 text-white">
          <div className="max-w-4xl text-center bg-gray-900/90 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl mx-2">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 mt-8 md:mt-16">The Lesson</h2>
            <p className="text-lg md:text-xl mb-6 md:mb-8 text-gray-300 leading-relaxed">
              You don't need to predict the future. You just need to own it. Index funds don't rely on luck. 
              They own the entire market, capturing every NVIDIA and weathering every disappointment.
            </p>

            {/* Callout Box */}
            <div className="bg-blue-600 border border-blue-500 rounded-lg p-4 md:p-6 mb-6 md:mb-8 transition-all duration-300 hover:bg-blue-500 hover:scale-105 hover:shadow-2xl">
              <p className="text-lg md:text-2xl font-semibold text-white leading-relaxed">
                "Consistent. Diversified. Low-cost. That's the index advantage."
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8 md:mt-12">
              <div className="p-4 md:p-6 bg-gray-800 rounded-lg transition-all duration-300 hover:bg-gray-700 hover:scale-105 hover:shadow-xl">
                <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-green-500 mb-3 md:mb-4 mx-auto transition-transform duration-300 hover:scale-110" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">Index Investing</h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed">Consistent returns, low fees, automatic diversification</p>
              </div>
              <div className="p-4 md:p-6 bg-gray-800 rounded-lg transition-all duration-300 hover:bg-gray-700 hover:scale-105 hover:shadow-xl">
                <TrendingDown className="w-10 h-10 md:w-12 md:h-12 text-red-500 mb-3 md:mb-4 mx-auto transition-transform duration-300 hover:scale-110" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">Stock Picking</h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed">High risk, requires expertise, most fail to beat the market</p>
              </div>
            </div>

            <div className="mt-8 md:mt-12">
              <p className="text-sm md:text-lg text-gray-400 leading-relaxed">
                This is not investment advice. Always consult with a financial advisor.
              </p>
            </div>
          </div>
        </section>

        {/* Footer with dataset reference */}
        <footer className="border-t mt-8 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center">
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
              <div className="flex items-center">
                <span>Project repository: </span>
                <a
                  href="https://github.com/CarterT27/outperforming-the-index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 ml-1 text-primary hover:underline"
                >
                  GitHub Repository
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
