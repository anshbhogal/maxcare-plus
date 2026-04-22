from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, patients, doctors, appointments,
    billing, lab, pharmacy, ipd, admin, public, otp, symptom_checker, chatbot
)

api_router = APIRouter()
api_router.include_router(public.router,       prefix="/public",       tags=["Public"])
api_router.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
api_router.include_router(otp.router,          prefix="/otp",          tags=["OTP / Account Linking"])
api_router.include_router(symptom_checker.router, prefix="/ai",        tags=["AI Tools"])
api_router.include_router(chatbot.router,       prefix="/ai",        tags=["AI Chatbot"])
api_router.include_router(patients.router,     prefix="/patients",     tags=["Patients"])
api_router.include_router(doctors.router,      prefix="/doctors",      tags=["Doctors"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(billing.router,      prefix="/billing",      tags=["Billing"])
api_router.include_router(lab.router,          prefix="/lab",          tags=["Laboratory"])
api_router.include_router(pharmacy.router,     prefix="/pharmacy",     tags=["Pharmacy"])
api_router.include_router(ipd.router,          prefix="/ipd",          tags=["IPD"])
api_router.include_router(admin.router,        prefix="/admin",        tags=["Admin"])
