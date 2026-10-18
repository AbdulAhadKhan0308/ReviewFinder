# Deploying to AWS (ECS Fargate)

The app ships as one Docker image: the ASP.NET Core API, which also serves the React build. It runs on ECS Fargate
behind CloudFront and an Application Load Balancer, with RDS PostgreSQL for data. Nothing is stored on the container's disk: images are
in PostgreSQL, and the keys that encrypt sign-in cookies and CSRF tokens are in SSM Parameter Store.

The examples use region `ap-southeast-2` (Sydney). Accounts on AWS's new
project-based console get one fixed region from their contact country, and India maps to Sydney; if your account
has a region menu, you can pick another region and replace `ap-southeast-2` throughout. Replace `<account>` with your
12-digit AWS account ID and `<tag>` with an image tag, here and in the JSON files in this folder.

## Architecture

```
                                        Users (browser)
                                               │ 1. HTTPS to https://<id>.cloudfront.net
┌─ CloudFront (AWS's global edge network) ─────┼───────────────────────────────────────────────┐
│                                              ▼                                               │
│   free HTTPS certificate for *.cloudfront.net, so no domain is needed                        │
│    • HTTP → redirect to HTTPS                                                                │
│    • /assets/* cached at the edge; everything else forwarded uncached                        │
│                                              │                                               │
└──────────────────────────────────────────────┼───────────────────────────────────────────────┘
                                               │ 2. HTTP :80, plus CloudFront-Forwarded-Proto: https
╔═ Region ap-southeast-2 (Sydney) ═════════════╪═══════════════════════════════════════════════╗
║                                              │                                               ║
║ ┌─ VPC 10.0.0.0/16 ──────────────────────────┼─────────────────────────────────────────────┐ ║
║ │                                  [ Internet gateway ]                                    │ ║
║ │                                            │                                             │ ║
║ │ ┌─ Public subnets (AZ a + AZ b) ───────────┼───────────────────────────────────────────┐ │ ║
║ │ │                                          ▼                                           │ │ ║
║ │ │   Application Load Balancer  [alb-sg: 80 from CloudFront only]                       │ │ ║
║ │ │    • :80 → target group (type IP, port 8080, health check /health)                   │ │ ║
║ │ │                                          │ 3. HTTP :8080                             │ │ ║
║ │ │                                          ▼                                           │ │ ║
║ │ │   ECS cluster → service (desired count 1) → Fargate task, with a public IP           │ │ ║
║ │ │    [app-sg: 8080 from alb-sg only]                                                   │ │ ║
║ │ │    container: ASP.NET Core API + React build in wwwroot, listening on :8080          │ │ ║
║ │ │                                          │                                           │ │ ║
║ │ └──────────────────────────────────────────┼───────────────────────────────────────────┘ │ ║
║ │                                            │ 4. PostgreSQL :5432 (SSL)                   │ ║
║ │ ┌─ Private subnets (AZ a + AZ b) ──────────┼───────────────────────────────────────────┐ │ ║
║ │ │                                          ▼                                           │ │ ║
║ │ │   RDS PostgreSQL 17  [db-sg: 5432 from app-sg only]     no route to the internet     │ │ ║
║ │ │    users, restaurants, reviews, images · encrypted storage · automated backups       │ │ ║
║ │ └──────────────────────────────────────────────────────────────────────────────────────┘ │ ║
║ └──────────────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                              ║
║ Regional AWS services outside the VPC, reached over HTTPS through the internet gateway       ║
║                                                                                              ║
║   Execution role (ECS, starting a task)          Task role (the running app)                 ║
║   ├─ ECR              download the image          └─ Parameter Store                         ║
║   ├─ Parameter Store  read the connection string      read/write the sign-in keys            ║
║   └─ CloudWatch Logs  write container output                                                 ║
║                                                                                              ║
║   Parameter Store values are SecureStrings, encrypted with KMS (the aws/ssm key)             ║
║   STS  issues temporary credentials for both roles                                           ║
║   IAM  holds both roles and their permission policies                                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

CloudFront provides the HTTPS address, `https://<id>.cloudfront.net`, with AWS's free certificate, so no domain or
Route 53 setup is needed. It reaches the load balancer over plain HTTP and tells the app that the visitor used HTTPS
in its `CloudFront-Forwarded-Proto` header; the load balancer only accepts connections from CloudFront, so that header
can't be faked from outside. To use your own domain later, add it to the distribution with an ACM certificate.

The Fargate task runs in a public subnet with a public IP so it can reach ECR, Parameter Store and CloudWatch without a
NAT gateway; `app-sg` only lets the load balancer connect to it. For a stricter setup, move it to the private subnets
and add a NAT gateway or VPC endpoints.

## Files

