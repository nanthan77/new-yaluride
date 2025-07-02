import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Message, Ride } from '@yaluride/database';
import { InternalServerErrorException } from '@nestjs/common';
// import { CommunicationGateway } from './communication.gateway';

// --- DTOs (Data Transfer Objects) ---
// These would typically be in a separate file, but are included here for clarity.

export class CreateMessageDto {
  rideId: string;
  senderId: string;
  content: string;
}

export class MarkAsReadDto {
  rideId: string;
  messageIds: string[];
  readerId: string;
}

export class TypingIndicatorDto {
  rideId: string;
  userId: string;
  isTyping: boolean;
}


@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  /**
   * Get canned responses for user type and language
   */
  async getCannedResponses(userType: string, language: string): Promise<any[]> {
    return [
      { id: 1, text: 'Thank you for your message', category: 'greeting' },
      { id: 2, text: 'I will be there shortly', category: 'arrival' },
      { id: 3, text: 'Running a few minutes late', category: 'delay' },
    ];
  }

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    // Use forwardRef to handle circular dependency between Service and Gateway
    // @Inject(forwardRef(() => CommunicationGateway))
    // private readonly communicationGateway: CommunicationGateway,
  ) {}

  /**
   * Saves a new chat message to the database and triggers a broadcast.
   * @param createMessageDto - The message data.
   * @returns The saved message entity.
   */
  async saveMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    const { rideId, senderId, content } = createMessageDto;

    // 1. Verify that the ride exists and the sender is a participant
    const ride = await this.rideRepository.findOneBy({ id: rideId });
    if (!ride) {
      throw new NotFoundException(`Ride with ID ${rideId} not found.`);
    }
    if (ride.passengerId !== senderId && ride.driverId !== senderId) {
      throw new ForbiddenException(`User ${senderId} is not a participant in ride ${rideId}.`);
    }

    // 2. Create and save the message entity
    const newMessage = this.messageRepository.create({
      rideId: rideId,
      senderId: senderId,
      content,
      // The recipient is the other person in the ride
      recipientId: senderId === ride.passengerId ? ride.driverId : ride.passengerId,
    });

    try {
      const savedMessage = await this.messageRepository.save(newMessage);
      this.logger.log(`Message saved for ride ${rideId} from user ${senderId}`);

      // 3. After saving, broadcast the new message via the gateway
      // this.communicationGateway.broadcastNewMessage(rideId, savedMessage);
      
      return savedMessage;
    } catch (error) {
      this.logger.error(`Failed to save message for ride ${rideId}.`, error.stack);
      throw new InternalServerErrorException('Could not save message.');
    }
  }

  /**
   * Retrieves the chat history for a specific ride.
   * @param rideId - The ID of the ride.
   * @param userId - The ID of the user requesting the history (for validation).
   * @returns An array of messages for the ride.
   */
  async getChatHistory(rideId: string, userId: string): Promise<Message[]> {
    const ride = await this.rideRepository.findOneBy({ id: rideId });
    if (!ride) {
      throw new NotFoundException(`Ride with ID ${rideId} not found.`);
    }
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new ForbiddenException(`User ${userId} is not a participant in ride ${rideId}.`);
    }

    this.logger.log(`Fetching chat history for ride ${rideId} for user ${userId}`);

    try {
      return this.messageRepository.find({
        where: { rideId: rideId },
        order: { createdAt: 'ASC' }, // Oldest messages first
        relations: ['sender'], // Optionally join sender's profile info
      });
    } catch (error) {
      this.logger.error(`Failed to fetch chat history for ride ${rideId}.`, error.stack);
      throw new InternalServerErrorException('Could not retrieve chat history.');
    }
  }

  /**
   * Handles incoming typing indicator events and broadcasts them.
   * @param typingDto - The typing indicator data.
   */
  handleTypingEvent(typingDto: TypingIndicatorDto): void {
    const { rideId, userId, isTyping } = typingDto;
    this.logger.debug(`User ${userId} is ${isTyping ? 'typing' : 'stopped typing'} in ride ${rideId}`);
    
    // The service's role is simply to pass this to the gateway for broadcasting
    // this.communicationGateway.broadcastTypingIndicator(rideId, userId, isTyping);
  }

  /**
   * Marks a set of messages as read by a user.
   * @param markAsReadDto - The data containing message IDs to be marked as read.
   */
  async markMessagesAsRead(markAsReadDto: MarkAsReadDto): Promise<{ updated: number }> {
    const { rideId, messageIds, readerId } = markAsReadDto;

    if (!messageIds || messageIds.length === 0) {
      return { updated: 0 };
    }

    // 1. Verify the user is part of the ride (similar to getChatHistory)
    const ride = await this.rideRepository.findOneBy({ id: rideId });
    if (!ride || (ride.passengerId !== readerId && ride.driverId !== readerId)) {
      throw new ForbiddenException('You can only mark messages as read in your own rides.');
    }

    // 2. Update the status of messages that were sent to the reader
    try {
      const result = await this.messageRepository.update(
        {
          id: In(messageIds),
          recipientId: readerId, // Ensure user can only mark messages sent TO them
          status: 'delivered', // Only update messages that have been delivered
        },
        {
          status: 'read',
        },
      );

      this.logger.log(`Marked ${result.affected || 0} messages as read for user ${readerId} in ride ${rideId}.`);

      // 3. Broadcast the read receipt to the other user in the room
      if (result.affected && result.affected > 0) {
        const otherUserId = readerId === ride.passengerId ? ride.driverId : ride.passengerId;
        if (otherUserId) {
            // this.communicationGateway.broadcastReadReceipt(rideId, otherUserId, messageIds);
        }
      }

      return { updated: result.affected || 0 };
    } catch (error) {
      this.logger.error(`Failed to mark messages as read for ride ${rideId}.`, error.stack);
      throw new InternalServerErrorException('Could not update message status.');
    }
  }
}
