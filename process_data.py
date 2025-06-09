import pandas as pd
import json
from pathlib import Path
import kagglehub
from kagglehub import KaggleDatasetAdapter
import numpy as np
from datetime import datetime

def load_data(file_path: str = "sp500_stocks.csv"):
    """Load data from Kaggle dataset or local parquet file."""
    if not Path(file_path.replace('.csv', '.parquet')).exists():
        df = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            "andrewmvd/sp-500-stocks",
            file_path,
            pandas_kwargs={"parse_dates": ["Date"] if file_path != 'sp500_companies.csv' else None},
        )
        numeric_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        if "Date" in df.columns:
            df = df.set_index('Date')
        df.to_parquet(file_path.replace('.csv', '.parquet'))
    else:
        df = pd.read_parquet(file_path.replace('.csv', '.parquet'))
        if "Date" in df.columns:
            df = df.set_index('Date')
        if not isinstance(df.index, pd.DatetimeIndex) and df.index.name == 'Date':
            df.index = pd.to_datetime(df.index)
    return df

def process_nvidia_comparison_data(stocks_df: pd.DataFrame, companies_df: pd.DataFrame, target_stock: str = "NVDA"):
    """Process data for the NVIDIA vs S&P 500 comparison chart with daily data."""
    # Get target stock data
    target_data = stocks_df[stocks_df['Symbol'] == target_stock].copy()
    
    # Calculate daily returns for target stock
    target_data['Return'] = target_data['Adj Close'].pct_change()
    
    # Calculate cumulative returns starting from 100
    target_data['Cumulative_Return'] = (1 + target_data['Return']).cumprod() * 100
    
    # Calculate S&P 500 returns (average of all stocks)
    sp500_returns = stocks_df.groupby(level=0)['Adj Close'].mean().pct_change()
    sp500_cumulative = (1 + sp500_returns).cumprod() * 100
    
    # Get company name for target stock
    target_company = companies_df[companies_df['Symbol'] == target_stock]
    target_name = target_company['Longname'].iloc[0] if not target_company.empty else target_stock
    
    # Create comparison data
    comparison_data = {
        'target_stock': {
            'name': target_name,
            'data': [
                {
                    'date': date.strftime('%Y-%m-%d'),
                    'price': float(price) if not pd.isna(price) else None,
                    'normalizedPrice': float(norm_price) if not pd.isna(norm_price) else None
                }
                for date, price, norm_price in zip(
                    target_data.index,
                    target_data['Adj Close'],
                    target_data['Cumulative_Return']
                )
                if not pd.isna(price) and not pd.isna(norm_price)
            ]
        },
        'sp500': {
            'name': 'S&P 500',
            'data': [
                {
                    'date': date.strftime('%Y-%m-%d'),
                    'price': float(price) if not pd.isna(price) else None,
                    'normalizedPrice': float(norm_price) if not pd.isna(norm_price) else None
                }
                for date, price, norm_price in zip(
                    sp500_cumulative.index,
                    stocks_df.groupby(level=0)['Adj Close'].mean(),
                    sp500_cumulative
                )
                if not pd.isna(price) and not pd.isna(norm_price)
            ]
        }
    }
    
    return comparison_data

def parse_market_cap_string(cap_str: str) -> float:
    """Parse market cap string like '1.2T', '500.5B', '10.3M' to numeric value."""
    if not isinstance(cap_str, str):
        return float(cap_str)
    
    cap_str = cap_str.strip().upper()
    
    # Remove currency symbols and commas
    cap_str = cap_str.replace('$', '').replace(',', '')
    
    # Handle different suffixes
    multipliers = {
        'T': 1e12,  # Trillion
        'B': 1e9,   # Billion
        'M': 1e6,   # Million
        'K': 1e3    # Thousand
    }
    
    for suffix, multiplier in multipliers.items():
        if cap_str.endswith(suffix):
            try:
                number = float(cap_str[:-1])
                return number * multiplier
            except ValueError:
                break
    
    # If no suffix, try to parse as regular number
    try:
        return float(cap_str)
    except ValueError:
        return None

