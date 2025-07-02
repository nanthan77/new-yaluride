export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
  CORPORATE_ADMIN = 'corporate_admin',
  CORPORATE_EMPLOYEE = 'corporate_employee',
  BOTH = 'both',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum VerificationType {
  GN = 'gn',
  LICENSE = 'license', 
  VEHICLE = 'vehicle',
}
