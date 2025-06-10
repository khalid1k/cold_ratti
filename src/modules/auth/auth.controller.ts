import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/common/filters/httException.filter';
import { SuccessResponse } from 'src/common/dto/response.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseFilters(HttpExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email-otp/start')
  @ApiOperation({ summary: 'Start email OTP flow' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP sent successfully',
    type: SuccessResponse,
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many OTP requests',
  })
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
    return this.authService.startEmailOtp(email);
  }

  @Post('email-otp/verify')
  @ApiOperation({ summary: 'Verify email OTP' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified successfully',
    type: SuccessResponse,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
      required: ['email', 'otp'],
    },
  })
  async verifyEmailOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyEmailOtp(email, otp);
  }

  @Post('email-otp/resend')
  @ApiOperation({ summary: 'Resend email OTP' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP resent successfully',
    type: SuccessResponse,
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Please wait before requesting a new OTP',
  })
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
    return this.authService.resendEmailOtp(email);
  }

  @Post('social/login')
  @ApiOperation({ summary: 'Social login with Firebase' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social login successful',
    type: SuccessResponse,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idToken: { 
          type: 'string', 
          description: 'Firebase ID token from social provider' 
        },
      },
      required: ['idToken'],
    },
  })
  async socialLogin(@Body('idToken') idToken: string) {
    return this.authService.handleSocialLogin(idToken);
  }
}