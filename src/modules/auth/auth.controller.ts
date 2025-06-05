import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email-otp/start')
  @ApiOperation({ summary: 'Start email OTP flow' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  async startEmailOtp(@Body('email') email: string) {
    try {
      return await this.authService.startEmailOtp(email);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send OTP',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('email-otp/verify')
  @ApiOperation({ summary: 'Verify email OTP' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: { type: 'object' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        token: { type: 'string', example: '123456' },
      },
      required: ['email', 'token'],
    },
  })
  async verifyEmailOtp(
    @Body('email') email: string,
    @Body('token') token: string,
  ) {
    try {
      return await this.authService.verifyEmailOtp(email, token);
    } catch (error) {
      throw new HttpException(
        error.message || 'Invalid OTP',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('email-otp/resend')
  @ApiOperation({ summary: 'Resend email OTP' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 429, description: 'Please wait before requesting a new OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  async resendEmailOtp(@Body('email') email: string) {
    try {
      return await this.authService.resendEmailOtp(email);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to resend OTP',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('social/login')
  @ApiOperation({ summary: 'Social login with Firebase' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: { type: 'object' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idToken: { type: 'string', description: 'Firebase ID token' },
      },
      required: ['idToken'],
    },
  })
  async socialLogin(@Body('idToken') idToken: string) {
    try {
      return await this.authService.handleSocialLogin(idToken);
    } catch (error) {
      throw new HttpException(
        error.message || 'Authentication failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }
}