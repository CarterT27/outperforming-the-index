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

def process_comparison_data(stocks_df: pd.DataFrame, companies_df: pd.DataFrame, target_stock: str = "NVDA"):
    """Process data for the comparison chart between a target stock and S&P 500."""
    # Get target stock data
    target_data = stocks_df[stocks_df['Symbol'] == target_stock].copy()
    
    # Calculate daily returns for target stock
    target_data['Return'] = target_data['Adj Close'].pct_change()
    
    # Calculate cumulative returns starting from 100
    target_data['Cumulative_Return'] = (1 + target_data['Return']).cumprod() * 100
    
    # Calculate S&P 500 returns (average of all stocks)
    sp500_returns = stocks_df.groupby(level=0)['Adj Close'].mean().pct_change()
    sp500_cumulative = (1 + sp500_returns).cumprod() * 100
    
    # Create comparison data
    comparison_data = {
        'target_stock': {
            'name': target_stock,
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
            ]
        }
    }
    
    return comparison_data

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
    stocks_df = load_data('sp500_stocks.csv')
    companies_df = load_data('sp500_companies.csv')
    
    # Process comparison data
    comparison_data = process_comparison_data(stocks_df, companies_df)
    with open(output_dir / 'comparison_data.json', 'w') as f:
        json.dump(comparison_data, f, indent=2, allow_nan=False)
    
    # Process returns distribution
    returns_data = process_returns_distribution(stocks_df, companies_df)
    with open(output_dir / 'returns_distribution.json', 'w') as f:
        json.dump(returns_data, f, indent=2, allow_nan=False)

if __name__ == '__main__':
    main() 