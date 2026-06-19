import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Report, ReportStatus, User
from app.schemas import MessageResponse, ReportCreate, ReportResponse, ReportUpdate
from app.services import InvestigationService, ReportService

router = APIRouter()


@router.get("", response_model=list[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.owner_id == current_user.id).order_by(Report.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.investigation_id:
        investigation = await InvestigationService.get_by_id(db, payload.investigation_id, current_user.id)
        if not investigation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    report = Report(
        title=payload.title,
        description=payload.description,
        investigation_id=payload.investigation_id,
        owner_id=current_user.id,
        status=ReportStatus.DRAFT,
        content={},
    )
    db.add(report)
    await db.flush()
    return report


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.owner_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.post("/{report_id}/generate", response_model=ReportResponse)
async def generate_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.owner_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if not report.investigation_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report has no linked investigation")

    report.status = ReportStatus.GENERATING
    await db.flush()

    content = await ReportService.generate_content(db, report.investigation_id)
    report.content = content
    report.status = ReportStatus.COMPLETED
    await db.flush()
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: uuid.UUID,
    payload: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.owner_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data:
        report.status = ReportStatus(update_data.pop("status"))
    for key, value in update_data.items():
        setattr(report, key, value)

    await db.flush()
    return report


@router.delete("/{report_id}", response_model=MessageResponse)
async def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.owner_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    await db.delete(report)
    return MessageResponse(message="Report deleted")
