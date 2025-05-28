"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-green-600 border-b border-green-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold text-black mb-2">
              The Illusion of Outperformance: What Looks Like a Win, Rarely Lasts
            </h1>
            <p className="text-sm text-green-100 font-semibold">
              By Carter Tran, April Huang, and Cheryl Xiang
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Visualization
        </Button>

        <div className="max-w-3xl mx-auto space-y-8">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">What We've Done So Far</h2>
              <p className="text-gray-600 mb-4">
                So far, we've built an interactive graph that compares NVIDIA's performance to the S&P 500 by normalizing both to the same starting point. This visualization highlights just how dramatically NVIDIA has outpaced the broader market, with its normalized return exceeding 31,000, while the S&P 500 saw more modest growth. We then created a second interactive graph that places NVIDIA’s annual return within the distribution of all S&P 500 stock returns, revealing that while two-thirds of companies underperformed the market average, NVIDIA was one of the few extreme outperformers. Together, these visualizations tell a compelling story: how cherry-picking one successful stock like NVIDIA can influence investor psychology and fuel the desire to chase the “next big winner.” The first graph allows users to hover and explore exact price index values over time, while the second lets users examine the distribution of returns and how many stocks fall into each range.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Challenging Next Steps</h2>
              <p className="text-gray-600 mb-4">
              The most challenging part of designing our final product will be implementing the interactive investment simulation. Our goal is to allow users to build a custom portfolio by selecting from a list of major stocks, then dynamically calculate and display the portfolio’s average annual return alongside the S&P 500’s average as a benchmark. To do this, we'll need to pull historical stock data, compute cumulative and annualized returns, and ensure that results update instantly as users add or remove stocks. Beyond the technical complexity, we also want the final visualization to clearly convey our message: that even when a portfolio appears to beat the market, success can often be due to a few outliers rather than consistent strategy. Maintaining this balance between interactivity and storytelling will be key to delivering a thoughtful and engaging user experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 