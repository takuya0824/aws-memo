from pydantic import BaseModel, ConfigDict
from datetime import datetime

class MemoCreate(BaseModel):
    title: str
    content: str
    published: bool = False

class MemoUpdate(BaseModel):
    title: str
    content: str
    published: bool

class MemoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    published: bool
    created_at: datetime
    updated_at: datetime
