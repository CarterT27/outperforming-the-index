# %%
import kagglehub
from kagglehub import KaggleDatasetAdapter
import os
import pandas as pd
import plotly.express as px
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# %%
ASSETS_PATH = Path("assets")

# %%
def load_data(file_path: str = "sp500_stocks.csv"):
    if not os.path.exists(file_path):
        df = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            "andrewmvd/sp-500-stocks",
            file_path,
            pandas_kwargs={"parse_dates": True},
        )
        if file_path == 'sp500_stocks.csv':
            df = df.set_index('Date')
        df.to_parquet(file_path.replace('.csv', '.parquet'))
    else:
        df = pd.read_parquet(file_path)
    return df
# %%
stocks_df = load_data('sp500_stocks.csv')
index_df = load_data('sp500_index.csv')
companies_df = load_data('sp500_companies.csv')
# %%
# 1. Average Volume by Sector
merged = stocks_df.reset_index().merge(companies_df[['Symbol', 'Sector']], on='Symbol')
avg_vol = merged.groupby('Sector')['Volume'].mean().sort_values()
ax = avg_vol.plot(kind='barh', figsize=(10,6), title='Average Volume by Sector')
ax.set_xlabel("Average Daily Volume (Millions of Shares)")
plt.tight_layout()
plt.show()
# %%
# 2. Treemap of S&P at a given point in time
def build_treemap(stock_df: pd.DataFrame = stocks_df, date: str = '2021-01-05'):
    df = stock_df.loc[date].merge(companies_df, on='Symbol')
    fig = px.treemap(df, path=['Sector', 'Industry', 'Symbol'], values='Close',
                     color='Close', hover_data=['Symbol'],
                  color_continuous_scale='BuGn',
                  color_continuous_midpoint=np.average(df['Close'], weights=df['Volume']))
    fig.show()
build_treemap()
# %%
# 3. Area plot of S&P 500 Index
def create_sp500_area_plot(stock_df: pd.DataFrame = stocks_df, start_date=None, end_date=None):
    """
    Create an area plot of S&P 500 Index for a specified date range.
    
    Args:
        stock_df (pd.DataFrame): DataFrame containing stock data. Defaults to stocks_df.
        start_date (str, optional): Start date in 'YYYY-MM-DD' format. Defaults to None (earliest date).
        end_date (str, optional): End date in 'YYYY-MM-DD' format. Defaults to None (latest date).
    """
    # Filter data by date range if specified
    if start_date:
        stock_df = stock_df[stock_df.index >= start_date]
    if end_date:
        stock_df = stock_df[stock_df.index <= end_date]
    
    # Print date range information
    print("Date range in the data:")
    print(f"Start date: {stock_df.index.min()}")
    print(f"End date: {stock_df.index.max()}")
    
    # Create area plot using plotly
    fig = px.area(stock_df, 
                  y='Adj Close',
                  title='S&P 500 Index Over Time',
                  labels={'Adj Close': 'Price', 'Date': 'Date'})
    
    # Update layout for better visualization
    fig.update_layout(
        xaxis_title='Date',
        yaxis_title='Price (USD)',
        hovermode='x unified',
        width=1200,  # Set width for better quality
        height=800,  # Set height for better quality
        xaxis=dict(
            tickformat='%Y-%m-%d',  # Format dates as YYYY-MM-DD
            tickangle=45,  # Angle the date labels for better readability
            nticks=10  # Limit the number of date labels to prevent overcrowding
        )
    )
    
    # Save the plot as a PNG file in the assets folder
    fig.write_image(ASSETS_PATH / 'sp500_area_plot.png')
    
    return fig

# Create plot for the entire dataset
create_sp500_area_plot()
# %%
# 4. Bar chart of daily, weekly, and monthly returns of S&P 500 Constituents
pass
# %%
# 5. Scatter plot of daily returns of S&P 500 Constituents over time
def create_daily_returns_scatter(stock_df: pd.DataFrame = stocks_df, start_date=None, end_date=None):
    """
    Create a scatter plot of daily returns for S&P 500 constituents over time.
    
    Args:
        stock_df (pd.DataFrame): DataFrame containing stock data. Defaults to stocks_df.
        start_date (str, optional): Start date in 'YYYY-MM-DD' format. Defaults to None (earliest date).
        end_date (str, optional): End date in 'YYYY-MM-DD' format. Defaults to None (latest date).
    """
    # Filter by date range if specified
    if start_date:
        stock_df = stock_df[stock_df.index >= start_date]
    if end_date:
        stock_df = stock_df[stock_df.index <= end_date]
    
    # Calculate daily returns for all stocks
    daily_returns = stock_df['Adj Close'].pct_change()
    
    # Remove any infinite values and extreme outliers
    daily_returns = daily_returns.replace([np.inf, -np.inf], np.nan)
    daily_returns = daily_returns.clip(lower=-0.1, upper=0.1)  # Clip returns to ±10%
    
    # Melt the dataframe to get it in long format for plotting
    returns_long = daily_returns.reset_index().melt(
        id_vars=['Date'],
        var_name='Symbol',
        value_name='Daily Return'
    )
    
    # Remove any NaN values
    returns_long = returns_long.dropna()
    
    # Merge with companies data to get sector information
    returns_with_sector = returns_long.merge(
        companies_df[['Symbol', 'Sector']],
        on='Symbol'
    )
    
    # Create scatter plot
    fig = px.scatter(
        returns_with_sector,
        x='Date',
        y='Daily Return',
        color='Sector',
        title='Daily Returns of S&P 500 Constituents Over Time',
        labels={
            'Date': 'Date',
            'Daily Return': 'Daily Return (%)',
            'Sector': 'Sector'
        },
        opacity=0.3,  # Make points more transparent to handle overlapping
        size_max=10   # Limit maximum point size
    )
    
    # Update layout
    fig.update_layout(
        xaxis_title='Date',
        yaxis_title='Daily Return (%)',
        hovermode='closest',
        width=1200,
        height=800,
        xaxis=dict(
            tickformat='%Y-%m-%d',
            tickangle=45,
            nticks=20,  # Increase number of date labels
            tickmode='auto',
            rangeslider=dict(visible=True)  # Add rangeslider for better navigation
        ),
        yaxis=dict(
            tickformat='.1%',  # Format y-axis as percentages
            range=[-0.1, 0.1]  # Set fixed y-axis range
        ),
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=1.05
        )
    )
    
    # Save the plot
    fig.write_image(ASSETS_PATH / 'sp500_daily_returns_scatter.png')
    
    return fig

# Create the scatter plot for the entire dataset
create_daily_returns_scatter()
# %%
# 6. Line plot of stock prices per sector over time
with_date = stocks_df.reset_index()
merged = with_date.merge(companies_df[['Symbol', 'Sector']], on='Symbol')
grouped = merged.groupby(['Date', 'Sector'])['Adj Close'].mean().unstack()

grouped.plot(figsize= (14, 6), title='Average Adjusted Closing Price by Sector Over Time')
plt.xlabel('Date')
plt.ylabel('Average Adjusted Closing Price')
plt.tight_layout()
plt.show()
# %%
