from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from sqlalchemy.orm import Session
from fastapi import Depends

from database import get_db
from db_models import ScanHistory, Resource

load_dotenv()

app = FastAPI(title="CloudCost Bharat API", version="1.0.0",
              description="Demo-first AWS FinOps audit API. Scanner is read-only.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

class ScanRequest(BaseModel):
    role_arn: Optional[str] = Field(default=None, description="Target read-only IAM role ARN")
    external_id: Optional[str] = Field(default=None, min_length=8)
    region: str = "ap-south-1"

def demo_inventory():
    return [
        {"id":"vol-0a12bc34","type":"EBS Volume","name":"legacy-db-data","region":"ap-south-1","status":"Unattached","age_days":42,"monthly_cost":420,"risk":"Check backups and owner before removal","recommendation":"Review and snapshot policy"},
        {"id":"eipalloc-09ab12cd","type":"Elastic IP","name":"unused-public-ip","region":"ap-south-1","status":"Unassociated","age_days":19,"monthly_cost":260,"risk":"May incur public IPv4 charges","recommendation":"Confirm no DNS or failover dependency"},
        {"id":"snap-0123abcd","type":"EBS Snapshot","name":"old-api-snapshot","region":"ap-south-1","status":"Older than 90 days","age_days":126,"monthly_cost":180,"risk":"Could be required for recovery/compliance","recommendation":"Validate retention requirements"},
        {"id":"i-0abc1234","type":"EC2 Instance","name":"staging-worker","region":"ap-south-1","status":"Low utilization","age_days":0,"monthly_cost":1850,"risk":"CPU average below 5% in sample window","recommendation":"Review schedule or right-size"}
    ]

# Demo monthly cloud spending history
demo_cost_history = [
    {"month": "June", "cost": 38000},
    {"month": "July", "cost": 41000},
    {"month": "August", "cost": 42000},
    {"month": "September", "cost": 45000},
    {"month": "October", "cost": 47500},
    {"month": "November", "cost": 68000},
]


def detect_cost_anomalies(history):
    anomalies = []

    for index in range(1, len(history)):
        previous = history[index - 1]
        current = history[index]

        previous_cost = previous["cost"]
        current_cost = current["cost"]

        if previous_cost <= 0:
            continue

        percentage_change = (
            (current_cost - previous_cost) / previous_cost
        ) * 100

        if percentage_change > 25:
            anomalies.append({
                "month": current["month"],
                "previous_month": previous["month"],
                "previous_cost": previous_cost,
                "current_cost": current_cost,
                "increase_amount": current_cost - previous_cost,
                "percentage_increase": round(percentage_change, 2),
                "severity": "High" if percentage_change >= 50 else "Medium",
                "message": (
                    f"Cloud spending increased by "
                    f"{percentage_change:.2f}% compared to "
                    f"{previous['month']}."
                ),
                "mode": "demo"
            })

    return anomalies


def demo_dashboard():
    return {
        "mode":"demo",
        "currency":"INR",
        "monthly_spend": 68420,
        "monthly_budget": 75000,
        "previous_month_spend": 61800,
        "month_over_month_change_pct": 10.7,
        "budget_utilization_pct": 91.2,
        "potential_savings": 12860,
        "resources_scanned": 38,
        "findings": 4,
        "carbon_avoided_kg": 18.4,
        "monthly_trend":[
            {"month":"Jun","spend":54200},{"month":"Jul","spend":57100},
            {"month":"Aug","spend":55900},{"month":"Sep","spend":63200},
            {"month":"Oct","spend":61800},{"month":"Nov","spend":68420}
        ],
        "category_breakdown":[
            {"category":"Compute","spend":32800,"share":48},
            {"category":"Storage","spend":12400,"share":18},
            {"category":"Database","spend":15050,"share":22},
            {"category":"Networking","spend":8170,"share":12}
        ],
        "inventory":demo_inventory()
    }



@app.get("/api/reports")
def get_cost_reports():
    dashboard = demo_dashboard()

    monthly_trend = dashboard.get("monthly_trend", [])
    category_breakdown = dashboard.get("category_breakdown", [])
    inventory = dashboard.get("inventory", [])

    total_category_spend = sum(
        item["spend"] for item in category_breakdown
    )

    return {
        "mode": "demo",
        "currency": dashboard.get("currency", "INR"),
        "summary": {
            "monthly_spend": dashboard.get("monthly_spend", 0),
            "monthly_budget": dashboard.get("monthly_budget", 0),
            "potential_savings": dashboard.get("potential_savings", 0),
            "budget_utilization_pct": dashboard.get(
                "budget_utilization_pct", 0
            )
        },
        "monthly_trend": monthly_trend,
        "category_breakdown": category_breakdown,
        "total_category_spend": total_category_spend,
        "resource_count": len(inventory),
        "inventory": inventory
    }

 
@app.get("/api/anomalies")
def get_cost_anomalies():
    anomalies = detect_cost_anomalies(demo_cost_history)

    return {
        "mode": "demo",
        "threshold_percentage": 25,
        "total_anomalies": len(anomalies),
        "anomalies": anomalies
    }
   

@app.get("/health")
def health():
    return {"status":"ok","service":"cloudcost-bharat-api"}

@app.get("/api/dashboard")
def dashboard():
    return demo_dashboard()

@app.get("/api/demo")
def load_demo_data():
    """Return the synthetic portfolio dataset without contacting AWS."""
    return demo_dashboard()



@app.post("/api/demo/scan")
def save_demo_scan(db: Session = Depends(get_db)):
    try:
        inventory = demo_inventory()

        scan_record = ScanHistory(
            mode="demo",
            region="ap-south-1",
            resources_scanned=len(inventory),
            findings_count=len(inventory)
        )

        db.add(scan_record)
        db.flush()

        for item in inventory:
            resource_record = Resource(
                scan_id=scan_record.id,
                resource_id=item.get("id", ""),
                resource_type=item.get("type", "Unknown"),
                name=item.get("name", "Unknown"),
                region=item.get("region", "ap-south-1"),
                status=item.get("status", "Unknown"),
                monthly_cost=item.get("monthly_cost", 0),
                recommendation=item.get("recommendation", "")
            )
            db.add(resource_record)

        db.commit()

        return {
            "message": "Demo scan saved successfully!",
            "mode": "demo",
            "scan_id": scan_record.id,
            "resources_saved": len(inventory)
        }

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save demo scan: {str(exc)}"
        )



