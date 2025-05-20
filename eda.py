# %%
import kagglehub
from kagglehub import KaggleDatasetAdapter
import os
import pandas as pd
import plotly.express as px
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
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
# 1. Line plot of S&P 500 Index
pass
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
pass
# %%
# 4. Bar chart of daily, weekly, and monthly returns of S&P 500 Constituents
pass
# %%
# 5. Bar chart of daily, weekly, and monthly returns of S&P 500 Index
pass
# %%
# 6. Scatter plot of daily returns of S&P 500 Constituents over time
pass