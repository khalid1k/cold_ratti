import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createUserDto } from './dto/createUser.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createOrUpdateUser(createUserDto: createUserDto): Promise<User> {
    let firebaseUid = createUserDto.firebaseUid;

    let user = await this.usersRepository.findOne({ where: { firebaseUid } });

    if (!user) {
      user = new User();
      user.firebaseUid = createUserDto.firebaseUid;
      user.email = createUserDto.email;
    }

    if (createUserDto.name) user.name = createUserDto.name;
    if (createUserDto.photoUrl) user.photoUrl = createUserDto.photoUrl;

    return this.usersRepository.save(user);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { firebaseUid } });
  }
}