@app.get("/api/scan-history")
def get_scan_history(db: Session = Depends(get_db)):
    scans = (
        db.query(ScanHistory)
        .order_by(ScanHistory.created_at.desc())
        .all()
    )

    return [
        {
            "id": scan.id,
            "mode": scan.mode,
            "region": scan.region,
            "resources_scanned": scan.resources_scanned,
            "findings_count": scan.findings_count,
            "created_at": (
                scan.created_at.isoformat()
                if scan.created_at else None
            )
        }
        for scan in scans
    ]



@app.get("/api/inventory")
def inventory():
    return {"mode":"demo","items":demo_inventory()}

def assumed_session(role_arn: str, external_id: str, region: str):
    if not role_arn.startswith("arn:aws:iam::") or ":role/" not in role_arn:
        raise HTTPException(status_code=400, detail="Provide a valid IAM role ARN.")
    try:
        sts = boto3.client("sts", region_name=region)
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName="CloudCostBharatReadOnlyAudit",
            ExternalId=external_id,
            DurationSeconds=900
        )
        creds = response["Credentials"]
        return boto3.Session(
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name=region
        )
    except NoCredentialsError:
        raise HTTPException(status_code=401, detail="Backend AWS identity not configured. Configure an AWS profile or workload role.")
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not assume read-only role: {str(exc)}")

