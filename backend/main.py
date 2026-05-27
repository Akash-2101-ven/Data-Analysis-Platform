from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend Running Successfully"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):

    # Read file
    if file.filename.endswith(".csv"):
        df = pd.read_csv(file.file)

    else:
        df = pd.read_excel(file.file)

    # Clean NaN values
    df = df.replace({np.nan: None})

    # Detect numeric columns
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()

    # Detect categorical columns
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()

    # Default chart data
    chart_data = []
    x_key = None
    y_key = None

    # Generate KPIs
    kpis = {}

    if numeric_cols:

        target_col = numeric_cols[0]

        kpis = {
            "target_column": target_col,
            "total": float(df[target_col].sum()),
            "average": float(df[target_col].mean()),
            "max": float(df[target_col].max())
        }

        # Auto chart generation
        if categorical_cols:

            x_key = categorical_cols[0]
            y_key = target_col

            grouped = (
                df.groupby(x_key)[y_key]
                .sum()
                .reset_index()
            )

            chart_data = grouped.to_dict(orient="records")

    return {
        "filename": file.filename,
        "columns": list(df.columns),
        "total_rows": len(df),
        "preview": df.head(10).to_dict(orient="records"),
        "kpis": kpis,
        "chart_data": chart_data,
        "x_key": x_key,
        "y_key": y_key
    }