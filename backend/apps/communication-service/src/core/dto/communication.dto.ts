export class GetCannedResponsesQueryDto {
  userType: string;
  language?: string;
}

export class MessageDto {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  rideId?: string;
  timestamp: Date;
  isRead: boolean;
}

export class CannedResponseDto {
  id: string;
  text: string;
  category: string;
  userType: string;
  language: string;

  constructor(data: any) {
    this.id = data.id;
    this.text = data.text;
    this.category = data.category;
    this.userType = data.userType;
    this.language = data.language;
  }
}
