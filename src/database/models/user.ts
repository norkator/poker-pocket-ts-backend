import bcrypt from 'bcrypt';
import {
  AllowNull,
  AutoIncrement,
  BeforeCreate,
  BeforeUpdate,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  username!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  password!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  xp!: number;
  
  @Column({
    type: DataType.DECIMAL,
    defaultValue: 0,
  })
  money!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  play_count!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  win_count!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  lose_count!: number;

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10); // salt rounds = 10
    }
  }

}
