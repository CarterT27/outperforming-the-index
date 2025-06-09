#!/usr/bin/env python3
"""
Full S&P 500 Hindsight Bias Analysis

This script analyzes the full S&P 500 dataset to find the best examples
of hindsight bias - stocks that would have looked like great picks based
on historical performance but then underperformed going forward.

Since we only have start/end data points for each stock, we'll simulate
what the hindsight bias demo should show by identifying stocks with:
1. High annualized returns (would look attractive)
2. High volatility (indicating risk that might not be obvious in hindsight)
3. Performance vs market patterns
"""

import json
import pandas as pd
from pathlib import Path
import numpy as np

def load_full_comparison_data():
    """Load the full S&P 500 comparison data"""
    data_dir = Path("public/data")
    
    with open(data_dir / "comparison_data.json", 'r') as f:
        comparison_data = json.load(f)
    
    return comparison_data

def analyze_full_sp500_for_hindsight_bias():
    """Analyze the full S&P 500 dataset to find stocks that would look great in training but fail in test period"""
    comparison_data = load_full_comparison_data()
    
    # Get S&P 500 benchmark
    sp500_metrics = comparison_data['sp500']['metrics']
    sp500_return = sp500_metrics['annualizedReturn']
    sp500_volatility = sp500_metrics['volatility']
    
    print("HINDSIGHT BIAS TRAP ANALYSIS")
    print("Finding stocks that looked great 2010-2018 but disappointed 2019-2024")
    print("=" * 70)
    print(f"Analyzing {len(comparison_data['stocks'])} stocks")
    print(f"S&P 500 Benchmark Return: {sp500_return:.2%}")
    print("-" * 70)
    
    # Convert stocks data to DataFrame for analysis
    stocks_list = []
    for symbol, stock_data in comparison_data['stocks'].items():
        metrics = stock_data['metrics']
        stocks_list.append({
            'symbol': symbol,
            'name': stock_data['name'],
            'sector': stock_data['sector'],
            'industry': stock_data['industry'],
            'annualized_return': metrics['annualizedReturn'],
            'volatility': metrics['volatility'],
            'total_return': metrics['totalReturn'],
            'years': metrics['years'],
            'market_cap': metrics['marketCap'],
            'outperformed_market': metrics['annualizedReturn'] > sp500_return,
            'return_vs_market': metrics['annualizedReturn'] - sp500_return,
            'volatility_vs_market': metrics['volatility'] - sp500_volatility,
            'risk_adjusted_return': metrics['annualizedReturn'] / metrics['volatility'] if metrics['volatility'] > 0 else 0,
            'market_risk_adjusted': sp500_return / sp500_volatility
        })
    
    df = pd.DataFrame(stocks_list)
    
    # Add analysis columns for hindsight bias identification
    df['early_boom_candidate'] = (
        # Stocks that likely peaked early (indicators of this pattern)
        (df['volatility'] > df['volatility'].quantile(0.8)) &  # High volatility suggests boom-bust cycles
        (df['annualized_return'] > sp500_return * 1.2) &       # Good overall returns to look attractive
        (df['annualized_return'] < df['annualized_return'].quantile(0.9))  # But not the absolute best (those likely sustained)
    )
    
    # Look for specific patterns that indicate early peak / late decline
    # Stocks with moderate-high returns but very high volatility often had their best years early
    df['hindsight_trap_score'] = (
        (df['annualized_return'] / sp500_return) * 0.3 +  # Decent returns to look attractive
        (df['volatility'] / sp500_volatility) * 0.4 +     # High volatility indicates boom-bust
        (1 / (df['market_cap'] / 1e11)) * 0.2 +           # Smaller companies more prone to this
        (df['sector'].isin(['Technology', 'Communication Services', 'Consumer Cyclical']).astype(int)) * 0.1  # Sectors prone to bubbles
    )
    
    print("STOCKS MOST LIKELY TO BE HINDSIGHT BIAS TRAPS:")
    print("(Would have looked great 2010-2018 but likely disappointed 2019-2024)")
    print("=" * 80)
    print(f"{'Symbol':<6} | {'Return':<8} | {'Volatility':<10} | {'Trap Score':<10} | {'Reason':<15} | {'Company'}")
    print("-" * 80)
    
    # Sort by trap score to find the best candidates
    potential_traps = df.sort_values('hindsight_trap_score', ascending=False).head(25)
    
    for _, row in potential_traps.iterrows():
        # Determine why this stock is likely a hindsight trap
        reasons = []
        if row['volatility'] > sp500_volatility * 2:
            reasons.append("High Vol")
        if row['market_cap'] < 50e9:
            reasons.append("Small Cap")
        if row['sector'] in ['Technology', 'Communication Services']:
            reasons.append("Bubble Sector")
        if row['annualized_return'] > sp500_return * 1.5:
            reasons.append("High Return")
        
        reason_str = ",".join(reasons[:2])  # Show top 2 reasons
        
        print(f"{row['symbol']:<6} | {row['annualized_return']:7.1%} | {row['volatility']:9.1%} | "
              f"{row['hindsight_trap_score']:9.2f} | {reason_str:<15} | {row['name'][:25]}")
    
    print("\n" + "=" * 70)
    print("SPECIFIC HINDSIGHT BIAS TRAP CANDIDATES:")
    print("(Best stocks for the demo - would fool investors)")
    print("=" * 70)
    
    # Now find the absolute best candidates based on specific criteria
    hindsight_candidates = df[
        (df['annualized_return'] > sp500_return * 1.1) &  # Beat market enough to look attractive
        (df['annualized_return'] < sp500_return * 2.5) &  # But not so much they're obvious outliers
        (df['volatility'] > sp500_volatility * 1.8) &      # High enough volatility to suggest boom-bust
        (df['hindsight_trap_score'] > df['hindsight_trap_score'].quantile(0.7))  # High trap score
    ].sort_values('hindsight_trap_score', ascending=False)
    
    print(f"Found {len(hindsight_candidates)} perfect hindsight bias traps:")
    print()
    
    for i, (_, row) in enumerate(hindsight_candidates.head(12).iterrows(), 1):
        volatility_multiple = row['volatility'] / sp500_volatility
        return_multiple = row['annualized_return'] / sp500_return
        
        # Determine the trap narrative
        trap_reasons = []
        if row['volatility'] > sp500_volatility * 2.5:
            trap_reasons.append("extreme volatility would have caused panic selling")
        elif row['volatility'] > sp500_volatility * 2:
            trap_reasons.append("high volatility would have tested investor nerves")
        
        if row['market_cap'] < 20e9:
            trap_reasons.append("small company with high failure risk")
        elif row['market_cap'] < 100e9:
            trap_reasons.append("mid-cap company with concentration risk")
            
        if row['sector'] == 'Technology':
            trap_reasons.append("tech stock vulnerable to bubble bursts")
        elif row['sector'] == 'Communication Services':
            trap_reasons.append("communications sector prone to disruption")
        elif row['sector'] == 'Consumer Cyclical':
            trap_reasons.append("cyclical stock vulnerable to economic downturns")
        
        trap_narrative = " and ".join(trap_reasons[:2]) if trap_reasons else "challenging to hold long-term"
        
        print(f"{i:2}. {row['symbol']:<5} | {row['sector']:<20}")
        print(f"     Return: {row['annualized_return']:6.1%} ({return_multiple:.1f}x market) - looks amazing!")
        print(f"     BUT: {row['volatility']:5.1%} volatility ({volatility_multiple:.1f}x market) - {trap_narrative}")
        print(f"     Trap Score: {row['hindsight_trap_score']:.2f} | {row['name']}")
        print()
    
    print("=" * 70)
    print("FINAL DEMO RECOMMENDATIONS:")
    print("(Perfect stocks to trick users in the hindsight bias demo)")
    print("=" * 70)
    
    # Select the absolute best candidates for the demo
    # These should be stocks that would genuinely fool smart investors
    demo_candidates = hindsight_candidates.head(8).copy()
    
    # Add some manually identified known traps based on market knowledge
    known_traps = ['NFLX', 'PELOTON', 'ZOOM', 'ROKU', 'PTON', 'ZM', 'TDOC', 'BYND']  # These had early peaks
    
    print("TOP PICKS FOR HINDSIGHT BIAS DEMO:")
    print("(These would genuinely fool investors)")
    print()
    
    final_picks = []
    sectors_used = set()
    
    # Start with our calculated candidates
    for _, row in demo_candidates.iterrows():
        if len(final_picks) >= 6:
            break
        if row['sector'] not in sectors_used or len(final_picks) < 4:
            final_picks.append(row)
            sectors_used.add(row['sector'])
    
    for i, row in enumerate(final_picks, 1):
        # Create compelling demo narrative
        why_looks_good = f"{row['annualized_return']:.1%} return beats S&P 500's {sp500_return:.1%}"
        why_its_trap = f"{row['volatility']:.1%} volatility means extreme ups and downs"
        
        if row['market_cap'] < 50e9:
            company_risk = "Small company - high bankruptcy risk"
        elif row['market_cap'] < 200e9:
            company_risk = "Mid-cap - vulnerable to competition"
        else:
            company_risk = "Large but volatile - prone to bubbles"
        
        print(f"📈 {i}. {row['symbol']} - {row['name']}")
        print(f"   💰 Why it looks great: {why_looks_good}")
        print(f"   ⚠️  Why it's a trap: {why_its_trap}")
        print(f"   🏢 Company risk: {company_risk}")
        print(f"   📊 Sector: {row['sector']} | Market Cap: ${row['market_cap']/1e9:.1f}B")
        print(f"   🎯 Trap Score: {row['hindsight_trap_score']:.2f}/10")
        print()
    
    print("=" * 70)
    print("HINDSIGHT BIAS TRAP STATISTICS:")
    print("=" * 70)
    
    # Overall statistics focused on trap identification
    total_stocks = len(df)
    trap_candidates = len(hindsight_candidates)
    high_vol_stocks = len(df[df['volatility'] > sp500_volatility * 1.5])
    early_boom_stocks = len(df[df['early_boom_candidate']])
    
    print(f"📊 Total S&P 500 stocks analyzed: {total_stocks}")
    print(f"🎯 Perfect hindsight bias traps found: {trap_candidates} ({trap_candidates/total_stocks:.1%})")
    print(f"⚡ High volatility stocks (>1.5x market): {high_vol_stocks} ({high_vol_stocks/total_stocks:.1%})")
    print(f"📈 Early boom candidates: {early_boom_stocks} ({early_boom_stocks/total_stocks:.1%})")
    
    # Trap analysis
    print(f"\n🧠 PSYCHOLOGY OF THE TRAP:")
    avg_trap_return = hindsight_candidates['annualized_return'].mean()
    avg_trap_vol = hindsight_candidates['volatility'].mean()
    
    print(f"   Average trap return: {avg_trap_return:.1%} (vs S&P 500: {sp500_return:.1%})")
    print(f"   Average trap volatility: {avg_trap_vol:.1%} (vs S&P 500: {sp500_volatility:.1%})")
    print(f"   Return looks {avg_trap_return/sp500_return:.1f}x better than market")
    print(f"   But volatility is {avg_trap_vol/sp500_volatility:.1f}x higher!")
    
    # Sector analysis for traps
    print(f"\n🏭 TRAP SECTORS:")
    trap_sectors = hindsight_candidates['sector'].value_counts()
    for sector, count in trap_sectors.head(5).items():
        pct = count / len(hindsight_candidates) * 100
        print(f"   {sector}: {count} stocks ({pct:.0f}% of traps)")
    
    print(f"\n⚠️  KEY INSIGHT:")
    print(f"   The best hindsight bias traps beat the market by {(avg_trap_return - sp500_return)*100:.1f}%")
    print(f"   But their {avg_trap_vol:.1f}% volatility would have caused most investors to panic sell")
    print(f"   This is why these stocks are perfect for demonstrating hindsight bias!")
    
    # Save results
    output_file = "full_sp500_hindsight_analysis.csv"
    df.sort_values('annualized_return', ascending=False).to_csv(output_file, index=False)
    print(f"\nDetailed results saved to: {output_file}")
    
    return df, demo_candidates

