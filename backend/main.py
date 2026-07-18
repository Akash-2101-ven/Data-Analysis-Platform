from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import math
import time
from datetime import datetime
from fastapi.responses import FileResponse
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas as pdfcanvas
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
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


def human_readable_size(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"

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
    start_time = time.time()
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

    # File size (works regardless of how much of the stream pandas already consumed)
    try:
        file.file.seek(0, os.SEEK_END)
        file_size_bytes = file.file.tell()
        file.file.seek(0)
    except Exception:
        file_size_bytes = 0
    file_size_display = human_readable_size(file_size_bytes)

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
            std_val = df[col].std()
            var_val = df[col].var()
            column_kpis[col] = {
                "sum": round(float(df[col].sum()), 2),
                "average": round(float(df[col].mean()), 2),
                "max": round(float(df[col].max()), 2),
                "min": round(float(df[col].min()), 2),
                "median": round(float(df[col].median()), 2),
                "std_dev": round(float(std_val), 2) if pd.notna(std_val) else 0.0,
                "variance": round(float(var_val), 2) if pd.notna(var_val) else 0.0
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
    # CORRELATION MATRIX (descriptive analytics -> heatmap on the frontend)
    # ==========================
    correlation_matrix = {"columns": [], "matrix": []}
    if len(numeric_cols) >= 2:
        try:
            corr_df = df[numeric_cols].corr().fillna(0).round(2)
            correlation_matrix = {
                "columns": list(corr_df.columns),
                "matrix": corr_df.values.tolist()
            }
        except Exception:
            pass

    # ==========================
    # FORECAST / TREND (predictive analytics)
    # Simple linear regression over the grouped chart values — fits a trend
    # line over the existing categories and projects 3 points forward.
    # This is intentionally lightweight (no external ML deps) but gives a
    # genuine, defensible predictive signal rather than a fake number.
    # ==========================
    forecast_data = []
    trend_info = {}
    if chart_data and y_axis:
        try:
            y_values = np.array([row.get(y_axis) or 0 for row in chart_data], dtype=float)
            x_positions = np.arange(len(y_values))
            if len(y_values) >= 2:
                slope, intercept = np.polyfit(x_positions, y_values, 1)
                fitted = (slope * x_positions + intercept).round(2)

                for i, row in enumerate(chart_data):
                    forecast_data.append({
                        x_axis: row.get(x_axis),
                        "actual": round(float(y_values[i]), 2),
                        "trend": float(fitted[i])
                    })

                future_points = 3
                for i in range(future_points):
                    pos = len(y_values) + i
                    predicted = round(float(slope * pos + intercept), 2)
                    forecast_data.append({
                        x_axis: f"Forecast {i + 1}",
                        "actual": None,
                        "trend": predicted
                    })

                # R^2 so the frontend can show how trustworthy the trend is
                residuals = y_values - fitted
                ss_res = float(np.sum(residuals ** 2))
                ss_tot = float(np.sum((y_values - y_values.mean()) ** 2))
                r_squared = round(1 - (ss_res / ss_tot), 3) if ss_tot > 0 else 0.0

                trend_info = {
                    "slope": round(float(slope), 4),
                    "direction": "increasing" if slope > 0 else ("decreasing" if slope < 0 else "flat"),
                    "r_squared": r_squared
                }
        except Exception:
            forecast_data = []
            trend_info = {}
    # ==========================
    # STORE DATASET INFO FOR CHAT + SMART DATA EXPLORER
    # ==========================
    # NOTE: we keep the ORIGINAL (unfiltered, unsorted) dataframe here.
    # The /data endpoint below reads from this same storage and applies
    # search/sort/pagination on top of it per-request, so the full dataset
    # never has to be sent to the browser in one shot.
    processing_time_seconds = round(time.time() - start_time, 2)

    storage["current_df"] = {
        "df": df,
        "columns": columns,
        "total_rows": total_rows,
        "preview_summary": df.head(5).to_dict(orient="records"),

         "overview_kpis": overview_kpis,
         "column_kpis": column_kpis,
         "chart_data": chart_data,
         "numeric_columns": numeric_cols,
         "categorical_columns": categorical_cols,
         "x_key": x_axis,
         "y_key": y_axis,
         "correlation_matrix": correlation_matrix,
         "forecast_data": forecast_data,
         "trend_info": trend_info,

         # Metadata used by the PDF/CSV export endpoints
         "filename": file.filename,
         "upload_time": datetime.now().strftime("%d %b %Y, %I:%M %p"),
         "file_size": file_size_display,
         "processing_time": f"{processing_time_seconds}s"
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
        "y_key": y_axis,

        "correlation_matrix": correlation_matrix,
        "forecast_data": forecast_data,
        "trend_info": trend_info
    }


def apply_filters(df, search="", sort="", order="asc", column="", value=""):
    """Shared filter/search/sort logic used by both /data (Explorer) and
    /export-csv, so the CSV export always matches exactly what's on screen."""

    # ---- Column filter (e.g. Country = India) ----
    if column and value and column in df.columns:
        df = df[df[column].astype(str).str.lower() == value.strip().lower()]

    # ---- Free text search across every column ----
    if search:
        search_lower = search.strip().lower()
        mask = df.apply(
            lambda row: row.astype(str).str.lower().str.contains(search_lower, na=False).any(),
            axis=1
        )
        df = df[mask]

    # ---- Sorting ----
    if sort and sort in df.columns:
        df = df.sort_values(
            by=sort,
            ascending=(order != "desc"),
            na_position="last",
            kind="mergesort"  # stable sort so paging stays consistent
        )

    return df


# ✅ NEW: SMART DATA EXPLORER ENDPOINT (pagination + search + sort + filter)
@app.get("/data")
def get_data(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: str = Query("", description="Free-text search across all columns"),
    sort: str = Query("", description="Column name to sort by"),
    order: str = Query("asc", description="asc or desc"),
    column: str = Query("", description="Optional column name to filter on"),
    value: str = Query("", description="Value to match when 'column' is provided")
):
    df_info = storage.get("current_df")

    if not df_info:
        return {"error": "No dataset loaded"}

    # Always start from the original, untouched dataframe for this request
    df = apply_filters(df_info["df"].copy(), search, sort, order, column, value)

    total_rows = len(df)
    total_pages = max(1, math.ceil(total_rows / limit))
    safe_page = min(max(page, 1), total_pages)

    start = (safe_page - 1) * limit
    end = start + limit

    page_df = df.iloc[start:end].replace({np.nan: None})
    rows = page_df.to_dict(orient="records")

    return {
        "page": safe_page,
        "limit": limit,
        "total_pages": total_pages,
        "total_rows": total_rows,
        "columns": df_info["columns"],
        "rows": rows
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
def export_csv(
    search: str = Query("", description="Free-text search across all columns"),
    sort: str = Query("", description="Column name to sort by"),
    order: str = Query("asc", description="asc or desc"),
    column: str = Query("", description="Optional column name to filter on"),
    value: str = Query("", description="Value to match when 'column' is provided")
):
    """CSV export = the clean processed dataset exactly as the user sees it in
    the Data Explorer (same filters, same sort). No charts, no styling —
    just the data, like Power BI / Tableau's data export."""

    df_info = storage.get("current_df")

    if not df_info:
        return {"error": "No dataset loaded"}

    df = apply_filters(df_info["df"].copy(), search, sort, order, column, value)

    os.makedirs("exports", exist_ok=True)
    file_path = "exports/dashboard_export.csv"
    df.to_csv(file_path, index=False)

    return FileResponse(
        path=file_path,
        filename="dashboard_export.csv",
        media_type="text/csv"
    )

# ---------------------------------------------------------------------------
# PDF REPORT HELPERS
# ---------------------------------------------------------------------------

_pdf_styles = getSampleStyleSheet()
_pdf_styles.add(ParagraphStyle(
    name="CoverTitle", fontSize=26, leading=32, alignment=TA_CENTER,
    textColor=colors.HexColor("#4338ca"), fontName="Helvetica-Bold", spaceAfter=6
))
_pdf_styles.add(ParagraphStyle(
    name="CoverSubtitle", fontSize=14, alignment=TA_CENTER,
    textColor=colors.HexColor("#6366f1"), spaceAfter=30
))
_pdf_styles.add(ParagraphStyle(
    name="CoverMeta", fontSize=10, alignment=TA_CENTER,
    textColor=colors.HexColor("#475569"), spaceAfter=4
))
_pdf_styles.add(ParagraphStyle(
    name="SectionHeading", fontSize=14, textColor=colors.HexColor("#1e293b"),
    fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=8
))
_pdf_styles.add(ParagraphStyle(
    name="ChartCaption", fontSize=8, textColor=colors.HexColor("#64748b"),
    alignment=TA_CENTER, spaceAfter=12
))
_pdf_styles.add(ParagraphStyle(
    name="InsightBullet", fontSize=10, textColor=colors.HexColor("#334155"),
    leftIndent=14, spaceAfter=6
))


class NumberedCanvas(pdfcanvas.Canvas):
    """Draws a 'Page X of Y' + brand footer on every page. Reportlab needs a
    two-pass approach for total page count, hence the saved-states trick."""

    def __init__(self, *args, **kwargs):
        pdfcanvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(page_count)
            pdfcanvas.Canvas.showPage(self)
        pdfcanvas.Canvas.save(self)

    def _draw_footer(self, page_count):
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#94a3b8"))
        self.drawString(45, 25, "AI Analytics Platform  |  Confidential")
        self.drawRightString(A4[0] - 45, 25, f"Page {self._pageNumber} of {page_count}")


def styled_table(data, col_widths=None, header_bg="#4338ca"):
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_bg)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def generate_chart_images(chart_data, x_axis, y_axis):
    """Renders bar / pie / line PNGs (matplotlib) matching the dashboard's
    Recharts visuals, so the PDF isn't just tables."""
    paths = {}
    if not chart_data or not x_axis or not y_axis:
        return paths

    os.makedirs("exports", exist_ok=True)
    labels = [str(row.get(x_axis)) for row in chart_data]
    values = [row.get(y_axis) or 0 for row in chart_data]
    palette = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
               "#ec4899", "#14b8a6", "#3b82f6", "#94a3b8"]

    # ---- Bar chart (top 15 for readability) ----
    bar_pairs = sorted(zip(labels, values), key=lambda p: p[1], reverse=True)[:15]
    if bar_pairs:
        b_labels, b_values = zip(*bar_pairs)
        plt.figure(figsize=(7, 3.2))
        plt.bar(b_labels, b_values, color="#6366f1")
        plt.xticks(rotation=40, ha="right", fontsize=7)
        plt.title(f"{y_axis} by {x_axis}", fontsize=10)
        plt.tight_layout()
        bar_path = "exports/chart_bar.png"
        plt.savefig(bar_path, dpi=150)
        plt.close()
        paths["bar"] = bar_path

    # ---- Pie chart (top 8 + Others) ----
    pie_sorted = sorted(zip(labels, values), key=lambda p: p[1], reverse=True)
    top = pie_sorted[:8]
    rest = pie_sorted[8:]
    if rest:
        others_total = sum(v for _, v in rest)
        top = top + [(f"Others ({len(rest)})", others_total)]
    if top:
        p_labels, p_values = zip(*top)
        plt.figure(figsize=(5.5, 4))
        plt.pie(p_values, labels=p_labels, autopct="%1.1f%%",
                colors=palette[:len(p_values)], textprops={"fontsize": 7})
        plt.title(f"{y_axis} composition by {x_axis}", fontsize=10)
        plt.tight_layout()
        pie_path = "exports/chart_pie.png"
        plt.savefig(pie_path, dpi=150)
        plt.close()
        paths["pie"] = pie_path

    # ---- Line chart ----
    plt.figure(figsize=(7, 3.2))
    plt.plot(labels, values, color="#6366f1", marker="o", markersize=3, linewidth=1.5)
    plt.xticks(rotation=40, ha="right", fontsize=7)
    plt.title(f"{y_axis} trend across {x_axis}", fontsize=10)
    plt.tight_layout()
    line_path = "exports/chart_line.png"
    plt.savefig(line_path, dpi=150)
    plt.close()
    paths["line"] = line_path

    return paths


def _rule_based_insights(df, df_info):
    """Offline fallback so the report never breaks if no OpenAI key is set."""
    insights = []
    overview_kpis = df_info.get("overview_kpis", {})
    numeric_cols = df_info.get("numeric_columns", [])
    chart_data = df_info.get("chart_data", [])
    x_axis = df_info.get("x_key")
    y_axis = df_info.get("y_key")

    try:
        if chart_data and x_axis and y_axis:
            sorted_data = sorted(chart_data, key=lambda r: r.get(y_axis) or 0, reverse=True)
            total = sum((r.get(y_axis) or 0) for r in sorted_data)
            if sorted_data and total > 0:
                top = sorted_data[0]
                pct = round((top.get(y_axis, 0) / total) * 100, 1)
                insights.append(
                    f"'{top.get(x_axis)}' leads all {x_axis} categories in {y_axis}, contributing {pct}% of the total."
                )
            if len(sorted_data) > 1:
                bottom = sorted_data[-1]
                insights.append(
                    f"'{bottom.get(x_axis)}' recorded the lowest {y_axis} among all {x_axis} categories."
                )
    except Exception:
        pass

    missing = overview_kpis.get("missing_values", 0)
    if missing == 0:
        insights.append("No missing values were detected across the dataset — data quality looks clean.")
    else:
        try:
            cols_with_na = df.columns[df.isnull().any()].tolist()
            insights.append(f"{missing} missing value(s) detected, concentrated in: {', '.join(cols_with_na[:5])}.")
        except Exception:
            insights.append(f"{missing} missing value(s) detected across the dataset.")

    if len(numeric_cols) >= 2:
        try:
            corr = df[numeric_cols].corr().abs()
            np.fill_diagonal(corr.values, 0)
            max_corr = corr.unstack().sort_values(ascending=False)
            if len(max_corr) > 0 and max_corr.iloc[0] > 0.5:
                a, b = max_corr.index[0]
                insights.append(
                    f"'{a}' and '{b}' show a strong correlation ({round(max_corr.iloc[0], 2)}), suggesting they move together."
                )
        except Exception:
            pass

    trend_info = df_info.get("trend_info") or {}
    if trend_info.get("direction") and trend_info.get("direction") != "flat":
        r2 = trend_info.get("r_squared", 0)
        confidence = "high" if r2 >= 0.6 else ("moderate" if r2 >= 0.3 else "low")
        insights.append(
            f"{y_axis} shows an {trend_info['direction']} trend across {x_axis} groups "
            f"({confidence} confidence, R² = {r2})."
        )

    insights.append(
        f"Dataset spans {overview_kpis.get('total_rows', 0):,} records across "
        f"{overview_kpis.get('total_columns', 0)} fields, with {overview_kpis.get('numeric_columns', 0)} "
        f"numeric metrics available for analysis."
    )

    return insights[:6]


def generate_ai_insights(df_info, df):
    """Tries a real OpenAI summary first (same pattern as /chat), falls back
    to deterministic rule-based insights if no key is configured or it fails."""
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key and not api_key.startswith("your_"):
        try:
            client = OpenAI(api_key=api_key)
            prompt = f"""
            You are a business intelligence analyst. Based on this dataset profile,
            write 4-6 short, specific bullet point insights (max 20 words each).
            Reply with ONLY the bullet points, one per line, each starting with "-".
            No preamble, no closing remarks.

            Columns: {df_info.get('columns')}
            Numeric columns: {df_info.get('numeric_columns', [])}
            Categorical columns: {df_info.get('categorical_columns', [])}
            Overview KPIs: {df_info.get('overview_kpis', {})}
            Grouped snapshot ({df_info.get('x_key')} vs {df_info.get('y_key')}): {df_info.get('chart_data', [])[:10]}
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            text = response.choices[0].message.content
            lines = [l.strip("-• ").strip() for l in text.split("\n") if l.strip()]
            if lines:
                return lines[:6]
        except Exception:
            pass

    return _rule_based_insights(df, df_info)


@app.get("/export-pdf")
def export_pdf(generated_by: str = Query("Guest User")):
    """Generates a polished, multi-page BI report: cover page, executive
    summary, dataset overview, AI insights, charts, column analytics,
    a capped data preview, and metadata — with a page-numbered footer."""

    df_info = storage.get("current_df")
    if not df_info:
        return {"error": "No dataset loaded"}

    df = df_info["df"]
    os.makedirs("exports", exist_ok=True)
    file_path = "exports/dashboard_report.pdf"

    doc = SimpleDocTemplate(
        file_path, pagesize=A4,
        topMargin=55, bottomMargin=50, leftMargin=45, rightMargin=45
    )
    story = []

    overview_kpis = df_info.get("overview_kpis", {})
    column_kpis = df_info.get("column_kpis", {})
    chart_data = df_info.get("chart_data", [])
    x_axis = df_info.get("x_key")
    y_axis = df_info.get("y_key")
    filename = df_info.get("filename", "dataset.csv")

    # ---------------- COVER PAGE ----------------
    story.append(Spacer(1, 140))
    story.append(Paragraph("AI Analytics Platform", _pdf_styles["CoverTitle"]))
    story.append(Paragraph("Business Intelligence Report", _pdf_styles["CoverSubtitle"]))
    story.append(Spacer(1, 40))
    story.append(Paragraph(f"Generated On: {datetime.now().strftime('%d %B %Y, %I:%M %p')}", _pdf_styles["CoverMeta"]))
    story.append(Paragraph(f"Dataset Name: {filename}", _pdf_styles["CoverMeta"]))
    story.append(Paragraph(f"Generated By: {generated_by}", _pdf_styles["CoverMeta"]))
    story.append(PageBreak())

    # ---------------- EXECUTIVE SUMMARY ----------------
    story.append(Paragraph("Executive Summary", _pdf_styles["SectionHeading"]))
    story.append(styled_table([
        ["Metric", "Value"],
        ["Total Records", f"{overview_kpis.get('total_rows', 0):,}"],
        ["Columns", overview_kpis.get("total_columns", 0)],
        ["Numeric Columns", overview_kpis.get("numeric_columns", 0)],
        ["Missing Values", overview_kpis.get("missing_values", 0)],
        ["Charts Generated", 3 if chart_data else 0],
    ], col_widths=[240, 200]))
    story.append(Spacer(1, 16))

    # ---------------- DATASET OVERVIEW ----------------
    story.append(Paragraph("Dataset Overview", _pdf_styles["SectionHeading"]))
    story.append(styled_table([
        ["Rows", "Columns", "Upload Time", "File Size", "Processing Time"],
        [
            f"{df_info.get('total_rows', 0):,}",
            overview_kpis.get("total_columns", 0),
            df_info.get("upload_time", "—"),
            df_info.get("file_size", "—"),
            df_info.get("processing_time", "—"),
        ],
    ]))
    story.append(Spacer(1, 16))

    # ---------------- AI INSIGHTS ----------------
    story.append(Paragraph("AI Insights", _pdf_styles["SectionHeading"]))
    for insight in generate_ai_insights(df_info, df):
        story.append(Paragraph(f"• {insight}", _pdf_styles["InsightBullet"]))
    story.append(Spacer(1, 10))

    # ---------------- VISUALIZATIONS ----------------
    story.append(Paragraph("Visualizations", _pdf_styles["SectionHeading"]))
    chart_paths = generate_chart_images(chart_data, x_axis, y_axis)

    if not chart_paths:
        story.append(Paragraph("No chart data was available to render visualizations.", _pdf_styles["Normal"]))
    else:
        if chart_paths.get("bar"):
            story.append(Paragraph("Automated Data Distribution", _pdf_styles["Heading3"]))
            story.append(Image(chart_paths["bar"], width=460, height=200))
            story.append(Paragraph(f"Total {y_axis} grouped by {x_axis}.", _pdf_styles["ChartCaption"]))

        if chart_paths.get("pie"):
            story.append(Paragraph("Category Composition", _pdf_styles["Heading3"]))
            story.append(Image(chart_paths["pie"], width=340, height=250))
            story.append(Paragraph(f"Share of {y_axis} across top {x_axis} categories.", _pdf_styles["ChartCaption"]))

        if chart_paths.get("line"):
            story.append(Paragraph("Analytics Trend Overview", _pdf_styles["Heading3"]))
            story.append(Image(chart_paths["line"], width=460, height=200))
            story.append(Paragraph(f"Trend of {y_axis} across grouped {x_axis} values.", _pdf_styles["ChartCaption"]))

    story.append(PageBreak())

    # ---------------- COLUMN ANALYTICS ----------------
    story.append(Paragraph("Column Analytics", _pdf_styles["SectionHeading"]))
    if column_kpis:
        col_table_data = [["Column", "Sum", "Average", "Median", "Maximum", "Minimum"]]
        for col, stats in column_kpis.items():
            col_table_data.append([
                col,
                f"{stats['sum']:,.2f}",
                f"{stats['average']:,.2f}",
                f"{stats.get('median', 0):,.2f}",
                f"{stats['max']:,.2f}",
                f"{stats['min']:,.2f}",
            ])
        story.append(styled_table(col_table_data, col_widths=[95, 80, 80, 80, 80, 80]))
    else:
        story.append(Paragraph("No numeric columns were detected in this dataset.", _pdf_styles["Normal"]))
    story.append(Spacer(1, 16))

    # ---------------- DATA PREVIEW (first 20 rows, capped columns) ----------------
    story.append(Paragraph("Data Preview (First 20 Records)", _pdf_styles["SectionHeading"]))
    preview_cols = df_info["columns"][:8]
    preview_rows = df.head(20)[preview_cols].replace({np.nan: "—"}).values.tolist()
    preview_table_data = [preview_cols] + [[str(v) for v in row] for row in preview_rows]
    story.append(styled_table(preview_table_data))
    if len(df_info["columns"]) > 8:
        story.append(Paragraph(
            f"Showing first 8 of {len(df_info['columns'])} columns. Download the CSV for the full dataset.",
            _pdf_styles["ChartCaption"]
        ))
    story.append(Spacer(1, 16))

    # ---------------- METADATA ----------------
    story.append(Paragraph("Report Metadata", _pdf_styles["SectionHeading"]))
    story.append(Paragraph("Exported From: AI Analytics Platform v1.0", _pdf_styles["Normal"]))
    story.append(Paragraph("Generated By: FastAPI + Pandas Processing Engine", _pdf_styles["Normal"]))
    story.append(Paragraph("Visualizations Rendered By: Matplotlib", _pdf_styles["Normal"]))
    story.append(Paragraph(
        f"Report Generated Automatically on {datetime.now().strftime('%d %B %Y, %I:%M %p')}",
        _pdf_styles["Normal"]
    ))

    doc.build(story, canvasmaker=NumberedCanvas)

    return FileResponse(
        path=file_path,
        filename="dashboard_report.pdf",
        media_type="application/pdf"
    )

@app.get("/dataset/{dataset_id}")
def get_dataset(dataset_id: int):

    db = SessionLocal()

    dataset = (
        db.query(UploadedFile)
        .filter(UploadedFile.id == dataset_id)
        .first()
    )

    db.close()

    if not dataset:
        return {"error": "Dataset not found"}

    return dataset
