# CloudCost Bharat — AWS FinOps & Cost Optimization

A portfolio-ready FinOps dashboard built with React, FastAPI and Boto3. It starts in **demo mode** with clearly labelled sample data. An optional read-only AWS scanner uses an assumed IAM role and temporary STS credentials.

## Features
- Executive dashboard with monthly spend, category allocation and savings opportunities
- Resource audit for unattached EBS volumes, unassociated Elastic IPs, old snapshots and low-utilization EC2 instances
- CSV export for audit findings
- Demo mode (no AWS account required)
- Optional cross-account AWS scan using `AssumeRole`
- Docker Compose development setup
- CloudFormation template for a read-only scanner role

## Architecture
```text
React + Vite UI  --->  FastAPI API  --->  Boto3
       |                    |              |
   Recharts             Demo engine     AWS STS AssumeRole
       |                    |              |
   CSV export          Sample data     EC2 / CloudWatch
```

## Requirements
- Node.js 18+
- Python 3.10+
- Docker Desktop (optional)
- AWS account only for live scanning

## Run locally

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

The UI uses demo data by default. To enable live AWS scanning, set the backend environment variables below and configure a role in your AWS account.

## Live AWS scanner configuration
Set these variables in `backend/.env` (never commit this file):
```env
AWS_REGION=ap-south-1
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/CloudCostBharatReadOnly
AWS_EXTERNAL_ID=replace-with-a-long-random-value
```
The backend must itself have AWS credentials that are allowed to call `sts:AssumeRole` on the target role. For local testing, use an AWS CLI profile or environment-based credentials. Do not use root credentials.

Create the role from `infra/read-only-role.yaml`, replacing the trusted account ID and external ID. The role is read-only and includes EC2 describe calls plus CloudWatch metric reads. The current scanner checks EC2 inventory and CloudWatch CPU utilization. It does **not** delete or modify resources.

### Security notes
- Never paste AWS access keys into the frontend.
- The app sends only the role ARN and external ID to the backend; use a trusted private deployment for real accounts.
- Add authentication, rate limiting, audit logging, HTTPS and per-user authorization before exposing this API publicly.
- The demo mode uses synthetic values. Estimated savings are indicative, not a bill-backed quote.
- A detached volume or old snapshot is a review candidate, not proof that deletion is safe.

## Docker
From the project root:
```bash
docker compose up --build
```
Frontend: http://localhost:5173  
Backend: http://localhost:8000/health

## Suggested portfolio upgrades
1. Add AWS Cost Explorer `GetCostAndUsage` for actual billed spend.
2. Persist scan history in PostgreSQL.
3. Add login and organization-level access control.
4. Add scheduled scans and SNS/email budget alerts.
5. Add Terraform and deploy the API to ECS or Elastic Beanstalk.

## Resume description
**CloudCost Bharat – AWS FinOps & Cost Optimization Platform**  
Built a React and FastAPI platform to visualize cloud spend and identify potential AWS waste. Integrated Boto3 and AWS STS AssumeRole for temporary, read-only cross-account EC2 audits; added CloudWatch CPU checks, CSV reporting, Dockerized services and a GitHub Actions CI workflow.
