import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PasswordlessStartDto, PasswordlessVerifyDto } from './dto/auth.dto';
import { AuthCallbackResponseDto } from './dto/authCallbackResponse.dto';
import { Auth0Guard } from './guards/auth0.guard';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('passwordless/start')
  @ApiOperation({ summary: 'passwordless login' })
  @ApiBody({ type: PasswordlessStartDto })
  async startPasswordless(@Body() body: PasswordlessStartDto) {
    return this.authService.startPasswordless(body.email);
  }

  @Post('passwordless/verify')
  @ApiOperation({ summary: 'Verify passwordless OTP' })
  @ApiBody({ type: PasswordlessVerifyDto })
  async verifyPasswordless(@Body() body: PasswordlessVerifyDto) {
    return this.authService.verifyPasswordless(body.email, body.code);
  }

  @Post('passwordless/resend')
  @ApiOperation({ summary: 'Resend passwordless OTP' })
  @ApiBody({ type: PasswordlessStartDto })
  async resendOtp(@Body() body: PasswordlessStartDto) {
    return this.authService.resendPasswordlessOTP(body.email);
  }


  @Get('social-login')
  @UseGuards(Auth0Guard)
  @ApiOperation({
    summary:
      'Initiates social login via Auth0 (Google, Apple, Facebook, Twitter, Microsoft, GitHub)',
  })
  login() {}

  @Get('callback')
  @UseGuards(Auth0Guard)
  @ApiOperation({ summary: 'Auth0 callback handler' })
  @ApiResponse({
    status: 200,
    description: 'Returns tokens and user data',
    type: AuthCallbackResponseDto,
  })
  async auth0Callback(@Req() req) {
    try {
      const result = await this.authService.handleAuth0Callback(req.user);
      console.log("social loging result is ", result)
      return {
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

}
