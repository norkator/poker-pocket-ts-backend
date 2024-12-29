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
  @Column(DataType.STRING)
  achievementType!: string;

}
