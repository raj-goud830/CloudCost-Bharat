
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Numeric,
)
from sqlalchemy.sql import func

from database import Base


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String(20), default="demo")
    region = Column(String(50))
    resources_scanned = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_history.id"))
    resource_id = Column(String(100))
    resource_type = Column(String(50))
    name = Column(String(150))
    region = Column(String(50))
    status = Column(String(50))
    monthly_cost = Column(Numeric(12, 2), default=0)
    recommendation = Column(String(500))


class CostReport(Base):
    __tablename__ = "cost_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_name = Column(String(150))
    mode = Column(String(20), default="demo")
    currency = Column(String(10), default="INR")
    monthly_spend = Column(Numeric(12, 2), default=0)
    monthly_budget = Column(Numeric(12, 2), default=0)
    potential_savings = Column(Numeric(12, 2), default=0)
    budget_utilization_pct = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())

