import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.bill import Bill, BillItem, PaymentStatus
from app.models.appointment import Appointment
from app.models.user import User, UserRole
from app.core.deps import get_current_user
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
from datetime import datetime, date

router = APIRouter()

class BillItemIn(BaseModel):
    description: str
    amount: Decimal

class BillCreate(BaseModel):
    appointment_id: uuid.UUID
    items: list[BillItemIn]
    payment_method: Optional[str] = None

class BillItemOut(BaseModel):
    id: uuid.UUID
    description: str
    amount: Decimal
    class Config: from_attributes = True

class PatientSnippet(BaseModel):
    id: uuid.UUID
    patient_code: str
    full_name: str
    phone: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    class Config: from_attributes = True

class BillOut(BaseModel):
    id: uuid.UUID
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    total_amount: Decimal
    payment_status: PaymentStatus
    payment_method: Optional[str]
    billed_at: datetime
    items: list[BillItemOut]
    patient: Optional[PatientSnippet] = None
    class Config: from_attributes = True

@router.post("/", response_model=BillOut, status_code=201)
def create_bill(data: BillCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    
    # Check if bill already exists
    existing_bill = db.query(Bill).filter(Bill.appointment_id == data.appointment_id).first()
    if existing_bill:
        return existing_bill

    total = sum(i.amount for i in data.items)
    bill = Bill(appointment_id=data.appointment_id, patient_id=appt.patient_id,
                total_amount=total, payment_method=data.payment_method)
    db.add(bill)
    db.flush()
    for item in data.items:
        db.add(BillItem(bill_id=bill.id, description=item.description, amount=item.amount))
    db.commit()
    db.refresh(bill)
    return bill

@router.get("/", response_model=list[BillOut])
def list_bills(
    patient_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    from sqlalchemy.orm import joinedload
    q = db.query(Bill).options(joinedload(Bill.patient), joinedload(Bill.items))

    # RBAC: Patients only see their own bills
    if current_user.role == UserRole.patient:
        if not current_user.patient:
            return []
        q = q.filter(Bill.patient_id == current_user.patient.id)
    elif patient_id:
        q = q.filter(Bill.patient_id == patient_id)

    return q.order_by(Bill.billed_at.desc()).all()


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(
    bill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    from sqlalchemy.orm import joinedload
    bill = db.query(Bill).options(joinedload(Bill.patient), joinedload(Bill.items)).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")

    # RBAC: Patients only see their own bill
    if current_user.role == UserRole.patient:
        if not current_user.patient or bill.patient_id != current_user.patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return bill

@router.patch("/{bill_id}/pay", response_model=BillOut)
def mark_paid(bill_id: uuid.UUID, payment_method: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    bill.payment_status = PaymentStatus.paid
    bill.payment_method = payment_method
    db.commit()
    db.refresh(bill)
    return bill
