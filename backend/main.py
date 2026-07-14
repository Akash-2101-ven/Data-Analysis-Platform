from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from fastapi.responses import FileResponse
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import collections
import os
from database import engine
from database import SessionLocal
from models import Base
from models import UploadedFile, ChatHistory
from openai import OpenAI

app = FastAPI()

Base.metadata.create_all(bind=engine)

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
@app.get("/recent-uploads")
def recent_uploads():
    db = SessionLocal()

    uploads = (
        db.query(UploadedFile)
        .order_by(UploadedFile.created_at.desc())
        .limit(10)
        .all()
    )

    result = []

    for upload in uploads:
        result.append({
            "id": upload.id,
            "filename": upload.filename,
            "total_rows": upload.total_rows,
            "total_columns": upload.total_columns,
            "created_at": upload.created_at
        })

    db.close()

    return result
# ✅ 1. FILE UPLOAD ENDPOINT (Yeh missing tha aapki file mein!)
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    x_axis: str = Form(None),
    y_axis: str = Form(None),
    aggregation: str = Form("sum")
):
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
    df.columns = df.columns.str.strip()
    columns = list(df.columns)
    total_rows = len(df)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    # Ignore ID / Serial columns
    numeric_cols = [
        col for col in numeric_cols
        if col.lower() not in ["s.no", "sno", "serial", "serial_no", "id"]
    ]

    # ==========================
    # OVERVIEW KPIs
    # ==========================
    overview_kpis = {
        "total_rows": total_rows,
        "total_columns": len(columns),
        "numeric_columns": len(numeric_cols),
        "missing_values": int(df.isnull().sum().sum())
    }

    # ==========================
    # COLUMN KPIs
    # ==========================
    column_kpis = {}

    for col in numeric_cols:
        try:
            column_kpis[col] = {
                "sum": round(float(df[col].sum()), 2),
                "average": round(float(df[col].mean()), 2),
                "max": round(float(df[col].max()), 2),
                "min": round(float(df[col].min()), 2)
            }
        except Exception:
            pass

    # ==========================
    # CHART DATA
    # ==========================
    chart_data = []

    # Default values if frontend doesn't send anything
    if not x_axis:
        x_axis = categorical_cols[0] if categorical_cols else None

    if not y_axis:
        y_axis = numeric_cols[0] if numeric_cols else None
    #New FIX
    if x_axis not in columns:
        x_axis = categorical_cols[0] if categorical_cols else None

    if y_axis not in columns:
        y_axis = numeric_cols[0] if numeric_cols else None
    target_col = y_axis
    print("Received X Axis:", x_axis)
    print("Received Y Axis:", y_axis)
    print("Available Columns:", columns)
    if x_axis and y_axis:

        try:

            if aggregation == "sum":
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()

            elif aggregation == "mean":
                grouped = df.groupby(x_axis)[y_axis].mean().reset_index()

            elif aggregation == "max":
                grouped = df.groupby(x_axis)[y_axis].max().reset_index()

            elif aggregation == "min":
                grouped = df.groupby(x_axis)[y_axis].min().reset_index()

            else:
                grouped = df.groupby(x_axis)[y_axis].sum().reset_index()

            chart_data = grouped.to_dict(orient="records")

        except Exception:
            chart_data = []
    # ==========================
    # STORE DATASET INFO FOR CHAT
    # ==========================
    storage["current_df"] = {
        "df": df,
        "columns": columns,
        "total_rows": total_rows,
        "preview_summary": df.head(5).to_dict(orient="records"),
    
         "overview_kpis": overview_kpis,
         "column_kpis": column_kpis,
         "chart_data": chart_data,
         "numeric_columns": numeric_cols,
         "categorical_columns": categorical_cols
    }
    preview_data = df.head(10).to_dict(orient="records")
    print("Categorical Columns:", categorical_cols)
    print("Numeric Columns:", numeric_cols)
    print("X Axis:", x_axis)
    print("Y Axis:", y_axis)
    print("Chart Data:", chart_data)
    db = SessionLocal()

    new_file = UploadedFile(
       filename=file.filename,
       total_rows=total_rows,
       total_columns=len(columns)
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    db.close()
    return {
        "filename": file.filename,
        "columns": columns,
        "total_rows": total_rows,
        "preview": preview_data,

        "overview_kpis": overview_kpis,
        "column_kpis": column_kpis,

        "chart_data": chart_data,
        "x_key": x_axis,
        "y_key": y_axis
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
            # OpenAI response ko variable me store karo
            response_text = response.choices[0].message.content

            # Database session open karo
            db = SessionLocal()

            # Chat history object banao
            chat = ChatHistory(
                 user_query=message,
                 ai_response=response_text
            )

            # Database me save karo
            db.add(chat)
            db.commit()
            db.close()

            # User ko response bhejo
            return {"reply": response_text}

        
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
            response_text = f"Your data layout maps across {len(df_info['columns'])} properties: {', '.join(df_info['columns'])}."
        elif "row" in msg_lower or "data" in msg_lower or "preview" in msg_lower:
            # 🌟 Return the actual rows snapshot directly from storage memory!
            response_text =  f"Here is the preview snapshot of your dataset rows: {df_info['preview_summary']}"
        elif "summary" in msg_lower or "analyze" in msg_lower or "report" in msg_lower:
            response_text =  f"Data Profiling Report: File contains {df_info['total_rows']} transactional rows. The categorical breakdowns are synchronized live with your chart vectors!"
        else:
            response_text = f"Received query: '{message}'. To unlock deep human-like analytics on your '{df_info['columns'][0]}' fields, paste your token inside the backend/.env pipeline!"
        
        db = SessionLocal()

        chat = ChatHistory(
           user_query=message,
           ai_response=response_text
        )

        db.add(chat)
        db.commit()
        db.close()

        return {"reply": response_text}
    
@app.get("/export-csv")
def export_csv():

    df_info = storage.get("current_df")

    if not df_info:
        return {"error": "No dataset loaded"}

    df = df_info["df"]

    os.makedirs("exports", exist_ok=True)

    file_path = "exports/dashboard_export.csv"

    df.to_csv(file_path, index=False)

    return FileResponse(
        path=file_path,
        filename="dashboard_export.csv",
        media_type="text/csv"
    ) 

@app.get("/export-pdf")
def export_pdf():

    df_info = storage.get("current_df")

    if not df_info:
        return {"error": "No dataset loaded"}

    os.makedirs("exports", exist_ok=True)

    file_path = "exports/dashboard_report.pdf"

    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("AI Business Intelligence Report", styles["Title"]))
    story.append(Spacer(1, 20))

    story.append(
        Paragraph(
            f"Total Rows: {df_info['total_rows']}",
            styles["Normal"]
        )
    )

    story.append(
        Paragraph(
            f"Columns: {', '.join(df_info['columns'])}",
            styles["Normal"]
        )
    )

    story.append(Spacer(1, 20))

    story.append(
        Paragraph(
            "Generated by AI Analytics Platform",
            styles["Normal"]
        )
    )
    story.append(Spacer(1,20))

    story.append(
       Paragraph(
          "KPI Summary",
           styles["Heading2"]
       )
    )

    story.append(
        Paragraph(
            f"Total Rows: {df_info['total_rows']}",
            styles["Normal"]
        )
    )

    story.append(
        Paragraph(
            f"Total Columns: {len(df_info['columns'])}",
            styles["Normal"]
        )
    )
    numeric_cols = df_info.get("numeric_columns", [])
    categorical_cols = df_info.get("categorical_columns", [])

    story.append(
        Paragraph(
            f"Numeric Columns: {len(numeric_cols)}",
             styles["Normal"]
        )
    )

    story.append(
        Paragraph(
            f"Categorical Columns: {len(categorical_cols)}",
            styles["Normal"]
        )
    )
    story.append(Spacer(1,20))

    story.append(
        Paragraph(
           "Dataset Columns",
            styles["Heading2"]
        )
    )

    for col in df_info["columns"]:
        story.append(
            Paragraph(
                f"• {col}",
                styles["Normal"]
            )
        )
    story.append(Spacer(1,20))
    
    story.append(
        Paragraph(
           "Overview KPIs",
            styles["Heading2"]
        )
    )

    for key, value in df_info.get("overview_kpis", {}).items():
        story.append(
            Paragraph(
                f"{key}: {value}",
                styles["Normal"]
            )
        )

    story.append(Spacer(1,20))
    story.append(
        Paragraph(
           "Visualization Summary",
            styles["Heading2"]
        )
    )

    story.append(
        Paragraph(
            f"Generated {len(df_info.get('chart_data', []))} visualizations for dashboard exploration.",
            styles["Normal"]
        )
    )

    story.append(Spacer(1,20))
    story.append(
        Paragraph(
           "AI Insights",
            styles["Heading2"]
        )
    )

    story.append(
        Paragraph(
           "Dataset successfully profiled and prepared for business intelligence analysis.",
            styles["Normal"]
        )  
    )

    story.append(
        Paragraph(
           "Interactive visualizations and conversational analytics are available through the dashboard.",
            styles["Normal"]
        )
    )    
    doc.build(story)

    return FileResponse(
        path=file_path,
        filename="dashboard_report.pdf",
        media_type="application/pdf"
    )    
    
          