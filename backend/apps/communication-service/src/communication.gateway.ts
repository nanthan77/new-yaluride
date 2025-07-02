import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('CommunicationGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRide')
  handleJoinRide(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    client.join(`ride_${data.rideId}`);
    this.logger.log(`Client ${client.id} joined ride ${data.rideId}`);
  }

  @SubscribeMessage('leaveRide')
  handleLeaveRide(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`ride_${data.rideId}`);
    this.logger.log(`Client ${client.id} left ride ${data.rideId}`);
  }

  broadcastNewMessage(rideId: string, message: any) {
    this.server.to(`ride_${rideId}`).emit('newMessage', message);
  }

  broadcastReadReceipt(rideId: string, userId: string, messageIds: string[]) {
    this.server.to(`ride_${rideId}`).emit('messagesRead', {
      userId,
      messageIds,
    });
  }

  broadcastTypingIndicator(rideId: string, userId: string, isTyping: boolean) {
    this.server.to(`ride_${rideId}`).emit('typingIndicator', {
      userId,
      isTyping,
    });
  }
}
