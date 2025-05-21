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
ASSETS_PATH.mkdir(parents=True, exist_ok=True)

# %%
def load_data(file_path: str = "sp500_stocks.csv"):
    if not os.path.exists(file_path.replace('.csv', '.parquet')):
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

fig = ax.get_figure()
fig.savefig(ASSETS_PATH / 'avg_volume_by_sector.png', dpi=300)

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
    fig.write_image(ASSETS_PATH / 'sp500_treemap.png')
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
# 4. Density histogram of daily, weekly, monthly, and annual returns of S&P 500 Constituents
def build_bar_charts(stock_df: pd.DataFrame = stocks_df, freq: str = 'daily'):
    stock_df_reset = stock_df.reset_index()
    merged = stock_df_reset.merge(companies_df[['Symbol', 'Sector']], on='Symbol')
    merged_indexed = merged.set_index('Date')
    
    # Calculate returns based on frequency
    if freq == 'daily':
        # Group by Symbol and calculate daily returns
        merged_indexed['Return'] = merged_indexed.groupby('Symbol')['Adj Close'].pct_change()
        title = 'Distribution of Daily Returns of S&P 500 Constituents'
    elif freq == 'weekly':
        # Resample to weekly and calculate returns
        weekly_prices = merged_indexed.groupby(['Symbol', 'Sector'])['Adj Close'].resample('W').last()
        weekly_returns = weekly_prices.groupby(level=[0, 1]).pct_change()
        
        # Restructure data for plotting
        merged_indexed = weekly_returns.reset_index()
        merged_indexed.columns = ['Symbol', 'Sector', 'Date', 'Return']
        merged_indexed = merged_indexed.set_index('Date')
        title = 'Distribution of Weekly Returns of S&P 500 Constituents'
    elif freq == 'monthly':
        # Resample to monthly and calculate returns
        monthly_prices = merged_indexed.groupby(['Symbol', 'Sector'])['Adj Close'].resample('M').last()
        monthly_returns = monthly_prices.groupby(level=[0, 1]).pct_change()
        
        # Restructure data for plotting
        merged_indexed = monthly_returns.reset_index()
        merged_indexed.columns = ['Symbol', 'Sector', 'Date', 'Return']
        merged_indexed = merged_indexed.set_index('Date')
        title = 'Distribution of Monthly Returns of S&P 500 Constituents'
    elif freq == 'annual':
        # Resample to yearly and calculate returns
        annual_prices = merged_indexed.groupby(['Symbol', 'Sector'])['Adj Close'].resample('Y').last()
        annual_returns = annual_prices.groupby(level=[0, 1]).pct_change()
        
        # Restructure data for plotting
        merged_indexed = annual_returns.reset_index()
        merged_indexed.columns = ['Symbol', 'Sector', 'Date', 'Return']
        merged_indexed = merged_indexed.set_index('Date')
        title = 'Distribution of Annual Returns of S&P 500 Constituents'
    else:
        raise ValueError("Frequency must be one of: 'daily', 'weekly', 'monthly', 'annual'")
    
    # Drop NaN values
    merged_indexed = merged_indexed.dropna(subset=['Return'])
    
    # Set return range based on frequency to capture most data while excluding extreme outliers
    if freq == 'daily':
        return_range = [-0.1, 0.1]  # ±10% for daily returns
    elif freq == 'weekly':
        return_range = [-0.2, 0.2]  # ±20% for weekly returns
    elif freq == 'monthly':
        return_range = [-0.3, 0.3]  # ±30% for monthly returns
    else:  # annual
        return_range = [-0.5, 0.5]  # ±50% for annual returns
    
    # Create density histogram without sector differentiation
    fig = px.histogram(
        merged_indexed.reset_index(),
        x='Return',
        title=title,
        marginal='box',  # Add box plot on the margin
        opacity=0.7,
        histnorm='probability density',  # Normalize to show density
        range_x=return_range,
        labels={'Return': f'{freq.capitalize()} Return'},
        color_discrete_sequence=['#636EFA']  # Use a single color
    )
    
    # Update layout
    fig.update_layout(
        width=1200,
        height=800,
        xaxis=dict(
            tickformat='.1%',  # Format x-axis as percentages
            title=f'{freq.capitalize()} Return (%)'
        ),
        yaxis=dict(
            title='Density'
        ),
        showlegend=False
    )
    
    # Add a vertical line at x=0
    fig.add_shape(
        type='line',
        x0=0, x1=0,
        y0=0, y1=1,
        yref='paper',
        line=dict(color='black', width=1, dash='dash')
    )
    
    # Add mean line
    mean_return = merged_indexed['Return'].mean()
    fig.add_shape(
        type='line',
        x0=mean_return, x1=mean_return,
        y0=0, y1=1,
        yref='paper',
        line=dict(color='red', width=1.5)
    )
    
    # Add annotation for mean
    fig.add_annotation(
        x=mean_return,
        y=0.95,
        yref='paper',
        text=f"Mean: {mean_return:.2%}",
        showarrow=True,
        arrowhead=1,
        ax=50,
        ay=-30,
        font=dict(color='red')
    )
    
    # Save the chart
    fig.write_image(ASSETS_PATH / f'sp500_{freq}_returns_density_histogram.png')
    
    return fig
