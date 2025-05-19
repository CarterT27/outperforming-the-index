# %%
import kagglehub
from kagglehub import KaggleDatasetAdapter
import os
import pandas as pd
# %%
def load_data():
    file_path = "sp500_stocks.csv"
    if not os.path.exists(file_path):
        df = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            "andrewmvd/sp-500-stocks",
            file_path,
            pandas_kwargs={"parse_dates": True, "index_col": "Date"},
        ).dropna(subset=['Adj Close'])
        df.to_parquet(file_path.replace('.csv', '.parquet'))
    else:
        df = pd.read_parquet(file_path)
    return df
# %%
df = load_data()
df.head()