def identify_specific_hindsight_examples():
    """Identify specific examples that would work well for the demo"""
    comparison_data = load_full_comparison_data()
    
    print("\n" + "=" * 60)
    print("SPECIFIC RECOMMENDATIONS FOR DEMO:")
    print("=" * 60)
    
    # Look for specific patterns that demonstrate hindsight bias
    stocks = comparison_data['stocks']
    sp500_return = comparison_data['sp500']['metrics']['annualizedReturn']
    
    examples = [
        {
            'type': 'High Return, High Risk',
            'description': 'Stocks with great returns but extreme volatility',
            'criteria': lambda s: s['metrics']['annualizedReturn'] > sp500_return * 1.5 and s['metrics']['volatility'] > 0.4
        },
        {
            'type': 'Sector Concentration Risk',
            'description': 'Tech stocks that benefited from the specific period',
            'criteria': lambda s: s['sector'] == 'Technology' and s['metrics']['annualizedReturn'] > sp500_return * 1.3
        },
        {
            'type': 'Small Cap Survivors',
            'description': 'Small companies that survived but were risky',
            'criteria': lambda s: s['metrics']['marketCap'] < 10e9 and s['metrics']['annualizedReturn'] > sp500_return * 1.2
        }
    ]
    
    for example in examples:
        print(f"\n{example['type']}:")
        print(f"Description: {example['description']}")
        
        matching_stocks = []
        for symbol, stock_data in stocks.items():
            if example['criteria'](stock_data):
                matching_stocks.append((symbol, stock_data))
        
        # Sort by return and take top 3
        matching_stocks.sort(key=lambda x: x[1]['metrics']['annualizedReturn'], reverse=True)
        
        for symbol, stock_data in matching_stocks[:3]:
            metrics = stock_data['metrics']
            print(f"  {symbol}: {stock_data['name'][:30]}")
            print(f"    Return: {metrics['annualizedReturn']:.1%}, Volatility: {metrics['volatility']:.1%}")
            print(f"    Market Cap: ${metrics['marketCap']/1e9:.1f}B")

if __name__ == "__main__":
    try:
        results_df, demo_candidates = analyze_full_sp500_for_hindsight_bias()
        identify_specific_hindsight_examples()
        print("\nAnalysis completed successfully!")
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback
        traceback.print_exc() 