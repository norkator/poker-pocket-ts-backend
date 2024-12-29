import {AllowNull, AutoIncrement, Column, DataType, ForeignKey, Model, PrimaryKey, Table} from 'sequelize-typescript';
import {User} from './user';

@Table({
  tableName: 'statistics',
  timestamps: true,
})
export class Statistic extends Model {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  userId!: number;

  @Column({
    type: DataType.DECIMAL,
    defaultValue: 0,
  })
  money!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  winCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  loseCount!: number;
  
}
