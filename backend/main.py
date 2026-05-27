from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import collections
import os
from openai import OpenAI

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

# ✅ 1. FILE UPLOAD ENDPOINT (Yeh missing tha aapki file mein!)
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

    # Chat engine ke liye dataset memory mein store kar rahe hain
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

# ✅ 2. INTERACTIVE CHAT COPILOT ENDPOINT
@app.post("/chat")
async def chat_with_data(message: str = Form(...)):
    df_info = storage.get("current_df")
    if not df_info:
        return {"reply": "Please upload a data file first so I can analyze its parameters!"}
    
    msg_lower = message.lower()
    api_key = os.getenv("OPENAI_API_KEY")
    
    # 🌟 IF API KEY IS VALID, CONNECT TO REAL LLM PORTS
    if api_key and not api_key.startswith("your_"):
        try:
            client = OpenAI(api_key=api_key)
            prompt = f"""
            You are an expert corporate Business Intelligence Dashboard AI.
            The user has uploaded a file with these attributes: {df_info['columns']}.
            Total rows detected: {df_info['total_rows']}.
            Sample metrics snapshot: {df_info['preview_summary']}
            
            User message: {message}
            Respond briefly, crisply, and professionally like a data expert.
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            return {"reply": response.choices[0].message.content}
        except Exception as e:
            return {"reply": f"AI Routing error: {str(e)}"}
            
   # 🧠 LOCAL INTELLIGENT ROUTER (With Rows Support)
    else:
        if "what can i ask" in msg_lower or "help" in msg_lower:
            return {
                "reply": f"You can ask me semantic queries about the indexed schema! Since your sheet contains fields like {', '.join(df_info['columns'][:3])}, you can try asking: \n"
                         f"1. 'Give me a structural summary of the columns'\n"
                         f"2. 'Analyze the total row distribution recorded'"
            }
        elif "column" in msg_lower or "field" in msg_lower or "structure" in msg_lower:
            return {"reply": f"Your data layout maps across {len(df_info['columns'])} properties: {', '.join(df_info['columns'])}."}
        elif "row" in msg_lower or "data" in msg_lower or "preview" in msg_lower:
            # 🌟 Return the actual rows snapshot directly from storage memory!
            return {"reply": f"Here is the preview snapshot of your dataset rows: {df_info['preview_summary']}"}
        elif "summary" in msg_lower or "analyze" in msg_lower or "report" in msg_lower:
            return {"reply": f"Data Profiling Report: File contains {df_info['total_rows']} transactional rows. The categorical breakdowns are synchronized live with your chart vectors!"}
        else:
            return {"reply": f"Received query: '{message}'. To unlock deep human-like analytics on your '{df_info['columns'][0]}' fields, paste your token inside the backend/.env pipeline!"}