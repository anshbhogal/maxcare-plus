import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.ipd import Bed, Admission, BedStatus
from app.models.user import User, UserRole
from app.core.deps import get_current_user
from app.core.audit import log_access
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class BedCreate(BaseModel):
    ward: str
    bed_number: str
    bed_type: str = "general"

class BedOut(BaseModel):
    id: uuid.UUID
    ward: str
    bed_number: str
    bed_type: str
    status: BedStatus
    class Config: from_attributes = True

class AdmissionCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    bed_id: uuid.UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None

class AdmissionOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    bed_id: uuid.UUID
    admission_date: datetime
    discharge_date: Optional[datetime]
    diagnosis: Optional[str]
    status: str
    notes: Optional[str]
    class Config: from_attributes = True

@router.get("/beds", response_model=list[BedOut])
def list_beds(status: Optional[BedStatus] = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(Bed)
    if status:
        q = q.filter(Bed.status == status)
    return q.all()

@router.post("/beds", response_model=BedOut, status_code=201)
def create_bed(data: BedCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bed = Bed(**data.model_dump())
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed

@router.post("/admissions", response_model=AdmissionOut, status_code=201)
def admit_patient(data: AdmissionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bed = db.query(Bed).filter(Bed.id == data.bed_id).first()
    if not bed or bed.status != BedStatus.available:
        raise HTTPException(400, "Bed not available")
    admission = Admission(**data.model_dump())
    bed.status = BedStatus.occupied
    db.add(admission)
    db.commit()
    db.refresh(admission)
    return admission

@router.patch("/admissions/{admission_id}/discharge", response_model=AdmissionOut)
def discharge_patient(admission_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(404, "Admission not found")
    from datetime import datetime, timezone
    admission.discharge_date = datetime.now(timezone.utc)
    admission.status = "discharged"
    bed = db.query(Bed).filter(Bed.id == admission.bed_id).first()
    if bed:
        bed.status = BedStatus.available
    db.commit()
    db.refresh(admission)
    return admission

@router.get("/admissions", response_model=list[AdmissionOut])
def list_admissions(
    request: Request,
    patient_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    q = db.query(Admission)

    # RBAC: Patients only see their own admissions
    if current_user.role == UserRole.patient:
        if not current_user.patient:
            return []
        q = q.filter(Admission.patient_id == current_user.patient.id)
        log_access(db, current_user, "LIST_MY_ADMISSIONS", patient_id=current_user.patient.id, request=request)
    elif patient_id:
        q = q.filter(Admission.patient_id == patient_id)
        log_access(db, current_user, "LIST_PATIENT_ADMISSIONS", patient_id=patient_id, request=request)
    else:
        log_access(db, current_user, "LIST_ALL_ADMISSIONS", request=request)

    return db.query(Admission).order_by(Admission.admission_date.desc()).all()
