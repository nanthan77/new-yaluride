export enum AlertType {
  TRAFFIC = 'traffic',
  ACCIDENT = 'accident',
  CONSTRUCTION = 'construction',
  WEATHER = 'weather',
  OTHER = 'other',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateRoadAlertDto {
  title: string;
  description: string;
  alertType: AlertType;
  severity: AlertSeverity;
  latitude: number;
  longitude: number;
  location?: string;
}

export class UpdateRoadAlertDto {
  title?: string;
  description?: string;
  alertType?: AlertType;
  severity?: AlertSeverity;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export class VoteOnAlertDto {
  vote: 'up' | 'down';
}

export class RoadAlertResponseDto {
  id: string;
  title: string;
  description: string;
  alertType: AlertType;
  severity: AlertSeverity;
  latitude: number;
  longitude: number;
  location?: string;
  votes: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.alertType = data.alertType;
    this.severity = data.severity;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.location = data.location;
    this.votes = data.votes;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
