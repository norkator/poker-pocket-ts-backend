import {AllowNull, AutoIncrement, Column, DataType, ForeignKey, Model, PrimaryKey, Table} from 'sequelize-typescript';
import {User} from './user';

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

}
