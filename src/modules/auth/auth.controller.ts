import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to email for authentication' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'user@example.com' } } }})
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Failed to send OTP' })
  async sendOtp(@Body('email') email: string) {
    try {
      await this.authService.sendOtp(email);
      return { success: true, message: 'OTP sent to email' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send OTP',
        error.message.includes('Too many') ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and authenticate user' })
  @ApiBody({ schema: { 
    properties: { 
      email: { type: 'string', example: 'user@example.com' },
      otp: { type: 'string', example: '123456' }
    } 
  }})
  @ApiResponse({ status: 200, description: 'Successfully authenticated', schema: {
    properties: {
      uid: { type: 'string' },
      email: { type: 'string' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Invalid OTP or expired' })
  @ApiResponse({ status: 404, description: 'OTP not found' })
  async verifyOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
  ) {
    try {
      return await this.authService.verifyOtp(email, otp);
    } catch (error) {
      throw new HttpException(
        error.message || 'Authentication failed',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiBody({ schema: { properties: { idToken: { type: 'string' } } }})
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleLogin(@Body('idToken') idToken: string) {
    try {
      return await this.authService.verifyGoogleToken(idToken);
    } catch (error) {
      throw new HttpException('Invalid Google token', HttpStatus.UNAUTHORIZED);
    }
  }
}