| File | Purpose |
|---|---|
| [../Dockerfile](../Dockerfile) | Builds the image: React build, API, and a migrations bundle (`./efbundle`) |
| [task-definition.json](task-definition.json) | The ECS task definition |
| [overrides-migrate.json](overrides-migrate.json), [overrides-reset-db.json](overrides-reset-db.json) | One-off task commands: apply migrations, or reset to demo data |
| [iam/execution-role-trust.json](iam/execution-role-trust.json), [iam/execution-role-policy.json](iam/execution-role-policy.json) | Execution role: lets ECS read the connection string while starting a task |
| [iam/task-role-trust.json](iam/task-role-trust.json), [iam/task-role-policy.json](iam/task-role-policy.json) | Task role: lets the app read and write its sign-in keys |

## Configuration the container reads

| Setting | Value | Set by |
|---|---|---|
| `ConnectionStrings__Default` | The RDS connection string | Task definition `secrets`, from Parameter Store |
| `DataProtection__ParameterStorePath` | `/restaurant-reviews/data-protection` | Task definition. When unset, keys stay in the container and every redeploy signs users out. |
| `AWS_REGION` | `ap-southeast-2` | Task definition |
| `ForwardedHeaders__ProtoHeaderName` | `CloudFront-Forwarded-Proto`: read the visitor's scheme from CloudFront's header | Task definition. When unset, the app uses `X-Forwarded-Proto`, which suits an HTTPS load balancer without CloudFront. |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true`, so the app trusts the forwarded headers from the proxy in front of it | Dockerfile |
| `ASPNETCORE_ENVIRONMENT` | Unset, which means Production | — |

## Before you start

- **The AWS CLI** (`winget install Amazon.AWSCLI`), signed in with an account allowed to create the resources below.
- **Docker Desktop**, to build the image.
- **Costs:** the load balancer, RDS and the Fargate task are billed by the hour even when idle; CloudFront's always-free
  tier covers a demo's traffic. Check the AWS Pricing Calculator, and delete everything when you're done with a demo.

## One-time setup

1. **Network.** VPC console → Create VPC → *VPC and more*: 2 Availability Zones, 2 public and 2 private subnets,
   NAT gateways *None*.
2. **Security groups** in that VPC:

   | Name | Inbound |
   |---|---|
   | `alb-sg` | TCP 80 from the managed prefix list `com.amazonaws.global.cloudfront.origin-facing` (CloudFront only) |
   | `app-sg` | TCP 8080 from `alb-sg` |
   | `db-sg` | TCP 5432 from `app-sg` |

3. **Database.** RDS → Create database: PostgreSQL 17, e.g. `db.t4g.micro`, a DB subnet group with the **private**
   subnets, *Public access: No*, security group `db-sg`, initial database name `restaurant_reviews`, storage
   encryption and automated backups on. Set the master password yourself; don't let RDS manage or rotate it, because
   the connection string below holds it.
4. **Connection string**, as an encrypted parameter:
   ```powershell
   aws ssm put-parameter --name /restaurant-reviews/connection-string --type SecureString `
     --value "Host=<rds-endpoint>;Port=5432;Database=restaurant_reviews;Username=<user>;Password=<password>;SSL Mode=Require;GSS Encryption Mode=Disable"
   ```
   RDS for PostgreSQL 17 requires SSL. `GSS Encryption Mode=Disable` stops Npgsql trying Kerberos, which the image
   doesn't include; without it, the logs show a harmless "Cannot load library libgssapi_krb5.so.2" message.
5. **Log group**, keeping logs for 30 days so old ones don't build up storage charges:
   ```powershell
   aws logs create-log-group --log-group-name /ecs/restaurant-reviews
   aws logs put-retention-policy --log-group-name /ecs/restaurant-reviews --retention-in-days 30
   ```
