import { CustomBaseEntity } from 'src/models/customeBase.entity';
import { Entity, Column } from 'typeorm';
@Entity()
export class User extends CustomBaseEntity {
  @Column({ unique: true })
  providerId: string;

  @Column()
  providerType: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;
}
