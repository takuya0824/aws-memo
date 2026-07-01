from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Memo(Base):
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String(255), nullable=False, default="無題")
    content = Column(Text, nullable=False, default="")
    published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