6. **IAM roles.** Replace `<account>` in the four files in `iam/`, then:
   ```powershell
   aws iam create-role --role-name restaurant-reviews-execution-role --assume-role-policy-document file://deploy/iam/execution-role-trust.json
   aws iam attach-role-policy --role-name restaurant-reviews-execution-role `
     --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
   aws iam put-role-policy --role-name restaurant-reviews-execution-role `
     --policy-name read-connection-string --policy-document file://deploy/iam/execution-role-policy.json

   aws iam create-role --role-name restaurant-reviews-task-role --assume-role-policy-document file://deploy/iam/task-role-trust.json
   aws iam put-role-policy --role-name restaurant-reviews-task-role `
     --policy-name data-protection-keys --policy-document file://deploy/iam/task-role-policy.json
   ```
7. **Image registry, and the first image**, from the repository root:
   ```powershell
   $acct = aws sts get-caller-identity --query Account --output text
   $registry = "$acct.dkr.ecr.ap-southeast-2.amazonaws.com"
   aws ecr create-repository --repository-name restaurant-reviews
   aws ecr get-login-password | docker login --username AWS --password-stdin $registry
   docker build -t "$registry/restaurant-reviews:v1" .
   docker push "$registry/restaurant-reviews:v1"
   ```
8. **Load balancer.** EC2 console:
   - Target group: target type **IP**, HTTP port 8080, your VPC, health check path `/health`.
   - Application Load Balancer: internet-facing, both **public** subnets, `alb-sg`, one listener: HTTP:80 → forward to
     the target group. There's no HTTPS listener; CloudFront handles HTTPS.
9. **CloudFront.** CloudFront console → Create distribution:
   - Origin: the load balancer's DNS name, protocol **HTTP only**, port 80.
   - Default behavior: viewer protocol policy **Redirect HTTP to HTTPS**; allowed methods **GET, HEAD, OPTIONS, PUT,
     POST, PATCH, DELETE**; cache policy **CachingDisabled**; origin request policy
     **AllViewerAndCloudFrontHeaders-2022-06**, which passes on cookies, query strings and headers, including
     `CloudFront-Forwarded-Proto`.
   - Add a behavior for the path `/assets/*`: the same origin, **Redirect HTTP to HTTPS**, GET and HEAD, cache policy
     **CachingOptimized**, no origin request policy. These files have content hashes in their names, so caching them
     at the edge is safe.
   - Don't turn on the web application firewall (WAF); it's a paid extra.
   - Note the distribution's domain name, e.g. `d1abc234.cloudfront.net`. It takes a few minutes to deploy.
10. **Cluster and task definition.** Replace `<account>` and `<tag>` (e.g. `v1`) in `task-definition.json`, then:
    ```powershell
    aws ecs create-cluster --cluster-name restaurant-reviews
    aws ecs register-task-definition --cli-input-json file://deploy/task-definition.json
    ```
11. **Create the tables** with a one-off task that runs the migrations bundle:
    ```powershell
    aws ecs run-task --cluster restaurant-reviews --launch-type FARGATE --task-definition restaurant-reviews `
      --network-configuration "awsvpcConfiguration={subnets=[<public-subnet-a>,<public-subnet-b>],securityGroups=[<app-sg-id>],assignPublicIp=ENABLED}" `
      --overrides file://deploy/overrides-migrate.json
    ```
    The task's log in CloudWatch ends with `Done.` when it succeeds.
12. **Service.** ECS → the cluster → Create service: Fargate, task definition `restaurant-reviews`, desired count
    **1**, the public subnets, `app-sg`, public IP on, the load balancer and target group from step 8, health check
    grace period 60 seconds. Start with one task so a single task creates the first sign-in key.
13. **Check it works:**
    - Open `https://<id>.cloudfront.net`, register, sign in, create a restaurant with an image, and post a review.
    - Opening the load balancer's own DNS name directly times out, because it only accepts CloudFront.
    - In the browser's dev tools, the sign-in and CSRF cookies are marked `Secure`.
    - `aws ssm get-parameters-by-path --path /restaurant-reviews/data-protection --query "Parameters[].Name"` lists
      one key.
    - Force a new deployment of the service; you should still be signed in afterwards.

## Deploying an update

1. Build and push a new tag, e.g. `:v2` (step 7, without `create-repository`).
2. Change `<tag>` in `task-definition.json` and register it again (step 10, without `create-cluster`).
3. If the release adds migrations, run step 11 first.
4. Update the service to the new task definition revision. ECS starts the new task, waits for `/health`, then stops
   the old one.

## Optional: demo data

`reset-db` deletes **all data**, then adds the demo accounts, restaurants and reviews. It refuses to run unless
`ASPNETCORE_ENVIRONMENT=Development`, so production can't run it by accident. To seed a fresh demo deployment, stop the
service (desired count 0), then run step 11 with `--overrides file://deploy/overrides-reset-db.json`, which runs
`reset-db` with that setting.

## Testing the image locally

With the Docker Compose database running, from the repository root:

```powershell
docker build -t restaurant-reviews:local .
$cs = "Host=host.docker.internal;Port=5432;Database=restaurant_reviews;Username=restaurant_reviews;Password=dev_only_password"
docker run --rm -e "ConnectionStrings__Default=$cs" restaurant-reviews:local ./efbundle
docker run --rm -p 127.0.0.1:8080:8080 -e "ConnectionStrings__Default=$cs" restaurant-reviews:local
```

The app is then at http://localhost:8080. Without `DataProtection__ParameterStorePath`, it keeps its sign-in keys inside
the container and logs a warning about it; that's expected locally.
