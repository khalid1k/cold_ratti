import { CustomBaseEntity } from 'src/models/customeBase.entity';
import { Entity, Column } from 'typeorm';

@Entity()
export class User extends CustomBaseEntity {
  @Column({ unique: true })
  firebaseUid: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  photoUrl: string;
}
