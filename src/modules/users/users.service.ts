import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

type AuthProvider = 'supabase' | 'firebase';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createOrUpdateUser(userData: {
    authProvider: AuthProvider;
    providerId: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    // Try to find existing user
    const user = await this.userRepository.findOne({
      where: {
        providerId: userData.providerId,
        providerType: userData.authProvider
      }
    });

    if (user) {
      // Update existing user
      if (userData.email) user.email = userData.email;
      if (userData.name) user.name = userData.name;
      if (userData.picture) user.picture = userData.picture;
      return this.userRepository.save(user);
    }

    // Create new user
    const newUser = this.userRepository.create({
      providerId: userData.providerId,
      providerType: userData.authProvider,
      email: userData.email,
      name: userData.name,
      picture: userData.picture
    });

    return this.userRepository.save(newUser);
  }

  sanitizeUser(user: User): User {
    return user;
  }
}