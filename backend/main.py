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
    filename_lower = file.filename.lower()
    
    try:
        # Smart detection: read as CSV/TXT if it matches extensions OR if it's text-based
        if filename_lower.endswith(".csv") or filename_lower.endswith(".txt"):
            df = pd.read_csv(file.file)
        elif filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
            df = pd.read_excel(file.file)
        else:
            # Fallback: Try reading as CSV first, if it fails, try Excel
            try:
                df = pd.read_csv(file.file)
            except Exception:
                df = pd.read_excel(file.file)
    except Exception as e:
        return {"error": f"Failed to parse file structure: {str(e)}"}

    # Handle any NaN/empty values so JSON doesn't break
    df = df.replace({np.nan: None})

    columns = list(df.columns)
    total_rows = len(df)
    
    # AUTOMATED ANALYTICS ENGINE: Find numeric and categorical columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()

    kpis = {}
    chart_data = []

    if numeric_cols:
        target_col = numeric_cols[0]
        kpis = {
            "target_column": target_col,
            "total": float(df[target_col].sum()) if df[target_col].sum() else 0,
            "average": float(df[target_col].mean()) if df[target_col].mean() else 0,
            "max": float(df[target_col].max()) if df[target_col].max() else 0
        }
        
        if categorical_cols:
            x_axis = categorical_cols[0]
            grouped = df.groupby(x_axis)[target_col].sum().reset_index()
            chart_data = grouped.to_dict(orient="records")
        else:
            chart_data = df[[target_col]].reset_index().to_dict(orient="records")

    preview_data = df.head(10).to_dict(orient="records")

    return {
        "filename": file.filename,
        "columns": columns,
        "total_rows": total_rows,
        "preview": preview_data,
        "kpis": kpis,
        "chart_data": chart_data,
        "x_key": categorical_cols[0] if categorical_cols else "index",
        "y_key": target_col if numeric_cols else ""
    }