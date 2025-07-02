export class GetNearbyAlertsDto {
  latitude: number;
  longitude: number;
  radius?: number = 5; // Default 5km radius
  limit?: number = 20; // Default 20 alerts
}
