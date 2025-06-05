import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateOtpDto } from './dto/update.user.dto';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createOrUpdateUser(userData: CreateUserDto) {
    let user = await this.findByFirebaseId(userData.firebaseId);

    if (!user) {
      user = this.userRepository.create({
        firebaseId: userData.firebaseId,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      });
    } else {
      if (userData.email) user.email = userData.email;
      if (userData.name) user.name = userData.name;
      if (userData.picture) user.picture = userData.picture;
    }

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByFirebaseId(firebaseId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { firebaseId } });
  }

  async updateOtpFields(
    email: string,
    otpData: {
      otpHash?: string;
      otpExpiresAt?: Date;
      otpAttempts?: number;
      lastOtpAttempt?: Date;
    },
  ) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (otpData.otpHash !== undefined) user.otpHash = otpData.otpHash;
    if (otpData.otpExpiresAt !== undefined) user.otpExpiresAt = otpData.otpExpiresAt;
    if (otpData.otpAttempts !== undefined) user.otpAttempts = otpData.otpAttempts;
    if (otpData.lastOtpAttempt !== undefined) user.lastOtpAttempt = otpData.lastOtpAttempt;

    return this.userRepository.save(user);
  }

  async clearOtpFields(email: string) {
    return this.updateOtpFields(email, {
      otpHash: undefined,
      otpExpiresAt: undefined,
      otpAttempts: 0,
      lastOtpAttempt: undefined,
    });
  }

  sanitizeUser(user: User): Partial<User> {
    const { otpHash, otpExpiresAt, otpAttempts, lastOtpAttempt, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}