from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional
import json
from backend.database import get_db
from backend.schemas.transaction import CSVPreviewSummary, CSVConfirmRequest
from backend.services.import_service import parse_csv_preview, confirm_csv_import

router = APIRouter(prefix="/imports", tags=["Imports"])

@router.post("/preview", response_model=CSVPreviewSummary)
async def preview_csv_import(
    file: UploadFile = File(...),
    user_id: str = Form("default_user"),
    column_mapping: Optional[str] = Form(None),
    db=Depends(get_db)
):
    try:
        content = await file.read()
        text_content = content.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(e)}")

    custom_map = None
    if column_mapping:
        try:
            custom_map = json.loads(column_mapping)
        except Exception:
            pass

    return parse_csv_preview(
        file_content=text_content,
        file_name=file.filename or "upload.csv",
        user_id=user_id,
        db=db,
        custom_mapping=custom_map
    )

@router.post("/confirm")
def confirm_import_endpoint(
    req: CSVConfirmRequest,
    db=Depends(get_db)
):
    if not req.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided to confirm.")
    tx_dicts = [tx.model_dump() for tx in req.transactions]
    result = confirm_csv_import(
        user_id=req.user_id,
        file_name=req.file_name,
        transactions=tx_dicts,
        db=db
    )
    return result

@router.get("")
def list_user_imports(user_id: str = "default_user", db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
    SELECT id, file_name, total_rows, accepted_rows, rejected_rows, duplicate_rows, created_at
    FROM imports WHERE user_id = ? ORDER BY created_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    return [
        {
            "id": r["id"],
            "file_name": r["file_name"],
            "total_rows": r["total_rows"],
            "accepted_rows": r["accepted_rows"],
            "rejected_rows": r["rejected_rows"],
            "duplicate_rows": r["duplicate_rows"],
            "created_at": r["created_at"]
        }
        for r in rows
    ]