def process_all_stocks_comparison_data(stocks_df: pd.DataFrame, companies_df: pd.DataFrame):
    """Process summary data for all stocks with annualized returns and volatility."""
    
    # Calculate S&P 500 benchmark data
    sp500_prices = stocks_df.groupby(level=0)['Adj Close'].mean()
    sp500_returns = sp500_prices.pct_change().dropna()
    
    # Calculate years in dataset
    start_date = sp500_prices.index.min()
    end_date = sp500_prices.index.max()
    years = (end_date - start_date).days / 365.25
    
    # Calculate S&P 500 total return and annualized return
    sp500_total_return = (sp500_prices.iloc[-1] / sp500_prices.iloc[0]) - 1
    sp500_annualized_return = (1 + sp500_total_return) ** (1 / years) - 1
    sp500_volatility = sp500_returns.std() * np.sqrt(252)  # Annualized volatility
    
    # Process each stock
    stocks_data = {}
    
    # Get unique symbols
    symbols = stocks_df['Symbol'].unique()
    
    for symbol in symbols:
        stock_data = stocks_df[stocks_df['Symbol'] == symbol].copy()
        
        # Skip if insufficient data
        if len(stock_data) < 252:  # At least 1 year of data
            continue
            
        # Get company information
        company_info = companies_df[companies_df['Symbol'] == symbol]
        if company_info.empty:
            continue
            
        company_name = company_info['Longname'].iloc[0]
        sector = company_info['Sector'].iloc[0] if 'Sector' in company_info.columns else 'Unknown'
        industry = company_info['Industry'].iloc[0] if 'Industry' in company_info.columns else 'Unknown'
        
        # Calculate returns
        stock_returns = stock_data['Adj Close'].pct_change().dropna()
        
        # Skip if no valid returns
        if len(stock_returns) == 0:
            continue
            
        # Calculate total return and annualized return
        start_price = stock_data['Adj Close'].iloc[0]
        end_price = stock_data['Adj Close'].iloc[-1]
        
        if pd.isna(start_price) or pd.isna(end_price) or start_price <= 0:
            continue
            
        total_return = (end_price / start_price) - 1
        
        # Calculate years for this specific stock
        stock_start = stock_data.index.min()
        stock_end = stock_data.index.max()
        stock_years = (stock_end - stock_start).days / 365.25
        
        if stock_years <= 0:
            continue
            
        annualized_return = (1 + total_return) ** (1 / stock_years) - 1
        volatility = stock_returns.std() * np.sqrt(252) if len(stock_returns) > 1 else 0
        
        # Get market cap
        market_cap = None
        if 'Marketcap' in company_info.columns:
            market_cap_value = company_info['Marketcap'].iloc[0]
            if pd.notna(market_cap_value):
                # Convert market cap to numeric if it's a string (e.g., "1.2T", "500.5B")
                if isinstance(market_cap_value, str):
                    market_cap = parse_market_cap_string(market_cap_value)
                else:
                    market_cap = float(market_cap_value)
        
        # Use a default market cap if still None (based on price as proxy)
        if market_cap is None:
            market_cap = float(end_price) * 1e6  # Assume 1M shares as default
        
        # Create normalized price data (start from 100, end at calculated value)
        normalized_end = 100 * (1 + total_return)
        
        stocks_data[symbol] = {
            'name': company_name,
            'sector': sector,
            'industry': industry,
            'data': [
                {
                    'date': stock_start.strftime('%Y-%m-%d'),
                    'price': float(start_price),
                    'normalizedPrice': 100.0
                },
                {
                    'date': stock_end.strftime('%Y-%m-%d'),
                    'price': float(end_price),
                    'normalizedPrice': float(normalized_end)
                }
            ],
            'metrics': {
                'totalReturn': float(total_return),
                'annualizedReturn': float(annualized_return),
                'volatility': float(volatility),
                'years': float(stock_years),
                'marketCap': float(market_cap)
            }
        }
    
    # Create S&P 500 data
    sp500_data = {
        'name': 'S&P 500 Index',
        'data': [
            {
                'date': start_date.strftime('%Y-%m-%d'),
                'price': float(sp500_prices.iloc[0]),
                'normalizedPrice': 100.0
            },
            {
                'date': end_date.strftime('%Y-%m-%d'),
                'price': float(sp500_prices.iloc[-1]),
                'normalizedPrice': float(100 * (1 + sp500_total_return))
            }
        ],
        'metrics': {
            'totalReturn': float(sp500_total_return),
            'annualizedReturn': float(sp500_annualized_return),
            'volatility': float(sp500_volatility),
            'years': float(years)
        }
    }
    
    return {
        'stocks': stocks_data,
        'sp500': sp500_data
    }

