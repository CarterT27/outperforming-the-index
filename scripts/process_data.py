import pandas as pd
import json
from pathlib import Path
import kagglehub
from kagglehub import KaggleDatasetAdapter
import numpy as np
from datetime import datetime

def load_data(file_path = "sp500_stocks.csv"):
    """Load data from Kaggle dataset or local parquet file."""
    # Convert to Path object and handle both string and Path inputs
    file_path = Path(file_path)
    parquet_path = file_path.with_suffix('.parquet')
    if not parquet_path.exists():
        df = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            "andrewmvd/sp-500-stocks/versions/960",
            file_path.name,
            pandas_kwargs={"parse_dates": ["Date"] if file_path.name != 'sp500_companies.csv' else None},
        )
        numeric_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        if "Date" in df.columns:
            df = df.set_index('Date')
        df.to_parquet(parquet_path)
    else:
        df = pd.read_parquet(parquet_path)
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
        
        # Use Adj Close if available, otherwise fall back to Close
        price_column = 'Adj Close' if not stock_data['Adj Close'].isna().all() else 'Close'
        
        # Calculate returns
        stock_returns = stock_data[price_column].pct_change().dropna()
        
        # Skip if no valid returns
        if len(stock_returns) == 0:
            continue
            
        # Calculate total return and annualized return
        start_price = stock_data[price_column].iloc[0]
        end_price = stock_data[price_column].iloc[-1]
        
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



def process_hindsight_stocks_data(stocks_df: pd.DataFrame, companies_df: pd.DataFrame, symbols: list):
    """Process monthly time series data for specific stocks used in hindsight bias section."""
    hindsight_data = {}
    
    for symbol in symbols:
        stock_data = stocks_df[stocks_df['Symbol'] == symbol].copy()
        
        # Skip if insufficient data
        if len(stock_data) < 60:  # At least ~3 months of data
            continue
            
        # Get company information
        company_info = companies_df[companies_df['Symbol'] == symbol]
        if company_info.empty:
            continue
            
        company_name = company_info['Longname'].iloc[0]
        sector = company_info['Sector'].iloc[0] if 'Sector' in company_info.columns else 'Unknown'
        industry = company_info['Industry'].iloc[0] if 'Industry' in company_info.columns else 'Unknown'
        
        # Use Adj Close if available, otherwise fall back to Close
        price_column = 'Adj Close' if not stock_data['Adj Close'].isna().all() else 'Close'
        
        # Resample to monthly data for efficiency (first business day of each month)
        # Make sure we have a proper datetime index for resampling
        stock_data_indexed = stock_data.copy()
        if not isinstance(stock_data_indexed.index, pd.DatetimeIndex):
            stock_data_indexed = stock_data_indexed.reset_index().set_index('Date')
        
        monthly_data = stock_data_indexed[price_column].resample('MS').first().dropna()
        
        if len(monthly_data) < 3:  # Need at least 3 months
            continue
        
        # Calculate normalized prices starting from 100
        start_price = monthly_data.iloc[0]
        normalized_prices = (monthly_data / start_price) * 100
        
        # Calculate total return and metrics
        end_price = monthly_data.iloc[-1]
        total_return = (end_price / start_price) - 1
        
        # Calculate years for annualized return
        stock_start = monthly_data.index.min()
        stock_end = monthly_data.index.max()
        stock_years = (stock_end - stock_start).days / 365.25
        
        if stock_years <= 0:
            continue
            
        annualized_return = (1 + total_return) ** (1 / stock_years) - 1
        
        # Create time series data
        time_series_data = [
            {
                'date': date.strftime('%Y-%m-%d'),
                'price': float(price),
                'normalizedPrice': float(norm_price)
            }
            for date, price, norm_price in zip(monthly_data.index, monthly_data.values, normalized_prices.values)
            if not pd.isna(price) and not pd.isna(norm_price)
        ]
        
        hindsight_data[symbol] = {
            'name': company_name,
            'sector': sector,
            'industry': industry,
            'data': time_series_data,
            'metrics': {
                'totalReturn': float(total_return),
                'annualizedReturn': float(annualized_return),
                'years': float(stock_years)
            }
        }
    
    return hindsight_data

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
    
    # Process hindsight bias stocks data (monthly data for specific stocks)
    print("Processing hindsight bias stocks data...")
    hindsight_symbols = ["MKTX", "ALGN", "ULTA", "TSLA", "PODD", "MOH"]
    hindsight_data = process_hindsight_stocks_data(stocks_df, companies_df, hindsight_symbols)
    with open(output_dir / 'hindsight_stocks.json', 'w') as f:
        json.dump(hindsight_data, f, indent=2, allow_nan=False)
    print(f"Saved hindsight_stocks.json with {len(hindsight_data)} stocks")
    
    print("Data processing complete!")

if __name__ == '__main__':
    main() 