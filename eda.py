# %%
import kagglehub
from kagglehub import KaggleDatasetAdapter
import os
import pandas as pd
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
            df = df.dropna(subset=['Adj Close']).set_index('Date')
        df.to_parquet(file_path.replace('.csv', '.parquet'))
    else:
        df = pd.read_parquet(file_path)
    return df
# %%
for filepath in ['sp500_stocks.csv', 'sp500_index.csv', 'sp500_companies.csv']:
    df = load_data(filepath)
    print(df.head())
# %%
# 1. Line plot of S&P 500 Index
pass
# %%
# 2. Treemap of S&P at a given point in time
pass
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