from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter()

@router.get("/", response_model=list[schemas.MemoResponse])
def list_memos(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    return db.query(models.Memo).filter(models.Memo.user_id == user_id).order_by(models.Memo.updated_at.desc()).all()

@router.get("/{memo_id}", response_model=schemas.MemoResponse)
def get_memo(memo_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id, models.Memo.user_id == user_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo

@router.post("/", response_model=schemas.MemoResponse, status_code=201)
def create_memo(body: schemas.MemoCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    memo = models.Memo(**body.model_dump(), user_id=user_id)
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return memo

@router.put("/{memo_id}", response_model=schemas.MemoResponse)
def update_memo(memo_id: int, body: schemas.MemoUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id, models.Memo.user_id == user_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    for k, v in body.model_dump().items():
        setattr(memo, k, v)
    db.commit()
    db.refresh(memo)
    return memo

@router.delete("/{memo_id}", status_code=204)
def delete_memo(memo_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id, models.Memo.user_id == user_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    db.delete(memo)
    db.commit()
