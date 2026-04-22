import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.lab import LabTest, LabTestStatus
from app.models.appointment import Appointment
from app.models.user import User, UserRole
from app.core.deps import get_current_user
from app.core.audit import log_access
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class LabTestCreate(BaseModel):
    appointment_id: uuid.UUID
    test_name: str
    notes: Optional[str] = None

class LabTestUpdate(BaseModel):
    status: Optional[LabTestStatus] = None
    result: Optional[str] = None
    notes: Optional[str] = None

class LabTestOut(BaseModel):
    id: uuid.UUID
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    test_name: str
    status: LabTestStatus
    result: Optional[str]
    notes: Optional[str]
    requested_at: datetime
    completed_at: Optional[datetime]
    class Config: from_attributes = True

@router.post("/", response_model=LabTestOut, status_code=201)
def request_lab_test(data: LabTestCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    test = LabTest(appointment_id=data.appointment_id, patient_id=appt.patient_id,
                   test_name=data.test_name, notes=data.notes)
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

@router.get("/", response_model=list[LabTestOut])
def list_tests(
    request: Request,
    patient_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    q = db.query(LabTest)

    # RBAC: Patients only see their own tests
    if current_user.role == UserRole.patient:
        if not current_user.patient:
            return []
        q = q.filter(LabTest.patient_id == current_user.patient.id)
        log_access(db, current_user, "LIST_MY_LAB_TESTS", patient_id=current_user.patient.id, request=request)
    elif patient_id:
        q = q.filter(LabTest.patient_id == patient_id)
        log_access(db, current_user, "LIST_PATIENT_LAB_TESTS", patient_id=patient_id, request=request)
    else:
        log_access(db, current_user, "LIST_ALL_LAB_TESTS", request=request)

    return q.order_by(LabTest.requested_at.desc()).all()


@router.patch("/{test_id}", response_model=LabTestOut)
def update_test(
    test_id: uuid.UUID,
    data: LabTestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.user import UserRole
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Lab test not found")

    # RBAC: Only admin or doctor can update lab results/status
    # Patients cannot update their own lab tests
    if current_user.role == UserRole.patient:
        raise HTTPException(status_code=403, detail="Patients cannot update lab tests")
    if data.status:
        test.status = data.status
        if data.status == LabTestStatus.completed:
            from datetime import datetime, timezone
            test.completed_at = datetime.now(timezone.utc)
    if data.result is not None:
        test.result = data.result
    if data.notes is not None:
        test.notes = data.notes
    db.commit()
    db.refresh(test)
    return test
