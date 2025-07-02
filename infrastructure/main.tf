# YALURIDE - Security Plan & Audit Checklist

## 1. Introduction

This document outlines the security strategy, policies, and audit procedures for the YALURIDE platform. Our goal is to build a secure and trustworthy service by embedding security into every layer of our application, from infrastructure to user-facing features.

This plan is a living document, intended to be reviewed and updated regularly as the platform evolves and new threats emerge.

**Scope**: This plan covers the entire YALURIDE stack, including:
-   Frontend Progressive Web App (PWA)
-   Backend Microservices (NestJS)
-   Database (PostgreSQL with RLS)
-   Cloud Infrastructure (AWS EKS, RDS, S3)
-   CI/CD Pipeline (GitLab)
-   Third-Party Integrations (Payment Gateways, Maps, etc.)

---

## 2. Core Security Principles

1.  **Defense in Depth**: Implement multiple layers of security controls.
2.  **Principle of Least Privilege**: Grant users and services only the minimum permissions necessary to perform their functions.
3.  **Secure by Default**: Configure systems to be secure out of the box.
4.  **Data Minimization**: Collect and store only the data that is absolutely necessary.
5.  **Assume Breach**: Design systems with the assumption that they will be compromised, and include mechanisms for detection and response.

---

## 3. Security Audit & Hardening Checklist

This checklist will be used for regular security audits (quarterly and before major releases).

| Category                       | Checkpoint                                                                                                                              | Status      | Notes / Action Items                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**             | **Password Policy**: Are strong password requirements enforced on the client and server?                                              | `[ ] To Do` | Implement server-side validation in the User Service.                                                                                              |
|                                | **MFA**: Is Multi-Factor Authentication available and encouraged for all users, especially drivers and admins?                            | `[ ] To Do` | Plan for TOTP and SMS-based MFA implementation in Phase 2.                                                                                         |
|                                | **Brute-Force Protection**: Is there rate limiting on login and password reset endpoints?                                                 | `[ ] To Do` | Implement with `@nestjs/throttler` in the API Gateway.                                                                                             |
|                                | **Secure Password Reset**: Is the password reset token single-use, short-lived, and securely generated?                                   | `[ ] To Do` | Verify token invalidation after use.                                                                                                               |
| **Session Management**         | **JWT Security**: Is the JWT secret strong and stored securely (e.g., AWS Secrets Manager)? Is the `HS256` algorithm used?                 | `[ ] To Do` | Use a long, randomly generated secret. Store in AWS Secrets Manager via Terraform.                                                                 |
|                                | **Token Expiry**: Are access tokens short-lived (e.g., 15-60 minutes) and refresh tokens used for long-lived sessions?                    | `[ ] To Do` | Configure Supabase Auth token expiry settings.                                                                                                     |
|                                | **Secure Storage**: Are JWTs stored securely on the client (e.g., in-memory or `HttpOnly` cookies) to mitigate XSS?                       | `[ ] To Do` | Review frontend implementation. Avoid `localStorage`.                                                                                              |
|                                | **Logout**: Does logout invalidate the session/token on the backend (e.g., via a denylist)?                                               | `[ ] To Do` | Implement token denylist in Redis for immediate session termination on logout.                                                                     |

---

## 4. Hardening & Remediation Plan

### a. Row Level Security (RLS) Policies

RLS is the most critical security feature for our multi-tenant database. The following policies must be implemented and verified:

*   **Users can only see and edit their own profile.**
    ```sql
    CREATE POLICY "Users can view their own profile." ON profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
    ```
*   **Users can only manage their own journeys and bids.**
    ```sql
    CREATE POLICY "Users can manage their own journeys." ON journeys FOR ALL USING (auth.uid() = passenger_id);
    CREATE POLICY "Drivers can view open journeys." ON journeys FOR SELECT USING (status = 'PENDING_BIDS');
    CREATE POLICY "Drivers can manage their own bids." ON bids FOR ALL USING (auth.uid() = driver_id);
    ```
*   **Users involved in a ride can access ride details.**
    ```sql
    CREATE POLICY "Users can view rides they are part of." ON rides FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
    ```
*   **Default Deny**: Ensure all tables have RLS enabled and a `USING (false)` policy for roles that should have no access.

### b. Infrastructure Hardening

*   **IAM Roles**: Follow the principle of least privilege for all IAM roles associated with the EKS cluster, nodes, and service accounts.
*   **Security Groups**: Restrict ingress traffic to the minimum required ports. For example, the RDS security group should only allow inbound traffic from the EKS node security group on port 5432.
*   **S3 Bucket Policy**: Implement a bucket policy that denies all public access by default. Access to private objects should be granted only through pre-signed URLs generated by a backend service.

### c. Application Hardening

*   **API Gateway**: Use NestJS guards to enforce authentication (`JwtAuthGuard`) and authorization (`RolesGuard`) on all sensitive endpoints.
*   **Dependency Management**: Integrate `npm audit` or `snyk` into the CI/CD pipeline to fail builds if high-severity vulnerabilities are found in dependencies.
*   **Rate Limiting**: Apply global rate limiting in the API Gateway and stricter limits on sensitive endpoints like login and password reset.

---

## 5. Incident Response Plan (High-Level)

1.  **Detect**: Identify a security incident through monitoring, alerts, or user reports.
2.  **Respond**:
    *   Assemble the core response team (Lead Eng, DevOps, CTO).
    *   Assess the impact and scope.
    *   Contain the incident (e.g., rotate credentials, block IPs, disable affected feature).
3.  **Remediate**:
    *   Identify the root cause.
    *   Develop and deploy a patch.
    *   Verify the fix.
4.  **Communicate**: Notify affected users and stakeholders as required by law and company policy.
5.  **Post-Mortem**: Conduct a blameless post-mortem to document the incident and improve future security posture.
