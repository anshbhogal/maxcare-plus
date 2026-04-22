import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.pharmacy import Medicine, Prescription, PrescriptionItem
from app.models.versioning import PrescriptionVersion
from app.models.appointment import Appointment
from app.models.user import User, UserRole
from app.core.deps import get_current_user
from app.core.audit import log_access
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
from datetime import datetime

router = APIRouter()

class MedicineCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: int = 0
    price: Decimal

class MedicineOut(BaseModel):
    id: uuid.UUID
    name: str
    category: Optional[str]
    unit: Optional[str]
    stock_quantity: int
    price: Decimal
    is_active: bool
    class Config: from_attributes = True

class PrescriptionItemIn(BaseModel):
    medicine_id: uuid.UUID
    dosage: str
    frequency: str
    duration_days: Optional[int] = None
    instructions: Optional[str] = None

class PrescriptionCreate(BaseModel):
    appointment_id: uuid.UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    items: list[PrescriptionItemIn]

class PrescriptionItemOut(BaseModel):
    id: uuid.UUID
    medicine_id: uuid.UUID
    dosage: str
    frequency: str
    duration_days: Optional[int]
    instructions: Optional[str]
    medicine: MedicineOut
    class Config: from_attributes = True

class PrescriptionVersionOut(BaseModel):
    id: uuid.UUID
    diagnosis: Optional[str]
    notes: Optional[str]
    items_snapshot: list
    version_number: str
    created_at: datetime
    class Config: from_attributes = True

class PrescriptionOut(BaseModel):
    id: uuid.UUID
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    diagnosis: Optional[str]
    notes: Optional[str]
    current_version: int
    created_at: datetime
    items: list[PrescriptionItemOut]
    versions: list[PrescriptionVersionOut] = []
    class Config: from_attributes = True

@router.get("/medicines", response_model=list[MedicineOut])
def list_medicines(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Medicine).filter(Medicine.is_active == True).all()

@router.post("/medicines", response_model=MedicineOut, status_code=201)
def add_medicine(data: MedicineCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    med = Medicine(**data.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.patch("/medicines/{med_id}/stock")
def update_stock(med_id: uuid.UUID, quantity: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    med = db.query(Medicine).filter(Medicine.id == med_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")
    med.stock_quantity = quantity
    db.commit()
    return {"message": "Stock updated", "new_quantity": quantity}

@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(data: PrescriptionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if db.query(Prescription).filter(Prescription.appointment_id == data.appointment_id).first():
        raise HTTPException(400, "Prescription already exists for this appointment")
    rx = Prescription(appointment_id=data.appointment_id, patient_id=appt.patient_id,
                      doctor_id=appt.doctor_id, diagnosis=data.diagnosis, notes=data.notes)
    db.add(rx)
    db.flush()
    for item in data.items:
        db.add(PrescriptionItem(prescription_id=rx.id, **item.model_dump()))
    db.commit()
    db.refresh(rx)
    return rx

@router.get("/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(
    request: Request,
    patient_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    q = db.query(Prescription)

    # RBAC: Patients only see their own prescriptions
    if current_user.role == UserRole.patient:
        if not current_user.patient:
            return []
        q = q.filter(Prescription.patient_id == current_user.patient.id)
        log_access(db, current_user, "LIST_MY_PRESCRIPTIONS", patient_id=current_user.patient.id, request=request)
    elif patient_id:
        q = q.filter(Prescription.patient_id == patient_id)
        log_access(db, current_user, "LIST_PATIENT_PRESCRIPTIONS", patient_id=patient_id, request=request)
    else:
        log_access(db, current_user, "LIST_ALL_PRESCRIPTIONS", request=request)

    return q.order_by(Prescription.created_at.desc()).all()


@router.get("/prescriptions/{rx_id}", response_model=PrescriptionOut)
def get_prescription(
    rx_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    rx = db.query(Prescription).filter(Prescription.id == rx_id).first()
    if not rx:
        raise HTTPException(404, "Prescription not found")

    # RBAC: Patients only see their own prescription
    if current_user.role == UserRole.patient:
        if not current_user.patient or rx.patient_id != current_user.patient.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    log_access(db, current_user, "VIEW_PRESCRIPTION", patient_id=rx.patient_id, resource_type="Prescription", resource_id=rx.id, request=request)
    return rx


@router.put("/prescriptions/{rx_id}", response_model=PrescriptionOut)
def update_prescription(
    rx_id: uuid.UUID,
    data: PrescriptionCreate, # Reuse create schema for update
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates a prescription and archives the old version for immutability/audit.
    """
    rx = db.query(Prescription).filter(Prescription.id == rx_id).first()
    if not rx:
        raise HTTPException(404, "Prescription not found")

    # Only the prescribing doctor or admin can update
    if current_user.role == UserRole.patient:
        raise HTTPException(status_code=403, detail="Patients cannot update prescriptions")
    
    if current_user.role == UserRole.doctor and rx.doctor_id != current_user.doctor.id:
         raise HTTPException(status_code=403, detail="Only the prescribing doctor can modify this record")

    # 1. Create a snapshot of the current version
    items_snapshot = [
        {
            "medicine_id": str(i.medicine_id),
            "medicine_name": i.medicine.name,
            "dosage": i.dosage,
            "frequency": i.frequency,
            "duration_days": i.duration_days,
            "instructions": i.instructions
        } for i in rx.items
    ]
    
    version = PrescriptionVersion(
        prescription_id=rx.id,
        diagnosis=rx.diagnosis,
        notes=rx.notes,
        items_snapshot=items_snapshot,
        version_number=f"v{rx.current_version}",
        changed_by_id=current_user.id
    )
    db.add(version)
    
    # 2. Update the main record
    rx.diagnosis = data.diagnosis
    rx.notes = data.notes
    rx.current_version += 1
    
    # 3. Replace items
    # Delete old items
    for item in rx.items:
        db.delete(item)
    
    # Add new items
    for item_in in data.items:
        db.add(PrescriptionItem(prescription_id=rx.id, **item_in.model_dump()))
    
    db.commit()
    db.refresh(rx)
    
    log_access(db, current_user, "UPDATE_PRESCRIPTION", patient_id=rx.patient_id, resource_type="Prescription", resource_id=rx.id, request=request)
    return rx
