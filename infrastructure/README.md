# Infrastructure (Terraform)

This directory contains all Terraform configuration for the CS480 FYP project deployed on AWS (ap-southeast-1).

## Overview

The infrastructure is managed via Terraform and provisions the following resources:

- **VPC & Networking** – VPC, public subnets, internet gateway, route tables
- **ALB** – Application Load Balancer with listener rules and target groups
- **ECS** – Fargate cluster running all microservices (RAG, search, ingestion, query-suggestion, data-processing, gateway)
- **RDS** – PostgreSQL instance for the main database
- **S3** – Frontend static hosting bucket and data bucket
- **ECR** – Container image repositories per service
- **SSM Parameter Store** – Secrets (API keys, credentials)
- **ElastiCache** – Redis for pub/sub and caching
- **CloudFront** – CDN for the frontend (managed via AWS Console)

## Prerequisites

- [Docker](https://www.docker.com/) (used to run Terraform via the provided wrapper scripts)
- AWS credentials configured (via environment variables or AWS CLI profile)

## Usage

### PowerShell (Windows)

```powershell
.\terraform.ps1 init
.\terraform.ps1 plan -var-file="production.tfvars"
.\terraform.ps1 apply -var-file="production.tfvars"
.\terraform.ps1 destroy -var-file="production.tfvars"
```

### Bash (Linux / macOS)

```bash
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  hashicorp/terraform:latest \
  init
```

## Remote State

Terraform state is stored in S3:

- **Bucket**: `cs480fyp-terraform-state`
- **Key**: `infrastructure/terraform.tfstate`
- **Region**: `ap-southeast-1`
- **Encryption**: enabled

## Recent Changes

Timestamps are in SGT (UTC+8), matching the AWS region `ap-southeast-1` used by this project.

| Date (SGT) | Author | Commit | Description |
|---|---|---|---|
| 2026-03-05 23:49 | ChenHuaEn171 | `88df677` | Update RAG service environments and secrets |
| 2026-03-05 01:24 | wenkai | `7cad791` | Amend insertion of keys |
| 2026-03-02 20:14 | ChenHuaEn171 | `cf6ec3e` | Removed CloudFront |
| 2026-03-01 22:34 | wenkai | `71e1b7f` | Fix: replace CORS_ORIGINS with wildcard to remove broken cloudfront module reference |
| 2026-03-01 00:40 | wenkai | `7211a89` | Add cors origin |
| 2026-02-28 23:21 | wenkai | `bb35336` | Fix: resolve search 500 error and secure Google API key via SSM |
| 2026-02-27 23:28 | ChenHuaEn171 | `7e9ff93` | Removed CloudFront distribution, edited env variables for search |
| 2026-02-27 12:23 | ChenHuaEn171 | `3e0228a` | Added environment variables |

> **Latest change**: `2026-03-05 23:49:58 SGT` by **ChenHuaEn171** — *Update RAG service environments and secrets* (`88df677`)

To see the full history of Terraform changes, run:

```bash
git log --oneline -- infrastructure/
```