def process_returns_distribution(stocks_df: pd.DataFrame, companies_df: pd.DataFrame, freq: str = 'annual'):
    """Process data for the returns distribution histogram."""
    # Merge with company data to get sectors
    merged = stocks_df.reset_index().merge(companies_df[['Symbol', 'Sector']], on='Symbol')
    merged_indexed = merged.set_index('Date')
    
    # Calculate returns based on frequency
    if freq == 'annual':
        # Resample to yearly and calculate returns
        annual_prices = merged_indexed.groupby(['Symbol', 'Sector'])['Adj Close'].resample('YE').last()
        returns = annual_prices.groupby(level=[0, 1]).pct_change(fill_method=None)
        
        # Restructure data
        returns_df = returns.reset_index()
        returns_df.columns = ['Symbol', 'Sector', 'Date', 'Return']
    else:
        raise ValueError("Currently only supporting annual frequency")
    
    # Drop NaN values
    returns_df = returns_df.dropna(subset=['Return'])
    
    # Calculate histogram bins
    bins = np.linspace(-0.5, 0.5, 21)  # 20 bins from -50% to +50%
    hist, bin_edges = np.histogram(returns_df['Return'], bins=bins)
    
    # Create histogram data
    histogram_data = {
        'bins': [float(x) for x in bin_edges[:-1]],  # Exclude last edge
        'counts': [int(x) for x in hist],
        'mean': float(returns_df['Return'].mean()) if not pd.isna(returns_df['Return'].mean()) else None,
        'median': float(returns_df['Return'].median()) if not pd.isna(returns_df['Return'].median()) else None,
        'std': float(returns_df['Return'].std()) if not pd.isna(returns_df['Return'].std()) else None
    }
    
    return histogram_data

def main():
    # Create output directory
    output_dir = Path('public/data')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print("Loading data...")
    stocks_df = load_data('sp500_stocks.csv')
    companies_df = load_data('sp500_companies.csv')
    
    print(f"Loaded {len(stocks_df)} stock records")
    print(f"Loaded {len(companies_df)} company records")
    print(f"Date range: {stocks_df.index.min()} to {stocks_df.index.max()}")
    
    # Process NVIDIA comparison data (daily data for main chart)
    print("Processing NVIDIA comparison data...")
    nvidia_comparison_data = process_nvidia_comparison_data(stocks_df, companies_df)
    with open(output_dir / 'nvidia_comparison.json', 'w') as f:
        json.dump(nvidia_comparison_data, f, indent=2, allow_nan=False)
    print(f"Saved nvidia_comparison.json with {len(nvidia_comparison_data['target_stock']['data'])} data points")
    
    # Process all stocks comparison data (summary statistics)
    print("Processing all stocks comparison data...")
    all_stocks_data = process_all_stocks_comparison_data(stocks_df, companies_df)
    with open(output_dir / 'comparison_data.json', 'w') as f:
        json.dump(all_stocks_data, f, indent=2, allow_nan=False)
    print(f"Saved comparison_data.json with {len(all_stocks_data['stocks'])} stocks")
    
    # Process returns distribution
    print("Processing returns distribution...")
    returns_data = process_returns_distribution(stocks_df, companies_df)
    with open(output_dir / 'returns_distribution.json', 'w') as f:
        json.dump(returns_data, f, indent=2, allow_nan=False)
    print(f"Saved returns_distribution.json with {len(returns_data['bins'])} bins")
    
    print("Data processing complete!")

if __name__ == '__main__':
    main() 