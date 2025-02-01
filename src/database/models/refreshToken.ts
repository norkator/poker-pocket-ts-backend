import {
  AllowNull,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
} from 'sequelize-typescript';
import {User} from './user';

@Table({
  tableName: 'refreshTokens',
  timestamps: true,
})
export class RefreshToken extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  token!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  userId!: number;

  @BelongsTo(() => User)
  user!: User;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  expiresAt!: Date;
}