@app.post("/api/scan")
def scan_aws(
    payload: ScanRequest,
    db: Session = Depends(get_db)
):
    role_arn = payload.role_arn or os.getenv("AWS_ROLE_ARN")
    external_id = payload.external_id or os.getenv("AWS_EXTERNAL_ID")
    if not role_arn or not external_id:
        raise HTTPException(status_code=400, detail="Set AWS_ROLE_ARN and AWS_EXTERNAL_ID or provide them in the request.")
    session = assumed_session(role_arn, external_id, payload.region)
    try:
        ec2 = session.client("ec2")
        cw = session.client("cloudwatch")
        now = datetime.now(timezone.utc)
        findings = []

        for page in ec2.get_paginator("describe_volumes").paginate(
            Filters=[{"Name":"status","Values":["available"]}]
        ):
            for vol in page.get("Volumes", []):
                created = vol.get("CreateTime", now)
                age = max(0, (now - created).days)
                findings.append({
                    "id":vol["VolumeId"],"type":"EBS Volume",
                    "name":next((t["Value"] for t in vol.get("Tags",[]) if t["Key"]=="Name"),"Unattached volume"),
                    "region":payload.region,"status":"Unattached","age_days":age,
                    "monthly_cost":None,"risk":"Confirm owner, backups and retention before action",
                    "recommendation":"Review volume and snapshot policy"
                })

        addresses = ec2.describe_addresses().get("Addresses", [])
        for addr in addresses:
            if not addr.get("AssociationId"):
                findings.append({
                    "id":addr.get("AllocationId") or addr.get("PublicIp"),
                    "type":"Elastic IP","name":addr.get("PublicIp","Unassociated address"),
                    "region":payload.region,"status":"Unassociated","age_days":None,
                    "monthly_cost":None,"risk":"Check DNS, NAT and failover dependencies",
                    "recommendation":"Review allocation; release only after owner approval"
                })

        for page in ec2.get_paginator("describe_snapshots").paginate(OwnerIds=["self"]):
            for snap in page.get("Snapshots", []):
                age = max(0, (now - snap["StartTime"]).days)
                if age >= 90:
                    findings.append({
                        "id":snap["SnapshotId"],"type":"EBS Snapshot",
                        "name":snap.get("Description") or "EBS snapshot",
                        "region":payload.region,"status":"Older than 90 days","age_days":age,
                        "monthly_cost":None,"risk":"Validate recovery and compliance retention",
                        "recommendation":"Review lifecycle policy"
                    })

        # Low CPU is a review signal, not an automatic deletion/rightsizing decision.
        reservations = ec2.describe_instances(
            Filters=[{"Name":"instance-state-name","Values":["running"]}]
        ).get("Reservations", [])
        for reservation in reservations:
            for inst in reservation.get("Instances", []):
                iid = inst["InstanceId"]
                end = now
                start = end - timedelta(days=7)
                metrics = cw.get_metric_statistics(
                    Namespace="AWS/EC2", MetricName="CPUUtilization",
                    Dimensions=[{"Name":"InstanceId","Value":iid}],
                    StartTime=start, EndTime=end, Period=3600,
                    Statistics=["Average"]
                ).get("Datapoints", [])
                avg = sum(x["Average"] for x in metrics)/len(metrics) if metrics else None
                if avg is not None and avg < 5:
                    findings.append({
                        "id":iid,"type":"EC2 Instance",
                        "name":next((t["Value"] for t in inst.get("Tags",[]) if t["Key"]=="Name"),iid),
                        "region":payload.region,"status":"Low utilization",
                        "age_days":None,"monthly_cost":None,
                        "risk":f"Average CPU {avg:.1f}% over available 7-day datapoints",
                        "recommendation":"Review workload pattern and right-sizing options"
                    })


        # Save successful AWS scan to MySQL
        try:
            scan_record = ScanHistory(
                mode="live",
                region=payload.region,
                resources_scanned=len(findings),
                findings_count=len(findings)
            )

            db.add(scan_record)
            db.flush()

            for finding in findings:
                resource_record = Resource(
                    scan_id=scan_record.id,
                    resource_id=str(finding.get("id", "")),
                    resource_type=finding.get("type", "Unknown"),
                    name=finding.get("name", "Unknown"),
                    region=finding.get("region", payload.region),
                    status=finding.get("status", "Unknown"),
                    monthly_cost=finding.get("monthly_cost"),
                    recommendation=finding.get("recommendation", "")
                )

                db.add(resource_record)

            db.commit()

        except Exception as db_error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save scan results: {str(db_error)}"
            )


        return {"mode":"live","region":payload.region,"scanned_at":now.isoformat(),
                "resources_scanned":len(findings),"findings":findings,
                "note":"Live inventory findings. Costs are not estimated by this scanner."}
    except HTTPException:
        raise
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(status_code=502, detail=f"AWS scan failed: {str(exc)}")