build_bar_charts(freq='daily')
# %%
# 5. Scatter plot of daily returns vs trading volume for S&P 500
def create_returns_volume_scatter(stock_df: pd.DataFrame = stocks_df, start_date=None, end_date=None):
    """
    Create a scatter plot showing the relationship between daily returns and trading volume
    for the S&P 500 index, demonstrating market stability.
    
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
    
    # Calculate daily returns for each stock
    daily_returns = stock_df['Adj Close'].pct_change()
    
    # Calculate average daily return across all stocks
    avg_daily_returns = daily_returns.groupby(level=0).mean()
    
    # Calculate total volume by summing across all stocks for each date
    total_volume = stock_df.groupby(level=0)['Volume'].sum()
    
    # Create a DataFrame for plotting
    plot_data = pd.DataFrame({
        'Date': avg_daily_returns.index,
        'Daily Return': avg_daily_returns,
        'Trading Volume': total_volume / 1e6  # Convert to millions
    }).dropna()
    
    # Create scatter plot
    fig = px.scatter(
        plot_data,
        x='Trading Volume',
        y='Daily Return',
        title='S&P 500 Daily Returns vs Trading Volume',
        labels={
            'Trading Volume': 'Trading Volume (Millions of Shares)',
            'Daily Return': 'Daily Return (%)'
        },
        hover_data=['Date'],
        color='Daily Return',  # Color points by return value
        color_continuous_scale='RdYlGn',  # Red for negative, green for positive
        color_continuous_midpoint=0
    )
    
    # Add a horizontal line at y=0
    fig.add_shape(
        type='line',
        x0=plot_data['Trading Volume'].min(),
        x1=plot_data['Trading Volume'].max(),
        y0=0,
        y1=0,
        line=dict(color='black', width=1, dash='dash')
    )
    
    # Update layout
    fig.update_layout(
        width=1200,
        height=800,
        yaxis=dict(
            tickformat='.1%',  # Format y-axis as percentages
            range=[-0.05, 0.05]  # Focus on typical daily return range
        ),
        xaxis=dict(
            title='Trading Volume (Millions of Shares)'
        ),
        showlegend=False,
        annotations=[
            dict(
                x=0.02,
                y=0.98,
                xref='paper',
                yref='paper',
                text='Most returns cluster around 0%,<br>showing market stability',
                showarrow=False,
                bgcolor='white',
                bordercolor='black',
                borderwidth=1
            )
        ]
    )
    
    # Save the plot
    fig.write_image(ASSETS_PATH / 'sp500_returns_volume_scatter.png')
    
    return fig

# Create the scatter plot for the entire dataset
create_returns_volume_scatter()
# %%
# 6. Line plot of stock prices per sector over time
with_date = stocks_df.reset_index()
merged = with_date.merge(companies_df[['Symbol', 'Sector']], on='Symbol')
grouped = merged.groupby(['Date', 'Sector'])['Adj Close'].mean().unstack()

ax = grouped.plot(figsize= (14, 6), title='Average Adjusted Closing Price by Sector Over Time')
plt.xlabel('Date')
plt.ylabel('Average Adjusted Closing Price')
plt.tight_layout()

fig = ax.get_figure()
fig.savefig(ASSETS_PATH / 'sector_avg_adj_close_over_time.png', dpi=300)

plt.show()
# %%
