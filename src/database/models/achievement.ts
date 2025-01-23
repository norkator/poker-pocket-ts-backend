import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import {User} from './user';

@Table({
  tableName: 'achievements',
  timestamps: true,
})
export class Achievement extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  userId!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  achievementId!: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  count!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastAchievedAt?: Date;

}