# ==========================================
# COST OPTIMIZATION RECOMMENDATION ENGINE
# ==========================================

from typing import Any


def generate_recommendations(items: list[dict[str, Any]]):

    recommendations = []

    for item in items:

        resource_type = item.get("type", "")
        status = item.get("status", "")
        age_days = item.get("age_days", 0)
        monthly_cost = float(item.get("monthly_cost", 0))

        recommendation = None
        priority = "Low"
        estimated_savings = 0
        issue = ""

        # 1. Unattached EBS Volume
        if resource_type == "EBS Volume" and status == "Unattached":

            issue = "Unattached EBS Volume"
            priority = "Medium"
            estimated_savings = round(monthly_cost * 0.80, 2)
            recommendation = (
                "Verify backups and ownership. "
                "Consider deleting only after approval."
            )

        # 2. Unassociated Elastic IP
        elif resource_type == "Elastic IP" and status == "Unassociated":

            issue = "Unassociated Elastic IP"
            priority = "Medium"
            estimated_savings = monthly_cost
            recommendation = (
                "Check DNS and failover dependencies. "
                "Release the IP only after approval."
            )

        # 3. Old EBS Snapshot
        elif resource_type == "EBS Snapshot" and age_days > 90:

            issue = "Old EBS Snapshot"
            priority = "Low"
            estimated_savings = round(monthly_cost * 0.30, 2)
            recommendation = (
                "Review retention and compliance requirements "
                "before removing the snapshot."
            )

        # 4. Low Utilization EC2
        elif resource_type == "EC2 Instance" and status == "Low utilization":

            issue = "Low EC2 Utilization"
            priority = "High"
            estimated_savings = round(monthly_cost * 0.40, 2)
            recommendation = (
                "Review CPU and workload patterns. "
                "Consider right-sizing or scheduling."
            )

        if recommendation:

            recommendations.append({
                "resource_id": item.get("id"),
                "resource_name": item.get("name"),
                "resource_type": resource_type,
                "region": item.get("region"),
                "issue": issue,
                "priority": priority,
                "monthly_cost": monthly_cost,
                "estimated_monthly_savings": estimated_savings,
                "recommendation": recommendation,
                "mode": "demo"
            })

    return recommendations


# ==========================================
# RECOMMENDATIONS API
# ==========================================

@app.get("/api/recommendations")
def get_recommendations():

    inventory_data = {
    "mode": "demo",
    "items": demo_inventory()
}

    items = inventory_data.get("items", [])

    recommendations = generate_recommendations(items)

    total_savings = sum(
        item["estimated_monthly_savings"]
        for item in recommendations
    )

    return {
        "mode": inventory_data.get("mode", "demo"),
        "total_recommendations": len(recommendations),
        "estimated_monthly_savings": round(total_savings, 2),
        "currency": "INR",
        "recommendations": recommendations
    }
