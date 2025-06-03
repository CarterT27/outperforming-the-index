import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import comparisonData from '../../public/data/comparison_data.json';

interface StockData {
  date: string;
  price: number;
  normalizedPrice: number;
}

interface Stock {
  name: string;
  data: StockData[];
}

interface ComparisonData {
  stocks: {
    [key: string]: Stock;
  };
  sp500: Stock;
}

interface PortfolioData {
  date: string;
  portfolioValue: number;
  sp500Value: number;
}

const OutperformingIndex: React.FC = () => {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [sp500Value, setSp500Value] = useState<number>(0);
  const [portfolioReturn, setPortfolioReturn] = useState<number>(0);
  const [sp500Return, setSp500Return] = useState<number>(0);
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([]);

  const calculatePortfolioValue = () => {
    const data = comparisonData as ComparisonData;
    const startDate = '2023-03-01';
    const endDate = '2024-03-01';
    
    // Calculate portfolio progression
    const progression: PortfolioData[] = [];
    const dates = data.sp500.data.map(d => d.date);
    
    dates.forEach(date => {
      let totalValue = 0;
      const perStockInvestment = investmentAmount / selectedStocks.length;
      
      selectedStocks.forEach(stockSymbol => {
        const stock = data.stocks[stockSymbol];
        const stockData = stock.data.find(d => d.date === date);
        if (stockData) {
          totalValue += perStockInvestment * (stockData.normalizedPrice / 100);
        }
      });
      
      const sp500Data = data.sp500.data.find(d => d.date === date);
      const sp500Value = investmentAmount * (sp500Data?.normalizedPrice || 0) / 100;
      
      progression.push({
        date,
        portfolioValue: totalValue,
        sp500Value
      });
    });
    
    setPortfolioData(progression);
    
    // Calculate final values
    const finalPortfolioValue = progression[progression.length - 1].portfolioValue;
    const finalSp500Value = progression[progression.length - 1].sp500Value;
    
    setPortfolioValue(finalPortfolioValue);
    setSp500Value(finalSp500Value);
    setPortfolioReturn(((finalPortfolioValue - investmentAmount) / investmentAmount) * 100);
    setSp500Return(((finalSp500Value - investmentAmount) / investmentAmount) * 100);
  };

  const handleStockChange = (stock: string) => {
    setSelectedStocks(prev => {
      if (prev.includes(stock)) {
        return prev.filter(s => s !== stock);
      }
      return [...prev, stock];
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Outperforming the Index</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Investment Amount ($)</label>
        <input
          type="number"
          value={investmentAmount}
          onChange={(e) => setInvestmentAmount(Number(e.target.value))}
          className="border rounded p-2 w-full"
          min="1000"
          step="1000"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Stocks</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries((comparisonData as ComparisonData).stocks).map(([symbol, stock]) => (
            <label key={symbol} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedStocks.includes(symbol)}
                onChange={() => handleStockChange(symbol)}
                className="form-checkbox"
              />
              <span>{symbol} - {stock.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={calculatePortfolioValue}
        disabled={selectedStocks.length === 0}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        Calculate Returns
      </button>

      {portfolioData.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Portfolio Progression</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="portfolioValue" 
                  name="Portfolio Value" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="sp500Value" 
                  name="S&P 500 Value" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {portfolioValue > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Portfolio Performance</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${portfolioValue.toLocaleString()}
            </p>
            <p className={`text-lg ${portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioReturn.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">S&P 500 Performance</h3>
            <p className="text-2xl font-bold text-red-600">
              ${sp500Value.toLocaleString()}
            </p>
            <p className={`text-lg ${sp500Return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sp500Return.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutperformingIndex; 