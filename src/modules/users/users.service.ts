import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOneByAuth0Id(auth0Id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { auth0Id } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async update(user: User, updateUserDto: UpdateUserDto): Promise<User> {
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async createOrUpdateFromAuth0(auth0User: {
    auth0Id: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    let user = await this.findOneByAuth0Id(auth0User.auth0Id);

    if (!user) {
      const createUserDto: CreateUserDto = {
        auth0Id: auth0User.auth0Id,
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture,
      };
      user = await this.create(createUserDto);
    } else {
      const updateUserDto: UpdateUserDto = {
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture,
      };
      user = await this.update(user, updateUserDto);
    }

    return user;
  }

  sanitizeUser(user: User): Partial<User> {
    const { ...sanitized } = user;
    return sanitized;
  }
}