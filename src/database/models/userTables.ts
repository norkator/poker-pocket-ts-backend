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
import {Game} from '../../types';

@Table({
  tableName: 'userTables',
  timestamps: true,
})
export class UserTable extends Model {
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
  tableName!: string;

  @Column(DataType.STRING)
  password!: string;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM('HOLDEM', 'FIVE_CARD_DRAW', 'BOTTLE_SPIN'),
  })
  game!: Game;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  botCount!: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  turnCountdown!: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  minBet!: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  afterRoundCountdown!: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  discardAndDrawTimeout!: number;
}
