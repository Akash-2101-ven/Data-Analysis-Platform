from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    total_rows = Column(Integer)
    total_columns = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_query = Column(String)
    ai_response = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)