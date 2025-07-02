import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor() {}

  @Get('/health')
  @ApiOperation({ summary: 'Voice service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Post('/synthesize')
  @ApiOperation({ summary: 'Text to speech synthesis' })
  @ApiResponse({ status: 200, description: 'Audio synthesized successfully' })
  synthesizeText(@Body() body: { text: string; voice?: string }): any {
    return { message: 'Text synthesis not implemented yet', text: body.text };
  }

  @Post('/recognize')
  @ApiOperation({ summary: 'Speech to text recognition' })
  @ApiResponse({ status: 200, description: 'Speech recognized successfully' })
  recognizeSpeech(@Body() body: { audioData: string }): any {
    return { message: 'Speech recognition not implemented yet' };
  }
}
