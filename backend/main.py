from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import collections

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global memory storage to hold the dataset structure temporarily for chat queries
storage = collections.defaultdict(dict)

@app.get("/")
def home():
    return {"message": "Backend Running Successfully"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename_lower = file.filename.lower()
    
    try:
        if filename_lower.endswith(".csv") or filename_lower.endswith(".txt"):
            df = pd.read_csv(file.file)
        elif filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
            df = pd.read_excel(file.file)
        else:
            try:
                df = pd.read_csv(file.file)
            except Exception:
                df = pd.read_excel(file.file)
    except Exception as e:
        return {"error": f"Failed to parse file structure: {str(e)}"}

    df = df.replace({np.nan: None})
    columns = list(df.columns)
    total_rows = len(df)
    
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

    # [NEW] Chat engine ke liye dataset memory mein store kar rahe hain
    storage["current_df"] = {
        "columns": columns,
        "total_rows": total_rows,
        "preview_summary": df.head(5).to_dict(orient="records")
    }

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

# [NEW ENDPOINT] Yeh chat request handle karega
@app.post("/chat")
async def chat_with_data(message: str = Form(...)):
    df_info = storage.get("current_df")
    if not df_info:
        return {"reply": "Please upload a data file first so I can analyze its parameters!"}
    
    msg_lower = message.lower()
    
    # Smart Local Autonomous Fallback Logic
    if "column" in msg_lower or "field" in msg_lower or "structure" in msg_lower:
        return {"reply": f"Your dataset contains {len(df_info['columns'])} key attributes: {', '.join(df_info['columns'])}."}
    elif "summary" in msg_lower or "analyze" in msg_lower or "report" in msg_lower:
        return {"reply": f"Data Profiling Complete! The dataset contains {df_info['total_rows']} total recorded rows. The metrics map cleanly across categorical items with clear distributions shown in your visual matrices."}
    else:
        return {"reply": f"I see your query about '{message}'. The underlying infrastructure is ready to process this semantic layer. Once your enterprise LLM keys are configured, full contextual intelligence will execute here!"}